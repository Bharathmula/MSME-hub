# MSME Hub — exact VS Code editing guide

`static/index.html` is the browser entry point. `streamlit_app.py` embeds that page and starts the Python API automatically for local use. On a public deployment, Streamlit calls the Render API configured in `MSME_EMPLOYEE_API_URL`.

## Login, accounts and database

| Visible feature or stored data | Exact file |
|---|---|
| Workspace sign-in, Create Profile and manager password reset | `static/owned-authentication-login.js` |
| Login page design | `static/owned-authentication.css` |
| Manager login/register/reset HTTP endpoints | `backend.py` |
| Manager accounts table access and old JSON import | `authentication/account_database.py` |
| Six-character CAPTCHA | `authentication/captcha_service.py` |
| Company workspace table access | `authentication/workspace_database.py` |
| Browser-to-database automatic save/load | `static/workspace-database-sync.js` |
| SQLite/PostgreSQL connection and schema initialization | `employee_portal/database.py` |
| Manager/workspace SQL tables | `migrations/003_persistent_workspaces.sql` |
| Employee login, invitations, shifts and attendance API | `employee_portal/routes.py` |
| Signed manager/employee sessions and role checks | `employee_portal/security.py` |
| Employee SQL tables | `migrations/002_employee_portal.sql` |
| Employee login/dashboard UI | `static/employee-portal/employee-portal.js` |
| Employee UI design | `static/employee-portal/employee-portal.css` |

Passwords are hashed and are never included in the company workspace JSON. Each database workspace is keyed by the signed-in manager's normalized email, so one company cannot request another company's data.

## Overview and sidebar sections

| Dashboard section | Exact file and useful search text |
|---|---|
| Good morning/afternoon/evening/night | `static/sections/dashboard-greeting.js` |
| Overview cards, date/time, attendance health, deadlines, habitual leave, absence estimate | `static/overview-payroll-and-training.js` — `enhanceOverviewDashboard` |
| Reminders | `static/overview-payroll-and-training.js` — `reminder` |
| Temporary Workers records and forms | `static/application-core-and-profiles.js` plus `static/sections/temporary-workers-dashboard.js` |
| Workers records and forms | `static/application-core-and-profiles.js` plus `static/sections/workers-dashboard.js` |
| Staff records and forms | `static/application-core-and-profiles.js` plus `static/sections/staff-dashboard.js` |
| Entrepreneur records and forms | `static/application-core-and-profiles.js` plus `static/sections/entrepreneur-dashboard.js` |
| Shared workforce attendance/salary table | `static/sections/workforce-dashboard-shared.js` |
| Worker Replacement | `static/application-core-and-profiles.js` — `coverage` |
| Attendance Calendar and manual entry switch | `static/dashboard-attendance-controls.js` |
| Festival calendar and yearly holidays | `static/attendance-and-calendar.js` |
| Payroll and monthly salary editing | `static/overview-payroll-and-training.js` — `payrollPage` |
| Training | `static/overview-payroll-and-training.js` — `trainingPage` |
| Contractors and deadlines | `static/attendance-and-calendar.js` |
| Ex-employees | `static/application-core-and-profiles.js` — `exemployees` |
| Recycle Bin | `static/overview-payroll-and-training.js` — `recycle` |
| Employee Login Setup | `static/employee-portal/employee-portal.js` — `adminView` |
| Global search behavior | `static/overview-payroll-and-training.js` |

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

Later files intentionally extend earlier functions. Keep this order in `static/index.html`.

## CSS guide

- `styles.css`: shell, sidebar, top bar and common cards.
- `owned-authentication.css`: manager/employee entry page.
- `automatic-workforce-dashboard.css`: role attendance tables.
- `dashboard-final-theme-and-form-controls.css`: final form borders and dashboard theme.
- `dashboard-feature-extensions.css`: overview attendance/deadline panels.
- `payroll-training.css`: Payroll and Training.
- `employee-portal/employee-portal.css`: employee personal portal.
- Remaining CSS filenames directly describe the feature they adjust and are all referenced by `static/index.html`.
