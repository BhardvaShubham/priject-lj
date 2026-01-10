from flask import Flask, request, jsonify, render_template, send_file
import sqlite3
from datetime import datetime, timedelta
import io
import os
import csv
import json
import pandas as pd
from werkzeug.utils import secure_filename

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import visualization as viz

DB = "imcs.db"
UPLOAD_FOLDER = 'data/uploads'
ALLOWED_EXTENSIONS = {'csv'}

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ===================== DB =====================
def db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def log(user, action, entity, entity_id=None):
    with db() as c:
        c.execute(
            "INSERT INTO audit_log(user,action,entity,entity_id) VALUES (?,?,?,?)",
            (user, action, entity, entity_id)
        )

# ===================== UI =====================
@app.route("/")
@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@app.route("/machinery")
def machinery():
    return render_template("machinery-overview.html")

@app.route("/machine/<int:mid>")
def machine_page(mid):
    return render_template("machine-details.html", machine_id=mid)

@app.route("/alerts")
def alerts_page():
    return render_template("alerts.html")

@app.route("/maintenance")
def maintenance_page():
    return render_template("maintenance.html")

@app.route("/reports")
def reports_page():
    return render_template("reports.html")

# ===================== APIs =====================

@app.route("/api/summary")
def summary():
    try:
        with db() as c:
            total = c.execute("SELECT COUNT(*) FROM machines").fetchone()[0]
            
            # Handle empty sensor_readings table
            avg_eff_result = c.execute("SELECT AVG(value) FROM sensor_readings").fetchone()
            avg_eff = avg_eff_result[0] if avg_eff_result and avg_eff_result[0] is not None else 0
            
            alerts = c.execute(
                "SELECT COUNT(*) FROM alarms WHERE acknowledged=0"
            ).fetchone()[0]

        return jsonify({
            "total_machines": total,
            "avg_efficiency": round(avg_eff, 1),
            "active_alerts": alerts
        })
    except Exception as e:
        return jsonify({
            "total_machines": 0,
            "avg_efficiency": 0,
            "active_alerts": 0,
            "error": str(e)
        }), 500

@app.route("/api/machines", methods=["GET", "POST"])
def machines():
    if request.method == "POST":
        # Create new machine
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        required = ["name", "type", "location"]
        if not all(k in data for k in required):
            return jsonify({"error": "Missing required fields"}), 400
        
        with db() as c:
            cursor = c.execute(
                """INSERT INTO machines (name, type, location, rated_capacity, status)
                   VALUES (?, ?, ?, ?, ?)""",
                (data["name"], data["type"], data["location"], 
                 data.get("rated_capacity"), data.get("status", "idle"))
            )
            c.commit()
            machine_id = cursor.lastrowid
            
            log("system", "create", "machine", machine_id)
            
            return jsonify({"success": True, "id": machine_id, "message": "Machine created"}), 201
    
    # GET - List all machines
    with db() as c:
        rows = c.execute("SELECT * FROM machines").fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/machines/<int:mid>")
