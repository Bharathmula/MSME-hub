"""Database-backed administrator accounts with safe legacy JSON import."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from employee_portal.database import connect, initialize, transaction


class AccountDatabase:
    def __init__(self, legacy_file: Path | None = None) -> None:
        self.legacy_file = legacy_file
        initialize()

    def load(self) -> list[dict]:
        db = connect()
        try:
            rows = db.execute(
                "SELECT account_json FROM admin_accounts ORDER BY email"
            ).fetchall()
        finally:
            db.close()
        accounts = []
        for row in rows:
            try:
                value = json.loads(row["account_json"])
                if isinstance(value, dict):
                    accounts.append(value)
            except (TypeError, json.JSONDecodeError):
                continue
        if accounts or not self.legacy_file or not self.legacy_file.exists():
            return accounts
        try:
            legacy = json.loads(self.legacy_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return []
        if isinstance(legacy, list):
            self.save(legacy)
            return legacy
        return []

    def save(self, accounts: list[dict]) -> None:
        now = datetime.now(timezone.utc).isoformat()
        normalized = {
            str(account.get("email", "")).strip().lower(): account
            for account in accounts
            if str(account.get("email", "")).strip()
        }
        with transaction() as db:
            for email, account in normalized.items():
                db.execute(
                    """INSERT INTO admin_accounts(email, account_json, updated_at)
                       VALUES(?, ?, ?)
                       ON CONFLICT(email) DO UPDATE SET
                         account_json=excluded.account_json,
                         updated_at=excluded.updated_at""",
                    (email, json.dumps(account, ensure_ascii=False), now),
                )
            rows = db.execute("SELECT email FROM admin_accounts").fetchall()
            for row in rows:
                if row["email"] not in normalized:
                    db.execute("DELETE FROM admin_accounts WHERE email=?", (row["email"],))

    def find_by_email(self, email: str) -> dict | None:
        normalized = email.strip().lower()
        return next(
            (
                account
                for account in self.load()
                if str(account.get("email", "")).strip().lower() == normalized
            ),
            None,
        )
