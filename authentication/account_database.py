"""JSON-backed administrator account database.

Passwords are stored only as Werkzeug password hashes. This module owns file
reading and writing so authentication routes do not manipulate files directly.
"""
from __future__ import annotations

import json
from pathlib import Path


class AccountDatabase:
    def __init__(self, database_file: Path) -> None:
        self.database_file = database_file

    def load(self) -> list[dict]:
        if not self.database_file.exists():
            return []

        try:
            accounts = json.loads(self.database_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return []

        return accounts if isinstance(accounts, list) else []

    def save(self, accounts: list[dict]) -> None:
        self.database_file.parent.mkdir(parents=True, exist_ok=True)
        self.database_file.write_text(
            json.dumps(accounts, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

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
