# MSME Hub — exact VS Code editing guide

`frontend/static/index.html` is the browser entry point. `streamlit_app.py` embeds that page and starts the Python API automatically for local use. On a public deployment, Streamlit calls the Render API configured in `MSME_EMPLOYEE_API_URL`.

## Login, accounts and database

| Visible feature or stored data | Exact file |
|---|---|
| Workspace sign-in, Create Profile and manager password reset | `frontend/static/owned-authentication-login.js` |
| Login page design | `frontend/static/owned-authentication.css` |
| Manager login/register/reset HTTP endpoints | `backend/app.py` |
| Manager accounts table access and old JSON import | `backend/authentication/account_database.py` |
| Six-character CAPTCHA | `backend/authentication/captcha_service.py` |
| Company workspace table access | `backend/authentication/workspace_database.py` |
| Browser-to-database automatic save/load | `frontend/static/workspace-database-sync.js` |
| SQLite/PostgreSQL connection and schema initialization | `backend/employee_portal/database.py` |
| Manager/workspace SQL tables | `backend/migrations/003_persistent_workspaces.sql` |
| Employee login, invitations, shifts and attendance API | `backend/employee_portal/routes.py` |
| Signed manager/employee sessions and role checks | `backend/employee_portal/security.py` |
| Employee SQL tables | `backend/migrations/002_employee_portal.sql` |
| Employee portal login/logout sessions | `backend/migrations/004_employee_login_sessions.sql` |
| Employee login/dashboard UI | `frontend/static/employee-portal/employee-portal.js` |
| Employee UI design | `frontend/static/employee-portal/employee-portal.css` |

Passwords are hashed and are never included in the company workspace JSON. Each database workspace is keyed by the signed-in manager's normalized email, so one company cannot request another company's data.

## Overview and sidebar sections

| Dashboard section | Exact file and useful search text |
|---|---|
| Good morning/afternoon/evening/night | `frontend/static/sections/dashboard-greeting.js` |
| Overview cards, date/time, attendance health, deadlines, habitual leave, absence estimate | `frontend/static/overview-payroll-and-training.js` — `enhanceOverviewDashboard` |
| Reminders | `frontend/static/overview-payroll-and-training.js` — `reminder` |
| Temporary Workers records and forms | `frontend/static/application-core-and-profiles.js` plus `frontend/static/sections/temporary-workers-dashboard.js` |
| Workers records and forms | `frontend/static/application-core-and-profiles.js` plus `frontend/static/sections/workers-dashboard.js` |
| Staff records and forms | `frontend/static/application-core-and-profiles.js` plus `frontend/static/sections/staff-dashboard.js` |
| Entrepreneur records and forms | `frontend/static/application-core-and-profiles.js` plus `frontend/static/sections/entrepreneur-dashboard.js` |
| Shared workforce attendance/salary table | `frontend/static/sections/workforce-dashboard-shared.js` |
| Worker Replacement | `frontend/static/application-core-and-profiles.js` — `coverage` |
| Individual monthly present/absent calendar and administrator photo viewer | `frontend/static/workforce-operations.js` — `openIndividualAttendanceCalendarV33` |
| Attendance Calendar and manual entry switch | `frontend/static/dashboard-attendance-controls.js` |
| Festival calendar and yearly holidays | `frontend/static/attendance-and-calendar.js` |
| Payroll and monthly salary editing | `frontend/static/overview-payroll-and-training.js` — `payrollPage` |
| Training | `frontend/static/overview-payroll-and-training.js` — `trainingPage` |
| Contractors and deadlines | `frontend/static/attendance-and-calendar.js` |
| Ex-employees | `frontend/static/application-core-and-profiles.js` — `exemployees` |
| Recycle Bin | `frontend/static/overview-payroll-and-training.js` — `recycle` |
| Employee Login Setup | `frontend/static/employee-portal/employee-portal.js` — `adminView` |
| Global search behavior | `frontend/static/overview-payroll-and-training.js` |

## Main JavaScript load order

1. `workspace-database-sync.js` installs persistent storage synchronization.
2. `application-core-and-profiles.js` creates shared state, navigation and profile forms.
3. `attendance-and-calendar.js` adds calendars, attendance and contractors.
4. `dashboard-attendance-controls.js` adds manual attendance controls and calculations.
5. `workforce-operations.js` adds overflow and workforce operations.
6. `account-notifications-and-forms.js` adds form validation and compatibility behavior.
7. `overview-payroll-and-training.js` supplies the final overview, payroll and training renderers.
8. `sections/*.js` supplies readable role-specific dashboard renderers.
9. `employee-portal/employee-portal.js` supplies employee access.
10. `owned-authentication-login.js` supplies the final visible login screen.

Later files intentionally extend earlier functions. Keep this order in `frontend/static/index.html`.

## CSS guide

- `styles.css`: shell, sidebar, top bar and common cards.
- `owned-authentication.css`: manager/employee entry page.
- `automatic-workforce-dashboard.css`: role attendance tables.
- `dashboard-final-theme-and-form-controls.css`: final form borders and dashboard theme.
- `dashboard-feature-extensions.css`: overview attendance/deadline panels.
- `payroll-training.css`: Payroll and Training.
- `employee-portal/employee-portal.css`: employee personal portal.
- Remaining CSS filenames directly describe the feature they adjust and are all referenced by `frontend/static/index.html`.
