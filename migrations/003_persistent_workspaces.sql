CREATE TABLE IF NOT EXISTS admin_accounts (
    email TEXT PRIMARY KEY,
    account_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_workspaces (
    tenant_email TEXT PRIMARY KEY,
    workspace_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
