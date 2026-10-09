# MSME Hub Streamlit Project

This Streamlit edition preserves the custom HTML, CSS and JavaScript MSME dashboard. Streamlit is the single local host and starts the Python API inside the same process.

## Run locally

Double-click `run-msme-hub.bat`, or run:

```powershell
cd "C:\Users\mulab\OneDrive\Desktop\MSME Hub Streamlit Project"
python -m venv .runtime
.\.runtime\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m streamlit run streamlit_app.py
```

Open only `http://localhost:8501`. Do not start `backend.py` separately.

Local records are stored permanently in the existing `data/employee_portal.db`. Existing manager accounts from `data/auth_accounts.json` and existing browser workspace data are imported without deleting the source copies.

## Public deployment

The frontend is deployed from GitHub to Streamlit Community Cloud with main file `streamlit_app.py`. The employee/database API is deployed from the same GitHub repository to Render using `render.yaml`.

For reliable public persistence, set a Neon/PostgreSQL connection string as `DATABASE_URL` in Render. Then set this in Streamlit App Settings → Secrets:

```toml
MSME_EMPLOYEE_API_URL="https://your-render-service.onrender.com"
```

Never commit secrets. Exact database steps and table names are in `DATABASE-SETUP.md`.

## Platform owner dashboard

The SaaS control plane is served by the Render backend at `/platform-owner`. It is separate from every company administrator and employee dashboard. Configure `MSME_PLATFORM_OWNER_EMAIL` and `MSME_PLATFORM_OWNER_PASSWORD` as private Render environment variables before signing in.

The owner dashboard shows all company UUIDs, subscription status, employee totals, attendance activity, database estimates, private-photo counts and service health. Owner actions can activate or suspend a company and manually assign a plan until payment webhooks are connected. Every owner change is recorded in `platform_owner_audit_log`; suspending a company preserves its records and photos.

## What is stored

- Manager accounts with hashed passwords.
- Company-isolated workforce profiles, temporary workers, ex-employees and contractors.
- Attendance, manual corrections, deleted attendance, festivals and yearly holidays.
- Payroll source values, training records, recycle-bin items and dashboard settings.
- Employee access accounts, invitations, profile photos, shifts, face-capture attendance events and audit records.

## Private face-photo storage

Production face photos can be stored in a private Cloudflare R2 bucket. Set
`MSME_R2_ACCOUNT_ID`, `MSME_R2_ACCESS_KEY_ID`, `MSME_R2_SECRET_ACCESS_KEY` and
`MSME_R2_BUCKET_NAME` on Render. New attendance/profile photos are then uploaded
to R2, while Neon stores only an `r2://` object reference. The API generates a
short-lived signed URL when an authorized employee or administrator opens a
photo. Existing Base64 photos in Neon remain readable and are not migrated or
deleted automatically. Without all four variables, local/test behaviour safely
falls back to the existing database storage.

Records persist until they are explicitly changed or deleted in the application. Each company has an immutable UUID shared by its workspace, employee, attendance, login, audit and subscription rows. Signed sessions include this company UUID, and PostgreSQL ownership constraints prevent child attendance/session rows from being attached to another company. Administrator email changes preserve the same UUID and existing data.

## VS Code maintenance

- `EDITING-GUIDE.md` maps every visible dashboard section, authentication flow and database component to its exact file.
- `static/COMPONENT-FILE-MAP.md` explains the browser load order and each JavaScript bundle.
- `DATABASE-SETUP.md` explains SQLite, Neon/PostgreSQL and Render configuration.
