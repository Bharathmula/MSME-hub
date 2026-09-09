PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS employee_accounts(
 id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_email TEXT NOT NULL, employee_id TEXT NOT NULL,
 name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, workforce_role TEXT NOT NULL CHECK(workforce_role IN('WORKER','STAFF','TEMPORARY')),
 password_hash TEXT, pin_hash TEXT, status TEXT NOT NULL DEFAULT 'INVITED' CHECK(status IN('INVITED','ACTIVE','SUSPENDED')),
 invite_hash TEXT, invite_expires_at TEXT, biometric_status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(tenant_email,employee_id));
CREATE TABLE IF NOT EXISTS employee_shifts(
 id TEXT PRIMARY KEY, employee_account_id INTEGER NOT NULL REFERENCES employee_accounts(id), work_date TEXT NOT NULL,
 check_in_at TEXT NOT NULL, check_out_at TEXT, worked_minutes INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'OPEN',
 UNIQUE(employee_account_id,work_date));
CREATE TABLE IF NOT EXISTS employee_attendance_events(
 id TEXT PRIMARY KEY, employee_account_id INTEGER NOT NULL REFERENCES employee_accounts(id), shift_id TEXT NOT NULL REFERENCES employee_shifts(id),
 event_type TEXT NOT NULL CHECK(event_type IN('CHECK_IN','CHECK_OUT')), server_timestamp TEXT NOT NULL,
 verification_method TEXT NOT NULL, idempotency_key TEXT NOT NULL, device_identifier TEXT NOT NULL,
 face_capture_data TEXT,
 UNIQUE(employee_account_id,idempotency_key));
CREATE TABLE IF NOT EXISTS employee_audit_log(
 id TEXT PRIMARY KEY, actor_email TEXT NOT NULL, actor_role TEXT NOT NULL, action TEXT NOT NULL,
 entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, details_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_employee_events_time ON employee_attendance_events(server_timestamp DESC);
