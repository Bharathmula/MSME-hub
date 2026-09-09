import os, sqlite3
from contextlib import contextmanager
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
def path(): return Path(os.environ.get('MSME_EMPLOYEE_DB',ROOT/'data'/'employee_portal.db')).resolve()
def connect():
    target=path();target.parent.mkdir(parents=True,exist_ok=True)
    db=sqlite3.connect(target,timeout=15,isolation_level=None);db.row_factory=sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON');db.execute('PRAGMA busy_timeout=15000');return db
def initialize():
    db=connect()
    try:
        db.executescript((ROOT/'migrations'/'002_employee_portal.sql').read_text(encoding='utf-8'))
        event_columns={row['name'] for row in db.execute('PRAGMA table_info(employee_attendance_events)').fetchall()}
        if 'face_capture_data' not in event_columns:
            db.execute('ALTER TABLE employee_attendance_events ADD COLUMN face_capture_data TEXT')
        account_columns={row['name'] for row in db.execute('PRAGMA table_info(employee_accounts)').fetchall()}
        if 'phone' not in account_columns:
            db.execute("ALTER TABLE employee_accounts ADD COLUMN phone TEXT NOT NULL DEFAULT ''")
        if 'profile_photo_data' not in account_columns:
            db.execute("ALTER TABLE employee_accounts ADD COLUMN profile_photo_data TEXT NOT NULL DEFAULT ''")
    finally: db.close()
@contextmanager
def transaction():
    db=connect()
    try: db.execute('BEGIN IMMEDIATE');yield db;db.commit()
    except Exception: db.rollback();raise
    finally: db.close()
