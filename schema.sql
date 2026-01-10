-- ============================
-- IMCS PHASE-1 DATABASE
-- ============================

PRAGMA foreign_keys = ON;

-- ---- USERS ----
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    role TEXT CHECK(role IN ('operator','maintenance','manager','admin')) NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ---- MACHINES ----
CREATE TABLE machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT NOT NULL,
    rated_capacity REAL,
    status TEXT CHECK(status IN ('running','idle','down','maintenance')) DEFAULT 'idle',
    last_seen TEXT
);

-- ---- SENSORS ----
CREATE TABLE sensors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    min_threshold REAL,
    max_threshold REAL,
    FOREIGN KEY(machine_id) REFERENCES machines(id)
);

-- ---- SENSOR READINGS ----
CREATE TABLE sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id INTEGER NOT NULL,
    value REAL NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(sensor_id) REFERENCES sensors(id)
);

-- ---- ALARMS ----
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
    FOREIGN KEY(machine_id) REFERENCES machines(id)
);

-- ---- MAINTENANCE TASKS ----
CREATE TABLE maintenance_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    priority TEXT CHECK(priority IN ('low','medium','high')) DEFAULT 'medium',
    technician TEXT,
    status TEXT CHECK(status IN ('open','in_progress','completed')) DEFAULT 'open',
    scheduled_date TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(machine_id) REFERENCES machines(id)
);

-- ---- AUDIT LOG ----
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id INTEGER,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);
