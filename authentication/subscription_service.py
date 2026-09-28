"""Company-scoped subscription and 30-day trial management."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from employee_portal.database import connect, transaction

TRIAL_DAYS = 30
TRIAL_EMPLOYEE_LIMIT = 10
PLAN_CATALOG = [
    {"code": "PLUS", "name": "Plus", "monthly_price": 499, "annual_price": 4990, "employee_limit": 30},
    {"code": "PRO", "name": "Pro", "monthly_price": 999, "annual_price": 9990, "employee_limit": 100},
    {"code": "ULTRA", "name": "Ultra", "monthly_price": 1999, "annual_price": 19990, "employee_limit": 300},
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse(value: str) -> datetime:
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def ensure_subscription(company_id: str) -> dict:
    """Return the company subscription, creating its one-time trial if absent."""
    company_id = str(company_id or "").strip().lower()
    with transaction() as db:
        row = db.execute(
            "SELECT * FROM company_subscriptions WHERE company_id=?",
            (company_id,),
        ).fetchone()
        if not row:
            started = _now()
            ends = started + timedelta(days=TRIAL_DAYS)
            db.execute(
                """INSERT INTO company_subscriptions(
                       company_id, plan_code, status, billing_cycle,
                       trial_started_at, trial_ends_at, current_period_start,
                       current_period_end, employee_limit, created_at, updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    company_id, "TRIAL", "TRIALING", "TRIAL",
                    started.isoformat(), ends.isoformat(), started.isoformat(),
                    ends.isoformat(), TRIAL_EMPLOYEE_LIMIT,
                    started.isoformat(), started.isoformat(),
                ),
            )
            row = db.execute(
                "SELECT * FROM company_subscriptions WHERE company_id=?",
                (company_id,),
            ).fetchone()
    return subscription_summary(company_id, row)


def subscription_summary(company_id: str, row=None) -> dict:
    if row is None:
        db = connect()
        try:
            row = db.execute(
                "SELECT * FROM company_subscriptions WHERE company_id=?",
                (company_id,),
            ).fetchone()
        finally:
            db.close()
    now = _now()
    end = _parse(row["current_period_end"] or row["trial_ends_at"])
    status = str(row["status"]).upper()
    if status == "TRIALING" and now >= end:
        status = "EXPIRED"
        with transaction() as db:
            db.execute(
                "UPDATE company_subscriptions SET status='EXPIRED',updated_at=? WHERE company_id=?",
                (now.isoformat(), company_id),
            )
    db = connect()
    try:
        employee_count = db.execute(
            "SELECT COUNT(*) AS count FROM employee_accounts WHERE tenant_email=?",
            (company_id,),
        ).fetchone()["count"]
    finally:
        db.close()
    remaining_seconds = max(0, int((end - now).total_seconds()))
    days_remaining = (remaining_seconds + 86399) // 86400
    return {
        "company_id": company_id,
        "plan_code": row["plan_code"],
        "plan_name": "30-day Free Trial" if row["plan_code"] == "TRIAL" else str(row["plan_code"]).title(),
        "status": status.lower(),
        "trial_started_at": row["trial_started_at"],
        "trial_ends_at": row["trial_ends_at"],
        "current_period_end": row["current_period_end"],
        "days_remaining": days_remaining,
        "employee_limit": row["employee_limit"],
        "employee_count": employee_count,
        "read_only": status not in {"TRIALING", "ACTIVE"},
    }


def can_add_employee(company_id: str) -> tuple[bool, dict]:
    summary = ensure_subscription(company_id)
    allowed = not summary["read_only"] and summary["employee_count"] < summary["employee_limit"]
    return allowed, summary


def require_writable(company_id: str) -> tuple[bool, dict]:
    summary = ensure_subscription(company_id)
    return not summary["read_only"], summary


def rename_subscription(old_company_id: str, new_company_id: str) -> None:
    """Move billing ownership when an administrator changes login email."""
    old_company_id = str(old_company_id or "").strip().lower()
    new_company_id = str(new_company_id or "").strip().lower()
    if not old_company_id or not new_company_id or old_company_id == new_company_id:
        return
    with transaction() as db:
        existing = db.execute(
            "SELECT company_id FROM company_subscriptions WHERE company_id=?",
            (new_company_id,),
        ).fetchone()
        if not existing:
            db.execute(
                "UPDATE company_subscriptions SET company_id=?,updated_at=? WHERE company_id=?",
                (new_company_id, _now().isoformat(), old_company_id),
            )
