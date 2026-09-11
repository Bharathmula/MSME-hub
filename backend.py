"""MSME Multi Skill Planner - Python / Flask application."""
from __future__ import annotations

import json
import hashlib
import os
import re
import secrets
import smtplib
import threading
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path

from flask import Flask, abort, jsonify, request, send_from_directory
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash
from employee_portal import install as install_employee_portal
from employee_portal.security import token as access_token
from authentication.account_database import AccountDatabase
from authentication.captcha_service import CaptchaService

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
AUTH_FILE = DATA_DIR / "auth_accounts.json"
OTP_TTL_SECONDS = 10 * 60
OTP_RESEND_SECONDS = 45
OTP_STORE: dict[str, dict] = {}
OTP_LOCK = threading.Lock()
LEGACY_ADMIN_EMAIL="manager@msme.com"
LEGACY_ADMIN_PASSWORD="Manager@123"
captcha_service = CaptchaService()

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")

# Development settings: saved files in VS Code should appear immediately.
# Flask's reloader restarts Python when app.py changes, while these settings
# prevent the browser from reusing old HTML, CSS, or JavaScript files.
app.config.update(
    DEBUG=True,
    TEMPLATES_AUTO_RELOAD=True,
    SEND_FILE_MAX_AGE_DEFAULT=0,
    SECRET_KEY=os.environ.get("MSME_SECRET_KEY", "msme-local-development-key-change-me"),
)

token_signer = URLSafeTimedSerializer(app.config["SECRET_KEY"], salt="msme-email-verification")
install_employee_portal(app)


def normalize_email(value: str) -> str:
    return str(value or "").strip().lower()


def valid_email(value: str) -> bool:
    return bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value))


def load_auth_accounts() -> list[dict]:
    return AccountDatabase(AUTH_FILE).load()


def save_auth_accounts(accounts: list[dict]) -> None:
    AccountDatabase(AUTH_FILE).save(accounts)


def public_account(account: dict) -> dict:
    return {key: account.get(key) for key in ("name", "company", "phone", "email", "country", "email_updates", "provider")}


def otp_key(email: str, purpose: str) -> str:
    return f"{purpose}:{email}"


def smtp_configured() -> bool:
    return bool(os.environ.get("MSME_SMTP_HOST") and os.environ.get("MSME_SMTP_FROM"))


def send_otp_email(email: str, otp: str, purpose: str) -> None:
    actions = {
        "register": "create your MSME Planner account",
        "reset": "reset your MSME Planner password",
        "change_email": "change your MSME Planner administrator email",
    }
    action = actions.get(purpose, "verify your MSME Planner email")
    message = EmailMessage()
    message["Subject"] = "Your MSME Planner verification code"
    message["From"] = os.environ["MSME_SMTP_FROM"]
    message["To"] = email
    message.set_content(
        f"Your verification code is {otp}.\n\nUse it within 10 minutes to {action}. "
        "If you did not request this code, you can ignore this email."
    )
    host = os.environ["MSME_SMTP_HOST"]
    port = int(os.environ.get("MSME_SMTP_PORT", "587"))
    with smtplib.SMTP(host, port, timeout=20) as smtp:
        if os.environ.get("MSME_SMTP_TLS", "true").lower() not in {"0", "false", "no"}:
            smtp.starttls()
        username = os.environ.get("MSME_SMTP_USER")
        password = os.environ.get("MSME_SMTP_PASSWORD")
        if username and password:
            smtp.login(username, password)
        smtp.send_message(message)


def verification_payload(token: str, purpose: str, email: str) -> bool:
    try:
        payload = token_signer.loads(token, max_age=OTP_TTL_SECONDS)
    except (BadSignature, SignatureExpired):
        return False
    return payload.get("purpose") == purpose and payload.get("email") == email


def verify_captcha(payload: dict) -> bool:
    return captcha_service.verify(
        str(payload.get("captcha_id") or ""),
        str(payload.get("captcha_answer") or ""),
    )


@app.get("/api/auth/captcha")
def create_captcha():
    return jsonify(captcha_service.create())