def machine_details(mid):
    with db() as c:
        m = c.execute("SELECT * FROM machines WHERE id=?", (mid,)).fetchone()
        if not m:
            return jsonify({"error": "Machine not found"}), 404

        # Enhanced sensor data with history
        sensors = c.execute(
            """SELECT s.id, s.name AS sensor_name, s.unit, s.min_threshold, s.max_threshold,
                      r.value, r.timestamp
               FROM sensors s
               LEFT JOIN sensor_readings r ON s.id=r.sensor_id
               WHERE s.machine_id=?
               ORDER BY r.timestamp DESC LIMIT 10""",
            (mid,)
        ).fetchall()

        # Performance history (30 days)
        perf = c.execute(
            """SELECT DATE(timestamp) AS metric_date,
                      AVG(value) AS efficiency,
                      MIN(value) AS min_eff,
                      MAX(value) AS max_eff,
                      COUNT(*) AS reading_count
               FROM sensor_readings
               WHERE sensor_id IN (
                 SELECT id FROM sensors WHERE machine_id=?
               )
               GROUP BY DATE(timestamp)
               ORDER BY metric_date DESC LIMIT 30""",
            (mid,)
        ).fetchall()

        # Historical trends (last 100 readings)
        trends = c.execute(
            """SELECT timestamp, value, s.name as sensor_name
               FROM sensor_readings r
               JOIN sensors s ON r.sensor_id = s.id
               WHERE s.machine_id = ?
               ORDER BY r.timestamp DESC LIMIT 100""",
            (mid,)
        ).fetchall()

        # Alerts for this machine
        machine_alerts = c.execute(
            """SELECT * FROM alarms WHERE machine_id=? ORDER BY raised_at DESC LIMIT 10""",
            (mid,)
        ).fetchall()

        # Maintenance history
        maintenance = c.execute(
            """SELECT * FROM maintenance_tasks 
               WHERE machine_id=? 
               ORDER BY created_at DESC LIMIT 10""",
            (mid,)
        ).fetchall()

        # Sensor statistics
        sensor_stats = c.execute("""
            SELECT s.name, s.unit,
                   AVG(r.value) as avg_value,
                   MIN(r.value) as min_value,
                   MAX(r.value) as max_value,
                   COUNT(r.id) as reading_count
            FROM sensors s
            LEFT JOIN sensor_readings r ON s.id = r.sensor_id
            WHERE s.machine_id = ?
            GROUP BY s.id, s.name, s.unit
        """, (mid,)).fetchall()

        # Get OEE data
        oee_data = None
        try:
            oee_response = oee(mid)
            if oee_response:
                oee_data = oee_response.get_json()
        except:
            oee_data = {"availability": 0, "performance": 0, "quality": 100, "oee": 0}

    return jsonify({
        **dict(m),
        "sensors": [dict(s) for s in sensors],
        "recent_performance": [dict(p) for p in perf],
        "performance": [
            {
                "date": str(p[0]),
                "efficiency": round(p[1] or 0, 1),
                "min": round(p[2] or 0, 1) if p[2] else None,
                "max": round(p[3] or 0, 1) if p[3] else None,
                "readings": p[4] or 0
            }
            for p in perf
        ],
        "trends": [{"timestamp": str(t[0]), "value": float(t[1]) if t[1] else 0, "sensor": t[2]} for t in trends],
        "alerts": [dict(a) for a in machine_alerts],
        "maintenance": [dict(m) for m in maintenance],
        "sensor_stats": [
            {
                "name": s[0] or "Unknown",
                "unit": s[1] or "",
                "avg": round(s[2] or 0, 2) if s[2] else 0,
                "min": round(s[3] or 0, 2) if s[3] else 0,
                "max": round(s[4] or 0, 2) if s[4] else 0,
                "count": s[5] or 0
            }
            for s in sensor_stats
        ],
        "oee": oee_data or {"availability": 0, "performance": 0, "quality": 100, "oee": 0}
    })

# ===================== PHASE-1.3 =====================

@app.route("/api/oee/<int:mid>")
def oee(mid):
    with db() as c:
        eff = c.execute(
            """SELECT AVG(value) FROM sensor_readings
               WHERE sensor_id IN (
                 SELECT id FROM sensors WHERE machine_id=?
               )""",
            (mid,)
        ).fetchone()[0] or 0

    availability = 100 if eff > 0 else 0
    oee = round((availability/100) * (eff/100) * 100, 1)

    return jsonify({
        "availability": availability,
        "performance": round(eff, 1),
        "quality": 100,
        "oee": oee
    })

@app.route("/api/reliability/<int:mid>")
def reliability(mid):
    with db() as c:
        failures = c.execute(
            "SELECT COUNT(*) FROM alarms WHERE machine_id=?",
            (mid,)
        ).fetchone()[0]

        repairs = c.execute(
            """SELECT COUNT(*) FROM maintenance_tasks
               WHERE machine_id=? AND status='completed'""",
            (mid,)
        ).fetchone()[0]

    return jsonify({
        "mtbf_hours": round(24 / max(failures, 1), 2),
        "mttr_hours": round(2 / max(repairs, 1), 2)
    })

