"""Persistent, company-isolated dashboard workspace records."""
from __future__ import annotations

import json
from datetime import datetime, timezone

from employee_portal.database import connect, ensure_company, initialize, transaction


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
            company_id = ensure_company(
                db,
                tenant,
                str(value.get("account", {}).get("company", ""))
                if isinstance(value.get("account"), dict)
                else "",
            )
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
                           tenant_email, company_id, workspace_json, source_updated_at, created_at
                       ) VALUES(?, ?, ?, ?, ?)""",
                    (tenant, company_id, current["workspace_json"], current["updated_at"], now),
                )
            db.execute(
                """INSERT INTO tenant_workspaces(tenant_email, company_id, workspace_json, updated_at)
                   VALUES(?, ?, ?, ?)
                   ON CONFLICT(tenant_email) DO UPDATE SET
                     company_id=excluded.company_id,
                     workspace_json=excluded.workspace_json,
                     updated_at=excluded.updated_at""",
                (tenant, company_id, json.dumps(value, ensure_ascii=False), now),
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
            company_id = ensure_company(db, old_tenant)
            conflict = db.execute(
                "SELECT id FROM companies WHERE tenant_email=?", (new_tenant,)
            ).fetchone()
            if conflict and conflict["id"] != company_id:
                raise ValueError("Another company already uses the new administrator email.")
            workspace_conflict = db.execute(
                "SELECT company_id FROM tenant_workspaces WHERE tenant_email=?",
                (new_tenant,),
            ).fetchone()
            if workspace_conflict and workspace_conflict["company_id"] != company_id:
                raise ValueError("Another company already owns the destination workspace.")
            now = datetime.now(timezone.utc).isoformat()
            db.execute(
                "UPDATE companies SET tenant_email=?,updated_at=? WHERE id=?",
                (new_tenant, now, company_id),
            )
            # Keep the account table internally consistent during the email
            # rename. AccountDatabase.save immediately refreshes account_json.
            db.execute(
                "UPDATE admin_accounts SET email=?,company_id=? WHERE email=?",
                (new_tenant, company_id, old_tenant),
            )
            current = db.execute(
                "SELECT workspace_json, updated_at FROM tenant_workspaces WHERE tenant_email=?",
                (old_tenant,),
            ).fetchone()
            if current:
                db.execute(
                    "UPDATE tenant_workspaces SET tenant_email=?,company_id=? WHERE tenant_email=?",
                    (new_tenant, company_id, old_tenant),
                )
            # Employee credentials, attendance ownership and login history must
            # remain attached to the same company after its administrator
            # changes the login email.
            db.execute(
                "UPDATE employee_accounts SET tenant_email=?,company_id=? WHERE tenant_email=?",
                (new_tenant, company_id, old_tenant),
            )
            db.execute(
                "UPDATE employee_login_sessions SET tenant_email=?,company_id=? WHERE tenant_email=?",
                (new_tenant, company_id, old_tenant),
            )
            db.execute(
                "UPDATE tenant_workspace_backups SET tenant_email=?,company_id=? WHERE tenant_email=?",
                (new_tenant, company_id, old_tenant),
            )
