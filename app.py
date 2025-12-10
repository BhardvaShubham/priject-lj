"""
Complete Clean-Route Backend for SAP-Style Industrial UI
"""

import os
import sqlite3
import logging
from contextlib import contextmanager
from datetime import datetime, timedelta
from flask import Flask, jsonify, render_template, send_from_directory, request, abort

# -----------------------------------------------------------
# Path configuration
# -----------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
CHARTS_DIR = os.path.join(STATIC_DIR, "img", "charts")
DB_PATH = os.path.join(BASE_DIR, "industrial_machinery.db")

os.makedirs(CHARTS_DIR, exist_ok=True)

# -----------------------------------------------------------
# Flask
# -----------------------------------------------------------
app = Flask(__name__, static_folder=STATIC_DIR, template_folder=TEMPLATES_DIR)
app.config["JSONIFY_PRETTYPRINT_REGULAR"] = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("industrial_app")

# -----------------------------------------------------------
# Import visualization module
# -----------------------------------------------------------
try:
    import visualization as viz
except Exception:
    viz = None
    logger.warning("visualization.py missing, fallback charts will be used.")

# -----------------------------------------------------------
# DB Helpers
# -----------------------------------------------------------
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def initialize_db():
    with get_db() as conn:
        cur = conn.cursor()

        cur.execute("""
            CREATE TABLE IF NOT EXISTS machines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                type TEXT,
                location TEXT,
                status TEXT,
                efficiency REAL,
                last_seen TEXT
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_id INTEGER,
                severity TEXT,
                message TEXT,
                raised_at TEXT,
                acknowledged INTEGER DEFAULT 0,
                FOREIGN KEY(machine_id) REFERENCES machines(id)
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_id INTEGER,
                sensor_name TEXT,
                value REAL,
                unit TEXT,
                recorded_at TEXT,
                FOREIGN KEY(machine_id) REFERENCES machines(id)
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_id INTEGER,
                metric_date TEXT,
                efficiency REAL,
                uptime REAL,
                notes TEXT,
                FOREIGN KEY(machine_id) REFERENCES machines(id)
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS maintenance_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_id INTEGER,
                description TEXT,
                priority TEXT,
                technician TEXT,
                scheduled_date TEXT,
                status TEXT DEFAULT 'pending',
                created_at TEXT,
                FOREIGN KEY(machine_id) REFERENCES machines(id)
            )
        """)

        conn.commit()


def seed_sample_data():
    with get_db() as conn:
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) AS c FROM machines")
        if cur.fetchone()["c"] == 0:
            now = datetime.utcnow().isoformat()
            machines = [
                ("CNC-01", "CNC", "Plant A", "Running", 92, now),
                ("Lathe-1", "Lathe", "Plant A", "Warning", 74, now),
                ("Press-B", "Press", "Plant B", "Offline", 0, now),
                ("Mill-A", "Mill", "Plant A", "Running", 87, now)
            ]
            cur.executemany("""
                INSERT INTO machines (name, type, location, status, efficiency, last_seen)
                VALUES (?, ?, ?, ?, ?, ?)
            """, machines)
            conn.commit()

        cur.execute("SELECT COUNT(*) AS c FROM alerts")
        if cur.fetchone()["c"] == 0:
            now = datetime.utcnow().isoformat()
            cur.execute("SELECT id FROM machines LIMIT 2")
            rows = cur.fetchall()
            alerts = []
            for i, r in enumerate(rows, start=1):
                alerts.append((r["id"], "High" if i == 1 else "Critical",
                               f"Auto-seed alert {i}", now))
            cur.executemany("""
                INSERT INTO alerts (machine_id, severity, message, raised_at)
                VALUES (?, ?, ?, ?)
            """, alerts)
            conn.commit()


initialize_db()
seed_sample_data()

# -----------------------------------------------------------
# PAGE ROUTES (Clean URLs, no .html)
# -----------------------------------------------------------
@app.route("/")
def index():
    return render_template("dashboard.html")


@app.route("/dashboard")
def page_dashboard():
    return render_template("dashboard.html")


@app.route("/machinery")
def page_machinery():
    return render_template("machinery-overview.html")


@app.route("/alerts")
def page_alerts():
    return render_template("alerts.html")


@app.route("/maintenance")
def page_maintenance():
    return render_template("maintenance.html")