# ===================== CHARTS =====================

@app.route("/chart/summary.png")
def chart_summary():
    with db() as c:
        machines = c.execute("SELECT COUNT(*) FROM machines").fetchone()[0]
        alerts = c.execute("SELECT COUNT(*) FROM alarms WHERE acknowledged=0").fetchone()[0]
        avg_value_result = c.execute("SELECT AVG(value) FROM sensor_readings").fetchone()
        avg_value = avg_value_result[0] if avg_value_result and avg_value_result[0] else 0

    fig, ax = plt.subplots(figsize=(8, 4), facecolor='white')

    if machines == 0:
        ax.text(
            0.5, 0.5,
            "No operational data yet",
            ha="center", va="center",
            fontsize=14, alpha=0.6,
            transform=ax.transAxes,
            color='#666'
        )
        ax.set_title("Plant Summary", fontsize=14, fontweight='bold', pad=15)
        ax.axis("off")
    else:
        colors = ['#0a6ed1', '#e9730c', '#107e3e']
        bars = ax.bar(
            ["Machines", "Active Alerts", "Avg Sensor"],
            [machines, alerts, round(avg_value, 1)],
            color=colors,
            edgecolor='#003366',
            linewidth=1.5,
            alpha=0.9
        )
        
        # Add value labels on bars
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{int(height) if height == int(height) else round(height, 1)}',
                   ha='center', va='bottom', fontsize=11, fontweight='bold')
        
        ax.set_title("Plant Summary", fontsize=14, fontweight='bold', pad=15, color='#003366')
        ax.grid(axis="y", alpha=0.3, linestyle='--', linewidth=1)
        ax.set_ylabel("Count", fontsize=11, fontweight='bold')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.tick_params(axis='both', labelsize=10)

    buf = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format="png", dpi=120, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return send_file(buf, mimetype="image/png")

@app.route("/chart/machine/<int:mid>.png")
def chart_machine(mid):
    with db() as c:
        rows = c.execute(
            """SELECT timestamp,value FROM sensor_readings
               WHERE sensor_id IN (
                 SELECT id FROM sensors WHERE machine_id=?
               )
               ORDER BY timestamp DESC LIMIT 50""",
            (mid,)
        ).fetchall()

    fig, ax = plt.subplots(figsize=(10, 4), facecolor='white')

    if not rows:
        ax.text(
            0.5, 0.5,
            "No Sensor Data",
            ha="center", va="center",
            fontsize=14, alpha=0.6,
            transform=ax.transAxes,
            color='#666'
        )
        ax.axis("off")
    else:
        times = [r["timestamp"][-8:] if len(r["timestamp"]) > 8 else r["timestamp"] for r in rows][::-1]
        values = [float(r["value"]) if r["value"] else 0 for r in rows][::-1]
        
        ax.plot(times, values, marker="o", linewidth=3, markersize=6,
               color='#0a6ed1', markerfacecolor='white', markeredgewidth=2,
               markeredgecolor='#0a6ed1', alpha=0.9)
        ax.fill_between(range(len(values)), values, alpha=0.2, color='#0a6ed1')
        
        ax.set_title(f"Machine {mid} Sensor Trend", fontsize=14, fontweight='bold', 
                    pad=15, color='#003366')
        ax.set_xlabel("Time", fontsize=11, fontweight='bold')
        ax.set_ylabel("Value", fontsize=11, fontweight='bold')
        ax.grid(alpha=0.3, linestyle='--', linewidth=1)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        plt.xticks(rotation=45, fontsize=9)
        plt.yticks(fontsize=9)

    buf = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format="png", dpi=120, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return send_file(buf, mimetype="image/png")

@app.route("/chart/oee/<int:mid>.png")
def chart_oee(mid):
    """OEE gauge chart for a machine."""
    oee_data = oee(mid)
    oee_val = oee_data.get_json().get("oee", 0)
    buf = viz.oee_gauge_chart(oee_val)
    return send_file(buf, mimetype="image/png")

