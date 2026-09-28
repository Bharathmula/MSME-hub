# MSME Multi Skill Planner — Architecture and Operations

This guide documents the real production structure of this repository. It is intentionally written so the project can be maintained without changing or deleting existing company data.

## 1. Project structure fundamentals

The application is a monorepo with clear runtime boundaries:

```text
MSME Hub Streamlit Project/
├── streamlit_app.py                 # Streamlit frontend host
├── backend/                         # Flask API, services and migrations
├── frontend/                        # Streamlit host and browser application
│   ├── index.html                   # Browser bundle order
│   ├── sections/                    # Role-specific dashboard sections
│   ├── employee-portal/             # Employee dashboard browser code
│   └── assets/                      # Versioned public visual assets
│   ├── authentication/              # Manager auth, workspace and subscription services
│   ├── employee_portal/             # Employee API, security and database access
│   └── migrations/                  # Append-only Neon/PostgreSQL schema history
├── tests/                           # Automated regression checks
├── scripts/                         # Safe development and release utilities
├── data/                            # Local-only SQLite/development state
├── render.yaml                      # Render service definition
├── requirements.txt                 # Python runtime dependencies
└── docs/                            # Architecture and operating procedures
```

### Core responsibilities

| Component | Runs where | Primary responsibility |
|---|---|---|
| Streamlit frontend | Streamlit Community Cloud | Serves the application interface and passes the public API URL into the browser. |
| Browser application | User's browser | Renders UI, validates interaction, sends authenticated HTTPS requests and displays responses. |
| Flask API | Render | Validates identity and company ownership, performs business rules and reads/writes persistent state. |
| Neon PostgreSQL | Neon | Permanently stores manager accounts, company workspaces, employees, attendance, sessions, subscriptions, backups and photo data handled by the API. |

The frontend never connects directly to Neon. Database credentials belong only in Render environment variables.

## 2. How the parts communicate

```text
Administrator / Employee
          │
          ▼
Streamlit browser interface
          │  HTTPS + JSON + access token
          ▼
Render Flask API
          │  parameterized database operations
          ▼
Neon PostgreSQL
```

### Request–response lifecycle

1. A user opens the Streamlit application.
2. `streamlit_app.py` bundles the files in `frontend/static/` and supplies `MSME_EMPLOYEE_API_URL` to the browser.
3. The user signs in or performs an action.
4. Browser JavaScript sends an HTTPS request to a defined API endpoint.
5. Flask validates the token, role and company identity.
6. The service reads or writes the company-scoped Neon records.
7. Flask returns a structured JSON response.
8. The browser refreshes only the affected interface.

Example:

```text
GET https://msme-hub-employee-api.onrender.com/api/employee/dashboard
Authorization: Bearer <employee-access-token>
```

No browser code may contain a Neon connection string, SMTP password, signing secret or database password.

## 3. Company and data isolation

Every persistent workspace is keyed by the authenticated manager/company identity. Employee access records are linked to their company and workforce profile. The application must preserve these rules:

- Never load one company's workspace into another company's session.
- Never replace a failed database response with demo records.
- Never mark a newly created employee present before an attendance event exists.
- Never edit a deployed migration file. Add a new numbered migration instead.
- Never delete a profile, attendance event, photo or login account as part of code cleanup.
- Backups and restore operations must stay company-scoped and authenticated.

The `data/` directory is for local development fallback only. Public persistence depends on Render using the correct Neon `DATABASE_URL`.

## 4. API ownership

### Authentication and company workspace

`backend/app.py` owns:

- `/api/auth/*` — CAPTCHA, registration, login, password reset and administrator updates.
- `/api/workspace` — company workspace load and save.
- `/api/subscription/*` — current subscription and plan catalogue.
- `/api/workspace/backups/*` — company backup listing and restoration.
- `/api/attendance.csv` — authenticated attendance export.
- `/api/health` — service and schema health.

### Employee portal

`backend/employee_portal/routes.py` owns:

- `/api/employee/login`, activation, logout and password reset.
- `/api/employee/dashboard` and profile updates.
- `/api/employee/attendance` and attendance detail.
- `/api/admin/employee-accounts` and category invitation links.
- `/api/admin/employee-attendance*` for administrator calendar/detail views.

## 5. Environment variables and security

| Variable | Location | Purpose |
|---|---|---|
| `DATABASE_URL` | Render only | Neon PostgreSQL connection string. |
| `MSME_SECRET_KEY` | Render only | Signs authentication and invitation tokens. |
| `MSME_ALLOWED_ORIGINS` | Render only | Allows the approved Streamlit origin through CORS. |
| `MSME_EMPLOYEE_API_URL` | Streamlit secret | Public Render API base URL. |
| `MSME_SMTP_*` | Render only | Optional email delivery configuration. |
| `MSME_GOOGLE_CLIENT_ID` | Render/public configuration | Google Identity web client ID; never a client secret. |

Rules:

- Keep real values out of Git.
- Use `.env.example` and `.streamlit/secrets.toml.example` only as templates.
- Rotate a secret immediately if it is pasted into source code or committed.
- CORS is a browser boundary, not authentication. Every protected endpoint must still validate its token and role.

## 6. Deployment and failure behavior

### Production services

| Service | Source | Responsibility |
|---|---|---|
| Streamlit | GitHub `main` → `streamlit_app.py` | Browser interface. |
| Render | GitHub `main` → `backend:app` | API and database operations. |
| Neon | `DATABASE_URL` used by Render | Permanent relational storage. |

### Failure scenarios

