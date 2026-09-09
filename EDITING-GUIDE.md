# MSME Hub — section-by-section editing guide

This guide identifies the file to open in VS Code for every visible section and for authentication/data storage.

## Application hosting and database

| Feature | File to edit |
|---|---|
| Streamlit page hosting and automatic local API startup | `streamlit_app.py` |
| Python API routes | `backend.py` |
| Administrator account file reading/writing | `authentication/account_database.py` |
| Six-character CAPTCHA creation/verification | `authentication/captcha_service.py` |
| Stored administrator accounts | `data/auth_accounts.json` |
| Employee SQLite connection/transactions | `employee_portal/database.py` |
| Employee authentication/session security | `employee_portal/security.py` |
| Employee database schema | `migrations/002_employee_portal.sql` |
| Browser-local public-host authentication fallback | `static/public-adapter.js` |
| Optional Clerk email/Google/phone authentication | `static/clerk-authentication.js` |
| Clerk button appearance | `static/clerk-authentication.css` |
| Clerk Streamlit secret injection | `streamlit_app.py` |

Do not manually put a plain-text password in `data/auth_accounts.json`. Passwords must be created through the application so Werkzeug stores a secure hash.

## Authentication pages

| Visible feature | File to edit |
|---|---|
| Workspace login and Create Profile flow | `static/owned-authentication-login.js` |
| Login/Create Profile appearance | `static/owned-authentication.css` |
| Backend create-account/login/reset endpoints | `backend.py` |
| CAPTCHA backend | `authentication/captcha_service.py` |
| Account database | `authentication/account_database.py` |
| Worker/Staff login and activation | `static/employee-portal/employee-portal.js` |
| Worker/Staff login appearance | `static/employee-portal/employee-portal.css` |

## Overview dashboard

| Visible section | File to edit |
|---|---|
| Good morning/afternoon/evening/night heading | `static/sections/dashboard-greeting.js` |
| Overview workforce cards | `static/overview-payroll-and-training.js` — search `enhanceOverviewDashboard` |
| Attendance status and deadline overflow | `static/overview-payroll-and-training.js` — search `operations-overview` |
| Attendance Health | `static/overview-payroll-and-training.js` — search `attendance-health-role-dashboard` |
| Total attendance by workforce | `static/overview-payroll-and-training.js` — search `Total attendance by workforce` |
| Temporary Worker overflow | `static/overview-payroll-and-training.js` — search `temporary-overflow` |
| Contractor overflow | `static/overview-payroll-and-training.js` — search `contractor-overflow` |
| Estimated next-week absence risk | `static/overview-payroll-and-training.js` — search `absenceEstimatePanel` |
| Habitual leave records | `static/overview-payroll-and-training.js` — search `habitual-leave-panel` |
| Festival calendar | `static/attendance-and-calendar.js` — search `festivalCalendar` |

## Workforce dashboards

Manual attendance entry exists only in Attendance Calendar. Workforce dashboards are read-only calculated summaries.

| Dashboard | File to edit |
|---|---|
| Shared automatic table, attendance lookup and salary calculation | `static/sections/workforce-dashboard-shared.js` |
| Workers labels and record selection | `static/sections/workers-dashboard.js` |
| Staff labels and record selection | `static/sections/staff-dashboard.js` |
| Entrepreneur labels and record selection | `static/sections/entrepreneur-dashboard.js` |
| Temporary Workers labels and record selection | `static/sections/temporary-workers-dashboard.js` |
| Automatic table appearance | `static/automatic-workforce-dashboard.css` |

Displayed columns are Name, Phone No., Shift Timings, Check-in Time, Check-out Time, Face Captured, Total Time, Overtime, Total Salary and Monthly Salary.

## Remaining sidebar sections

| Section | Main implementation |
|---|---|
| Reminders | `static/overview-payroll-and-training.js` — search `reminder` |
| Employee Access | `static/employee-portal/employee-portal.js` — search `adminView` |
| Worker Replacement | `static/application-core-and-profiles.js` — search `coverage` |
| Attendance Calendar/manual attendance | `static/dashboard-attendance-controls.js` — search `attendanceCalendar` |
| Payroll | `static/overview-payroll-and-training.js` — search `payrollPage` |
| Training | `static/overview-payroll-and-training.js` — search `trainingPage` |
| Contractors | `static/attendance-and-calendar.js` — search `contractor` |
| Ex-employees | `static/application-core-and-profiles.js` — search `exemployees` |
| Recycle Bin | `static/overview-payroll-and-training.js` — search `recycle` |
| Profile forms | `static/application-core-and-profiles.js` and `static/overview-payroll-and-training.js` |

## Diagnostic component files

Every sidebar entry also has a small, readable diagnostic file under `static/components/`:

- `overview.js`
- `reminders.js`
- `temporary-workers.js`
- `workers.js`
- `staff.js`
- `entrepreneurs.js`
- `worker-replacement.js`
- `attendance-calendar.js`
- `payroll.js`
- `training.js`
- `contractors.js`
- `ex-employees.js`
- `recycle-bin.js`

These files validate the visible section. Shared diagnostic behavior is in `static/components/component-utils.js` and `static/components/runtime.js`.

## Main browser load order

`static/index.html` is the only file that loads CSS and JavaScript. Keep its script order unchanged. Later scripts intentionally refine behavior created by earlier scripts.