@app.route("/chart/status.png")
def chart_status():
    """Machine status distribution pie chart."""
    with db() as conn:
        buf = viz.status_pie_chart_from_conn(conn)
    return send_file(buf, mimetype="image/png")

@app.route("/chart/multi-sensor/<int:mid>.png")
def chart_multi_sensor(mid):
    """Multi-sensor trend chart."""
    days = request.args.get("days", 7, type=int)
    with db() as conn:
        buf = viz.multi_sensor_trend_chart(conn, mid, days)
    return send_file(buf, mimetype="image/png")

@app.route("/chart/heatmap.png")
def chart_heatmap():
    """Status heatmap by location."""
    with db() as conn:
        buf = viz.status_heatmap_chart(conn)
    return send_file(buf, mimetype="image/png")

@app.route("/chart/performance.png")
def chart_performance():
    """Performance comparison chart."""
    days = request.args.get("days", 30, type=int)
    with db() as conn:
        buf = viz.performance_comparison_chart(conn, days)
    return send_file(buf, mimetype="image/png")

@app.route("/chart/alerts-trend.png")
def chart_alerts_trend():
    """Alert frequency trend chart."""
    days = request.args.get("days", 14, type=int)
    with db() as conn:
        buf = viz.alert_frequency_chart_from_conn(conn, days)
    return send_file(buf, mimetype="image/png")

# ===================== DATA APIs FOR CLIENT-SIDE CHARTS =====================

@app.route("/api/chart-data/summary")
def chart_data_summary():
    """JSON data for client-side chart rendering."""
    try:
        with db() as c:
            machines = c.execute("SELECT COUNT(*) FROM machines").fetchone()[0]
            alerts = c.execute("SELECT COUNT(*) FROM alarms WHERE acknowledged=0").fetchone()[0]
            
            # Handle case where sensor_readings table might be empty
            avg_eff_result = c.execute("SELECT AVG(value) FROM sensor_readings").fetchone()
            avg_eff = avg_eff_result[0] if avg_eff_result and avg_eff_result[0] is not None else 0
            
            # Status distribution
            status_data = c.execute(
                "SELECT status, COUNT(*) as cnt FROM machines GROUP BY status"
            ).fetchall()
            
            # Recent performance (last 7 days) - handle empty case
            perf_data = c.execute("""
                SELECT DATE(timestamp) as d, AVG(value) as eff
                FROM sensor_readings
                WHERE timestamp >= date('now', '-7 days')
                GROUP BY DATE(timestamp)
                ORDER BY d ASC
            """).fetchall()
        
        # If no performance data, create empty trend
        if not perf_data:
            perf_data = []
        
        return jsonify({
            "kpis": {
                "machines": machines,
                "alerts": alerts,
                "avg_efficiency": round(avg_eff, 1)
            },
            "status_distribution": {row[0] or "unknown": row[1] for row in status_data},
            "performance_trend": [
                {"date": str(row[0]), "efficiency": round(row[1] or 0, 1)} 
                for row in perf_data
            ]
        })
    except Exception as e:
        # Return empty data structure on error
        return jsonify({
            "kpis": {"machines": 0, "alerts": 0, "avg_efficiency": 0},
            "status_distribution": {},
            "performance_trend": []
        })

