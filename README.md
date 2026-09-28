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

## What is stored

- Manager accounts with hashed passwords.
- Company-isolated workforce profiles, temporary workers, ex-employees and contractors.
- Attendance, manual corrections, deleted attendance, festivals and yearly holidays.
- Payroll source values, training records, recycle-bin items and dashboard settings.
- Employee access accounts, invitations, profile photos, shifts, face-capture attendance events and audit records.

Records persist until they are explicitly changed or deleted in the application. Each API request is restricted to the company identified by the signed manager session.

## VS Code maintenance

- `EDITING-GUIDE.md` maps every visible dashboard section, authentication flow and database component to its exact file.
- `static/COMPONENT-FILE-MAP.md` explains the browser load order and each JavaScript bundle.
- `DATABASE-SETUP.md` explains SQLite, Neon/PostgreSQL and Render configuration.