| Failure | Expected behavior | Action |
|---|---|---|
| Streamlit unavailable | UI cannot load; Neon data remains unchanged. | Check Streamlit logs/restart. |
| Render sleeping or unavailable | UI loads but API actions wait or display an error; no demo-data replacement. | Check `/api/health`, events and logs. |
| Neon unavailable | API refuses persistence operations and returns an error. | Check Neon status and `DATABASE_URL`; do not re-enter/delete data until connectivity is confirmed. |
| Wrong CORS origin | Browser blocks calls although API may be healthy. | Correct `MSME_ALLOWED_ORIGINS`. |
| Schema behind code | New endpoints may fail. | Deploy the latest commit and confirm `/api/health` reports the expected schema version. |

## 7. Safe Git and release process

Use a feature branch for non-trivial changes:

```powershell
git switch -c feature/short-description
```

Before committing:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-project.ps1
git status
git diff --check
```

Commit only source files relevant to the change:

```powershell
git add <specific-files>
git commit -m "Describe the verified change"
git push origin HEAD
```

After deployment:

1. Open the Streamlit welcome and login pages.
2. Check the Render `/api/health` endpoint.
3. Sign in to one test company.
4. Confirm its existing worker count before changing anything.
5. Create or edit one test record and refresh.
6. Confirm the record remains and no other company changed.
7. Check worker login and attendance details.

## 8. Repository cleanup without data loss

Safe to remove from Git tracking (while keeping local copies): virtual environments, `__pycache__`, `.pyc`, logs, build trackers and test caches. Never include `data/`, migrations or database tables in a cleanup command.

This repository already ignores those development artifacts. Because older commits tracked some of them, use a dedicated cleanup commit only after the application changes are committed:

```powershell
git rm -r --cached .venv __pycache__
git add .gitignore
git commit -m "Stop tracking local Python environment and cache files"
```

`git rm --cached` removes files from Git tracking but leaves the local files on the computer. Review `git status` before committing. Do not add `data/auth_accounts.json`, SQLite files, `.env`, real secrets or downloaded attendance exports.

## 9. Change checklist

- [ ] Existing Neon records were not manually updated or deleted.
- [ ] No migration already deployed was edited.
- [ ] Company identity is included in every persistent read/write path.
- [ ] Secrets remain outside Git.
- [ ] Static regression tests pass.
- [ ] Employee portal tests pass.
- [ ] JavaScript syntax checks pass.
- [ ] Render health is valid after deployment.
- [ ] One existing administrator and one employee can sign in.
- [ ] Existing attendance photos are still visible for their original dates.

## 10. Key rule

> Organize code by responsibility, isolate every company by authenticated identity, and treat Neon records as production data that code cleanup must never modify.

## 11. Reference headings and project answers

### How Frontend and Backend Communicate

The frontend renders the interface and sends authenticated HTTPS/JSON requests. The backend validates the request, applies business rules and accesses Neon. The browser never accesses database credentials or database tables directly.

### Project Structure Fundamentals

The code is separated into `frontend/`, `backend/`, `tests/`, `docs/` and `scripts/`. This makes UI code, server logic, schemas and verification easier to identify and prevents database operations from being mixed into browser code.

### Repositories and Cloud Deployment

This project uses one GitHub repository with separated frontend and backend directories. Streamlit deploys the frontend entry point, Render deploys `backend.app:app`, and both are versioned by the same commit.

### The Request–Response Lifecycle

A browser action becomes an HTTPS request to Render. Render authenticates the user and company, reads or writes Neon, and returns JSON. The frontend uses that response to update the displayed dashboard.

### Server Failure Scenarios

If Streamlit fails, the interface is unavailable but Neon data remains unchanged. If Render fails, API-backed actions cannot complete. If Neon fails, the backend must return an error and must not replace the workspace with demo or empty data.

### CORS and Environment Variables

CORS allows only the configured Streamlit origin to call Render from a browser. Environment variables hold `DATABASE_URL`, signing keys, SMTP configuration and allowed origins outside source control. CORS is not authentication; protected routes still validate tokens and roles.

### Git Branching Model

The repository contains the complete application. A branch is an isolated line of changes inside that repository. Feature branches allow development and verification before changes reach production `main`.

### System Architecture Cheat Sheet

```text
Frontend (Streamlit + browser JavaScript)
                  │ HTTPS / JSON
                  ▼
API layer (Render + Flask)
                  │ authenticated company-scoped queries
                  ▼
Backend storage (Neon PostgreSQL)
```

## 12. Technical interview questions and answers

**Q1: Where is the frontend application located?**  
It is in `frontend/app.py` and `frontend/static/`. The root `streamlit_app.py` is a compatibility entry point for Streamlit Community Cloud.

**Q2: Where is the backend application located?**  
It is in `backend/app.py`, with authentication services in `backend/authentication/`, employee services in `backend/employee_portal/`, and schemas in `backend/migrations/`.

**Q3: How do the frontend and backend communicate?**  
They communicate asynchronously through HTTPS API requests using JSON. `MSME_EMPLOYEE_API_URL` tells the browser which Render service to call.

**Q4: What happens to the frontend if the backend goes down?**  
The welcome/interface shell may still load, but login, workspace loading, employee access and database-backed actions display an error. Existing Neon records remain unchanged.

**Q5: Why use Git branches during development?**  
Branches isolate feature work, bug fixes and testing so unverified changes do not break the stable production branch.

**Q6: What is CORS and why is it necessary?**  
CORS is a browser security policy controlling which web origins may call the Render API. Render must explicitly allow the Streamlit application origin while still requiring authentication on protected endpoints.

