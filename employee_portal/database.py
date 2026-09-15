"""Shared database connection for manager and employee data.

SQLite is used locally. Set DATABASE_URL to a PostgreSQL/Neon connection
string on a public host so records survive service restarts and deployments.
"""
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def database_url() -> str:
    return os.environ.get("DATABASE_URL", "").strip()


def path() -> Path:
    return Path(
        os.environ.get("MSME_EMPLOYEE_DB", ROOT / "data" / "employee_portal.db")
    ).resolve()


class DatabaseConnection:
    """Small compatibility layer for SQLite and PostgreSQL."""

    def __init__(self, raw, postgres: bool = False) -> None:
        self.raw = raw
        self.postgres = postgres

    def execute(self, sql: str, params=()):
        if self.postgres:
            sql = sql.replace("?", "%s")
        return self.raw.execute(sql, params)

    def executescript(self, sql: str) -> None:
        if self.postgres:
            for statement in sql.split(";"):
                if statement.strip():
                    self.raw.execute(statement)
        else:
            self.raw.executescript(sql)

    def commit(self) -> None:
        self.raw.commit()

    def rollback(self) -> None:
        self.raw.rollback()

    def close(self) -> None:
        self.raw.close()


def connect() -> DatabaseConnection:
    url = database_url()
    if url:
        import psycopg
        from psycopg.rows import dict_row

        raw = psycopg.connect(url, row_factory=dict_row, autocommit=True)
        return DatabaseConnection(raw, postgres=True)

    target = path()
    target.parent.mkdir(parents=True, exist_ok=True)
    raw = sqlite3.connect(target, timeout=15, isolation_level=None)
    raw.row_factory = sqlite3.Row
    raw.execute("PRAGMA foreign_keys=ON")
    raw.execute("PRAGMA busy_timeout=15000")
    return DatabaseConnection(raw)


POSTGRES_SCHEMA = """
CREATE TABLE IF NOT EXISTS admin_accounts (
    email TEXT PRIMARY KEY,
    account_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tenant_workspaces (
    tenant_email TEXT PRIMARY KEY,
    workspace_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS employee_accounts (
    id BIGSERIAL PRIMARY KEY,
    tenant_email TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    workforce_role TEXT NOT NULL CHECK (workforce_role IN ('WORKER','STAFF','TEMPORARY')),
    password_hash TEXT,
    pin_hash TEXT,
    status TEXT NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED','ACTIVE','SUSPENDED')),
    invite_hash TEXT,
    invite_expires_at TEXT,
    biometric_status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    phone TEXT NOT NULL DEFAULT '',
    profile_photo_data TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (tenant_email, employee_id)
);
CREATE TABLE IF NOT EXISTS employee_shifts (
    id TEXT PRIMARY KEY,
    employee_account_id BIGINT NOT NULL REFERENCES employee_accounts(id),
    work_date TEXT NOT NULL,
    check_in_at TEXT NOT NULL,
    check_out_at TEXT,
    worked_minutes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'OPEN',
    UNIQUE(employee_account_id, work_date)
);
CREATE TABLE IF NOT EXISTS employee_attendance_events (
    id TEXT PRIMARY KEY,
    employee_account_id BIGINT NOT NULL REFERENCES employee_accounts(id),
    shift_id TEXT NOT NULL REFERENCES employee_shifts(id),
    event_type TEXT NOT NULL CHECK (event_type IN ('CHECK_IN','CHECK_OUT')),
    server_timestamp TEXT NOT NULL,
    verification_method TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    device_identifier TEXT NOT NULL,
    face_capture_data TEXT,
    UNIQUE(employee_account_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS employee_audit_log (
    id TEXT PRIMARY KEY,
    actor_email TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS employee_login_sessions (
    id TEXT PRIMARY KEY,
    employee_account_id BIGINT NOT NULL REFERENCES employee_accounts(id) ON DELETE CASCADE,
    tenant_email TEXT NOT NULL,
    login_at TEXT NOT NULL,
    logout_at TEXT,
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_employee_accounts_tenant_role ON employee_accounts(tenant_email, workforce_role);
CREATE INDEX IF NOT EXISTS idx_employee_events_time ON employee_attendance_events(server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_employee_login_sessions_account ON employee_login_sessions(employee_account_id, login_at DESC);
"""


def initialize() -> None:
    db = connect()
    try:
        if db.postgres:
            db.executescript(POSTGRES_SCHEMA)
            return

        db.executescript(
            (ROOT / "migrations" / "002_employee_portal.sql").read_text(encoding="utf-8")
        )
        db.executescript(
            (ROOT / "migrations" / "003_persistent_workspaces.sql").read_text(encoding="utf-8")
        )
        db.executescript(
            (ROOT / "migrations" / "004_employee_login_sessions.sql").read_text(encoding="utf-8")
        )
        event_columns = {
            row["name"]
            for row in db.execute("PRAGMA table_info(employee_attendance_events)").fetchall()
        }
        if "face_capture_data" not in event_columns:
            db.execute(
                "ALTER TABLE employee_attendance_events ADD COLUMN face_capture_data TEXT"
            )
        account_columns = {
            row["name"]
            for row in db.execute("PRAGMA table_info(employee_accounts)").fetchall()
        }
        if "phone" not in account_columns:
            db.execute(
                "ALTER TABLE employee_accounts ADD COLUMN phone TEXT NOT NULL DEFAULT ''"
            )
        if "profile_photo_data" not in account_columns:
            db.execute(
                "ALTER TABLE employee_accounts ADD COLUMN profile_photo_data TEXT NOT NULL DEFAULT ''"
            )
    finally:
        db.close()


@contextmanager
def transaction():
    db = connect()
    try:
        db.execute("BEGIN" if db.postgres else "BEGIN IMMEDIATE")
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