@app.after_request
def disable_development_cache(response):
    """Never cache editable project assets while running locally."""
    if request.path == "/" or request.path.endswith((".html", ".css", ".js")):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    origin=request.headers.get('Origin','')
    allowed={x.strip() for x in os.environ.get('MSME_ALLOWED_ORIGINS','http://localhost:8501,http://localhost:5050').split(',')}
    if origin in allowed:
        response.headers['Access-Control-Allow-Origin']=origin;response.headers['Vary']='Origin'
        response.headers['Access-Control-Allow-Headers']='Authorization,Content-Type,Idempotency-Key'
        response.headers['Access-Control-Allow-Methods']='GET,POST,PATCH,DELETE,OPTIONS'
    return response


def safe_account_id(email: str) -> str:
    """Use only a safe filename derived from the entrepreneur email."""
    return re.sub(r"[^a-zA-Z0-9._-]", "_", email.strip().lower())[:120]


def account_file(email: str) -> Path:
    if not email or "@" not in email:
        abort(400, "A valid entrepreneur email is required.")
    return DATA_DIR / f"{safe_account_id(email)}.json"


def empty_workspace(email: str) -> dict:
    return {
        "account": {"email": email},
        "people": [],
        "temporary_workers": [],
        "ex_employees": [],
        "contractors": [],
        "attendance": [],
        "festival_calendar": [],
        "recycle_bin": [],
        "updated_at": None,
    }


@app.get("/")
def home():
    return send_from_directory(STATIC_DIR, "index.html")


@app.get("/api/health")
def health():
    """Render health check endpoint; it does not expose account information."""
    return jsonify({"ok": True, "service": "msme-employee-api"})


@app.get("/api/auth/config")
def auth_config():
    return jsonify({
        "google_client_id": os.environ.get("MSME_GOOGLE_CLIENT_ID", ""),
        "email_delivery": "smtp" if smtp_configured() else "development",
    })


@app.post("/api/auth/send-otp")
def send_otp():
    payload = request.get_json(silent=True) or {}
    email = normalize_email(payload.get("email"))
    purpose = payload.get("purpose")
    if not valid_email(email) or purpose not in {"register", "reset", "change_email"}:
        return jsonify({"error": "Enter a valid email and request type."}), 400
    accounts = load_auth_accounts()
    exists = any(item.get("email") == email for item in accounts)
    if purpose == "register" and exists:
        return jsonify({"error": "An account with this email already exists."}), 409
    if purpose == "reset" and not exists:
        return jsonify({"error": "No account was found for this email."}), 404
    if purpose == "change_email" and exists:
        return jsonify({"error": "An account with this email already exists."}), 409

    key = otp_key(email, purpose)
    now = datetime.now(timezone.utc)
    with OTP_LOCK:
        previous = OTP_STORE.get(key)
        if previous and now - previous["sent_at"] < timedelta(seconds=OTP_RESEND_SECONDS):
            return jsonify({"error": "Please wait 45 seconds before requesting another code."}), 429
        otp = f"{secrets.randbelow(1_000_000):06d}"
        OTP_STORE[key] = {
            "digest": hashlib.sha256(otp.encode()).hexdigest(),
            "sent_at": now,
            "expires_at": now + timedelta(seconds=OTP_TTL_SECONDS),
            "attempts": 0,
        }
    if smtp_configured():
        try:
            send_otp_email(email, otp, purpose)
        except (OSError, smtplib.SMTPException) as exc:
            app.logger.exception("Unable to send OTP email")
            with OTP_LOCK:
                OTP_STORE.pop(key, None)
            return jsonify({"error": f"Email could not be sent: {exc}"}), 502
        return jsonify({"ok": True, "message": "Verification code sent to your email.", "delivery": "smtp"})

    return jsonify({
        "ok": True,
        "message": "SMTP is not configured. Use the development code shown below.",
        "delivery": "development",
        "dev_otp": otp,
    })


