"""Persistent, company-isolated dashboard workspace records."""
from __future__ import annotations

import json
from datetime import datetime, timezone

from employee_portal.database import connect, initialize, transaction


class WorkspaceDatabase:
    def __init__(self) -> None:
        initialize()

    def load(self, tenant_email: str) -> dict | None:
        db = connect()
        try:
            row = db.execute(
                "SELECT workspace_json, updated_at FROM tenant_workspaces WHERE tenant_email=?",
                (tenant_email.strip().lower(),),
            ).fetchone()
        finally:
            db.close()
        if not row:
            return None
        try:
            workspace = json.loads(row["workspace_json"])
        except (TypeError, json.JSONDecodeError):
            return None
        if not isinstance(workspace, dict):
            return None
        workspace["updated_at"] = row["updated_at"]
        return workspace

    def save(self, tenant_email: str, workspace: dict) -> str:
        tenant = tenant_email.strip().lower()
        now = datetime.now(timezone.utc).isoformat()
        value = dict(workspace)
        value["schema_version"] = 1
        value["updated_at"] = now
        with transaction() as db:
            db.execute(
                """INSERT INTO tenant_workspaces(tenant_email, workspace_json, updated_at)
                   VALUES(?, ?, ?)
                   ON CONFLICT(tenant_email) DO UPDATE SET
                     workspace_json=excluded.workspace_json,
                     updated_at=excluded.updated_at""",
                (tenant, json.dumps(value, ensure_ascii=False), now),
            )
        return now

    def rename(self, old_email: str, new_email: str) -> None:
        old_tenant = old_email.strip().lower()
        new_tenant = new_email.strip().lower()
        if not old_tenant or old_tenant == new_tenant:
            return
        with transaction() as db:
            current = db.execute(
                "SELECT workspace_json, updated_at FROM tenant_workspaces WHERE tenant_email=?",
                (old_tenant,),
            ).fetchone()
            if not current:
                return
            db.execute("DELETE FROM tenant_workspaces WHERE tenant_email=?", (new_tenant,))
            db.execute(
                "UPDATE tenant_workspaces SET tenant_email=? WHERE tenant_email=?",
                (new_tenant, old_tenant),
            )
