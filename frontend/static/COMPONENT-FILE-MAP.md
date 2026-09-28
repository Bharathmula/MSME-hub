# Browser component map

The project no longer contains the old numbered files, Clerk remnants, legacy dashboard copy, or diagnostic-only `components/` scripts. Active browser code is grouped by responsibility.

| File | Responsibility |
|---|---|
| `index.html` | CSS/JavaScript manifest and application markup |
| `workspace-database-sync.js` | Loads and saves company data through `/api/workspace` |
| `application-core-and-profiles.js` | State, navigation, workforce profiles, forms and basic sections |
| `attendance-and-calendar.js` | Attendance records, calendars, festivals and contractors |
| `dashboard-attendance-controls.js` | Manual/automatic attendance controls and work-time calculations |
| `workforce-operations.js` | Overflow views, replacement operations and exports |
| `account-notifications-and-forms.js` | Form enhancements, validation and notifications |
| `overview-payroll-and-training.js` | Final Overview, Payroll, Training, search and account controls |
| `sections/workforce-dashboard-shared.js` | Shared read-only workforce attendance table |
| `sections/workers-dashboard.js` | Worker dashboard configuration |
| `sections/staff-dashboard.js` | Staff dashboard configuration |
| `sections/entrepreneur-dashboard.js` | Entrepreneur dashboard configuration |
| `sections/temporary-workers-dashboard.js` | Temporary Worker dashboard configuration |
| `sections/dashboard-greeting.js` | Time-based greeting |
| `employee-portal/employee-portal.js` | Employee activation, sign-in, attendance and admin access setup |
| `owned-authentication-login.js` | Final login/create-account experience |
| `public-adapter.js` | Sends API calls to the configured public backend |

For the complete visible-section and database map, open root `EDITING-GUIDE.md`.
