const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'rizvi_dreams.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============================================================
// USERS  (login accounts — role based: admin | director | employee)
// ============================================================
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_code TEXT UNIQUE,          -- login username, links to employees.employee_code
  name TEXT NOT NULL,
  password TEXT NOT NULL,             -- bcrypt hash
  role TEXT NOT NULL DEFAULT 'employee', -- 'admin' | 'director' | 'employee'
  must_change_password INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// ============================================================
// EMPLOYEES  (master data — imported from HR CSV export)
// ============================================================
db.exec(`
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_code TEXT UNIQUE NOT NULL,   -- e.g. "AF1 0001"
  punched_id TEXT,
  full_name TEXT NOT NULL,
  name_bn TEXT,
  join_date TEXT,
  department TEXT,
  category TEXT,
  section TEXT,
  sub_section TEXT,
  designation TEXT,
  job_location TEXT,
  status TEXT DEFAULT 'Active',         -- Active | Inactive | Terminated
  job_termination_type TEXT,
  termination_date TEXT,
  gross_salary REAL,
  phone TEXT,
  whatsapp TEXT,
  national_id TEXT,
  birth_certificate TEXT,
  bank_account TEXT,
  bank_account_no TEXT,
  routing_number TEXT,
  blood_group TEXT,
  gender TEXT,
  religion TEXT,
  job_type TEXT,
  birth_date TEXT,
  payment_mode TEXT,
  email TEXT,
  number_of_child INTEGER,
  nationality TEXT,
  weekend TEXT,
  payroll_type TEXT,
  grade TEXT,
  job_division TEXT,
  shift_name TEXT,
  transport_service TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(full_name);`);

// ============================================================
// ATTENDANCE
// ============================================================
db.exec(`
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  date TEXT NOT NULL,                   -- YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'present', -- present | absent | leave | holiday
  check_in TEXT,
  check_out TEXT,
  ot_hours REAL DEFAULT 0,
  remarks TEXT,
  marked_by INTEGER,                    -- users.id
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(employee_id, date),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
);
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);`);

// worked_hours = total net hours actually worked that day (general + OT), used for weekly 72hr signal.
try { db.exec(`ALTER TABLE attendance ADD COLUMN worked_hours REAL DEFAULT 0;`); } catch (e) { /* column already exists */ }

// GPS location tracking columns — self-service punch in/out from the employee's phone.
// Phone-number/GSM-based location is not possible without a telecom operator API, so this
// uses the device's own GPS (navigator.geolocation) instead — live when online, queued
// client-side and synced automatically once the connection returns.
try { db.exec(`ALTER TABLE attendance ADD COLUMN check_in_lat REAL;`); } catch (e) { /* exists */ }
try { db.exec(`ALTER TABLE attendance ADD COLUMN check_in_lng REAL;`); } catch (e) { /* exists */ }
try { db.exec(`ALTER TABLE attendance ADD COLUMN check_in_accuracy REAL;`); } catch (e) { /* exists */ }
try { db.exec(`ALTER TABLE attendance ADD COLUMN check_in_source TEXT;`); } catch (e) { /* exists: 'gps' | 'manual' | 'admin' */ }
try { db.exec(`ALTER TABLE attendance ADD COLUMN check_out_lat REAL;`); } catch (e) { /* exists */ }
try { db.exec(`ALTER TABLE attendance ADD COLUMN check_out_lng REAL;`); } catch (e) { /* exists */ }
try { db.exec(`ALTER TABLE attendance ADD COLUMN check_out_accuracy REAL;`); } catch (e) { /* exists */ }
try { db.exec(`ALTER TABLE attendance ADD COLUMN check_out_source TEXT;`); } catch (e) { /* exists */ }
try { db.exec(`ALTER TABLE attendance ADD COLUMN punched_offline INTEGER DEFAULT 0;`); } catch (e) { /* exists: 1 if synced late from an offline queue */ }

// ============================================================
// SALARY MASTER  (monthly salary sheet import — reconciled against attendance OT)
// ============================================================
db.exec(`
CREATE TABLE IF NOT EXISTS salary_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  month TEXT NOT NULL,                  -- 'YYYY-MM'
  basic REAL DEFAULT 0,
  gross_salary REAL DEFAULT 0,
  ot_hours REAL DEFAULT 0,              -- OT hours as per imported salary sheet
  ot_rate REAL DEFAULT 0,
  ot_amount REAL DEFAULT 0,
  other_allowance REAL DEFAULT 0,
  deductions REAL DEFAULT 0,
  net_payable REAL DEFAULT 0,
  source_file TEXT,
  imported_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(employee_id, month),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL
);
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_salary_month ON salary_master(month);`);

