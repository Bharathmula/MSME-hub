# MSME Hub component file map

The former 32 numbered JavaScript files have been consolidated into seven clearly named bundles. `static/index.html` loads them in the order below. Preserve this order because later bundles extend functions defined by earlier bundles.

## Main application bundles

| File | Dashboard components and responsibilities |
|---|---|
| `application-core-and-profiles.js` | Application state, storage, navigation, Overview foundation, profile editors, accounts, Temporary Workers, festival data |
| `attendance-and-calendar.js` | Attendance times, reminders, calendar, exports, contractors, deadlines, yearly festivals, statistics, attendance history |
| `dashboard-attendance-controls.js` | Attendance Health, greeting/date labels, work-hour calculations, save/edit/delete/restore, role attendance tables and controls |
| `workforce-operations.js` | Worker/Staff/Entrepreneur overflow pages, Temporary Worker timing, resignation archive, calendar downloads, overtime controls |
| `account-notifications-and-forms.js` | Legacy account compatibility, login notifications, profile creation, bulk selection, form borders and date pickers |
| `overview-payroll-and-training.js` | Final Overview, attendance/deadline overflow, Attendance Health workforce summary, habitual leave, absence estimates, Payroll, Training, salary and parent-anniversary fields |
| `owned-authentication-login.js` | Current MSME-BS-style Workspace and Worker/Staff login, CAPTCHA registration, four-step onboarding and password reset |

Each bundle contains searchable comments such as `Source component: ...`. These preserve the original feature boundaries and make a specific section easy to find in VS Code.

## Supporting browser components

| Path | Responsibility |
|---|---|
| `components/runtime.js` | Component/debug registry |
| `components/component-utils.js` | Shared component registration helpers |
| `components/overview.js` | Overview diagnostics |
| `components/workers.js` | Workers diagnostics |
| `components/staff.js` | Staff diagnostics |
| `components/entrepreneurs.js` | Entrepreneur diagnostics |
| `components/temporary-workers.js` | Temporary Workers diagnostics |
| `components/attendance-calendar.js` | Attendance Calendar diagnostics |
| `components/payroll.js` | Payroll diagnostics |
| `components/training.js` | Training diagnostics |
| `components/contractors.js` | Contractors diagnostics |
| `components/reminders.js` | Reminders diagnostics |
| `components/worker-replacement.js` | Worker Replacement diagnostics |
| `components/ex-employees.js` | Ex-employees diagnostics |
| `components/recycle-bin.js` | Recycle Bin diagnostics |
| `employee-portal/employee-portal.js` | Employee activation, login, check-in/check-out and attendance history |

## Important styles

- `styles.css` — application shell and shared controls.
- `dashboard-final-theme-and-form-controls.css` — dashboard and form theme.
- `dashboard-feature-extensions.css` — Overview, attendance, deadline and habitual-leave styling.
- `payroll-training.css` — Payroll and Training styling.
- `owned-authentication.css` — current MSME-BS-style authentication page.
- Remaining descriptively named CSS files style their matching dashboard feature.

## Runtime flow

1. `streamlit_app.py` reads `static/index.html` and inlines every referenced local CSS and JavaScript file.
2. `public-adapter.js` provides browser-local authentication when no remote API URL is configured.
3. The seven main bundles load in the exact table order above.
4. Files in `components/` register diagnostics without replacing dashboard output.
5. `employee-portal/employee-portal.js` provides employee access.
6. `owned-authentication-login.js` renders the final visible login page.

Browser debugging commands:

```javascript
MSMEDebug.status()
MSMEDebug.list()
MSMEDebug.run('workers')
MSMEDebug.errors()
```
