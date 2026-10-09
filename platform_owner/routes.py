"""Owner-only SaaS control plane for companies and subscriptions."""
from __future__ import annotations

import json
import os
import secrets
import threading
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, g, jsonify, request, send_from_directory
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash

from authentication.subscription_service import PLAN_CATALOG, ensure_subscription
from employee_portal.database import connect, database_url, transaction
from employee_portal.photo_storage import storage_mode

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static" / "platform-owner"
OWNER_SESSION_SECONDS = 8 * 60 * 60
LOGIN_WINDOW_SECONDS = 10 * 60
LOGIN_ATTEMPT_LIMIT = 8
_login_attempts: dict[str, list[datetime]] = {}
_login_lock = threading.Lock()

platform_owner = Blueprint("platform_owner", __name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _stamp() -> str:
    return _now().isoformat()


def _owner_email() -> str:
    return os.environ.get("MSME_PLATFORM_OWNER_EMAIL", "").strip().lower()


def _owner_configured() -> bool:
    return bool(
        _owner_email()
        and (
            os.environ.get("MSME_PLATFORM_OWNER_PASSWORD_HASH", "").strip()
            or os.environ.get("MSME_PLATFORM_OWNER_PASSWORD", "")
        )
    )


def _password_matches(value: str) -> bool:
    password_hash = os.environ.get("MSME_PLATFORM_OWNER_PASSWORD_HASH", "").strip()
    if password_hash:
        try:
            return check_password_hash(password_hash, value)
        except (ValueError, TypeError):
            return False
    return secrets.compare_digest(
        os.environ.get("MSME_PLATFORM_OWNER_PASSWORD", ""), value
    )


def _signer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(
        current_app.config["SECRET_KEY"], salt="msme-platform-owner-v1"
    )


def _token() -> str:
    return _signer().dumps(
        {"email": _owner_email(), "role": "PLATFORM_OWNER", "issued_at": _stamp()}
    )


def owner_required(fn):
    @wraps(fn)
    def protected(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        raw = header[7:] if header.startswith("Bearer ") else ""
        try:
            identity = _signer().loads(raw, max_age=OWNER_SESSION_SECONDS)
        except (BadSignature, SignatureExpired):
            return jsonify({"error": "Platform owner sign-in is required."}), 401
        if (
            identity.get("role") != "PLATFORM_OWNER"
            or not secrets.compare_digest(
                str(identity.get("email", "")).lower(), _owner_email()
            )
        ):
            return jsonify({"error": "Platform owner access is required."}), 403
        g.platform_owner = identity
        return fn(*args, **kwargs)

    return protected


def _login_allowed(client: str) -> bool:
    threshold = _now() - timedelta(seconds=LOGIN_WINDOW_SECONDS)
    with _login_lock:
        recent = [item for item in _login_attempts.get(client, []) if item >= threshold]
        _login_attempts[client] = recent
        return len(recent) < LOGIN_ATTEMPT_LIMIT


def _record_failed_login(client: str) -> None:
    with _login_lock:
        _login_attempts.setdefault(client, []).append(_now())


def _clear_logins(client: str) -> None:
    with _login_lock:
        _login_attempts.pop(client, None)


def _safe_json(value: str) -> dict:
    try:
        parsed = json.loads(value or "{}")
        return parsed if isinstance(parsed, dict) else {}
    except (TypeError, json.JSONDecodeError):
        return {}


def _map_rows(rows, key: str) -> dict:
    return {str(row[key]): dict(row) for row in rows if row[key] is not None}


def _days_remaining(value: str | None) -> int:
    if not value:
        return 0
    try:
        end = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        return max(0, int((end - _now()).total_seconds() + 86399) // 86400)
    except ValueError:
        return 0


def _company_summaries(db) -> list[dict]:
    companies = db.execute(
        "SELECT id,tenant_email,display_name,status,created_at,updated_at "
        "FROM companies ORDER BY created_at DESC"
    ).fetchall()
    admins = _map_rows(
        db.execute(
            "SELECT company_id,email,account_json,updated_at FROM admin_accounts "
            "WHERE company_id IS NOT NULL"
        ).fetchall(),
        "company_id",
    )
    workspaces = _map_rows(
        db.execute(
            "SELECT company_id,updated_at,LENGTH(COALESCE(workspace_json,'')) AS workspace_bytes "
            "FROM tenant_workspaces WHERE company_id IS NOT NULL"
        ).fetchall(),
        "company_id",
    )
    employees = _map_rows(
        db.execute(
            """SELECT company_id,COUNT(*) AS employee_count,
            SUM(CASE WHEN workforce_role='WORKER' THEN 1 ELSE 0 END) AS worker_count,
            SUM(CASE WHEN workforce_role='STAFF' THEN 1 ELSE 0 END) AS staff_count,
            SUM(CASE WHEN workforce_role='TEMPORARY' THEN 1 ELSE 0 END) AS temporary_count,
            SUM(CASE WHEN workforce_role='ENTREPRENEUR' THEN 1 ELSE 0 END) AS entrepreneur_count,
            SUM(CASE WHEN status='ACTIVE' THEN 1 ELSE 0 END) AS active_employee_count,
            SUM(CASE WHEN COALESCE(profile_photo_data,'')<>'' THEN 1 ELSE 0 END) AS profile_photo_count,
            SUM(CASE WHEN profile_photo_data LIKE 'r2://%' THEN 1 ELSE 0 END) AS r2_profile_count,
            SUM(LENGTH(COALESCE(profile_json,''))+LENGTH(COALESCE(profile_photo_data,''))) AS employee_bytes,
            MAX(updated_at) AS last_employee_activity
            FROM employee_accounts WHERE company_id IS NOT NULL GROUP BY company_id"""
        ).fetchall(),
        "company_id",
    )
    shifts = _map_rows(
        db.execute(
            "SELECT company_id,COUNT(*) AS shift_count,MAX(check_in_at) AS last_shift_at "
            "FROM employee_shifts WHERE company_id IS NOT NULL GROUP BY company_id"
        ).fetchall(),
        "company_id",
    )
    events = _map_rows(
        db.execute(
            """SELECT company_id,COUNT(*) AS attendance_event_count,
            SUM(CASE WHEN COALESCE(face_capture_data,'')<>'' THEN 1 ELSE 0 END) AS attendance_photo_count,
            SUM(CASE WHEN face_capture_data LIKE 'r2://%' THEN 1 ELSE 0 END) AS r2_attendance_count,
            SUM(LENGTH(COALESCE(face_capture_data,''))) AS attendance_bytes,
            MAX(server_timestamp) AS last_attendance_at
            FROM employee_attendance_events WHERE company_id IS NOT NULL GROUP BY company_id"""
        ).fetchall(),
        "company_id",
    )
    subscriptions = _map_rows(
        db.execute(
            "SELECT * FROM company_subscriptions WHERE tenant_company_id IS NOT NULL"
        ).fetchall(),
        "tenant_company_id",
    )

    results = []
    for company_row in companies:
        company = dict(company_row)
        company_id = company["id"]
        admin = admins.get(company_id, {})
        account = _safe_json(admin.get("account_json", ""))
        workspace = workspaces.get(company_id, {})
        employee = employees.get(company_id, {})
        shift = shifts.get(company_id, {})
        event = events.get(company_id, {})
        subscription = subscriptions.get(company_id, {})
        database_bytes = sum(
            int(value or 0)
            for value in (
                workspace.get("workspace_bytes"),
                employee.get("employee_bytes"),
                event.get("attendance_bytes"),
            )
        )
        photo_count = int(employee.get("profile_photo_count") or 0) + int(
            event.get("attendance_photo_count") or 0
        )
        r2_photo_count = int(employee.get("r2_profile_count") or 0) + int(
            event.get("r2_attendance_count") or 0
        )
        last_activity = max(
            [
                str(value)
                for value in (
                    workspace.get("updated_at"),
                    employee.get("last_employee_activity"),
                    shift.get("last_shift_at"),
                    event.get("last_attendance_at"),
                )
                if value
            ],
            default=company.get("updated_at") or company.get("created_at"),
        )
        results.append(
            {
                "company_id": company_id,
                "company_name": account.get("company")
                or company.get("display_name")
                or company.get("tenant_email"),
                "owner_name": account.get("name") or "",
                "owner_email": company.get("tenant_email"),
                "status": str(company.get("status") or "ACTIVE").upper(),
                "created_at": company.get("created_at"),
                "last_activity_at": last_activity,
                "employee_count": int(employee.get("employee_count") or 0),
                "active_employee_count": int(
                    employee.get("active_employee_count") or 0
                ),
                "roles": {
                    "workers": int(employee.get("worker_count") or 0),
                    "staff": int(employee.get("staff_count") or 0),
                    "temporary": int(employee.get("temporary_count") or 0),
                    "entrepreneurs": int(employee.get("entrepreneur_count") or 0),
                },
                "shift_count": int(shift.get("shift_count") or 0),
                "attendance_event_count": int(
                    event.get("attendance_event_count") or 0
                ),
                "photo_count": photo_count,
                "r2_photo_count": r2_photo_count,
                "database_bytes_estimate": database_bytes,
                "plan_code": subscription.get("plan_code") or "NOT_STARTED",
                "subscription_status": str(
                    subscription.get("status") or "NOT_STARTED"
                ).upper(),
                "billing_cycle": subscription.get("billing_cycle") or "",
                "employee_limit": subscription.get("employee_limit"),
                "current_period_end": subscription.get("current_period_end"),
                "days_remaining": _days_remaining(
                    subscription.get("current_period_end")
                ),
            }
        )
    return results


def _owner_audit(db, action: str, company_id: str | None, details: dict) -> None:
    db.execute(
        """INSERT INTO platform_owner_audit_log(
        id,owner_email,action,company_id,details_json,created_at
        ) VALUES(?,?,?,?,?,?)""",
        (
            uuid4().hex,
            g.platform_owner["email"],
            action,
            company_id,
            json.dumps(details, ensure_ascii=False),
            _stamp(),
        ),
    )


@platform_owner.get("/platform-owner")
@platform_owner.get("/platform-owner/")
def owner_page():
    return send_from_directory(STATIC, "index.html")


@platform_owner.get("/platform-owner/<path:filename>")
def owner_asset(filename: str):
    return send_from_directory(STATIC, filename)


@platform_owner.get("/api/platform-owner/config")
def owner_config():
    return jsonify({"configured": _owner_configured()})


@platform_owner.post("/api/platform-owner/login")
def owner_login():
    if not _owner_configured():
        return jsonify(
            {
                "error": "Platform owner access is not configured on this server."
            }
        ), 503
    client = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
    client = client.split(",", 1)[0].strip()
    if not _login_allowed(client):
        return jsonify({"error": "Too many attempts. Try again later."}), 429
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")
    if not (
        secrets.compare_digest(email, _owner_email()) and _password_matches(password)
    ):
        _record_failed_login(client)
        return jsonify({"error": "Incorrect platform owner email or password."}), 401
    _clear_logins(client)
    return jsonify(
        {
            "ok": True,
            "access_token": _token(),
            "owner": {"email": _owner_email(), "role": "PLATFORM_OWNER"},
        }
    )


@platform_owner.get("/api/platform-owner/overview")
@owner_required
def owner_overview():
    db = connect()
    try:
        companies = _company_summaries(db)
        audit_rows = db.execute(
            "SELECT id,owner_email,action,company_id,details_json,created_at "
            "FROM platform_owner_audit_log ORDER BY created_at DESC LIMIT 30"
        ).fetchall()
    finally:
        db.close()
    total_employees = sum(item["employee_count"] for item in companies)
    total_photos = sum(item["photo_count"] for item in companies)
    total_database_bytes = sum(
        item["database_bytes_estimate"] for item in companies
    )
    return jsonify(
        {
            "companies": companies,
            "totals": {
                "companies": len(companies),
                "active_companies": sum(
                    item["status"] == "ACTIVE" for item in companies
                ),
                "suspended_companies": sum(
                    item["status"] == "SUSPENDED" for item in companies
                ),
                "employees": total_employees,
                "photos": total_photos,
                "r2_photos": sum(item["r2_photo_count"] for item in companies),
                "database_bytes_estimate": total_database_bytes,
            },
            "system": {
                "api": "ONLINE",
                "database": "POSTGRESQL" if database_url() else "SQLITE",
                "photo_storage": storage_mode(),
                "schema_version": 15,
            },
            "plans": PLAN_CATALOG,
            "audit": [
                {
                    **dict(row),
                    "details": _safe_json(row["details_json"]),
                }
                for row in audit_rows
            ],
        }
    )


@platform_owner.get("/api/platform-owner/companies/<company_id>")
@owner_required
def owner_company(company_id: str):
    db = connect()
    try:
        company = next(
            (
                item
                for item in _company_summaries(db)
                if item["company_id"] == company_id
            ),
            None,
        )
        audit = db.execute(
            "SELECT action,details_json,created_at FROM platform_owner_audit_log "
            "WHERE company_id=? ORDER BY created_at DESC LIMIT 50",
            (company_id,),
        ).fetchall()
    finally:
        db.close()
    if not company:
        return jsonify({"error": "Company not found."}), 404
    return jsonify(
        {
            "company": company,
            "audit": [
                {
                    "action": row["action"],
                    "details": _safe_json(row["details_json"]),
                    "created_at": row["created_at"],
                }
                for row in audit
            ],
        }
    )


@platform_owner.patch("/api/platform-owner/companies/<company_id>/status")
@owner_required
def owner_company_status(company_id: str):
    payload = request.get_json(silent=True) or {}
    status = str(payload.get("status") or "").upper()
    if status not in {"ACTIVE", "SUSPENDED"}:
        return jsonify({"error": "Status must be ACTIVE or SUSPENDED."}), 400
    with transaction() as db:
        company = db.execute(
            "SELECT tenant_email,status FROM companies WHERE id=?", (company_id,)
        ).fetchone()
        if not company:
            return jsonify({"error": "Company not found."}), 404
        previous = str(company["status"]).upper()
        db.execute(
            "UPDATE companies SET status=?,updated_at=? WHERE id=?",
            (status, _stamp(), company_id),
        )
        _owner_audit(
            db,
            "COMPANY_STATUS_CHANGED",
            company_id,
            {
                "from": previous,
                "to": status,
                "reason": str(payload.get("reason") or "").strip()[:500],
            },
        )
    return jsonify({"ok": True, "company_id": company_id, "status": status})


@platform_owner.patch("/api/platform-owner/companies/<company_id>/plan")
@owner_required
def owner_company_plan(company_id: str):
    payload = request.get_json(silent=True) or {}
    plan_code = str(payload.get("plan_code") or "").upper()
    catalog = {item["code"]: item for item in PLAN_CATALOG}
    if plan_code not in catalog:
        return jsonify({"error": "Choose a valid subscription plan."}), 400
    db = connect()
    try:
        company = db.execute(
            "SELECT tenant_email FROM companies WHERE id=?", (company_id,)
        ).fetchone()
    finally:
        db.close()
    if not company:
        return jsonify({"error": "Company not found."}), 404
    ensure_subscription(company["tenant_email"])
    default_limit = catalog[plan_code]["employee_limit"]
    requested_limit = payload.get("employee_limit")
    try:
        employee_limit = int(
            requested_limit if requested_limit not in (None, "") else default_limit
        )
    except (TypeError, ValueError):
        return jsonify({"error": "Enter a valid employee limit."}), 400
    if employee_limit < 1 or employee_limit > 1_000_000:
        return jsonify({"error": "Employee limit must be between 1 and 1,000,000."}), 400
    billing_cycle = str(payload.get("billing_cycle") or "MONTHLY").upper()
    if billing_cycle not in {"MONTHLY", "YEARLY", "CUSTOM"}:
        return jsonify({"error": "Choose a valid billing cycle."}), 400
    with transaction() as db:
        previous = db.execute(
            "SELECT plan_code,billing_cycle,employee_limit,status "
            "FROM company_subscriptions WHERE tenant_company_id=?",
            (company_id,),
        ).fetchone()
        db.execute(
            """UPDATE company_subscriptions SET
            plan_code=?,status='ACTIVE',billing_cycle=?,employee_limit=?,
            provider='MANUAL_OWNER',updated_at=? WHERE tenant_company_id=?""",
            (
                plan_code,
                billing_cycle,
                employee_limit,
                _stamp(),
                company_id,
            ),
        )
        _owner_audit(
            db,
            "COMPANY_PLAN_CHANGED",
            company_id,
            {
                "from": dict(previous) if previous else {},
                "to": {
                    "plan_code": plan_code,
                    "billing_cycle": billing_cycle,
                    "employee_limit": employee_limit,
                    "status": "ACTIVE",
                },
            },
        )
    return jsonify(
        {
            "ok": True,
            "company_id": company_id,
            "plan_code": plan_code,
            "billing_cycle": billing_cycle,
            "employee_limit": employee_limit,
        }
    )
