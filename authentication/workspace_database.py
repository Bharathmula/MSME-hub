"""Persistent, company-isolated dashboard workspace records."""
from __future__ import annotations

import json
from datetime import datetime, timezone

from employee_portal.database import connect, initialize, transaction


class WorkspaceConflictError(RuntimeError):
    """Raised when an older browser attempts to replace a newer workspace."""

    def __init__(self, current_updated_at: str) -> None:
        super().__init__("The company workspace changed in another browser session.")
        self.current_updated_at = current_updated_at


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

    def save(
        self,
        tenant_email: str,
        workspace: dict,
        expected_updated_at: str | None = None,
    ) -> str:
        tenant = tenant_email.strip().lower()
        now = datetime.now(timezone.utc).isoformat()
        value = dict(workspace)
        value["schema_version"] = 1
        value["updated_at"] = now
        with transaction() as db:
            current = db.execute(
                "SELECT workspace_json, updated_at FROM tenant_workspaces WHERE tenant_email=?",
                (tenant,),
            ).fetchone()
            if (
                expected_updated_at is not None
                and current
                and current["updated_at"] != expected_updated_at
            ):
                raise WorkspaceConflictError(current["updated_at"])
            if current:
                db.execute(
                    """INSERT INTO tenant_workspace_backups(
                           tenant_email, workspace_json, source_updated_at, created_at
                       ) VALUES(?, ?, ?, ?)""",
                    (tenant, current["workspace_json"], current["updated_at"], now),
                )
            db.execute(
                """INSERT INTO tenant_workspaces(tenant_email, workspace_json, updated_at)
                   VALUES(?, ?, ?)
                   ON CONFLICT(tenant_email) DO UPDATE SET
                     workspace_json=excluded.workspace_json,
                     updated_at=excluded.updated_at""",
                (tenant, json.dumps(value, ensure_ascii=False), now),
            )
        return now

    def backups(self, tenant_email: str, limit: int = 25) -> list[dict]:
        tenant = tenant_email.strip().lower()
        db = connect()
        try:
            rows = db.execute(
                """SELECT id, workspace_json, source_updated_at, created_at
                   FROM tenant_workspace_backups
                   WHERE tenant_email=?
                   ORDER BY created_at DESC
                   LIMIT ?""",
                (tenant, max(1, min(int(limit), 100))),
            ).fetchall()
        finally:
            db.close()
        results = []
        for row in rows:
            try:
                workspace = json.loads(row["workspace_json"])
            except (TypeError, json.JSONDecodeError):
                workspace = {}
            storage = workspace.get("storage", {}) if isinstance(workspace, dict) else {}
            results.append({
                "id": row["id"],
                "source_updated_at": row["source_updated_at"],
                "created_at": row["created_at"],
                "people_count": len(storage.get("people", [])),
                "temporary_count": len(storage.get("temporary", [])),
                "attendance_days": len(storage.get("attendance", [])),
            })
        return results

    def restore(self, tenant_email: str, backup_id: int) -> str | None:
        tenant = tenant_email.strip().lower()
        db = connect()
        try:
            row = db.execute(
                """SELECT workspace_json FROM tenant_workspace_backups
                   WHERE tenant_email=? AND id=?""",
                (tenant, backup_id),
            ).fetchone()
        finally:
            db.close()
        if not row:
            return None
        try:
            workspace = json.loads(row["workspace_json"])
        except (TypeError, json.JSONDecodeError):
            return None
        return self.save(tenant, workspace)

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
            if current:
                db.execute("DELETE FROM tenant_workspaces WHERE tenant_email=?", (new_tenant,))
                db.execute(
                    "UPDATE tenant_workspaces SET tenant_email=? WHERE tenant_email=?",
                    (new_tenant, old_tenant),
                )
            # Employee credentials, attendance ownership and login history must
            # remain attached to the same company after its administrator
            # changes the login email.
            db.execute(
                "UPDATE employee_accounts SET tenant_email=? WHERE tenant_email=?",
                (new_tenant, old_tenant),
            )
            db.execute(
                "UPDATE employee_login_sessions SET tenant_email=? WHERE tenant_email=?",
                (new_tenant, old_tenant),
            )
            db.execute(
                "UPDATE tenant_workspace_backups SET tenant_email=? WHERE tenant_email=?",
                (new_tenant, old_tenant),
            )