@app.route("/reports")
def page_reports():
    return render_template("reports.html")


@app.route("/machine/<int:mid>")
def page_machine_details(mid):
    return render_template("machine-details.html", machine_id=mid)

# -----------------------------------------------------------
# STATIC FILES
# -----------------------------------------------------------
@app.route("/static/<path:fn>")
def static_files(fn):
    return send_from_directory(STATIC_DIR, fn)

# -----------------------------------------------------------
# API: SUMMARY
# -----------------------------------------------------------
@app.route("/api/summary")
def api_summary():
    try:
        with get_db() as conn:
            cur = conn.cursor()

            cur.execute("SELECT COUNT(*) AS total FROM machines")
            total = cur.fetchone()["total"]

            cur.execute("SELECT AVG(efficiency) AS avg_eff FROM machines WHERE efficiency > 0")
            r = cur.fetchone()
            avg_eff = round(r["avg_eff"], 1) if r and r["avg_eff"] else 0

            cur.execute("SELECT COUNT(*) AS alerts FROM alerts WHERE acknowledged = 0")
            alerts = cur.fetchone()["alerts"]

            cur.execute("SELECT status, COUNT(*) AS c FROM machines GROUP BY status")
            status_counts = {row["status"]: row["c"] for row in cur.fetchall()}

            cur.execute("SELECT id, name, type, location, status, efficiency FROM machines ORDER BY id")
            machines = [dict(x) for x in cur.fetchall()]

            cur.execute("""
                SELECT a.id, m.name AS machine, a.severity, a.message,
                       a.raised_at, a.acknowledged
                FROM alerts a
                LEFT JOIN machines m ON m.id = a.machine_id
                ORDER BY a.raised_at DESC
            """)
            alerts_list = [dict(x) for x in cur.fetchall()]

            return jsonify({
                "total_machines": total,
                "avg_efficiency": avg_eff,
                "active_alerts": alerts,
                "status_counts": status_counts,
                "machines": machines,
                "alerts": alerts_list
            })

    except Exception:
        logger.exception("api/summary failed")
        return jsonify({
            "total_machines": 0,
            "avg_efficiency": 0,
            "active_alerts": 0,
            "status_counts": {},
            "machines": [],
            "alerts": []
        })

# -----------------------------------------------------------
# API: MACHINES, ALERTS, MAINTENANCE
# -----------------------------------------------------------
@app.route("/api/machines")
def api_machines():
    status = request.args.get("status")
    q = request.args.get("q")
    try:
        with get_db() as conn:
            cur = conn.cursor()

            sql = "SELECT id,name,type,location,status,efficiency FROM machines"
            params = []
            cond = []

            if status:
                cond.append("status = ?")
                params.append(status)

            if q:
                cond.append("(name LIKE ? OR type LIKE ? OR location LIKE ?)")
                qv = f"%{q}%"
                params.extend([qv, qv, qv])

            if cond:
                sql += " WHERE " + " AND ".join(cond)

            sql += " ORDER BY id"

            cur.execute(sql, params)
            return jsonify([dict(r) for r in cur.fetchall()])

    except Exception:
        logger.exception("api/machines failed")
        return jsonify([])

@app.route("/api/machines/<int:mid>")
def api_machine(mid):
    try:
        with get_db() as conn:
            cur = conn.cursor()

            cur.execute("SELECT * FROM machines WHERE id = ?", (mid,))
            m = cur.fetchone()
            if not m:
                return jsonify({"error": "not found"}), 404

            machine = dict(m)

            cur.execute("""
                SELECT sensor_name, value, unit, recorded_at
                FROM sensor_readings
                WHERE machine_id = ?
                ORDER BY recorded_at DESC
                LIMIT 20
            """, (mid,))
            machine["sensors"] = [dict(x) for x in cur.fetchall()]

            cur.execute("""
                SELECT metric_date, efficiency, uptime
                FROM performance_metrics
                WHERE machine_id = ?
                ORDER BY metric_date DESC
                LIMIT 7
            """, (mid,))
            machine["recent_performance"] = [dict(x) for x in cur.fetchall()]

            return jsonify(machine)

    except Exception:
        logger.exception("api/machine failed")
        return jsonify({"error": "unexpected"}), 500

