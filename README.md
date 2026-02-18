# IMCS — Industrial Machinery Control System
### Complete Developer Reference Guide

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Backend — `app.py`](#5-backend--apppy)
6. [Visualization Engine — `visualization.py`](#6-visualization-engine--visualizationpy)
7. [Demo Data Generator — `demo_data.py`](#7-demo-data-generator--demo_datapy)
8. [Frontend — HTML Templates](#8-frontend--html-templates)
9. [Frontend — JavaScript Files](#9-frontend--javascript-files)
10. [Frontend — CSS Stylesheets](#10-frontend--css-stylesheets)
11. [API Reference](#11-api-reference)
12. [Data Flow Diagram](#12-data-flow-diagram)
13. [How to Run the Project](#13-how-to-run-the-project)
14. [Key Design Decisions](#14-key-design-decisions)

---

## 1. Project Overview

IMCS is a **multi-tenant, web-based Industrial Machinery Control System** built with Python (Flask) on the backend and vanilla HTML/CSS/JavaScript on the frontend.

It allows multiple companies (tenants) to:
- Register and monitor industrial machines
- Track sensor readings (temperature, pressure, vibration, speed, etc.)
- View real-time KPI dashboards with interactive charts
- Manage and acknowledge alerts/alarms
- Create and track maintenance work orders
- Upload and visualize custom CSV datasets
- Generate and clear demo data for testing

The UI is styled in a **retro SAP / Windows 95–98 aesthetic** (beveled borders, classic grey tones, inset/outset effects) combined with modern Chart.js visualizations.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend | Python 3 + Flask | Web server, REST API, session management |
| Database | SQLite (`imcs.db`) | Persistent storage for all data |
| ORM/Query | `sqlite3` (raw SQL) | Direct SQL queries with `Row` factory |
| Charts (server) | Matplotlib + NumPy | Server-rendered PNG chart images |
| Charts (client) | Chart.js (CDN) | Interactive browser-side charts |
| Data Processing | Pandas | CSV parsing and analysis |
| Auth | Werkzeug | Password hashing (`generate_password_hash`, `check_password_hash`) |
| Frontend | HTML5 + Vanilla CSS + Vanilla JS | No framework — pure browser APIs |
| PWA | Service Worker (`sw.js`) | Offline caching support |
| Deployment | Procfile (Gunicorn-ready) | Heroku / any WSGI host |

**Python dependencies** (`requirements.txt`):
```
Flask==3.0.0
flask-cors==4.0.0
matplotlib==3.8.2
numpy==1.26.2
pandas==2.1.4
Werkzeug==3.0.1
```

---

## 3. Project Structure

```
priject lj/
│
├── app.py                  ← Main Flask application (all routes + API)
├── visualization.py        ← Server-side chart generation (Matplotlib)
├── demo_data.py            ← Demo data generator (machines, sensors, alerts)
├── schema.sql              ← Full SQLite database schema
├── migrate_auth.py         ← One-time migration script for auth tables
├── server.py               ← Minimal server entry point (alternative to app.py)
├── imcs.db                 ← SQLite database file (auto-created)
├── requirements.txt        ← Python dependencies
├── Procfile                ← Deployment config (Gunicorn)
│
├── templates/              ← Jinja2 HTML templates (served by Flask)
│   ├── login.html          ← Login page
│   ├── register.html       ← Registration page
│   ├── dashboard.html      ← Main dashboard (KPIs, charts, CSV upload)
│   ├── machinery-overview.html  ← List of all machines
│   ├── machine-details.html     ← Single machine deep-dive
│   ├── alerts.html         ← Alerts management
│   ├── maintenance.html    ← Maintenance task management
│   ├── reports.html        ← Reports + data export
│   └── help.html           ← Help / documentation page
│
├── static/
│   ├── css/
│   │   ├── sap90.css       ← Main stylesheet (90s SAP aesthetic)
│   │   └── theme.css       ← Theme token definitions (light/dark/signature)
│   ├── js/
│   │   ├── app.js                      ← Global: sidebar, theme, nav search
│   │   ├── dashboard-main.js           ← Dashboard controller (charts, KPIs, CSV)
│   │   ├── dashboard-viz-integration.js ← Connects dashboard to VizManager
│   │   ├── alerts.js                   ← Alerts page logic
│   │   ├── machine.js                  ← Single machine detail page logic
│   │   ├── machinery.js                ← Machine list + add machine modal
│   │   ├── maintenance.js              ← Maintenance task list + create task
│   │   ├── reports-enhanced.js         ← Reports: editable tables, charts, export
│   │   ├── reports.js                  ← Minimal reports bootstrap
│   │   ├── charts.js                   ← Chart utility functions
│   │   ├── charts-enhanced.js          ← Enhanced chart configurations
│   │   ├── chart-sync.js               ← Chart synchronization utilities
│   │   ├── viz-manager.js              ← Visualization manager (VizManager)
│   │   ├── csv-viz.js                  ← CSV visualization utilities
│   │   ├── dataset-manager.js          ← Client-side dataset management (IndexedDB)
│   │   ├── dashboard-enhanced.js       ← Additional dashboard enhancements
│   │   ├── dashboard.js                ← Legacy dashboard (superseded by main)
│   │   ├── lazy.js                     ← Lazy loading utilities
│   │   └── tabs.js                     ← Tab switching utility
│   ├── icons/              ← SVG icon assets
│   ├── img/                ← Image assets
│   └── sw.js               ← Service Worker (PWA offline caching)
│
└── data/
    └── uploads/            ← Uploaded CSV files + JSON cache files
```

---

## 4. Database Schema

Defined in `schema.sql`. The database is **multi-tenant** — every table that stores business data has a `company_id` column, so each company only ever sees its own data.

### Tables

#### `companies` — Multi-Tenancy Root
```sql
id, name (UNIQUE), created_at
```
Every user and every machine belongs to a company. When a new user registers with a company name that doesn't exist yet, a new company row is automatically created.

#### `users` — Authentication
```sql
id, username, login_id, password_hash, role, company_id, created_at
UNIQUE(login_id, company_id)
```
- `login_id` is the user's login identifier (unique per company, not globally).
- `password_hash` is stored using Werkzeug's `generate_password_hash` (PBKDF2-SHA256).
- `role` can be: `operator`, `maintenance`, `manager`, or `admin`.

#### `machines` — Equipment Fleet
```sql
id, name, type, location, rated_capacity, status, last_seen, company_id, created_at
```
- `status` can be: `running`, `idle`, `down`, or `maintenance`.
- `rated_capacity` is the machine's maximum rated output.

#### `sensors` — Machine Sensors
```sql
id, machine_id, name, unit, min_threshold, max_threshold, created_at
```
Each machine can have multiple sensors (e.g., Temperature, Pressure, Vibration). Thresholds define the acceptable operating range.

#### `sensor_readings` — Time Series Data
```sql
id, sensor_id, value, timestamp, created_at
```
This is the largest table — it stores every sensor reading. Indexed on `sensor_id` and `timestamp` for fast time-range queries.

#### `alarms` — Alerts & Notifications
```sql
id, machine_id, severity, message, raised_at, acknowledged, acknowledged_by, acknowledged_at, comment, company_id
```
- `severity` can be: `info`, `warning`, or `critical`.
- `acknowledged` is `0` (unacknowledged) or `1` (acknowledged).

#### `maintenance_tasks` — Work Orders
```sql
id, machine_id, description, priority, technician, status, scheduled_date, completed_at, company_id
```
- `priority` can be: `low`, `medium`, or `high`.
- `status` can be: `open`, `in_progress`, or `completed`.

#### `audit_log` — Compliance & Security
```sql
id, user, action, entity, entity_id, timestamp
```
Every create/update/delete/login action is logged here via the `log()` helper function in `app.py`.

### Performance Indexes
The schema creates indexes on all foreign keys and frequently-queried columns (e.g., `timestamp`, `company_id`, `status`) to ensure fast queries even with large datasets.

---

## 5. Backend — `app.py`

This is the **heart of the application**. It is a single Flask file (~1840 lines) that handles everything: authentication, page rendering, REST API, chart generation, CSV upload, and demo data management.

### Application Setup (Lines 1–32)
```python
app = Flask(__name__, template_folder="templates", static_folder="static")
app.config['UPLOAD_FOLDER'] = 'data/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key...')
```
- Flask is configured to serve templates from `templates/` and static files from `static/`.
- The upload folder is created automatically with `os.makedirs(..., exist_ok=True)`.

### Database Helper (Lines 34–45)
```python
def db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row  # Rows behave like dicts
    return conn

def log(user, action, entity, entity_id=None):
    # Inserts a row into audit_log
```
- `db()` returns a connection where rows can be accessed by column name (e.g., `row['name']`).
- `log()` is called after every write operation to maintain an audit trail.

### Authentication (Lines 47–200)

#### `login_required` decorator
```python
def login_required(f):
    # Checks session for 'user_id' and 'company_id'
    # Redirects to /login for page routes, returns 401 JSON for API routes
```
This decorator wraps every protected route. It checks `session['user_id']` and `session['company_id']`. If missing, page routes redirect to `/login`; API routes return `{"error": "Authentication required"}` with HTTP 401.

#### `POST /api/auth/login`
1. Receives `company_name`, `login_id`, `password` as JSON.
2. Looks up the company by name (case-insensitive).
3. Looks up the user by `login_id` + `company_id`.
4. Verifies the password with `check_password_hash`.
5. On success, stores `user_id`, `username`, `company_id`, `role`, `login_id` in the Flask session.
6. Logs the login action to `audit_log`.

#### `POST /api/auth/register`
1. Receives `company_name`, `login_id`, `username`, `password`, `role`.
2. If the company doesn't exist, creates it automatically.
3. Checks for duplicate `login_id` within the company.
4. Hashes the password and inserts the user.

### Page Routes (Lines 202–246)
These routes simply render HTML templates. All are protected by `@login_required`.

| Route | Template | Description |
|---|---|---|
| `/` or `/dashboard` | `dashboard.html` | Main dashboard |
| `/machinery` | `machinery-overview.html` | Machine list |
| `/machine/<id>` | `machine-details.html` | Single machine detail |
| `/alerts` | `alerts.html` | Alerts management |
| `/maintenance` | `maintenance.html` | Maintenance tasks |
| `/reports` | `reports.html` | Reports & data export |
| `/help` | `help.html` | Help documentation |

The `/machine/<id>` route also verifies that the machine belongs to the current user's company before rendering — if not, it redirects to `/machinery`.

### Summary API (Lines 250–287)
#### `GET /api/summary`
Returns a quick overview for the current company:
```json
{ "total_machines": 5, "avg_efficiency": 78.3, "active_alerts": 2 }
```
`avg_efficiency` is calculated as the average of all sensor readings across all machines in the company.

### Machines API (Lines 289–454)
#### `GET /api/machines`
Returns all machines for the current company, each with an `efficiency` field (average of all sensor readings for that machine).

#### `POST /api/machines`
Creates a new machine. Required fields: `name`, `type`, `location`.

#### `GET /api/machines/<id>`
Returns full machine details including:
- Basic machine info
- Last 10 sensor readings per sensor
- 30-day performance history (daily averages)
- Last 100 sensor trend readings
- Last 10 alerts for this machine
- Last 10 maintenance tasks
- Sensor statistics (avg, min, max, count per sensor)
- OEE (Overall Equipment Effectiveness) data

### OEE & Reliability (Lines 456–516)
#### `GET /api/oee/<machine_id>`
Calculates OEE:
- **Availability**: 100% if any sensor readings exist, 0% otherwise.
- **Performance**: Average of all sensor readings (treated as efficiency %).
- **Quality**: Fixed at 100% (simplification).
- **OEE** = (Availability/100) × (Performance/100) × 100

#### `GET /api/reliability/<machine_id>`
Calculates:
- **MTBF** (Mean Time Between Failures): `24 / max(alarm_count, 1)` hours
- **MTTR** (Mean Time To Repair): `2 / max(completed_maintenance_count, 1)` hours

### Server-Side Chart Routes (Lines 518–736)
These routes generate PNG images using Matplotlib and return them as `image/png` responses. They are used as `<img src="...">` in the HTML.

| Route | What it renders |
|---|---|
| `GET /chart/summary.png` | Bar chart: machines count, active alerts, avg sensor value |
| `GET /chart/machine/<id>.png` | Line chart: last 50 sensor readings for a machine |
| `GET /chart/oee/<id>.png` | Circular gauge chart showing OEE % |
| `GET /chart/status.png` | Pie chart: machine status distribution |
| `GET /chart/multi-sensor/<id>.png` | Multi-line chart: all sensors for a machine |
| `GET /chart/heatmap.png` | Heatmap: machine status by location |
| `GET /chart/performance.png` | Dual-panel: efficiency trend + active sensor count |
| `GET /chart/alerts-trend.png` | Line chart: alert frequency over last N days |

All chart routes accept a `?quality=high|normal|fast` query parameter that controls the Matplotlib DPI (150/100/80).

### JSON Data APIs for Client-Side Charts (Lines 738–1092)
These return JSON data that the browser's Chart.js uses to render interactive charts.

#### `GET /api/chart-data/summary`
Returns KPIs, status distribution, and 7-day performance trend for the dashboard.

#### `GET /api/chart-data/machine/<id>`
Returns sensor readings, OEE, 30-day performance, and sensor stats for a machine.

#### `GET /api/machine/<id>/analytics`
Returns advanced analytics: total readings, failure rate, maintenance frequency, 7-day efficiency trend, and peak performance hour.

#### `GET /api/dashboard/widgets`
Returns the full dashboard widget payload: overview stats, location breakdown, and recent alerts.

#### `GET /api/chart-data/alerts?days=14`
Returns alert counts grouped by date and severity for the alerts trend chart.

### Alerts API (Lines 1094–1180)
#### `GET /api/alerts?ack=0|1`
Lists alerts for the current company. Optional `ack` filter: `0` = unacknowledged, `1` = acknowledged.

#### `POST /api/alerts`
Creates a new alert. Required: `machine_id`, `severity`, `message`.

#### `POST /api/alerts/<id>/ack`
Acknowledges an alert. Optionally accepts a `comment`. Records `acknowledged_by` (username) and `acknowledged_at` timestamp.

### Sensor Readings API (Lines 1182–1225)
#### `GET /api/sensor-readings?limit=100&offset=0&machine_id=X`
Paginated list of sensor readings for the current company. Supports filtering by `machine_id`.

### Reports Performance API (Lines 1229–1332)
#### `GET /api/reports/performance`
Returns a comprehensive 30-day performance report:
- Daily trend (avg, min, max efficiency + reading count)
- Per-machine summary (sorted by avg efficiency)
- Overall totals (machines, running count, alerts, maintenance tasks)

### Maintenance API (Lines 1334–1447)
#### `GET /api/maintenance?status=open|in_progress|completed`
Lists maintenance tasks for the current company with optional status filter.

#### `POST /api/maintenance`
Creates a new task. Required: `machine_id`, `description`. Optional: `priority`, `technician`, `scheduled_date`.

#### `PUT /api/maintenance/<id>`
Updates a task's `status`, `technician`, `scheduled_date`, or `priority`. Setting `status=completed` also sets `completed_at = now()`.

### CSV Upload & Visualization (Lines 1449–1559)
#### `POST /api/upload-csv`
- Accepts a multipart file upload (`.csv` only, max 16MB).
- Saves the file to `data/uploads/`.
- Parses it with Pandas, returns column names, first 1000 rows, and row count.
- Caches the parsed data as a JSON file in `data/uploads/`.

#### `GET /api/csv-data/<cache_key>`
Retrieves previously cached CSV data by its cache key.

#### `POST /api/csv-visualize`
Accepts CSV data (columns + rows), auto-detects numeric/date columns, computes summary statistics (min, max, mean, std), and returns chart-ready data.

### Data Management APIs (Lines 1561–1739)
#### `GET /api/data/machines/all`
Returns all machines with their efficiency for the Reports page.

#### `GET /api/data/sensors/all`
Returns the last 500 sensor readings for the Reports page.

#### `PUT /api/data/machines/<id>`
Updates machine fields (name, type, location, status, rated_capacity).

#### `PUT /api/data/sensors/<id>`
Updates a sensor reading's value or timestamp.

#### `DELETE /api/data/sensors/<id>`
Deletes a sensor reading.

### Demo Data & Dataset Management (Lines 1741–1825)
#### `POST /api/demo/generate`
Calls `demo_data.generate_demo_data()` to create sample machines, sensors, readings, alerts, and maintenance tasks for the current company.

#### `POST /api/demo/clear`
Deletes all data (sensor readings → sensors → alarms → maintenance tasks → machines) for the current company in the correct foreign-key order.

#### `GET /api/datasets`
Returns an empty list (client-side IndexedDB handles dataset storage).

#### `POST /api/datasets/upload`
Saves and parses an uploaded CSV file, returns the dataset with column type information.

### Health Check (Lines 1827–1835)
#### `GET /health`
Returns `{"status": "ok"}` if the database is reachable. Used by load balancers and monitoring tools.

---

## 6. Visualization Engine — `visualization.py`

This module generates all **server-side PNG charts** using Matplotlib. It is imported by `app.py`.

### `_save_fig_to_bytes(fig, dpi, quality_mode)`
A shared helper that saves any Matplotlib figure to a `BytesIO` buffer (in-memory PNG). The `quality_mode` parameter controls DPI:
- `"high"` → 150 DPI (best quality)
- `"normal"` → 100 DPI (default, balanced)
- `"fast"` → 80 DPI (fastest, for bulk operations)

### `_apply_theme_settings(theme_name)`
Returns a color dictionary for the given theme:
- `"belize-light"` → white background, dark text, blue accents
- `"belize-dark"` → dark background, light text, bright blue accents
- `"signature"` → warm off-white background, gold accents

### Chart Functions

| Function | Chart Type | What it shows |
|---|---|---|
| `performance_trends_chart_from_conn()` | Line + fill | Efficiency % trend over N days |
| `status_pie_chart_from_conn()` | Pie | Machine status distribution |
| `alert_frequency_chart_from_conn()` | Line + fill | Alert count per day |
| `machine_comparison_chart_from_conn()` | Horizontal bar | Top machines by efficiency |
| `oee_gauge_chart(oee_value)` | Polar/gauge | OEE % as a semicircular gauge |
| `multi_sensor_trend_chart()` | Multi-line | Up to 5 sensors on one chart |
| `status_heatmap_chart()` | Heatmap | Machine status counts by location |
| `performance_comparison_chart()` | Dual panel | Efficiency line + active sensor count bar |

Each function:
1. Queries the database via the passed `conn` object.
2. Falls back to synthetic/random data if no real data exists (so charts never crash).
3. Applies the theme colors.
4. Returns a `BytesIO` buffer ready to be sent as an HTTP response.

---

## 7. Demo Data Generator — `demo_data.py`

### `generate_demo_data(company_id, num_machines, days_of_data)`
Creates a full set of realistic test data:

1. **Machines**: Creates `num_machines` machines with random types (CNC, Lathe, Robot Arm, etc.) and locations (Production Line A/B, Assembly Floor, etc.).

2. **Sensors**: Each machine gets 2–4 randomly selected sensors from: Temperature (°C), Pressure (PSI), Vibration (mm/s), Speed (RPM), Efficiency (%), Power Consumption (kW).

3. **Sensor Readings**: Generates readings every 15 minutes for the last `days_of_data` days. 80% of readings are within the "normal range" for each sensor; 20% are abnormal (simulating real-world anomalies). Capped at 50,000 total readings to prevent database bloat.

4. **Alerts**: Creates 2–5 random alerts for the first 3 machines, with random severities and 60% acknowledged.

5. **Maintenance Tasks**: Creates 1–3 tasks per machine with random priorities, statuses, and technician names.

---

## 8. Frontend — HTML Templates

All templates are in `templates/`. They use Jinja2 templating (Flask's default). The sidebar navigation is consistent across all pages.

### `login.html`
- Simple login form with fields: Company Name, Login ID, Password.
- On submit, POSTs to `/api/auth/login` via `fetch()`.
- On success, redirects to `/dashboard`.

### `register.html`
- Registration form: Company Name, Login ID, Username, Password, Role.
- POSTs to `/api/auth/register`.

### `dashboard.html`
The most complex template. Contains:
- **KPI Cards**: Total Machines, Avg Efficiency, Active Alerts, System Health.
- **Machine Status Breakdown**: Running/Idle/Maintenance/Offline counts.
- **Chart canvases**: Performance Trend, Status Distribution, Alerts Trend, Machine Comparison, Performance Matrix.
- **Machines Table**: Searchable table of all machines.
- **Alerts List**: Last 10 unacknowledged alerts with Acknowledge button.
- **Acknowledge Modal**: Dialog to add a comment when acknowledging an alert.
- **Create Maintenance Modal**: Form to create a new maintenance task.
- **CSV Upload Section**: Drag-and-drop zone, chart type selector, X/Y axis selectors, preview table, editable data table, export buttons.
- **Demo Data Buttons**: Generate and Clear demo data.
- Loads: `app.js`, `dashboard-main.js`, `dashboard-viz-integration.js`, Chart.js (CDN).

### `machinery-overview.html`
- Searchable table of all machines.
- "Add Machine" button opens a modal form.
- Loads: `app.js`, `machinery.js`.

### `machine-details.html`
- Shows machine name, type, location, status.
- Displays sensor statistics (avg, min, max per sensor).
- Shows 30-day performance history table.
- Embeds server-rendered chart images (`/chart/machine/<id>.png`, `/chart/oee/<id>.png`).
- Loads: `app.js`, `machine.js`.

### `alerts.html`
- Table of all unacknowledged alerts.
- Each row has an "Ack" button.
- Loads: `app.js`, `alerts.js`.

### `maintenance.html`
- Table of all maintenance tasks.
- Form to create a new task (machine ID, description, technician, date).
- Loads: `app.js`, `maintenance.js`.

### `reports.html`
- Performance summary cards (30-day stats).
- Machines data table (load-on-demand, editable, exportable).
- Sensor readings table (load-on-demand, editable with delete, exportable).
- CSV upload and visualization section.
- Loads: `app.js`, `reports-enhanced.js`, Chart.js.

### `help.html`
- Static documentation page explaining how to use the system.

---

## 9. Frontend — JavaScript Files

### `app.js` — Global Application Shell
**Loaded on every page.** Manages:

- **Theme System**: Reads/writes the current theme (`belize-light`, `belize-dark`, `signature`) to `localStorage`. Applies it by setting `data-theme` attribute on `<html>`. The `themeCycleBtn` cycles through themes.
- **Sidebar Collapse**: Reads/writes sidebar collapsed state to `localStorage`. The `.sidebar-toggle` button toggles the `.collapsed` class on `.app-sidebar`.
- **Nav Section Collapse**: Each `.nav-section-header` can collapse its section. State is persisted in `localStorage` per section ID.
- **Nav Search**: The `#navSearch` input filters `.nav-item` elements in real time. Sections with matching items are auto-expanded.
- **`fetchJsonLow(url, opts)`**: A shared `fetch` wrapper that returns `null` on error (never throws). Exposed on `window.__sapApp` so other scripts can use it.

**Exposes**: `window.__sapApp = { applyTheme, readTheme, fetchJsonLow, toggleSidebar, applySidebar }`

---

### `dashboard-main.js` — Dashboard Controller
**The largest JS file (~1000 lines).** Loaded only on `dashboard.html`. Wrapped in an IIFE to avoid polluting the global scope.

#### Key Sections:

**Chart Registry** (`charts` object)
Tracks all Chart.js instances by key. `makeChart(key, canvasId, config)` always destroys the old chart before creating a new one — this prevents the "canvas already in use" error.

**Color Palette** (`COLORS` object)
Defines the SAP 90s color palette used consistently across all charts:
- Running: `#107e3e` (green)
- Idle: `#0a6ed1` (blue)
- Maintenance: `#e9730c` (orange)
- Offline/Critical: `#bb0000` (red)

**`loadKPIs()`**
Fetches `/api/dashboard/widgets` and `/api/summary` in parallel. Updates the KPI card text elements (`k_total`, `k_eff`, `k_alerts`, `k_health`, etc.) and sidebar badges.

**`loadMachinesTable()`**
Fetches `/api/machines` and renders the machines table. Also triggers `loadMachineStatus()`, `createMachineComparisonChart()`, and `createPerformanceMatrixChart()` with the same data.

**`createPerformanceTrendChart()`**
Fetches `/api/chart-data/summary` for 7-day efficiency data. Falls back to simulated random data if no real data exists. Supports chart type switching (line, area, bar, scatter) via `.dash-type-btn` buttons.

**`createStatusDistributionChart()`**
Fetches `/api/machines` and counts machines by status. Renders a doughnut chart. Supports switching to pie, bar, or polarArea via buttons.

**`createAlertsTrendChart()`**
Fetches `/api/chart-data/alerts?days=14`. Renders a stacked bar chart with Critical/Warning/Info datasets.

**`createMachineComparisonChart(machines)`**
Takes the already-fetched machines array. Sorts by efficiency descending, takes top 8, renders a horizontal bar chart colored by machine status.

**`createPerformanceMatrixChart(machines)`**
Renders a bubble chart where X = efficiency %, Y = status level (numeric), bubble size = efficiency/8.

**`loadAlertsList()`**
Fetches `/api/alerts?ack=0` and renders the last 10 unacknowledged alerts as HTML cards with Ack buttons.

**`showAckModal()` / `acknowledgeAlert()`** (exposed on `window`)
Opens the acknowledge modal and POSTs to `/api/alerts/<id>/ack`.

**`loadMachinesForMaintenance()` / `createMaintenanceTask()`** (exposed on `window`)
Populates the machine dropdown in the maintenance modal and POSTs to `/api/maintenance`.

**CSV Upload Section (`initCSVUpload()`)**
This is the most complex part of the file. It handles:
1. **File loading**: Drag-and-drop or click-to-browse. Reads the file with `FileReader`.
2. **CSV parsing**: A custom parser that handles quoted fields and commas inside quotes.
3. **Column classification** (`reclassifyCols()`): Determines which columns are numeric (≥60% parseable as float) vs text.
4. **Stats display**: Shows min, max, avg, count for each numeric column.
5. **Chart rendering** (`renderChart()`): Supports line, bar, scatter, pie, and radar chart types. Uses the selected X column and one or more Y columns.
6. **Preview table** (`renderPreviewTable()`): Shows first N rows with mini bar indicators for numeric values.
7. **Editable table** (`renderEditTable()`): Full editable grid where users can modify cell values, add rows, delete rows, save changes, and re-plot.
8. **Export**: Export chart as PNG, export data as CSV (with BOM for Excel compatibility).

**`initDemoButtons()`**
Wires the "Generate Demo Data" and "Clear Demo Data" buttons to `/api/demo/generate` and `/api/demo/clear`.

**`refreshAll()`**
Calls all load functions in parallel. Called on page load and every 60 seconds via `setInterval`.

**Service Worker Registration**
Registers `/static/sw.js` for PWA offline support.

---

### `dashboard-viz-integration.js` — Viz Bridge
Connects the dashboard to the global `VizManager` and `ChartSync` systems (from `viz-manager.js` and `chart-sync.js`). Registers fallback image chart elements and listens for `viz:data-generated` and `viz:data-cleared` custom events.

---

### `alerts.js` — Alerts Page
- Fetches `/api/alerts?ack=0` on load.
- Uses `localStorage` as an offline cache (key: `pj_alerts`).
- Renders a table with Ack buttons.
- Each Ack button POSTs to `/api/alerts/<id>/ack` and refreshes the list.
- Also renders a compact `#alertsList` div (used on pages that embed a mini alert list).

---

### `machine.js` — Machine Detail Page
- Reads `window.machine_id` (set by the Flask template via `{{ machine_id }}`).
- Fetches `/api/machines/<id>` on load.
- Uses `localStorage` as an offline cache (key: `imcs_machine_<id>`).
- Populates: machine name, type/location, status badge, sensor stats cards, performance history table.
- Sets the `src` of `#machineChart` to `/chart/machine/<id>.png` (server-rendered image).

---

### `machinery.js` — Machine List Page
- Fetches `/api/machines` on load.
- Uses `localStorage` as an offline cache (key: `pj_machines`).
- Renders the machines table with links to individual machine pages.
- Wires the search input to filter table rows.
- Handles the "Add Machine" modal: collects form data and POSTs to `/api/machines`.

---

### `maintenance.js` — Maintenance Page
- Fetches `/api/maintenance` on load.
- Uses `localStorage` as an offline cache (key: `pj_maint`).
- Renders the maintenance tasks table.
- The "Create Task" button collects form inputs and POSTs to `/api/maintenance`.

---

### `reports-enhanced.js` — Reports Page
The most feature-rich page script after `dashboard-main.js`.

**`initEditableTable(tableId, editableFields, updateEndpoint, deleteEndpoint)`**
Sets up event delegation on a table so clicking the ✎ Edit button makes cells editable inline. Changes are saved via `PUT` to the update endpoint. Delete buttons send `DELETE` requests.

**`loadMachinesData()`**
Fetches `/api/data/machines/all` and renders:
- A Chart.js bar chart of machine efficiencies (color-coded: green ≥80%, yellow ≥60%, red <60%).
- An editable table where name, type, location, status can be changed inline.

**`loadSensorsData()`**
Fetches `/api/data/sensors/all` and renders:
- A Chart.js line chart of the last 50 sensor readings.
- An editable table where value and timestamp can be changed, and rows can be deleted.

**`renderCSVTable(csvData)`**
Renders an editable table from CSV data (client-side only — changes are not persisted to the server).

**`exportToCSV(tableId, filename)`**
Exports any HTML table to a downloadable CSV file.

---

### `viz-manager.js` — Visualization Manager
Provides the global `window.VizManager` object that manages the lifecycle of all visualizations. Handles data checking, chart refresh, and clearing.

### `chart-sync.js` — Chart Synchronization
Provides the global `window.ChartSync` object. Registers image-based chart fallbacks and keeps them in sync with data state.

### `charts.js` / `charts-enhanced.js`
Utility functions for creating and configuring Chart.js charts. Used by other scripts as a shared library.

### `csv-viz.js`
CSV-specific visualization utilities, used alongside the main CSV upload logic.

### `dataset-manager.js`
Client-side dataset management using the browser's IndexedDB API. Allows datasets to persist across page reloads without server storage.

### `sw.js` — Service Worker
Implements a cache-first strategy for static assets (CSS, JS, icons). Enables the app to load offline after the first visit.

### `lazy.js`
Lazy loading utilities for deferring non-critical resource loading.

### `tabs.js`
Simple tab-switching utility for pages with tabbed content.

---

## 10. Frontend — CSS Stylesheets

### `static/css/sap90.css` — Main Stylesheet
The primary stylesheet implementing the **SAP / Windows 95–98 aesthetic**:
- Classic grey (`#c0c0c0`) backgrounds with beveled borders (`outset`/`inset` effects).
- `.btn` class uses the classic raised button look.
- `.app-sidebar` with collapsible behavior and the blue gradient brand header.
- `.status-badge` classes for running (green), idle (blue), maintenance (orange), down (red).
- Responsive sidebar: collapses to icon-only mode when `.collapsed` class is added.
- Modal dialogs with classic window chrome styling.
- Table styles with alternating row colors.
- Form input styles with inset borders.

### `static/css/theme.css` — Theme Token Definitions
Defines CSS custom properties (variables) for the three themes:
- `[data-theme="belize-light"]` — Light blue/grey SAP theme
- `[data-theme="belize-dark"]` — Dark mode
- `[data-theme="signature"]` — Warm signature theme

Variables include: `--bg`, `--surface`, `--border`, `--text`, `--accent`, `--sidebar-bg`, etc.

### `sap-quartz-theme.css` (root level)
An additional theme file with Quartz-style SAP design tokens. Used as a reference/alternative theme.

---

## 11. API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login with company_name, login_id, password |
| POST | `/api/auth/register` | Register new user (creates company if needed) |
| GET | `/logout` | Clear session and redirect to login |

### Machines
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/machines` | List all machines for current company |
| POST | `/api/machines` | Create a new machine |
| GET | `/api/machines/<id>` | Full machine details with sensors, performance, alerts |
| PUT | `/api/data/machines/<id>` | Update machine fields |

### Sensors
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/sensor-readings` | Paginated sensor readings (supports `machine_id` filter) |
| GET | `/api/data/sensors/all` | All sensor readings (last 500) |
| PUT | `/api/data/sensors/<id>` | Update a sensor reading |
| DELETE | `/api/data/sensors/<id>` | Delete a sensor reading |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/summary` | Quick KPI summary |
| GET | `/api/oee/<machine_id>` | OEE metrics for a machine |
| GET | `/api/reliability/<machine_id>` | MTBF and MTTR for a machine |
| GET | `/api/machine/<id>/analytics` | Advanced analytics for a machine |
| GET | `/api/dashboard/widgets` | Full dashboard widget data |
| GET | `/api/reports/performance` | 30-day performance report |

### Chart Data (JSON for Chart.js)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/chart-data/summary` | KPIs + status distribution + 7-day trend |
| GET | `/api/chart-data/machine/<id>` | Machine-specific chart data |
| GET | `/api/chart-data/alerts?days=14` | Alert trend data |

### Chart Images (PNG from Matplotlib)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/chart/summary.png` | Plant summary bar chart |
| GET | `/chart/machine/<id>.png` | Machine sensor trend line chart |
| GET | `/chart/oee/<id>.png` | OEE gauge chart |
| GET | `/chart/status.png` | Machine status pie chart |
| GET | `/chart/multi-sensor/<id>.png` | Multi-sensor trend chart |
| GET | `/chart/heatmap.png` | Status heatmap by location |
| GET | `/chart/performance.png` | Performance comparison chart |
| GET | `/chart/alerts-trend.png` | Alert frequency trend chart |

### Alerts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/alerts?ack=0` | List alerts (filter by acknowledged status) |
| POST | `/api/alerts` | Create a new alert |
| POST | `/api/alerts/<id>/ack` | Acknowledge an alert |

### Maintenance
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/maintenance?status=open` | List maintenance tasks |
| POST | `/api/maintenance` | Create a new task |
| PUT | `/api/maintenance/<id>` | Update a task |

### CSV & Datasets
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/upload-csv` | Upload and parse a CSV file |
| GET | `/api/csv-data/<cache_key>` | Retrieve cached CSV data |
| POST | `/api/csv-visualize` | Generate visualization data from CSV |
| POST | `/api/datasets/upload` | Upload a dataset file |

### Demo Data
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/demo/generate` | Generate demo machines, sensors, readings |
| POST | `/api/demo/clear` | Clear all demo data for current company |

### System
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check — returns `{"status": "ok"}` |

---

## 12. Data Flow Diagram

```
USER BROWSER
    │
    │ 1. Login → POST /api/auth/login
    │    Flask sets session (user_id, company_id, role)
    │
    │ 2. Navigate to /dashboard
    │    Flask renders dashboard.html (Jinja2 template)
    │
    │ 3. Browser loads JS files:
    │    app.js → applies theme, wires sidebar
    │    dashboard-main.js → starts data loading
    │
    │ 4. dashboard-main.js calls refreshAll():
    │    ├── GET /api/dashboard/widgets → KPI cards
    │    ├── GET /api/machines → machines table + charts
    │    ├── GET /api/alerts?ack=0 → alerts list
    │    ├── GET /api/chart-data/summary → performance trend chart
    │    └── GET /api/chart-data/alerts → alerts trend chart
    │
    │ 5. Flask queries SQLite (imcs.db):
    │    All queries filter by session['company_id']
    │    Returns JSON responses
    │
    │ 6. Chart.js renders interactive charts in <canvas> elements
    │
    │ 7. Server-side charts (PNG images):
    │    <img src="/chart/oee/1.png"> → Flask → visualization.py → Matplotlib → PNG
    │
    │ 8. Auto-refresh every 60 seconds (setInterval)
    │
    │ 9. User actions (Ack alert, Create maintenance, Upload CSV):
    │    POST/PUT/DELETE → Flask API → SQLite → JSON response → UI update
```

---

## 13. How to Run the Project

### Prerequisites
- Python 3.9+
- pip

### Setup Steps

```bash
# 1. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# 2. Install dependencies
pip install -r requirements.txt

# 3. Initialize the database (first time only)
python -c "
import sqlite3
with open('schema.sql') as f:
    sqlite3.connect('imcs.db').executescript(f.read())
print('Database initialized')
"

# 4. Run the development server
python app.py
# Server starts at http://127.0.0.1:8000

# 5. Open browser and register
# Go to http://127.0.0.1:8000/register
# Enter any Company Name, Login ID, Username, Password

# 6. Generate demo data
# After logging in, go to Dashboard
# Click "Generate Demo Data" button
# Enter 5 machines, 30 days → click OK
```

### Windows Quick Start
```batch
start_backend.bat
```

### Production Deployment
```bash
# Uses Gunicorn (defined in Procfile)
gunicorn app:app --bind 0.0.0.0:$PORT
```

Set the `SECRET_KEY` environment variable in production:
```bash
export SECRET_KEY="your-secure-random-key-here"
```

---

## 14. Key Design Decisions

### Multi-Tenancy via `company_id`
Every API endpoint calls `get_current_company_id()` which reads from the session. Every database query includes `WHERE company_id = ?`. This ensures complete data isolation between companies without needing separate databases.

### Offline-First with `localStorage` Cache
The JS files (`alerts.js`, `machinery.js`, `maintenance.js`, `machine.js`) all follow the same pattern:
1. Check `localStorage` for cached data → render immediately if found.
2. Fetch fresh data from the API.
3. Update `localStorage` and re-render.

This means the UI shows something immediately even on slow connections.

### Dual Chart Strategy
The app uses two chart systems:
- **Server-side (Matplotlib)**: For complex charts (OEE gauge, heatmap, multi-sensor) where server-side computation is needed. Returned as PNG images.
- **Client-side (Chart.js)**: For interactive charts on the dashboard that support hover tooltips, chart type switching, and real-time updates.

### Chart Type Switching
The dashboard performance and status charts support switching between chart types (line/area/bar/scatter for performance; doughnut/pie/bar/polarArea for status) without re-fetching data. The data is cached in `_dashChartData` and the chart is simply re-created with the new type.

### CSV Visualization Pipeline
The CSV upload is handled entirely client-side after the initial file read:
1. `FileReader` reads the file as text.
2. A custom CSV parser handles quoted fields.
3. Column types are auto-detected (numeric vs text).
4. Chart.js renders the visualization.
5. The editable table allows data correction before re-plotting.
6. Export uses `Blob` + `URL.createObjectURL` for client-side file download.

### Security
- Passwords are hashed with PBKDF2-SHA256 (Werkzeug default).
- All HTML output in JS files uses an `esc()` / `escapeHtml()` function to prevent XSS.
- All database queries use parameterized queries (`?` placeholders) to prevent SQL injection.
- Session-based authentication with Flask's signed cookie sessions.
- Every API endpoint verifies that the requested resource belongs to the current user's company.

---

*This README was generated as a complete developer reference for the IMCS project. Last updated: February 2026.*
