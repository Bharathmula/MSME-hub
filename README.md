# MSME Multi Skill Planner

A company-isolated workforce platform with administrator and employee portals, attendance, face captures, payroll inputs, training, reporting and persistent Neon/PostgreSQL storage.

## Architecture at a glance

| Layer | Location | Responsibility |
|---|---|---|
| Frontend shell | `streamlit_app.py` | Publishes the browser application on Streamlit Cloud and injects public runtime configuration. |
| Browser UI | `frontend/static/` | HTML, CSS and JavaScript for authentication, dashboards, profiles, attendance, payroll and settings. |
| Backend API | `backend/app.py` | Authentication, workspace persistence, subscriptions, backups and CSV export. |
| Employee API | `backend/employee_portal/` | Employee access, invitations, profiles, attendance and photo endpoints. |
| Authentication services | `backend/authentication/` | Accounts, CAPTCHA, subscriptions and company workspace storage. |
| Database schema | `backend/migrations/` | Versioned PostgreSQL/Neon database changes. Existing migrations must never be edited after deployment. |
| Verification | `tests/` and `scripts/` | Regression tests and safe pre-deployment checks. |

The repository remains a deliberate monorepo: the frontend and backend are separated by folders and API boundaries while sharing one Git deployment source. See [Architecture and Operations](docs/ARCHITECTURE-AND-OPERATIONS.md) for the full request lifecycle, security boundaries, deployment process and data-protection rules.

## Run locally

Double-click `run-msme-hub.bat`, or run:

```powershell
cd "C:\Users\mulab\OneDrive\Desktop\MSME Hub Streamlit Project"
python -m venv .runtime
.\.runtime\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m streamlit run streamlit_app.py
```

Open only `http://localhost:8501`. Do not start the backend separately; Streamlit starts `backend.app` for local use.

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
- `frontend/static/COMPONENT-FILE-MAP.md` explains the browser load order and each JavaScript bundle.
- `DATABASE-SETUP.md` explains SQLite, Neon/PostgreSQL and Render configuration.
- `docs/ARCHITECTURE-AND-OPERATIONS.md` explains how frontend, backend, Render and Neon communicate.
- Run `powershell -ExecutionPolicy Bypass -File scripts/verify-project.ps1` before every push.