@app.route("/api/chart-data/machine/<int:mid>")
def chart_data_machine(mid):
    """JSON data for machine-specific charts."""
    try:
        with db() as c:
            # Sensor readings (last 100 for better visualization)
            readings = c.execute("""
                SELECT timestamp, value, s.name as sensor_name, s.unit
                FROM sensor_readings r
                JOIN sensors s ON r.sensor_id = s.id
                WHERE s.machine_id = ?
                ORDER BY r.timestamp DESC LIMIT 100
            """, (mid,)).fetchall()
            
            # OEE data
            oee_data = oee(mid).get_json()
            
            # Performance history (30 days)
            perf = c.execute("""
                SELECT DATE(timestamp) as d, 
                       AVG(value) as eff,
                       MIN(value) as min_eff,
                       MAX(value) as max_eff,
                       COUNT(*) as reading_count
                FROM sensor_readings
                WHERE sensor_id IN (SELECT id FROM sensors WHERE machine_id=?)
                GROUP BY DATE(timestamp)
                ORDER BY d DESC LIMIT 30
            """, (mid,)).fetchall()
            
            # Sensor statistics
            sensor_stats = c.execute("""
                SELECT s.name, s.unit,
                       AVG(r.value) as avg_value,
                       MIN(r.value) as min_value,
                       MAX(r.value) as max_value,
                       COUNT(r.id) as reading_count
                FROM sensors s
                LEFT JOIN sensor_readings r ON s.id = r.sensor_id
                WHERE s.machine_id = ?
                GROUP BY s.id, s.name, s.unit
            """, (mid,)).fetchall()
        
        return jsonify({
            "sensor_readings": [
                {
                    "timestamp": str(r[0]), 
                    "value": float(r[1]) if r[1] is not None else 0, 
                    "sensor": r[2] or "",
                    "unit": r[3] or ""
                } 
                for r in readings
            ],
            "oee": oee_data,
            "performance": [
                {
                    "date": str(p[0]), 
                    "efficiency": round(p[1] or 0, 1),
                    "min": round(p[2] or 0, 1) if p[2] else 0,
                    "max": round(p[3] or 0, 1) if p[3] else 0,
                    "readings": p[4] or 0
                } 
                for p in perf
            ],
            "sensor_stats": [
                {
                    "name": s[0],
                    "unit": s[1],
                    "avg": round(s[2] or 0, 2) if s[2] else 0,
                    "min": round(s[3] or 0, 2) if s[3] else 0,
                    "max": round(s[4] or 0, 2) if s[4] else 0,
                    "count": s[5] or 0
                }
                for s in sensor_stats
            ]
        })
    except Exception as e:
        return jsonify({
            "error": str(e),
            "sensor_readings": [],
            "oee": {"availability": 0, "performance": 0, "quality": 0, "oee": 0},
            "performance": [],
            "sensor_stats": []
        }), 500

