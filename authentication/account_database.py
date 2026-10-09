"""Database-backed administrator accounts with safe legacy JSON import."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from employee_portal.database import connect, ensure_company, initialize, transaction


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
                company_id = None if account.get("disabled") else ensure_company(
                    db, email, str(account.get("company") or account.get("name") or "")
                )
                db.execute(
                    """INSERT INTO admin_accounts(email, company_id, account_json, updated_at)
                       VALUES(?, ?, ?, ?)
                       ON CONFLICT(email) DO UPDATE SET
                         company_id=excluded.company_id,
                         account_json=excluded.account_json,
                         updated_at=excluded.updated_at""",
                    (email, company_id, json.dumps(account, ensure_ascii=False), now),
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
