# IMCS — Industrial Machinery Control System
## Project Introduction & Overview

---

## 📋 Table of Contents

1. [Introduction](#1-introduction)
2. [Uses of This Software](#2-uses-of-this-software)
3. [Advantages](#3-advantages)
4. [Disadvantages](#4-disadvantages)
5. [Technology Stack](#5-technology-stack)
6. [How the Software Works — Flowchart](#6-how-the-software-works--flowchart)
7. [Future Scope](#7-future-scope)

---

## 1. Introduction

### What is IMCS?

**IMCS (Industrial Machinery Control System)** is a web-based software application designed to help manufacturing companies and industrial facilities **monitor, manage, and maintain their machinery** from a single, centralized dashboard.

In modern industrial environments, machines run 24/7 and generate enormous amounts of data — temperatures, pressures, vibrations, speeds, and efficiency readings. Without a proper system, this data is lost, anomalies go undetected, and machines fail unexpectedly, causing costly downtime.

**IMCS solves this problem** by:
- Collecting and storing sensor data from all machines in real time.
- Displaying key performance indicators (KPIs) on an easy-to-read dashboard.
- Automatically raising alerts when sensor values go out of range.
- Helping maintenance teams track and schedule repair work orders.
- Providing historical performance charts and reports for data-driven decisions.

### Who Is It For?

| User Role | What They Use It For |
|---|---|
| **Plant Manager** | View overall plant health, efficiency KPIs, and alert summaries |
| **Maintenance Engineer** | Track maintenance tasks, view machine history, schedule repairs |
| **Machine Operator** | Monitor individual machine status and sensor readings |
| **Data Analyst** | Upload CSV datasets, generate charts, export reports |
| **IT Administrator** | Manage user accounts, company settings, and system health |

### Key Highlights

- 🏭 **Multi-Company Support** — Multiple organizations can use the same system with completely isolated data.
- 📊 **Real-Time Dashboard** — Live KPIs, charts, and alerts that auto-refresh every 60 seconds.
- 🔔 **Alert Management** — Raise, view, and acknowledge machine alarms with comments.
- 🔧 **Maintenance Tracking** — Create and manage work orders for machine maintenance.
- 📁 **CSV Data Visualization** — Upload any CSV file and instantly visualize it with interactive charts.
- 🎨 **Retro SAP UI** — A unique Windows 95/98-inspired interface that is familiar to industrial software users.
- 📶 **Offline Support** — Works even without internet using browser caching (PWA).

---

## 2. Uses of This Software

### 2.1 Machine Monitoring
IMCS continuously tracks the status of every registered machine in a facility. Operators can see at a glance which machines are **Running**, **Idle**, **Under Maintenance**, or **Down**. Each machine has a dedicated detail page showing its sensors, performance history, and recent alerts.

### 2.2 Sensor Data Collection & Analysis
Each machine can have multiple sensors attached (e.g., Temperature, Pressure, Vibration, Speed, Efficiency, Power Consumption). IMCS stores every sensor reading with a timestamp and provides:
- Average, minimum, and maximum values per sensor.
- 30-day performance trend charts.
- Multi-sensor comparison charts.

### 2.3 KPI Dashboard
The main dashboard provides a bird's-eye view of the entire plant:
- **Total Machines** registered in the system.
- **Average Efficiency** across all machines.
- **Active Alerts** that need attention.
- **System Health** score.
- Performance trend charts for the last 7 days.
- Machine status distribution (pie/doughnut chart).

### 2.4 Alert & Alarm Management
When a machine sensor exceeds its threshold or an operator notices an issue, an alert can be raised with:
- **Severity level**: Info, Warning, or Critical.
- **Message**: Description of the problem.
- **Acknowledgement**: Engineers can acknowledge alerts with a comment, creating an audit trail.

### 2.5 Maintenance Work Order Management
Maintenance teams can:
- Create work orders linked to specific machines.
- Assign a technician and set a scheduled date.
- Set priority (Low, Medium, High).
- Update status (Open → In Progress → Completed).

### 2.6 Performance Reports
The Reports page provides:
- 30-day performance summary with daily efficiency trends.
- Per-machine efficiency rankings.
- Editable data tables for machines and sensor readings.
- Export to CSV for use in Excel or other tools.

### 2.7 CSV Data Upload & Visualization
Any CSV file (from external sensors, ERP systems, or spreadsheets) can be uploaded and visualized with:
- Line, Bar, Scatter, Pie, and Radar charts.
- Automatic detection of numeric and text columns.
- An editable data table to correct values before plotting.
- Export the chart as a PNG image.

### 2.8 Demo Data Generation
For testing and demonstration purposes, IMCS can generate a complete set of realistic sample data:
- Multiple machines with sensors.
- Months of historical sensor readings.
- Sample alerts and maintenance tasks.

---

## 3. Advantages

### ✅ Centralized Monitoring
All machines across an entire facility (or multiple facilities) are visible from a single web browser. No need to physically walk to each machine or check separate systems.

### ✅ Multi-Tenant Architecture
Multiple companies can use the same IMCS installation. Each company's data is completely isolated — one company cannot see another's machines, alerts, or reports.

### ✅ Real-Time Awareness
The dashboard auto-refreshes every 60 seconds, ensuring that operators always have up-to-date information without manually reloading the page.

### ✅ No Expensive Hardware Required
IMCS runs entirely on a standard web server and uses a lightweight SQLite database. No specialized industrial hardware or expensive SCADA software licenses are needed.

### ✅ Dual Chart System
- **Server-side charts** (Matplotlib PNG) for complex visualizations like OEE gauges and heatmaps.
- **Client-side charts** (Chart.js) for interactive, hover-enabled dashboards.
This gives the best of both worlds — rich visuals and interactivity.

### ✅ Offline-First Design
JavaScript files cache data in the browser's `localStorage`. If the network goes down briefly, the last-known data is still displayed instead of showing an error.

### ✅ PWA Support
The Service Worker enables the app to work offline and can be installed on a desktop or mobile device like a native app.

### ✅ Audit Trail
Every login, data creation, update, and deletion is logged in the `audit_log` table. This is essential for industrial compliance and accountability.

### ✅ Flexible Data Import
The CSV upload feature means IMCS is not limited to its own sensor data — it can visualize data from any external source (PLCs, SCADA exports, ERP reports, Excel files).

### ✅ Easy to Deploy
The app runs with a single `python app.py` command. It can be deployed to any cloud platform (Heroku, Railway, Render, AWS) using the included `Procfile`.

### ✅ Open & Customizable
Built with standard Python and vanilla JavaScript — no proprietary frameworks. Any developer familiar with Flask and JavaScript can extend or modify it.

---

## 4. Disadvantages

### ❌ SQLite Limitations
SQLite is a file-based database suitable for small to medium deployments. For very large installations with thousands of machines and millions of sensor readings, a more powerful database like **PostgreSQL** or **MySQL** would be needed.

### ❌ No Real-Time Sensor Integration (Out of the Box)
IMCS stores sensor data that is manually entered or uploaded via CSV. It does not have a built-in connector to read data directly from physical sensors, PLCs, or SCADA systems. Integration with hardware requires additional development.

### ❌ Single-Server Architecture
The current design runs as a single Flask process. For high-availability production environments, additional work is needed to set up load balancing, database replication, and failover.

### ❌ Basic OEE Calculation
The OEE (Overall Equipment Effectiveness) formula used is simplified:
- Availability is binary (100% if any readings exist, 0% if none).
- Quality is fixed at 100%.
A production-grade OEE system would require more detailed downtime tracking and quality defect recording.

### ❌ No Role-Based Access Control (RBAC) Enforcement
While user roles (operator, maintenance, manager, admin) are stored in the database, the current code does not enforce different permissions per role. All logged-in users have the same access level.

### ❌ No Email or SMS Notifications
Alerts are only visible inside the IMCS dashboard. There is no built-in mechanism to send email, SMS, or push notifications when a critical alert is raised.

### ❌ Limited Mobile Responsiveness
The UI was designed primarily for desktop use. While it is functional on tablets, the 90s-style layout is not fully optimized for small mobile screens.

### ❌ No Data Encryption at Rest
The SQLite database file (`imcs.db`) is stored as a plain file on the server. Sensitive data (sensor readings, user information) is not encrypted at rest.

### ❌ Session-Based Auth Only
Authentication uses Flask server-side sessions. There is no support for OAuth, SSO (Single Sign-On), or API token-based authentication, which may be required for enterprise integrations.

---

## 5. Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   HTML5      │  │  Vanilla JS  │  │  Vanilla CSS │  │
│  │  Templates   │  │  (ES6+)      │  │  (sap90.css) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Chart.js    │  │ localStorage │  │ Service      │  │
│  │  (CDN)       │  │  (Cache)     │  │ Worker (PWA) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │  HTTP/HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  WEB SERVER (Flask)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   app.py     │  │visualization │  │  demo_data   │  │
│  │  (Routes +   │  │    .py       │  │    .py       │  │
│  │   REST API)  │  │ (Matplotlib) │  │ (Generator)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Werkzeug   │  │    Pandas    │  │    NumPy     │  │
│  │  (Auth/Hash) │  │ (CSV Parse)  │  │  (Arrays)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │  SQL Queries
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  DATABASE (SQLite)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │companies │ │  users   │ │ machines │ │ sensors  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ sensor_  │ │  alarms  │ │maintain- │ │audit_log │  │
│  │ readings │ │          │ │  ance    │ │          │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Technology Summary Table

| Category | Technology | Version | Role |
|---|---|---|---|
| **Language** | Python | 3.9+ | Backend logic |
| **Web Framework** | Flask | 3.0.0 | HTTP server + routing |
| **Database** | SQLite | Built-in | Data storage |
| **Auth Library** | Werkzeug | 3.0.1 | Password hashing |
| **Chart Library (Server)** | Matplotlib | 3.8.2 | PNG chart generation |
| **Math Library** | NumPy | 1.26.2 | Array operations for charts |
| **Data Processing** | Pandas | 2.1.4 | CSV parsing & analysis |
| **CORS Support** | Flask-CORS | 4.0.0 | Cross-origin API access |
| **Chart Library (Client)** | Chart.js | Latest CDN | Interactive browser charts |
| **Frontend Language** | Vanilla JavaScript | ES6+ | UI logic, API calls |
| **Styling** | Vanilla CSS | — | 90s SAP aesthetic |
| **Templating** | Jinja2 | Built-in Flask | HTML template rendering |
| **PWA** | Service Worker | Web API | Offline caching |
| **Deployment** | Gunicorn + Procfile | — | Production WSGI server |

---

## 6. How the Software Works — Flowchart

### 6.1 Overall System Flow

```
                    ┌─────────────────┐
                    │   USER OPENS    │
                    │   BROWSER       │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Is User        │
                    │  Logged In?     │
                    └────────┬────────┘
                    NO │     │ YES
                       ▼     ▼
              ┌──────────┐  ┌──────────────────┐
              │  LOGIN / │  │   DASHBOARD      │
              │ REGISTER │  │   (Main Page)    │
              └────┬─────┘  └────────┬─────────┘
                   │                 │
                   ▼                 ▼
          ┌─────────────────┐  ┌─────────────────────────────┐
          │ Verify Company  │  │  Load KPIs, Charts, Tables  │
          │ Name + Password │  │  (API calls every 60 sec)   │
          └────────┬────────┘  └─────────────┬───────────────┘
                   │                         │
              FAIL │  SUCCESS                │
                   ▼     ▼                   ▼
          ┌──────────┐  ┌──────────┐  ┌─────────────────────┐
          │  Show    │  │  Create  │  │  Navigate to:       │
          │  Error   │  │ Session  │  │  • Machinery        │
          └──────────┘  └────┬─────┘  │  • Alerts           │
                             │        │  • Maintenance       │
                             ▼        │  • Reports           │
                    ┌─────────────┐   │  • Machine Detail    │
                    │  DASHBOARD  │   └─────────────────────┘
                    └─────────────┘
```

### 6.2 Dashboard Data Loading Flow

```
  DOMContentLoaded
        │
        ▼
  refreshAll() ──────────────────────────────────────────┐
        │                                                 │
        ├──► loadKPIs()                                   │
        │         │                                       │
        │         ├── GET /api/dashboard/widgets          │
        │         └── GET /api/summary                    │
        │              └── Update KPI cards on screen     │
        │                                                 │
        ├──► loadMachinesTable()                          │
        │         │                                       │
        │         ├── GET /api/machines                   │
        │         ├── Render machines table               │
        │         ├── createMachineComparisonChart()      │
        │         └── createPerformanceMatrixChart()      │
        │                                                 │
        ├──► loadAlertsList()                             │
        │         │                                       │
        │         └── GET /api/alerts?ack=0               │
        │              └── Render alerts list             │
        │                                                 │
        ├──► createPerformanceTrendChart()                │
        │         │                                       │
        │         └── GET /api/chart-data/summary         │
        │              └── Render Chart.js line chart     │
        │                                                 │
        └──► createAlertsTrendChart()                     │
                  │                                       │
                  └── GET /api/chart-data/alerts          │
                       └── Render Chart.js bar chart      │
                                                          │
  ◄─────────────── setInterval(60,000 ms) ───────────────┘
```

### 6.3 Alert Acknowledgement Flow

```
  User clicks [Ack] button on an alert
        │
        ▼
  showAckModal(alertId)
        │
        ▼
  Modal opens → User types optional comment
        │
        ▼
  User clicks [Confirm Acknowledge]
        │
        ▼
  POST /api/alerts/{id}/ack
  { "comment": "..." }
        │
        ▼
  Flask verifies alert belongs to company
        │
        ├── NOT FOUND → Return 404 error
        │
        └── FOUND →
              UPDATE alarms SET
                acknowledged = 1,
                acknowledged_by = username,
                acknowledged_at = now(),
                comment = "..."
              │
              ▼
              Log action to audit_log
              │
              ▼
              Return { "success": true }
              │
              ▼
              UI refreshes alert list
```

### 6.4 CSV Upload & Visualization Flow

```
  User drags CSV file onto drop zone
        │
        ▼
  FileReader reads file as text
        │
        ▼
  Custom CSV parser splits rows & columns
  (handles quoted fields with commas inside)
        │
        ▼
  reclassifyCols():
  ├── Column is NUMERIC if ≥60% values parse as float
  └── Column is TEXT otherwise
        │
        ▼
  Display column statistics:
  (min, max, avg, count per numeric column)
        │
        ▼
  User selects:
  ├── Chart Type (Line / Bar / Scatter / Pie / Radar)
  ├── X-Axis Column
  └── Y-Axis Column(s)
        │
        ▼
  renderChart() → Chart.js renders visualization
        │
        ▼
  User can:
  ├── Switch chart type → re-render instantly
  ├── Edit data in table → Save & Replot
  ├── Export chart as PNG
  └── Export data as CSV
```

### 6.5 Machine Detail Page Flow

```
  User navigates to /machine/{id}
        │
        ▼
  Flask verifies machine belongs to company
        │
        ├── NOT AUTHORIZED → Redirect to /machinery
        │
        └── AUTHORIZED → Render machine-details.html
                │
                ▼
        machine.js loads:
        │
        ├── Check localStorage cache → show cached data immediately
        │
        ├── GET /api/machines/{id}
        │     Returns: sensors, performance, alerts, maintenance, OEE
        │
        ├── Populate: name, type, status, sensor stats, performance table
        │
        ├── <img src="/chart/machine/{id}.png">
        │     Flask → visualization.py → Matplotlib → PNG → Browser
        │
        └── <img src="/chart/oee/{id}.png">
              Flask → oee_gauge_chart() → Matplotlib → PNG → Browser
```

### 6.6 Demo Data Generation Flow

```
  User clicks [Generate Demo Data]
        │
        ▼
  Prompt: "How many machines?" → e.g., 5
  Prompt: "How many days of data?" → e.g., 30
        │
        ▼
  POST /api/demo/generate
  { "num_machines": 5, "days": 30 }
        │
        ▼
  Flask calls demo_data.generate_demo_data(company_id, 5, 30)
        │
        ▼
  ┌─────────────────────────────────────────┐
  │  For each of 5 machines:                │
  │  ├── Create machine (random type/loc)   │
  │  ├── Create 2-4 sensors                 │
  │  └── Generate readings every 15 min     │
  │       for 30 days (up to 50,000 total)  │
  └─────────────────────────────────────────┘
        │
        ▼
  Create alerts for first 3 machines (2-5 each)
        │
        ▼
  Create maintenance tasks (1-3 per machine)
        │
        ▼
  Return { machines: 5, readings: 43200, alerts: 12, maintenance: 9 }
        │
        ▼
  Dashboard reloads → shows new data
```

---

## 7. Future Scope

The current version of IMCS is a solid foundation. Here are the planned and potential improvements for future versions:

### 7.1 🔌 Real-Time Sensor Integration
**Current**: Sensor data is manually entered or uploaded via CSV.
**Future**: Direct integration with physical sensors via:
- **MQTT Protocol** — Industry-standard IoT messaging protocol for real-time sensor data.
- **OPC-UA** — Standard for industrial automation data exchange.
- **REST API Webhooks** — Allow PLCs and SCADA systems to push data directly to IMCS.
- **Modbus TCP** — For legacy industrial equipment.

### 7.2 🤖 AI-Powered Predictive Maintenance
**Current**: Alerts are raised manually or when thresholds are exceeded.
**Future**:
- **Machine Learning models** trained on historical sensor data to predict failures before they happen.
- **Anomaly detection** using algorithms like Isolation Forest or LSTM neural networks.
- **Remaining Useful Life (RUL) estimation** — predict how many hours/days before a component fails.
- **Automated alert generation** based on AI predictions, not just threshold breaches.

### 7.3 📱 Mobile Application
**Current**: Web-only, desktop-optimized UI.
**Future**:
- A dedicated **React Native** or **Flutter** mobile app for iOS and Android.
- Push notifications for critical alerts directly to engineers' phones.
- QR code scanning to quickly navigate to a specific machine's detail page.
- Offline data collection for areas with poor connectivity.

### 7.4 📧 Notification System
**Current**: Alerts are only visible inside the dashboard.
**Future**:
- **Email notifications** (via SMTP / SendGrid) for critical alerts.
- **SMS alerts** (via Twilio) for urgent machine failures.
- **Slack / Microsoft Teams integration** for team-based alert management.
- **Configurable escalation rules** — if an alert is not acknowledged in X minutes, notify the manager.

### 7.5 🔐 Role-Based Access Control (RBAC)
**Current**: All logged-in users have the same access level.
**Future**:
- **Operators** can only view machines and acknowledge alerts.
- **Maintenance Engineers** can create and update work orders.
- **Managers** can view reports and manage users.
- **Admins** have full access including system configuration.

### 7.6 🗄️ Database Upgrade
**Current**: SQLite (file-based, single-server).
**Future**:
- Migrate to **PostgreSQL** for production deployments.
- Support **time-series databases** like **InfluxDB** or **TimescaleDB** for storing millions of sensor readings efficiently.
- Implement **data archiving** — move old readings to cold storage to keep the main database fast.

### 7.7 📊 Advanced Analytics & Business Intelligence
**Current**: Basic charts and 30-day performance reports.
**Future**:
- **Custom report builder** — drag-and-drop interface to create custom reports.
- **Integration with Power BI or Grafana** for enterprise-grade dashboards.
- **Cost analysis** — calculate the financial impact of downtime and maintenance.
- **Benchmarking** — compare machine performance against industry standards.
- **Shift-based reporting** — analyze performance by shift (morning/evening/night).

### 7.8 🌐 Multi-Language Support (i18n)
**Current**: English only.
**Future**:
- Support for multiple languages (Hindi, German, Japanese, etc.) using internationalization (i18n) libraries.
- RTL (Right-to-Left) layout support for Arabic and Hebrew.

### 7.9 🔄 ERP & CMMS Integration
**Current**: Standalone system.
**Future**:
- **SAP ERP integration** — sync machine data and work orders with SAP PM (Plant Maintenance).
- **CMMS integration** — connect with Computerized Maintenance Management Systems like IBM Maximo or Fiix.
- **Spare parts inventory management** — track spare parts and auto-generate purchase orders when stock is low.

### 7.10 ☁️ Cloud & Scalability
**Current**: Single-server Flask application.
**Future**:
- **Microservices architecture** — separate services for auth, data ingestion, analytics, and notifications.
- **Docker + Kubernetes** deployment for auto-scaling.
- **Multi-region deployment** for global manufacturing companies.
- **Data lake integration** — store raw sensor data in AWS S3 or Azure Blob Storage for long-term analysis.

### 7.11 🔒 Enhanced Security
**Current**: Basic session authentication, no encryption at rest.
**Future**:
- **OAuth 2.0 / SSO** — integrate with corporate identity providers (Active Directory, Google Workspace).
- **API key authentication** for machine-to-machine communication.
- **Database encryption at rest** using SQLCipher or PostgreSQL TDE.
- **TLS/SSL enforcement** and security headers (HSTS, CSP, etc.).
- **Two-Factor Authentication (2FA)** for admin accounts.

### 7.12 🏗️ Digital Twin
**Current**: Monitors real machines.
**Future**:
- Create **digital twin models** — virtual representations of physical machines.
- Simulate "what-if" scenarios (e.g., "what happens to efficiency if temperature increases by 10°C?").
- 3D visualization of the factory floor with real-time machine status overlays.

---

## Summary

| Aspect | Current State | Future Vision |
|---|---|---|
| **Data Input** | Manual / CSV upload | Real-time IoT sensors (MQTT, OPC-UA) |
| **Alerts** | Manual / threshold-based | AI-powered predictive alerts |
| **Notifications** | Dashboard only | Email, SMS, Slack, Teams |
| **Access Control** | All users equal | Full RBAC by role |
| **Database** | SQLite | PostgreSQL + TimescaleDB |
| **Platform** | Web (desktop) | Web + Mobile App |
| **Analytics** | Basic charts | BI integration, custom reports |
| **Architecture** | Single server | Microservices + Kubernetes |
| **Integration** | Standalone | SAP, CMMS, ERP systems |
| **Security** | Session auth | OAuth, 2FA, encryption at rest |

---

*IMCS — Built for the factory floor. Designed to grow with your needs.*

*Document prepared: February 2026*
