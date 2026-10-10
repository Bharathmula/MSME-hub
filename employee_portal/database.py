"""Shared database connection for manager and employee data.

SQLite is used locally. Set DATABASE_URL to a PostgreSQL/Neon connection
string on a public host so records survive service restarts and deployments.
"""
from __future__ import annotations

import os
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import NAMESPACE_URL, uuid4, uuid5

ROOT = Path(__file__).resolve().parent.parent


def normalize_tenant(value: str) -> str:
    return str(value or "").strip().lower()


def stable_company_id(tenant_email: str) -> str:
    """Return the permanent company UUID used during the legacy backfill."""
    tenant = normalize_tenant(tenant_email)
    if not tenant:
        raise ValueError("A company email is required.")
    return str(uuid5(NAMESPACE_URL, f"msme-workforce-company:{tenant}"))


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
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    tenant_email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS platform_owner_audit_log (
    id TEXT PRIMARY KEY,
    owner_email TEXT NOT NULL,
    action TEXT NOT NULL,
    company_id TEXT REFERENCES companies(id) ON DELETE RESTRICT,
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS platform_owner_profiles (
    owner_email TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT 'Platform Owner',
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_accounts (
    email TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE RESTRICT,
    account_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tenant_workspaces (
    tenant_email TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE RESTRICT,
    workspace_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tenant_workspace_backups (
    id BIGSERIAL PRIMARY KEY,
    tenant_email TEXT NOT NULL,
    company_id TEXT REFERENCES companies(id) ON DELETE RESTRICT,
    workspace_json TEXT NOT NULL,
    source_updated_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS employee_accounts (
    id BIGSERIAL PRIMARY KEY,
    tenant_email TEXT NOT NULL,
    company_id TEXT REFERENCES companies(id) ON DELETE RESTRICT,
    employee_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    workforce_role TEXT NOT NULL CHECK (workforce_role IN ('EMPLOYEE','WORKER','STAFF','MANAGER','HR','OWNER','TEMPORARY','ENTREPRENEUR')),
    password_hash TEXT,
    pin_hash TEXT,
    status TEXT NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED','ACTIVE','SUSPENDED')),
    invite_hash TEXT,
    invite_expires_at TEXT,
    biometric_status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    phone TEXT NOT NULL DEFAULT '',
    profile_photo_data TEXT NOT NULL DEFAULT '',
    profile_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (tenant_email, employee_id)
);
CREATE TABLE IF NOT EXISTS employee_shifts (
    id TEXT PRIMARY KEY,
    employee_account_id BIGINT NOT NULL REFERENCES employee_accounts(id),
    company_id TEXT REFERENCES companies(id) ON DELETE RESTRICT,
    work_date TEXT NOT NULL,
    check_in_at TEXT NOT NULL,
    check_out_at TEXT,
    worked_minutes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'OPEN',
    admin_checkout_by TEXT NOT NULL DEFAULT '',
    admin_checkout_note TEXT NOT NULL DEFAULT '',
    UNIQUE(employee_account_id, work_date)
);
CREATE TABLE IF NOT EXISTS employee_attendance_events (
    id TEXT PRIMARY KEY,
    employee_account_id BIGINT NOT NULL REFERENCES employee_accounts(id),
    company_id TEXT REFERENCES companies(id) ON DELETE RESTRICT,
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
    company_id TEXT REFERENCES companies(id) ON DELETE RESTRICT,
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
    company_id TEXT REFERENCES companies(id) ON DELETE RESTRICT,
    login_at TEXT NOT NULL,
    logout_at TEXT,
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS company_subscriptions (
    company_id TEXT PRIMARY KEY,
    tenant_company_id TEXT REFERENCES companies(id) ON DELETE RESTRICT,
    plan_code TEXT NOT NULL DEFAULT 'TRIAL',
    status TEXT NOT NULL DEFAULT 'TRIALING',
    billing_cycle TEXT NOT NULL DEFAULT 'TRIAL',
    provider TEXT,
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    trial_started_at TEXT NOT NULL,
    trial_ends_at TEXT NOT NULL,
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    employee_limit INTEGER NOT NULL DEFAULT 10,
    cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_employee_accounts_tenant_role ON employee_accounts(tenant_email, workforce_role);
CREATE INDEX IF NOT EXISTS idx_workspace_backups_tenant_created ON tenant_workspace_backups(tenant_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_events_time ON employee_attendance_events(server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_employee_login_sessions_account ON employee_login_sessions(employee_account_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_status ON company_subscriptions(status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_platform_owner_audit_created ON platform_owner_audit_log(created_at DESC);
"""


COMPANY_COLUMNS = {
    "admin_accounts": "company_id",
    "tenant_workspaces": "company_id",
    "tenant_workspace_backups": "company_id",
    "employee_accounts": "company_id",
    "employee_shifts": "company_id",
    "employee_attendance_events": "company_id",
    "employee_audit_log": "company_id",
    "employee_login_sessions": "company_id",
    "company_subscriptions": "tenant_company_id",
}


def _columns(db: DatabaseConnection, table: str) -> set[str]:
    if db.postgres:
        rows = db.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema=current_schema() AND table_name=?",
            (table,),
        ).fetchall()
        return {row["column_name"] for row in rows}
    return {row["name"] for row in db.execute(f"PRAGMA table_info({table})").fetchall()}


def ensure_company(db: DatabaseConnection, tenant_email: str, display_name: str = "") -> str:
    """Create or return a stable company identity without replacing any data."""
    tenant = normalize_tenant(tenant_email)
    if not tenant:
        raise ValueError("A company email is required.")
    existing = db.execute(
        "SELECT id FROM companies WHERE tenant_email=?", (tenant,)
    ).fetchone()
    if existing:
        return existing["id"]
    company_id = stable_company_id(tenant)
    collision = db.execute(
        "SELECT tenant_email FROM companies WHERE id=?", (company_id,)
    ).fetchone()
    if collision and normalize_tenant(collision["tenant_email"]) != tenant:
        # The original email of a renamed company may later be registered by a
        # different customer. Never reuse the renamed company's permanent ID.
        company_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        """INSERT INTO companies(id,tenant_email,display_name,status,created_at,updated_at)
           VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING""",
        (company_id, tenant, str(display_name or "").strip(), "ACTIVE", now, now),
    )
    # A UUID collision is practically impossible, but never silently attach a
    # tenant to a company with a different email.
    row = db.execute(
        "SELECT id FROM companies WHERE tenant_email=?", (tenant,)
    ).fetchone()
    if not row:
        raise RuntimeError("Unable to create the company ownership record.")
    return row["id"]


def company_id_for_tenant(tenant_email: str, create: bool = True) -> str | None:
    tenant = normalize_tenant(tenant_email)
    if not tenant:
        return None
    db = connect()
    try:
        row = db.execute("SELECT id FROM companies WHERE tenant_email=?", (tenant,)).fetchone()
        if row:
            return row["id"]
        if not create:
            return None
        db.execute("BEGIN" if db.postgres else "BEGIN IMMEDIATE")
        company_id = ensure_company(db, tenant)
        db.commit()
        return company_id
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def company_status_for_tenant(tenant_email: str) -> str | None:
    tenant = normalize_tenant(tenant_email)
    if not tenant:
        return None
    db = connect()
    try:
        row = db.execute(
            "SELECT status FROM companies WHERE tenant_email=?", (tenant,)
        ).fetchone()
        return str(row["status"]).upper() if row else None
    finally:
        db.close()


def company_status_for_id(company_id: str) -> str | None:
    if not str(company_id or "").strip():
        return None
    db = connect()
    try:
        row = db.execute(
            "SELECT status FROM companies WHERE id=?", (str(company_id).strip(),)
        ).fetchone()
        return str(row["status"]).upper() if row else None
    finally:
        db.close()


def _strengthen_company_isolation(db: DatabaseConnection) -> None:
    """Add and backfill immutable company ownership without deleting rows."""
    if db.postgres:
        db.execute(
            """CREATE TABLE IF NOT EXISTS companies(
            id TEXT PRIMARY KEY, tenant_email TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'ACTIVE',
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"""
        )
        for table, column in COMPANY_COLUMNS.items():
            db.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} TEXT")
    else:
        db.execute(
            """CREATE TABLE IF NOT EXISTS companies(
            id TEXT PRIMARY KEY, tenant_email TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'ACTIVE',
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"""
        )
        for table, column in COMPANY_COLUMNS.items():
            if column not in _columns(db, table):
                db.execute(f"ALTER TABLE {table} ADD COLUMN {column} TEXT")

    db.execute(
        """CREATE TABLE IF NOT EXISTS platform_owner_audit_log(
        id TEXT PRIMARY KEY,
        owner_email TEXT NOT NULL,
        action TEXT NOT NULL,
        company_id TEXT,
        details_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL)"""
    )

    tenant_sources = (
        ("tenant_workspaces", "tenant_email"),
        ("tenant_workspace_backups", "tenant_email"),
        ("employee_accounts", "tenant_email"),
        ("employee_login_sessions", "tenant_email"),
        ("company_subscriptions", "company_id"),
    )
    tenants: set[str] = set()
    for row in db.execute("SELECT email,account_json FROM admin_accounts").fetchall():
        # Disabled historical login markers do not represent a customer
        # company and therefore intentionally have no company UUID.
        try:
            account = json.loads(row["account_json"] or "{}")
        except (TypeError, json.JSONDecodeError):
            account = {}
        if not isinstance(account, dict) or not account.get("disabled"):
            tenant = normalize_tenant(row["email"])
            if tenant:
                tenants.add(tenant)
    for table, column in tenant_sources:
        for row in db.execute(
            f"SELECT DISTINCT {column} AS tenant FROM {table} "
            f"WHERE {column} IS NOT NULL AND {column} <> ''"
        ).fetchall():
            tenant = normalize_tenant(row["tenant"])
            if tenant:
                tenants.add(tenant)
    for tenant in sorted(tenants):
        ensure_company(db, tenant)

    direct = (
        ("admin_accounts", "email", "company_id"),
        ("tenant_workspaces", "tenant_email", "company_id"),
        ("tenant_workspace_backups", "tenant_email", "company_id"),
        ("employee_accounts", "tenant_email", "company_id"),
        ("employee_login_sessions", "tenant_email", "company_id"),
        ("company_subscriptions", "company_id", "tenant_company_id"),
    )
    for table, tenant_column, company_column in direct:
        db.execute(
            f"""UPDATE {table} SET {company_column}=(
                SELECT c.id FROM companies c
                WHERE lower(c.tenant_email)=lower({table}.{tenant_column})
            ) WHERE {company_column} IS NULL OR {company_column}=''"""
        )
    db.execute(
        """UPDATE employee_shifts SET company_id=(
           SELECT a.company_id FROM employee_accounts a
           WHERE a.id=employee_shifts.employee_account_id)
           WHERE company_id IS NULL OR company_id=''"""
    )
    db.execute(
        """UPDATE employee_attendance_events SET company_id=(
           SELECT a.company_id FROM employee_accounts a
           WHERE a.id=employee_attendance_events.employee_account_id)
           WHERE company_id IS NULL OR company_id=''"""
    )
    db.execute(
        """UPDATE employee_audit_log SET company_id=(
           SELECT a.company_id FROM employee_accounts a
           WHERE lower(a.email)=lower(employee_audit_log.actor_email) LIMIT 1)
           WHERE company_id IS NULL OR company_id=''"""
    )
    db.execute(
        """UPDATE employee_audit_log SET company_id=(
           SELECT a.company_id FROM admin_accounts a
           WHERE lower(a.email)=lower(employee_audit_log.actor_email) LIMIT 1)
           WHERE company_id IS NULL OR company_id=''"""
    )

    indexes = (
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_accounts_id_company ON employee_accounts(id,company_id)",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_shifts_id_company ON employee_shifts(id,company_id)",
        "CREATE INDEX IF NOT EXISTS idx_admin_accounts_company ON admin_accounts(company_id)",
        "CREATE INDEX IF NOT EXISTS idx_tenant_workspaces_company ON tenant_workspaces(company_id)",
        "CREATE INDEX IF NOT EXISTS idx_workspace_backups_company_created ON tenant_workspace_backups(company_id,created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_employee_accounts_company_role ON employee_accounts(company_id,workforce_role)",
        "CREATE INDEX IF NOT EXISTS idx_employee_shifts_company_date ON employee_shifts(company_id,work_date DESC)",
        "CREATE INDEX IF NOT EXISTS idx_employee_events_company_time ON employee_attendance_events(company_id,server_timestamp DESC)",
        "CREATE INDEX IF NOT EXISTS idx_employee_audit_company_created ON employee_audit_log(company_id,created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_employee_sessions_company_login ON employee_login_sessions(company_id,login_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_company ON company_subscriptions(tenant_company_id)",
        "CREATE INDEX IF NOT EXISTS idx_platform_owner_audit_created ON platform_owner_audit_log(created_at DESC)",
    )
    for statement in indexes:
        db.execute(statement)

    if db.postgres:
        required_ownership = (
            ("tenant_workspaces", "company_id"),
            ("tenant_workspace_backups", "company_id"),
            ("employee_accounts", "company_id"),
            ("employee_shifts", "company_id"),
            ("employee_attendance_events", "company_id"),
            ("employee_login_sessions", "company_id"),
            ("company_subscriptions", "tenant_company_id"),
        )
        for table, column in required_ownership:
            missing = db.execute(
                f"SELECT COUNT(*) AS count FROM {table} WHERE {column} IS NULL OR {column}=''"
            ).fetchone()["count"]
            if not missing:
                db.execute(f"ALTER TABLE {table} ALTER COLUMN {column} SET NOT NULL")
        foreign_keys = (
            ("admin_accounts", "admin_accounts_company_fk", "FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT"),
            ("tenant_workspaces", "tenant_workspaces_company_fk", "FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT"),
            ("tenant_workspace_backups", "tenant_workspace_backups_company_fk", "FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT"),
            ("employee_accounts", "employee_accounts_company_fk", "FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT"),
            ("employee_shifts", "employee_shifts_company_fk", "FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT"),
            ("employee_shifts", "employee_shifts_owner_fk", "FOREIGN KEY(employee_account_id,company_id) REFERENCES employee_accounts(id,company_id) ON DELETE RESTRICT"),
            ("employee_attendance_events", "employee_events_company_fk", "FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT"),
            ("employee_attendance_events", "employee_events_owner_fk", "FOREIGN KEY(employee_account_id,company_id) REFERENCES employee_accounts(id,company_id) ON DELETE RESTRICT"),
            ("employee_attendance_events", "employee_events_shift_company_fk", "FOREIGN KEY(shift_id,company_id) REFERENCES employee_shifts(id,company_id) ON DELETE RESTRICT"),
            ("employee_audit_log", "employee_audit_company_fk", "FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT"),
            ("employee_login_sessions", "employee_sessions_company_fk", "FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT"),
            ("employee_login_sessions", "employee_sessions_owner_fk", "FOREIGN KEY(employee_account_id,company_id) REFERENCES employee_accounts(id,company_id) ON DELETE RESTRICT"),
            ("company_subscriptions", "subscriptions_company_fk", "FOREIGN KEY(tenant_company_id) REFERENCES companies(id) ON DELETE RESTRICT"),
            ("platform_owner_audit_log", "platform_owner_audit_company_fk", "FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE RESTRICT"),
        )
        for table, constraint, definition in foreign_keys:
            exists = db.execute(
                "SELECT 1 FROM pg_constraint WHERE conname=?", (constraint,)
            ).fetchone()
            if not exists:
                # NOT VALID avoids blocking deployment if an old partial row
                # exists, while immediately protecting all new writes.
                db.execute(
                    f"ALTER TABLE {table} ADD CONSTRAINT {constraint} {definition} NOT VALID"
                )
        for table, constraint, _ in foreign_keys:
            remaining = db.execute(
                "SELECT 1 FROM pg_constraint WHERE conname=? AND NOT convalidated",
                (constraint,),
            ).fetchone()
            if remaining:
                try:
                    db.execute(f"ALTER TABLE {table} VALIDATE CONSTRAINT {constraint}")
                except Exception:
                    # Existing incomplete audit history is retained rather than
                    # deleted; the NOT VALID constraint still protects new rows.
                    pass


def initialize() -> None:
    db = connect()
    try:
        if db.postgres:
            db.executescript(POSTGRES_SCHEMA)
            # CREATE TABLE IF NOT EXISTS does not add columns to tables that
            # already exist. Public Render/Neon databases created before photo
            # persistence was introduced therefore need these safe upgrades.
            db.execute(
                "ALTER TABLE employee_attendance_events "
                "ADD COLUMN IF NOT EXISTS face_capture_data TEXT"
            )
            db.execute(
                "ALTER TABLE employee_accounts "
                "ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''"
            )
            db.execute(
                "ALTER TABLE employee_accounts "
                "ADD COLUMN IF NOT EXISTS profile_photo_data TEXT NOT NULL DEFAULT ''"
            )
            db.execute(
                "ALTER TABLE employee_accounts "
                "ADD COLUMN IF NOT EXISTS profile_json TEXT NOT NULL DEFAULT '{}'"
            )
            db.execute(
                "ALTER TABLE employee_shifts "
                "ADD COLUMN IF NOT EXISTS admin_checkout_by TEXT NOT NULL DEFAULT ''"
            )
            db.execute(
                "ALTER TABLE employee_shifts "
                "ADD COLUMN IF NOT EXISTS admin_checkout_note TEXT NOT NULL DEFAULT ''"
            )
            # Earlier Neon deployments restricted accounts to Worker, Staff and
            # Temporary Worker. Recreate the named check so existing databases
            # can also issue Entrepreneur invitations and record attendance.
            db.execute(
                "ALTER TABLE employee_accounts DROP CONSTRAINT IF EXISTS "
                "employee_accounts_workforce_role_check"
            )
            db.execute(
                "ALTER TABLE employee_accounts ADD CONSTRAINT "
                "employee_accounts_workforce_role_check CHECK "
                "(workforce_role IN ('EMPLOYEE','WORKER','STAFF','MANAGER','HR','OWNER','TEMPORARY','ENTREPRENEUR'))"
            )
            _strengthen_company_isolation(db)
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
        db.executescript(
            (ROOT / "migrations" / "005_company_subscriptions.sql").read_text(encoding="utf-8")
        )
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS tenant_workspace_backups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_email TEXT NOT NULL,
                workspace_json TEXT NOT NULL,
                source_updated_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_workspace_backups_tenant_created
                ON tenant_workspace_backups(tenant_email, created_at DESC);
            CREATE TABLE IF NOT EXISTS platform_owner_profiles (
                owner_email TEXT PRIMARY KEY,
                display_name TEXT NOT NULL DEFAULT 'Platform Owner',
                updated_at TEXT NOT NULL
            );
            """
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
        if "profile_json" not in account_columns:
            db.execute(
                "ALTER TABLE employee_accounts ADD COLUMN profile_json TEXT NOT NULL DEFAULT '{}'"
            )
        shift_columns = {
            row["name"]
            for row in db.execute("PRAGMA table_info(employee_shifts)").fetchall()
        }
        if "admin_checkout_by" not in shift_columns:
            db.execute(
                "ALTER TABLE employee_shifts ADD COLUMN admin_checkout_by TEXT NOT NULL DEFAULT ''"
            )
        if "admin_checkout_note" not in shift_columns:
            db.execute(
                "ALTER TABLE employee_shifts ADD COLUMN admin_checkout_note TEXT NOT NULL DEFAULT ''"
            )
        account_schema = db.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='employee_accounts'"
        ).fetchone()
        required_roles = ("EMPLOYEE", "MANAGER", "HR", "OWNER", "ENTREPRENEUR")
        if account_schema and not all(role in (account_schema["sql"] or "") for role in required_roles):
            # SQLite cannot alter a CHECK constraint in place. Rebuild only this
            # table, retaining every account and leaving attendance/session
            # tables pointed at the same final employee_accounts table name.
            db.execute("PRAGMA foreign_keys=OFF")
            try:
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    """CREATE TABLE employee_accounts_role_upgrade (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_email TEXT NOT NULL,
                    employee_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    workforce_role TEXT NOT NULL CHECK(workforce_role IN('EMPLOYEE','WORKER','STAFF','MANAGER','HR','OWNER','TEMPORARY','ENTREPRENEUR')),
                    password_hash TEXT,
                    pin_hash TEXT,
                    status TEXT NOT NULL DEFAULT 'INVITED' CHECK(status IN('INVITED','ACTIVE','SUSPENDED')),
                    invite_hash TEXT,
                    invite_expires_at TEXT,
                    biometric_status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
                    phone TEXT NOT NULL DEFAULT '',
                    profile_photo_data TEXT NOT NULL DEFAULT '',
                    profile_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(tenant_email,employee_id)
                    )"""
                )
                db.execute(
                    """INSERT INTO employee_accounts_role_upgrade(
                    id,tenant_email,employee_id,name,email,workforce_role,
                    password_hash,pin_hash,status,invite_hash,invite_expires_at,
                    biometric_status,phone,profile_photo_data,profile_json,
                    created_at,updated_at)
                    SELECT id,tenant_email,employee_id,name,email,workforce_role,
                    password_hash,pin_hash,status,invite_hash,invite_expires_at,
                    biometric_status,phone,profile_photo_data,profile_json,
                    created_at,updated_at FROM employee_accounts"""
                )
                db.execute("DROP TABLE employee_accounts")
                db.execute("ALTER TABLE employee_accounts_role_upgrade RENAME TO employee_accounts")
                db.execute(
                    "CREATE INDEX IF NOT EXISTS idx_employee_accounts_tenant_role "
                    "ON employee_accounts(tenant_email, workforce_role)"
                )
                db.commit()
            except Exception:
                db.rollback()
                raise
            finally:
                db.execute("PRAGMA foreign_keys=ON")
        _strengthen_company_isolation(db)
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
