-- ============================
-- IMCS COMPLETE DATABASE SCHEMA
-- Multi-tenant Industrial Machinery Control System
-- ============================

PRAGMA foreign_keys = ON;

-- ---- COMPANIES (Multi-Tenancy) ----
CREATE TABLE companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ---- USERS (Authentication & Multi-Tenancy) ----
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    login_id TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('operator','maintenance','manager','admin')) NOT NULL,
    company_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id),
    UNIQUE(login_id, company_id)
);

-- ---- MACHINES (Equipment Fleet) ----
CREATE TABLE machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT NOT NULL,
    rated_capacity REAL,
    status TEXT CHECK(status IN ('running','idle','down','maintenance')) DEFAULT 'idle',
    last_seen TEXT,
    company_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(company_id) REFERENCES companies(id)
);

-- ---- SENSORS (Machine Sensors) ----
CREATE TABLE sensors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    min_threshold REAL,
    max_threshold REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(machine_id) REFERENCES machines(id)
);

-- ---- SENSOR READINGS (Time Series Data) ----
CREATE TABLE sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id INTEGER NOT NULL,
    value REAL NOT NULL,
    timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sensor_id) REFERENCES sensors(id)
);

-- ---- ALARMS (Alerts & Notifications) ----
CREATE TABLE alarms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL,
    severity TEXT CHECK(severity IN ('info','warning','critical')) NOT NULL,
    message TEXT NOT NULL,
    raised_at TEXT NOT NULL,
    acknowledged INTEGER DEFAULT 0,
    acknowledged_by TEXT,
    acknowledged_at TEXT,
    comment TEXT,
    company_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(machine_id) REFERENCES machines(id),
    FOREIGN KEY(company_id) REFERENCES companies(id)
);

-- ---- MAINTENANCE TASKS (Work Orders) ----
CREATE TABLE maintenance_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    priority TEXT CHECK(priority IN ('low','medium','high')) DEFAULT 'medium',
    technician TEXT,
    status TEXT CHECK(status IN ('open','in_progress','completed')) DEFAULT 'open',
    scheduled_date TEXT,
    completed_at TEXT,
    company_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(machine_id) REFERENCES machines(id),
    FOREIGN KEY(company_id) REFERENCES companies(id)
);

-- ---- AUDIT LOG (Compliance & Security) ----
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id INTEGER,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ---- INDEXES (Performance Optimization) ----
CREATE INDEX IF NOT EXISTS idx_users_login_id ON users(login_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_machines_company_id ON machines(company_id);
CREATE INDEX IF NOT EXISTS idx_sensors_machine_id ON sensors(machine_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_alarms_company_id ON alarms(company_id);
CREATE INDEX IF NOT EXISTS idx_alarms_machine_id ON alarms(machine_id);
CREATE INDEX IF NOT EXISTS idx_alarms_raised_at ON alarms(raised_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_company_id ON maintenance_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_machine_id ON maintenance_tasks(machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user);