@app.route("/api/alerts")
def api_alerts():
    ack = request.args.get("ack")
    try:
        with get_db() as conn:
            cur = conn.cursor()

            sql = """
                SELECT a.id, a.machine_id, m.name AS machine,
                       a.severity, a.message, a.raised_at, a.acknowledged
                FROM alerts a
                LEFT JOIN machines m ON m.id = a.machine_id
            """
            params = []

            if ack is not None:
                sql += " WHERE a.acknowledged = ?"
                params.append(1 if ack == "1" else 0)

            sql += " ORDER BY a.raised_at DESC"

            cur.execute(sql, params)
            return jsonify([dict(r) for r in cur.fetchall()])

    except Exception:
        logger.exception("api/alerts fail")
        return jsonify([])

@app.route("/api/alerts/<int:alert_id>/ack", methods=["POST"])
def api_ack_alert(alert_id):
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("UPDATE alerts SET acknowledged = 1 WHERE id = ?", (alert_id,))
            conn.commit()
            return jsonify({"ok": True})
    except Exception:
        logger.exception("ack failed")
        return jsonify({"ok": False}), 500


@app.route("/api/maintenance", methods=["GET", "POST"])
def api_maintenance():
    if request.method == "GET":
        try:
            with get_db() as conn:
                cur = conn.cursor()
                cur.execute("""
                    SELECT t.*, m.name AS machine
                    FROM maintenance_tasks t
                    LEFT JOIN machines m ON m.id = t.machine_id
                    ORDER BY t.created_at DESC
                """)
                return jsonify([dict(r) for r in cur.fetchall()])
        except Exception:
            logger.exception("maintenance GET fail")
            return jsonify([])

    # POST create maintenance task
    data = request.json or {}
    machine_id = data.get("machine_id")
    description = data.get("description", "")
    priority = data.get("priority", "Medium")
    technician = data.get("technician", "")
    scheduled_date = data.get("scheduled_date")

    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO maintenance_tasks
                (machine_id, description, priority, technician, scheduled_date, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (machine_id, description, priority, technician,
                  scheduled_date, datetime.utcnow().isoformat()))
            conn.commit()
            return jsonify({"ok": True})
    except Exception:
        logger.exception("maintenance POST fail")
        return jsonify({"ok": False}), 500

# -----------------------------------------------------------
# CHART ROUTES
# -----------------------------------------------------------
def safe_chart(func, out_path):
    try:
        with get_db() as conn:
            buf = func(conn)
            with open(out_path, "wb") as f:
                f.write(buf.getbuffer())
            return True
    except Exception:
        return False


@app.route("/chart/summary.png")
def chart_summary():
    filename = "summary.png"
    out = os.path.join(CHARTS_DIR, filename)

    if viz and hasattr(viz, "performance_trends_chart_from_conn"):
        ok = safe_chart(viz.performance_trends_chart_from_conn, out)
        if ok:
            return send_from_directory(CHARTS_DIR, filename)

    abort(404)


@app.route("/chart/machine/<int:mid>.png")
def chart_machine(mid):
    filename = f"machine_{mid}.png"
    out = os.path.join(CHARTS_DIR, filename)

    if viz and hasattr(viz, "machine_chart_from_conn"):
        ok = safe_chart(lambda conn: viz.machine_chart_from_conn(conn, mid), out)
        if ok:
            return send_from_directory(CHARTS_DIR, filename)

    abort(404)


@app.route("/chart/trend/<int:mid>.png")
def chart_trend(mid):
    days = int(request.args.get("days", 30))
    filename = f"trend_{mid}_{days}.png"
    out = os.path.join(CHARTS_DIR, filename)

    if viz and hasattr(viz, "trend_chart_from_conn"):
        ok = safe_chart(lambda conn: viz.trend_chart_from_conn(conn, mid, days=days), out)
        if ok:
            return send_from_directory(CHARTS_DIR, filename)

    abort(404)

# -----------------------------------------------------------
# HEALTH CHECK
# -----------------------------------------------------------
@app.route("/health")
def health():
    try:
        with get_db() as conn:
            c = conn.execute("SELECT COUNT(*) FROM machines").fetchone()[0]
            return jsonify({"status": "ok", "machines": c})
    except:
        return jsonify({"status": "error"}), 500


# -----------------------------------------------------------
# Run
# -----------------------------------------------------------
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
