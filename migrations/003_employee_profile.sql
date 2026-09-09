PRAGMA foreign_keys=ON;

-- Employee-owned profile photo. All other profile fields remain administrator-managed.
-- Columns are added conditionally by employee_portal/database.py for compatibility
-- with SQLite versions that do not support ADD COLUMN IF NOT EXISTS.