@app.route("/api/machine/<int:mid>/analytics")
def machine_analytics(mid):
    """Advanced analytics for a machine."""
    try:
        with db() as c:
            # Uptime calculation
            total_readings = c.execute("""
                SELECT COUNT(*) FROM sensor_readings
                WHERE sensor_id IN (SELECT id FROM sensors WHERE machine_id=?)
            """, (mid,)).fetchone()[0]
            
            # Failure rate
            failures = c.execute("""
                SELECT COUNT(*) FROM alarms 
                WHERE machine_id=? AND severity='critical'
            """, (mid,)).fetchone()[0]
            
            # Maintenance frequency
            maint_count = c.execute("""
                SELECT COUNT(*) FROM maintenance_tasks 
                WHERE machine_id=? AND status='completed'
            """, (mid,)).fetchone()[0]
            
            # Efficiency trend (last 7 days)
            efficiency_trend = c.execute("""
                SELECT DATE(timestamp) as d, AVG(value) as eff
                FROM sensor_readings
                WHERE sensor_id IN (SELECT id FROM sensors WHERE machine_id=?)
                  AND timestamp >= date('now', '-7 days')
                GROUP BY DATE(timestamp)
                ORDER BY d ASC
            """, (mid,)).fetchall()
            
            # Peak performance time
            hourly_perf = c.execute("""
                SELECT strftime('%H', timestamp) as hour, AVG(value) as avg_eff
                FROM sensor_readings
                WHERE sensor_id IN (SELECT id FROM sensors WHERE machine_id=?)
                GROUP BY strftime('%H', timestamp)
                ORDER BY avg_eff DESC
                LIMIT 1
            """, (mid,)).fetchone()
        
        return jsonify({
            "total_readings": total_readings,
            "failure_rate": round((failures / max(total_readings, 1)) * 100, 2),
            "maintenance_frequency": maint_count,
            "efficiency_trend": [
                {"date": str(e[0]), "efficiency": round(e[1] or 0, 1)} 
                for e in efficiency_trend
            ],
            "peak_hour": hourly_perf[0] if hourly_perf else None,
            "peak_efficiency": round(hourly_perf[1] or 0, 1) if hourly_perf else 0
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/dashboard/widgets")
def dashboard_widgets():
    """Enhanced dashboard widget data."""
    try:
        with db() as c:
            # Overall statistics
            total_machines = c.execute("SELECT COUNT(*) FROM machines").fetchone()[0]
            running_machines = c.execute("SELECT COUNT(*) FROM machines WHERE status='running'").fetchone()[0]
            active_alerts = c.execute("SELECT COUNT(*) FROM alarms WHERE acknowledged=0").fetchone()[0]
            
            # Efficiency metrics
            avg_eff_result = c.execute("SELECT AVG(value) FROM sensor_readings").fetchone()
            avg_eff = avg_eff_result[0] if avg_eff_result and avg_eff_result[0] else 0
            
            # Location breakdown
            location_stats = c.execute("""
                SELECT m.location, COUNT(*) as count
                FROM machines m
                GROUP BY m.location
            """).fetchall()
            
            # Calculate efficiency per location
            location_eff = {}
            for loc in location_stats:
                loc_name = loc[0]
                machine_ids = c.execute(
                    "SELECT id FROM machines WHERE location=?", (loc_name,)
                ).fetchall()
                if machine_ids:
                    eff_values = []
                    for mid in machine_ids:
                        eff = c.execute("""
                            SELECT AVG(value) FROM sensor_readings
                            WHERE sensor_id IN (SELECT id FROM sensors WHERE machine_id=?)
                        """, (mid[0],)).fetchone()
                        if eff and eff[0]:
                            eff_values.append(eff[0])
                    location_eff[loc_name] = sum(eff_values) / len(eff_values) if eff_values else 0
                else:
                    location_eff[loc_name] = 0
            
            location_stats = [
                (loc[0], loc[1], location_eff.get(loc[0], 0))
                for loc in location_stats
            ]
            
            # Recent activity
            recent_alerts = c.execute("""
                SELECT a.*, m.name as machine_name
                FROM alarms a
                LEFT JOIN machines m ON a.machine_id = m.id
                ORDER BY a.raised_at DESC LIMIT 5
            """).fetchall()
            
            # Maintenance status
            pending_maintenance = c.execute("""
                SELECT COUNT(*) FROM maintenance_tasks WHERE status='open'
            """).fetchone()[0]
        
        return jsonify({
            "overview": {
                "total_machines": total_machines,
                "running_machines": running_machines,
                "active_alerts": active_alerts,
                "avg_efficiency": round(avg_eff, 1),
                "uptime_percentage": round((running_machines / max(total_machines, 1)) * 100, 1),
                "pending_maintenance": pending_maintenance
            },
            "location_breakdown": [
                {
                    "location": l[0],
                    "machine_count": l[1],
                    "avg_efficiency": round(l[2] or 0, 1) if l[2] else 0
                }
                for l in location_stats
            ],
            "recent_alerts": [dict(a) for a in recent_alerts]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/chart-data/alerts")
def chart_data_alerts():
    """JSON data for alerts trend chart."""
    try:
        days = request.args.get("days", 14, type=int)
        with db() as c:
            data = c.execute("""
                SELECT date(raised_at) as d, COUNT(*) as cnt, severity
                FROM alarms
                WHERE raised_at >= date('now', '-{} days')
                GROUP BY date(raised_at), severity
                ORDER BY d ASC
            """.format(days)).fetchall()
        
        # Group by date
        by_date = {}
        for row in data:
            date = row[0]
            if date not in by_date:
                by_date[date] = {"total": 0, "critical": 0, "warning": 0, "info": 0}
            by_date[date]["total"] += row[1]
            by_date[date][row[2] or "info"] += row[1]
        
        return jsonify({
            "trend": [
                {"date": str(date), **counts} 
                for date, counts in sorted(by_date.items())
            ]
        })
    except Exception as e:
        # Return empty trend on error
        return jsonify({"trend": []})

# ===================== ALERTS API =====================

@app.route("/api/alerts", methods=["GET", "POST"])
def alerts():
    """Get or create alerts."""
    if request.method == "POST":
        # Create new alert
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        required = ["machine_id", "severity", "message"]
        if not all(k in data for k in required):
            return jsonify({"error": "Missing required fields"}), 400
        
        with db() as c:
            cursor = c.execute(
                """INSERT INTO alarms (machine_id, severity, message, raised_at, acknowledged)
                   VALUES (?, ?, ?, datetime('now'), 0)""",
                (data["machine_id"], data["severity"], data["message"])
            )
            c.commit()
            alert_id = cursor.lastrowid
            log("system", "create", "alarm", alert_id)
            return jsonify({"success": True, "id": alert_id}), 201
    
    # GET - List alerts
    ack_filter = request.args.get("ack")
    with db() as c:
        query = "SELECT a.*, m.name as machine FROM alarms a LEFT JOIN machines m ON a.machine_id = m.id"
        params = []
        
        if ack_filter is not None:
            ack_val = 1 if ack_filter == "1" else 0
            query += " WHERE a.acknowledged = ?"
            params.append(ack_val)
        
        query += " ORDER BY a.raised_at DESC LIMIT 100"
        rows = c.execute(query, params).fetchall()
    
    return jsonify([dict(r) for r in rows])

@app.route("/api/alerts/<int:alert_id>/ack", methods=["POST"])
def acknowledge_alert(alert_id):
    """Acknowledge an alert."""
    data = request.json or {}
    user = data.get("user", "system")
    comment = data.get("comment")
    
    with db() as c:
        c.execute(
            """UPDATE alarms 
               SET acknowledged = 1, 
                   acknowledged_by = ?,
                   acknowledged_at = datetime('now'),
                   comment = ?
               WHERE id = ?""",
            (user, comment, alert_id)
        )
        c.commit()
        log(user, "acknowledge", "alarm", alert_id)
    
    return jsonify({"success": True, "message": "Alert acknowledged"})

# ===================== MAINTENANCE API =====================

@app.route("/api/maintenance", methods=["GET", "POST"])
def maintenance():
    """Get or create maintenance tasks."""
    if request.method == "POST":
        # Create new maintenance task
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        required = ["machine_id", "description"]
        if not all(k in data for k in required):
            return jsonify({"error": "Missing required fields"}), 400
        
        with db() as c:
            cursor = c.execute(
                """INSERT INTO maintenance_tasks 
                   (machine_id, description, priority, technician, scheduled_date, status)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (data["machine_id"], 
                 data["description"],
                 data.get("priority", "medium"),
                 data.get("technician"),
                 data.get("scheduled_date"),
                 data.get("status", "open"))
            )
            c.commit()
            task_id = cursor.lastrowid
            log("system", "create", "maintenance", task_id)
            return jsonify({"success": True, "id": task_id, "ok": True}), 201
    
    # GET - List maintenance tasks
    status_filter = request.args.get("status")
    with db() as c:
        query = """SELECT t.*, m.name as machine 
                   FROM maintenance_tasks t 
                   LEFT JOIN machines m ON t.machine_id = m.id"""
        params = []
        
        if status_filter:
            query += " WHERE t.status = ?"
            params.append(status_filter)
        
        query += " ORDER BY t.created_at DESC LIMIT 100"
        rows = c.execute(query, params).fetchall()
    
    return jsonify([dict(r) for r in rows])

@app.route("/api/maintenance/<int:task_id>", methods=["PUT"])
def update_maintenance(task_id):
    """Update maintenance task."""
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    updates = []
    params = []
    
    if "status" in data:
        updates.append("status = ?")
        params.append(data["status"])
    
    if "technician" in data:
        updates.append("technician = ?")
        params.append(data["technician"])
    
    if "scheduled_date" in data:
        updates.append("scheduled_date = ?")
        params.append(data["scheduled_date"])
    
    if "priority" in data:
        updates.append("priority = ?")
        params.append(data["priority"])
    
    if data.get("status") == "completed":
        updates.append("completed_at = datetime('now')")
    
    if not updates:
        return jsonify({"error": "No fields to update"}), 400
    
    params.append(task_id)
    
    with db() as c:
        c.execute(
            f"UPDATE maintenance_tasks SET {', '.join(updates)} WHERE id = ?",
            params
        )
        c.commit()
        log("system", "update", "maintenance", task_id)
    
    return jsonify({"success": True, "message": "Task updated"})

# ===================== CSV UPLOAD & VISUALIZATION =====================

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/api/upload-csv", methods=["POST"])
def upload_csv():
    """Upload and parse CSV file for visualization."""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Parse CSV
            df = pd.read_csv(filepath)
            
            # Convert to JSON-serializable format
            data = {
                "columns": df.columns.tolist(),
                "rows": df.head(1000).to_dict('records'),  # Limit to 1000 rows
                "row_count": len(df),
                "filename": filename
            }
            
            # Store in session/cache for visualization
            cache_key = f"csv_{filename}_{datetime.now().timestamp()}"
            cache_file = os.path.join(UPLOAD_FOLDER, f"{cache_key}.json")
            with open(cache_file, 'w') as f:
                json.dump(data, f)
            
            return jsonify({
                "success": True,
                "cache_key": cache_key,
                "data": data,
                "message": f"CSV uploaded successfully. {len(df)} rows, {len(df.columns)} columns"
            })
        except Exception as e:
            return jsonify({"error": f"Error parsing CSV: {str(e)}"}), 400
    
    return jsonify({"error": "Invalid file type"}), 400

@app.route("/api/csv-data/<cache_key>")
def get_csv_data(cache_key):
    """Retrieve cached CSV data."""
    cache_file = os.path.join(UPLOAD_FOLDER, f"{cache_key}.json")
    try:
        with open(cache_file, 'r') as f:
            return jsonify(json.load(f))
    except:
        return jsonify({"error": "Data not found"}), 404

@app.route("/api/csv-visualize", methods=["POST"])
def visualize_csv():
    """Generate visualization data from CSV."""
    data = request.json
    if not data or 'columns' not in data or 'rows' not in data:
        return jsonify({"error": "Invalid data"}), 400
    
    try:
        df = pd.DataFrame(data['rows'])
        
        # Auto-detect numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        date_cols = df.select_dtypes(include=['datetime64']).columns.tolist()
        
        # Generate summary statistics
        summary = {}
        for col in numeric_cols:
            summary[col] = {
                "min": float(df[col].min()),
                "max": float(df[col].max()),
                "mean": float(df[col].mean()),
                "std": float(df[col].std())
            }
        
        # Time series data if date column exists
        time_series = None
        if date_cols and numeric_cols:
            date_col = date_cols[0]
            numeric_col = numeric_cols[0]
            df_sorted = df.sort_values(date_col)
            time_series = {
                "labels": df_sorted[date_col].astype(str).tolist(),
                "data": df_sorted[numeric_col].tolist(),
                "label": numeric_col
            }
        
        return jsonify({
            "success": True,
            "numeric_columns": numeric_cols,
            "date_columns": date_cols,
            "summary": summary,
            "time_series": time_series,
            "chart_data": {
                "bar": numeric_cols[:5],  # Top 5 for bar chart
                "line": time_series
            }
        })
    except Exception as e:
        return jsonify({"error": f"Error processing data: {str(e)}"}), 400

# ===================== HEALTH =====================
@app.route("/health")
def health():
    try:
        with db() as c:
            c.execute("SELECT 1").fetchone()
        return jsonify({"status": "ok"})
    except:
        return jsonify({"status": "error"}), 500

# ===================== RUN =====================
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