// ============================================================
// TRAINING RECORDS  (imported from scanned/PDF/Word/Excel training docs)
// ============================================================
db.exec(`
CREATE TABLE IF NOT EXISTS training_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  training_name TEXT NOT NULL,
  training_date TEXT,                   -- as imported, may be 'DD-Mon-YY' or ISO
  category TEXT,                         -- e.g. Fire Safety, Compliance, POSH, OHS, Machine Safety
  source_file TEXT,
  imported_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL
);
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_training_employee ON training_records(employee_id);`);

// ============================================================
// COMPLAINTS / SUGGESTIONS  (with optional voice / file attachment)
// ============================================================
db.exec(`
CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER,                  -- NULL allowed for anonymous submissions
  type TEXT NOT NULL DEFAULT 'complaint', -- complaint | suggestion
  subject TEXT NOT NULL,
  body TEXT,
  attachment_path TEXT,                 -- voice note / photo / document
  attachment_type TEXT,                 -- audio | image | document
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | in_review | resolved | rejected
  resolution_note TEXT,
  resolved_by INTEGER,
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);
`);

// ============================================================
// KPI DAILY CHECKLIST  (Yes / No / Partial — Partial requires a note)
// ============================================================
db.exec(`
CREATE TABLE IF NOT EXISTS checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  department TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
`);
// designation: when set, this task template applies to every employee holding that designation
// (so all Sr. Officers / Officers / Managers etc. in that role share the same daily task list).
// weight: relative weight of this task within the employee's 100-mark daily score (default equal split).
try { db.exec(`ALTER TABLE checklist_items ADD COLUMN designation TEXT;`); } catch (e) { /* exists */ }
try { db.exec(`ALTER TABLE checklist_items ADD COLUMN weight REAL DEFAULT 1;`); } catch (e) { /* exists */ }

db.exec(`
CREATE TABLE IF NOT EXISTS checklist_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  checklist_item_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  answer TEXT NOT NULL,                 -- yes | no | partial
  note TEXT,                            -- mandatory when answer = 'partial'
  submitted_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(employee_id, checklist_item_id, date),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (checklist_item_id) REFERENCES checklist_items(id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL
);
`);

// ============================================================
// POLICY DOCUMENTS
// ============================================================
db.exec(`
CREATE TABLE IF NOT EXISTS policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT,
  file_path TEXT NOT NULL,
  uploaded_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);
`);


// ============================================================
// RIZVI FOMS REAL-TIME OPERATIONAL SYNC STATE
// Stores the shared workflow/checklist/update snapshot used by the web command center.
// ============================================================
db.exec(`
CREATE TABLE IF NOT EXISTS rizvi_sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);
`);


// ============================================================
// AUDIT LOGS — immutable operational trace
// ============================================================
db.exec(`
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);`);

// Operational settings (approval windows, company controls, feature flags)
db.exec(`
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);
`);


// ============================================================
// ENTERPRISE OPERATIONAL CONTROL TABLES
// These tables are the normalized operational event layer. In production,
// migrate them to managed PostgreSQL; SQLite is retained for local/pilot use.
// ============================================================
db.exec(`
CREATE TABLE IF NOT EXISTS enterprise_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  module TEXT NOT NULL,
  employee_code TEXT,
  department TEXT,
  section TEXT,
  designation TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ent_events_module ON enterprise_events(module, created_at);
CREATE INDEX IF NOT EXISTS idx_ent_events_employee ON enterprise_events(employee_code, created_at);
CREATE INDEX IF NOT EXISTS idx_ent_events_status ON enterprise_events(status, created_at);

CREATE TABLE IF NOT EXISTS employee_responsibility_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_code TEXT NOT NULL UNIQUE,
  department TEXT,
  section TEXT,
  designation TEXT,
  reporting_to TEXT,
  job_responsibility TEXT,
  authority_level TEXT,
  approval_authority TEXT,
  kpi TEXT,
  required_competency TEXT,
  training_requirement TEXT,
  daily_responsibility TEXT,
  weekly_responsibility TEXT,
  monthly_responsibility TEXT,
  iso_responsibility TEXT,
  applicable_checklist TEXT,
  assigned_workflow TEXT,
  task_template TEXT,
  document_access TEXT,
  dashboard_access TEXT,
  permission_level TEXT,
  source TEXT DEFAULT 'configured-master',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_resp_designation ON employee_responsibility_profiles(designation);
`);

module.exports = db;