@app.post("/api/auth/verify-otp")
def verify_otp():
    payload = request.get_json(silent=True) or {}
    email = normalize_email(payload.get("email"))
    purpose = payload.get("purpose")
    otp = str(payload.get("otp") or "").strip()
    key = otp_key(email, purpose)
    now = datetime.now(timezone.utc)
    with OTP_LOCK:
        record = OTP_STORE.get(key)
        if not record or now > record["expires_at"]:
            OTP_STORE.pop(key, None)
            return jsonify({"error": "The verification code has expired. Request a new code."}), 400
        record["attempts"] += 1
        if record["attempts"] > 5:
            OTP_STORE.pop(key, None)
            return jsonify({"error": "Too many incorrect attempts. Request a new code."}), 429
        if not secrets.compare_digest(record["digest"], hashlib.sha256(otp.encode()).hexdigest()):
            return jsonify({"error": "Incorrect verification code."}), 400
        OTP_STORE.pop(key, None)
    token = token_signer.dumps({"email": email, "purpose": purpose})
    return jsonify({"ok": True, "verification_token": token})


@app.post("/api/auth/register")
def register_account():
    payload = request.get_json(silent=True) or {}
    email = normalize_email(payload.get("email"))
    password = str(payload.get("password") or "")
    if not verify_captcha(payload):
        return jsonify({"error": "The CAPTCHA is incorrect or expired. Generate a new code."}), 403
    if len(password) < 8:
        return jsonify({"error": "Password must contain at least 8 characters."}), 400
    accounts = load_auth_accounts()
    if any(item.get("email") == email for item in accounts):
        return jsonify({"error": "An account with this email already exists."}), 409
    account = {
        "name": str(payload.get("name") or email.split("@")[0]).strip(),
        "company": str(payload.get("company") or "").strip(),
        "staff_count": str(payload.get("staff_count") or "").strip(),
        "business_category": str(payload.get("business_category") or "").strip(),
        "address": str(payload.get("address") or "").strip(),
        "role": str(payload.get("role") or "Owner").strip(),
        "email": email,
        "password_hash": generate_password_hash(password),
        "country": str(payload.get("country") or "India"),
        "email_updates": bool(payload.get("email_updates")),
        "provider": "email",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    accounts.append(account)
    save_auth_accounts(accounts)
    return jsonify({"ok": True, "account": public_account(account),"access_token":access_token(email,"ADMIN",email)})


@app.post("/api/auth/login")
def login_account():
    payload = request.get_json(silent=True) or {}
    email = normalize_email(payload.get("email"))
    password = str(payload.get("password") or "")
    account = next((item for item in load_auth_accounts() if item.get("email") == email), None)
    if not account and email==LEGACY_ADMIN_EMAIL and secrets.compare_digest(password,LEGACY_ADMIN_PASSWORD):
        account={"name":"MSME Manager","email":email,"country":"India","provider":"default","password_hash":generate_password_hash(password)}
    if not account or not account.get("password_hash") or not check_password_hash(account["password_hash"], password):
        return jsonify({"error": "Incorrect email or password."}), 401
    return jsonify({"ok": True, "account": public_account(account),"access_token":access_token(email,"ADMIN",email)})


@app.post("/api/auth/reset-password")
def reset_password():
    payload = request.get_json(silent=True) or {}
    email = normalize_email(payload.get("email"))
    password = str(payload.get("password") or "")
    if not verify_captcha(payload):
        return jsonify({"error": "The CAPTCHA is incorrect or expired. Generate a new code."}), 403
    if len(password) < 8:
        return jsonify({"error": "Password must contain at least 8 characters."}), 400
    accounts = load_auth_accounts()
    account = next((item for item in accounts if item.get("email") == email), None)
    if not account:
        return jsonify({"error": "No account was found for this email."}), 404
    account["password_hash"] = generate_password_hash(password)
    account["password_changed_at"] = datetime.now(timezone.utc).isoformat()
    save_auth_accounts(accounts)
    return jsonify({"ok": True})


@app.post("/api/auth/update-admin")
def update_admin_account():
    """Update administrator details; changing email always requires a verified OTP."""
    payload = request.get_json(silent=True) or {}
    current_email = normalize_email(payload.get("current_email"))
    new_email = normalize_email(payload.get("new_email"))
    current_password = str(payload.get("current_password") or "")
    new_password = str(payload.get("new_password") or "")
    token = str(payload.get("verification_token") or "")

    if not valid_email(current_email) or not valid_email(new_email):
        return jsonify({"error": "Enter valid current and new administrator email addresses."}), 400
    if new_password and len(new_password) < 8:
        return jsonify({"error": "The new password must contain at least 8 characters."}), 400
    if new_email != current_email and not verification_payload(token, "change_email", new_email):
        return jsonify({"error": "Verify the new email with its OTP before saving changes."}), 403

    accounts = load_auth_accounts()
    account = next((item for item in accounts if normalize_email(item.get("email")) == current_email), None)
    if account:
        if not account.get("password_hash") or not check_password_hash(account["password_hash"], current_password):
            return jsonify({"error": "Current password is incorrect."}), 401
    else:
        return jsonify({"error": "Current password is incorrect."}), 401

    duplicate = next((item for item in accounts if item is not account and normalize_email(item.get("email")) == new_email), None)
    if duplicate:
        return jsonify({"error": "Another account already uses the new email address."}), 409

    old_workspace = account_file(current_email)
    new_workspace = account_file(new_email)
    if new_email != current_email and old_workspace.exists() and not new_workspace.exists():
        old_workspace.replace(new_workspace)

    account.update({
        "name": str(payload.get("name") or account.get("name") or "MSME Manager").strip(),
        "phone": str(payload.get("phone") or account.get("phone") or "").strip(),
        "email": new_email,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    if new_password:
        account["password_hash"] = generate_password_hash(new_password)
        account["password_changed_at"] = datetime.now(timezone.utc).isoformat()
    save_auth_accounts(accounts)
    return jsonify({"ok": True, "account": public_account(account)})


@app.post("/api/auth/google")
def google_account():
    client_id = os.environ.get("MSME_GOOGLE_CLIENT_ID", "")
    if not client_id:
        return jsonify({"error": "Google sign-up is not configured on this server."}), 503
    credential = str((request.get_json(silent=True) or {}).get("credential") or "")
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        profile = id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)
        if not profile.get("email_verified"):
            raise ValueError("Google email is not verified")
    except (ImportError, ValueError) as exc:
        return jsonify({"error": f"Google sign-up could not be verified: {exc}"}), 401
    email = normalize_email(profile.get("email"))
    accounts = load_auth_accounts()
    account = next((item for item in accounts if item.get("email") == email), None)
    if not account:
        account = {
            "name": profile.get("name") or email.split("@")[0],
            "email": email,
            "country": "",
            "email_updates": False,
            "provider": "google",
            "google_subject": profile.get("sub"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        accounts.append(account)
        save_auth_accounts(accounts)
    return jsonify({"ok": True, "account": public_account(account)})


@app.get("/api/workspace")
def get_workspace():
    path = account_file(request.args.get("email", ""))
    if not path.exists():
        return jsonify(empty_workspace(request.args["email"]))
    return jsonify(json.loads(path.read_text(encoding="utf-8")))


@app.put("/api/workspace")
def put_workspace():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        abort(400, "Send a JSON workspace object.")
    account = payload.get("account") or {}
    email = account.get("email", "")
    path = account_file(email)
    stored = {
        "account": account,
        "people": payload.get("people", []),
        "temporary_workers": payload.get("temporary_workers", []),
        "ex_employees": payload.get("ex_employees", []),
        "contractors": payload.get("contractors", []),
        "attendance": payload.get("attendance", []),
        "festival_calendar": payload.get("festival_calendar", []),
        "recycle_bin": payload.get("recycle_bin", []),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    path.write_text(json.dumps(stored, ensure_ascii=False, indent=2), encoding="utf-8")
    return jsonify({"ok": True, "updated_at": stored["updated_at"]})


@app.get("/api/attendance.csv")
def attendance_csv():
    import csv
    import io
    from flask import Response

    path = account_file(request.args.get("email", ""))
    workspace = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Date", "Name", "Role", "Status", "Login", "Logout", "Work", "Half Time", "Overtime"])
    for day in workspace.get("attendance", []):
        for record in day.get("records", []):
            writer.writerow([day.get("date"), record.get("name"), record.get("role"), record.get("status"), record.get("login"), record.get("logout"), record.get("work"), record.get("half"), record.get("overtime")])
    return Response(buffer.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=msme-attendance-sheet.csv"})


if __name__ == "__main__":
    server_port = int(os.environ.get("MSME_PORT", "5050"))
    app.run(
        debug=True,
        use_reloader=True,
        host="127.0.0.1",
        port=server_port,
    )
