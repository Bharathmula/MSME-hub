# MSME Hub Streamlit Project

This is a public-host-compatible Streamlit edition of the authoritative MSME project. The original HTML, CSS, JavaScript, navigation, forms, and calendar are bundled directly into the Streamlit page. It does not depend on a localhost iframe or a second server port.

## Run from the Desktop

1. Install Python 3.10 or newer if it is not already available as `py` or `python`.
2. Double-click `run-msme-hub.bat` to start the complete application.
3. Wait while the private `.runtime` environment is created and dependencies are installed on the first run.
4. Keep the single terminal window open and use only `http://localhost:8501`. The employee API starts automatically inside the Streamlit process.
5. Your browser opens at `http://localhost:8501`.
6. Create an administrator account by completing the CAPTCHA, then sign in.

Accounts and workspace data are stored privately in each visitor's browser. They persist when that visitor returns in the same browser, but they are not shared between devices. CAPTCHA prevents accidental or simple automated submissions, but it does not verify ownership of the entered email address.

## Manual command

```powershell
python -m venv .runtime
.\.runtime\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m streamlit run streamlit_app.py
```

## Public deployment on Streamlit Community Cloud

1. Upload this project to a GitHub repository.
2. Open `share.streamlit.io` and select **Create app**.
3. Choose the repository and branch.
4. Set the main file path to `streamlit_app.py`.
5. Deploy and share the generated public HTTPS link.

The original administrator dashboard can run using only Streamlit's exposed port. Administrator account creation, password reset, and email changes use CAPTCHA and browser-local storage; they do not require Supabase or Google OAuth. The separate employee login and attendance feature added below requires its Python API to be deployed once and its public URL added to Streamlit secrets. A public app cannot use `localhost` for that API.

The shareable link is shown under the app name in Streamlit Community Cloud. Copy that complete `https://...streamlit.app` address to share the project.

## Optional Clerk authentication

Clerk integration is prepared for administrator Workspace access. When it is configured, the login form shows **Continue with email, Google or phone**. The existing project-owned email/password login remains available as a fallback.

Add these values to `.streamlit/secrets.toml` locally and to **App settings → Secrets** in Streamlit Community Cloud:

```toml
CLERK_PUBLISHABLE_KEY="pk_test_replace_with_your_clerk_publishable_key"
CLERK_FRONTEND_API_URL="https://your-instance.clerk.accounts.dev"
```

Use the Publishable Key and Frontend API URL from the Clerk Dashboard API Keys page. Never put the Clerk Secret Key in browser JavaScript or commit it to GitHub.

In the Clerk Dashboard:

1. Enable email sign-up and sign-in.
2. Enable phone sign-up and sign-in if SMS authentication is required.
3. Enable Google under SSO connections.
4. Add the complete local and Streamlit public URLs to Clerk's allowed application/redirect URLs.

Restart Streamlit after changing secrets. The Clerk button stays hidden when either required value is missing, so an incomplete Clerk setup cannot break the normal login form.

## Side-panel components and debugging

Each side-panel section has a separate JavaScript component in `static/components/`:

- `overview.js`, `reminders.js`, `temporary-workers.js`
- `workers.js`, `staff.js`, `entrepreneurs.js`
- `worker-replacement.js`, `attendance-calendar.js`, `contractors.js`
- `ex-employees.js`, `recycle-bin.js`

The components preserve the existing renderers and data while adding isolated diagnostics. Open the browser developer console and use:

```javascript
MSMEDebug.status()          // current component, checks and recent errors
MSMEDebug.run('workers')    // diagnose one side-panel section
MSMEDebug.list()            // list every registered component
MSMEDebug.errors()          // captured JavaScript errors
MSMEDebug.help()            // command reminder
```

The rendered `#view-root` also receives `data-component` and `data-section-ready` attributes, making the active section easy to inspect in developer tools.

## Features migrated from MSME-BS

The Streamlit edition now includes the MSME-BS Payroll and Training sections while retaining its existing HTML/CSS/JavaScript dashboard and Streamlit host.

- **Payroll** calculates the selected month's pay from attendance. A monthly salary is prorated against 26 eight-hour workdays; a daily-rate profile is paid per present attendance record. The table can be exported as CSV.
- **Training** stores course, trainee, mentor, dates, level, progress, and notes. A skill at **High learning** or **Learned** is also added to that person's profile.
- Worker, Staff, Entrepreneur, and Temporary Worker profile forms include monthly salary, daily rate, and conditional father/mother death-anniversary fields.
- Overview settings can show or hide Entrepreneur and Contractor workforce cards.

Main VS Code files:

- `static/overview-payroll-and-training.js` — Overview, Payroll, Training, profile behavior and calculations.
- `static/payroll-training.css` — Payroll and Training visual styling.
- `static/components/payroll.js` and `static/components/training.js` — diagnostic component registrations.
- `static/COMPONENT-FILE-MAP.md` — full file-to-dashboard mapping and load order.

The MSME-BS browser-only selfie/PIN demo was intentionally not copied over the employee authentication system. MSME-BS does not perform genuine face matching or liveness detection; this edition retains its password-and-private-PIN employee portal until a real biometric provider is configured.

## Separate Worker, Staff, and Temporary Worker portal

The login page now includes **Worker / Staff employee login**. Every activated employee sees only their own identity, today's check-in/check-out state, automatically calculated work duration, and attendance history. The temporary verification method is password plus a private six-digit attendance PIN. No face image is collected or stored.

VS Code components:

- `employee_portal/routes.py` — employee login, activation, attendance, history, and administrator APIs.
- `employee_portal/database.py` — SQLite connection and transactions.
- `employee_portal/security.py` — signed sessions and role authorization.
- `employee_portal/biometrics.py` — provider boundary for later AWS Rekognition activation.
- `migrations/002_employee_portal.sql` — accounts, shifts, immutable events, and audit-log schema.
- `static/employee-portal/employee-portal.js` — employee and administrator interfaces.
- `static/employee-portal/employee-portal.css` — employee portal styling.

Run the complete local application in one PowerShell terminal:

```powershell
cd "C:\Users\mulab\OneDrive\Desktop\MSME Hub Streamlit Project"
.\.runtime\Scripts\Activate.ps1
python -m streamlit run streamlit_app.py
```

Open only `http://localhost:8501`. `streamlit_app.py` starts the employee API automatically; do not run `backend.py` separately for local use.

For public deployment, host `backend.py` on persistent Python hosting and add this Streamlit secret:

```toml
MSME_EMPLOYEE_API_URL="https://your-api-host.example.com"
```

The API host must define `MSME_SECRET_KEY`, `MSME_ALLOWED_ORIGINS` with the exact Streamlit URL, and `MSME_EMPLOYEE_DB` on persistent storage. Never add AWS keys, passwords, or PINs to GitHub. Later AWS integration replaces `employee_portal/biometrics.py`; attendance must fail closed unless liveness and identity both succeed.
