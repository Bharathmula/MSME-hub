CREATE TABLE IF NOT EXISTS employee_login_sessions (
    id TEXT PRIMARY KEY,
    employee_account_id INTEGER NOT NULL REFERENCES employee_accounts(id) ON DELETE CASCADE,
    tenant_email TEXT NOT NULL,
    login_at TEXT NOT NULL,
    logout_at TEXT,
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_employee_login_sessions_account
ON employee_login_sessions(employee_account_id, login_at DESC);
