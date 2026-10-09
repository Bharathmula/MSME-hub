# Permanent database setup

## Local use

No configuration is required. The one-command Streamlit app uses the existing SQLite database at `data/employee_portal.db`. Manager accounts, company workspace data, employee accounts, invitations, shifts, attendance events, face captures and audit records remain there until an authorized user deletes a record.

Existing `data/auth_accounts.json` accounts are imported automatically. Existing dashboard data in a manager's browser is uploaded automatically on the first login when no database workspace exists.

## Public Streamlit + Render use

Render's free web-service disk is temporary. Use a PostgreSQL database such as Neon for permanent public data:

1. Create a Neon PostgreSQL project and copy its pooled connection string.
2. In Render, open the `msme-hub-employee-api` service, then **Environment**.
3. Add `DATABASE_URL` and paste the Neon connection string as its value.
4. Confirm `MSME_ALLOWED_ORIGINS` is exactly `https://msme-app-ignv75tsx32ds4bqvsvsz3.streamlit.app`.
5. Confirm Streamlit Secrets contains the deployed Render URL:

```toml
MSME_EMPLOYEE_API_URL="https://your-render-service.onrender.com"
```

6. Redeploy Render and reboot the Streamlit app.

The Python service creates all tables automatically. Never commit `DATABASE_URL`, database passwords, `MSME_SECRET_KEY`, or Streamlit secrets to GitHub.

## Company isolation and safe upgrades

Every company now has an immutable UUID in `companies`. Administrator email is still used for sign-in and backwards compatibility, but it is no longer the permanent ownership key. Workspaces, employees, shifts, attendance events, login sessions, audit events and subscriptions all carry the same company UUID.

On the first start after this upgrade the service performs an additive migration:

- creates the `companies` registry;
- adds company ownership columns without dropping or replacing existing columns;
- backfills existing rows using their current tenant email and employee relationships;
- adds indexes and PostgreSQL foreign-key protections for new writes;
- keeps the same UUID when an administrator changes email.

The migration does not delete employees, workspaces, attendance, subscriptions, photo references or audit history. Take a Neon snapshot/backup before every production deployment as an additional operational safeguard.

## Tables

- `admin_accounts`: hashed manager account records.
- `companies`: permanent company UUID and current administrator/tenant email.
- `tenant_workspaces`: manager-entered dashboard collections, one row per company/admin email.
- `employee_accounts`: Worker, Staff and Temporary Worker access.
- `employee_shifts`: check-in, check-out and calculated worked minutes.
- `employee_attendance_events`: immutable face-capture attendance events.
- `employee_login_sessions`: permanent employee portal login/logout history.
- `employee_audit_log`: security and account-action audit history.
- `company_subscriptions`: plan, trial and billing-provider state linked to the company UUID.

Inside each `tenant_workspaces.workspace_json`, `storage` contains people, ex-employees, temporary workers, festivals, festival years, attendance, deleted attendance, contractors, recycle bin, training and dashboard visibility settings.
