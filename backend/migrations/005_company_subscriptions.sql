CREATE TABLE IF NOT EXISTS company_subscriptions (
    company_id TEXT PRIMARY KEY,
    plan_code TEXT NOT NULL DEFAULT 'TRIAL',
    status TEXT NOT NULL DEFAULT 'TRIALING',
    billing_cycle TEXT NOT NULL DEFAULT 'TRIAL',
    provider TEXT,
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    trial_started_at TEXT NOT NULL,
    trial_ends_at TEXT NOT NULL,
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    employee_limit INTEGER NOT NULL DEFAULT 10,
    cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_status
    ON company_subscriptions(status, current_period_end);
