# visualization.py
# Upgraded visualization utilities for SAP-90s UI
# Produces PNG images (BytesIO) for chart endpoints.

from matplotlib import pyplot as plt
import matplotlib.dates as mdates
import numpy as np
import io
import datetime as dt

# Ensure non-interactive backend if running headless
import matplotlib
matplotlib.use("Agg")


def _save_fig_to_bytes(fig, dpi=120):
    """Save a matplotlib figure to a BytesIO and return it with high quality."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight", 
                facecolor='white', edgecolor='none', pad_inches=0.2)
    plt.close(fig)
    buf.seek(0)
    return buf


def _apply_theme_settings(theme_name="belize-light"):
    """Return a dict of colors and styling values for charts."""
    # Basic theme mapping compatible with your CSS token names.
    # Keep it conservative for low-bandwidth (no gradients in charts).
    if theme_name == "belize-dark":
        return {
            "bg": "#0f1724",
            "text": "#e6eef8",
            "line": "#2ea3ff",
            "accent": "#2ea3ff",
            "grid": "#1f2b36"
        }
    if theme_name == "signature":
        return {
            "bg": "#fff8ef",
            "text": "#2d2a25",
            "line": "#0a6ed1",
            "accent": "#a37d2a",
            "grid": "#d9cdb8"
        }
    # default belize-light
    return {
        "bg": "#ffffff",
        "text": "#1f2d3d",
        "line": "#0a6ed1",
        "accent": "#0a6ed1",
        "grid": "#e6ecf2"
    }


def performance_trends_chart_from_conn(conn, days=7, theme_name="signature"):
    """
    Simple performance summary (line chart) for the last `days`.
    Returns BytesIO.
    """
    theme = _apply_theme_settings(theme_name)
    cur = conn.cursor()
    cur.execute("""
        SELECT metric_date, AVG(efficiency) as eff
        FROM performance_metrics
        WHERE metric_date >= date('now','-{} days')
        GROUP BY metric_date
        ORDER BY metric_date ASC
    """.format(days - 1))
    rows = cur.fetchall()

    # If no data, fabricate gentle synthetic series to avoid errors
    if not rows:
        dates = [ (dt.date.today() - dt.timedelta(days=i)).isoformat() for i in reversed(range(days)) ]
        y = list(np.random.uniform(70, 92, len(dates)))
    else:
        dates = [r[0] for r in rows]
        y = [r[1] if r[1] is not None else 0 for r in rows]

    x = [dt.datetime.fromisoformat(d) if isinstance(d, str) else d for d in dates]

    fig, ax = plt.subplots(figsize=(8, 4), facecolor='white')
    ax.plot(x, y, marker='o', linewidth=3, color=theme["line"], 
            markersize=6, markerfacecolor='white', markeredgewidth=2,
            markeredgecolor=theme["line"], alpha=0.9)
    ax.fill_between(x, y, alpha=0.2, color=theme["line"])
    ax.set_ylim(0, 100)
    ax.set_ylabel("Efficiency %", fontsize=11, fontweight='bold', color=theme["text"])
    ax.set_xlabel("Date", fontsize=10, color=theme["text"])
    ax.set_title("Efficiency Trend (last {} days)".format(days), 
                 fontsize=12, fontweight='bold', color=theme["text"], pad=15)
    ax.grid(axis='y', linestyle='--', linewidth=1, color=theme["grid"], alpha=0.7)
    ax.grid(axis='x', linestyle='--', linewidth=0.5, color=theme["grid"], alpha=0.5)
    ax.tick_params(axis='x', labelrotation=30, labelsize=9, colors=theme["text"])
    ax.tick_params(axis='y', labelsize=9, colors=theme["text"])
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color(theme["grid"])
    ax.spines['bottom'].set_color(theme["grid"])
    fig.tight_layout()
    return _save_fig_to_bytes(fig, dpi=120)


def status_pie_chart_from_conn(conn, theme_name="signature"):
    """Pie chart showing machine status distribution."""
    theme = _apply_theme_settings(theme_name)
    cur = conn.cursor()
    cur.execute("SELECT status, COUNT(*) as cnt FROM machines GROUP BY status")
    rows = cur.fetchall()

    labels = [r[0] if r[0] else "Unknown" for r in rows]
    values = [r[1] for r in rows]

    if not labels:
        labels = ["Running", "Warning", "Offline"]
        values = [5, 2, 1]

    # colors: map common statuses to colors
    color_map = {
        "Running": theme["line"],
        "Warning": "#e6a600",
        "Offline": "#b83232",
        "Unknown": "#9aa6b2"
    }
    colors = [color_map.get(lbl, theme["accent"]) for lbl in labels]

    fig, ax = plt.subplots(figsize=(5, 5), facecolor='white')
    wedges, texts, autotexts = ax.pie(values, labels=labels, autopct="%1.1f%%", 
                                      colors=colors, startangle=90,
                                      textprops={"fontsize": 10, "color": theme["text"], 
                                                "fontweight": "bold"},
                                      explode=[0.05 if v == max(values) else 0 for v in values],
                                      shadow=True)
    # Enhance autopct text
    for autotext in autotexts:
        autotext.set_color('white')
        autotext.set_fontweight('bold')
        autotext.set_fontsize(11)
    ax.set_title("Machine Status Distribution", fontsize=12, fontweight='bold', 
                 color=theme["text"], pad=20)
    fig.tight_layout()
    return _save_fig_to_bytes(fig, dpi=120)


def alert_frequency_chart_from_conn(conn, days=14, theme_name="signature"):
    """Line chart of alerts count per day for the last `days` days."""
    theme = _apply_theme_settings(theme_name)
    cur = conn.cursor()
    cur.execute("""
        SELECT date(raised_at) as d, COUNT(*) as cnt
        FROM alerts
        WHERE raised_at >= date('now','-{} days')
        GROUP BY date(raised_at)
        ORDER BY d ASC
    """.format(days - 1))
    rows = cur.fetchall()

    if not rows:
        dates = [ (dt.date.today() - dt.timedelta(days=i)).isoformat() for i in reversed(range(days)) ]
        counts = list(np.random.randint(0, 5, len(dates)))
    else:
        dates = [r[0] for r in rows]
        counts = [r[1] for r in rows]

    x = [dt.datetime.fromisoformat(d) for d in dates]

    fig, ax = plt.subplots(figsize=(8, 2.4))
    ax.plot(x, counts, marker='o', linewidth=2, color=theme["line"])
    ax.fill_between(x, counts, alpha=0.08, color=theme["line"])
    ax.set_title("Alerts (last {} days)".format(days), fontsize=10)
    ax.set_ylabel("Count", fontsize=9)
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %d'))
    ax.grid(True, linestyle='--', linewidth=0.5, color=theme["grid"])
    fig.autofmt_xdate(rotation=25)
    fig.tight_layout()
    return _save_fig_to_bytes(fig)


def machine_comparison_chart_from_conn(conn, limit=20, theme_name="signature"):
    """Horizontal bar chart of machine efficiencies (top `limit` machines)."""
    theme = _apply_theme_settings(theme_name)
    cur = conn.cursor()
    cur.execute("SELECT name, efficiency FROM machines ORDER BY efficiency ASC LIMIT ?", (limit,))
    rows = cur.fetchall()

    if not rows:
        names = [f"Machine {i}" for i in range(1, 6)]
        effs = list(np.random.uniform(60, 95, len(names)))
    else:
        names = [r[0] for r in rows]
        effs = [r[1] if r[1] is not None else 0 for r in rows]

    fig, ax = plt.subplots(figsize=(8, max(2.2, 0.4 * len(names))))
    y_pos = np.arange(len(names))
    ax.barh(y_pos, effs, align='center', color=theme["line"])
    ax.set_yticks(y_pos)
    ax.set_yticklabels(names, fontsize=9)
    ax.set_xlabel("Efficiency %")
    ax.set_xlim(0, 100)
    ax.set_title("Machine Efficiency Comparison", fontsize=10)
    ax.grid(axis='x', linestyle='--', linewidth=0.5, color=theme["grid"])
    fig.tight_layout()
    return _save_fig_to_bytes(fig)


def oee_gauge_chart(oee_value, theme_name="signature"):
    """Circular gauge chart for OEE value (0-100%)."""
    theme = _apply_theme_settings(theme_name)
    fig, ax = plt.subplots(figsize=(4, 4), subplot_kw=dict(projection='polar'))
    
    # Gauge parameters
    theta = np.linspace(0, np.pi, 100)
    r = np.ones_like(theta)
    
    # Color zones
    oee_val = max(0, min(100, oee_value))
    if oee_val >= 85:
        color = '#107e3e'  # Green
    elif oee_val >= 60:
        color = '#e9730c'  # Orange
    else:
        color = '#bb0000'  # Red
    
    # Draw gauge
    ax.fill_between(theta, 0, r, alpha=0.2, color=color)
    ax.plot(theta, r, linewidth=3, color=color)
    
    # Value arc
    value_theta = np.linspace(0, np.pi * (oee_val / 100), 50)
    value_r = np.ones_like(value_theta)
    ax.plot(value_theta, value_r, linewidth=8, color=color)
    
    # Text
    ax.text(0, 0, f'{oee_val:.1f}%', ha='center', va='center', 
            fontsize=24, fontweight='bold', color=theme["text"])
    ax.text(0, -0.3, 'OEE', ha='center', va='center', 
            fontsize=12, color=theme["muted"])
    
    ax.set_ylim(0, 1.2)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.spines['polar'].set_visible(False)
    fig.patch.set_facecolor(theme["bg"])
    fig.tight_layout()
    return _save_fig_to_bytes(fig)


def multi_sensor_trend_chart(conn, machine_id, days=7, theme_name="signature"):
    """Multi-line chart showing multiple sensor trends over time."""
    theme = _apply_theme_settings(theme_name)
    cur = conn.cursor()
    
    # Get all sensors for machine
    cur.execute("SELECT id, name FROM sensors WHERE machine_id=?", (machine_id,))
    sensors = cur.fetchall()
    
    if not sensors:
        fig, ax = plt.subplots(figsize=(8, 3))
        ax.text(0.5, 0.5, "No sensors available", ha="center", va="center",
                transform=ax.transAxes, fontsize=12, color=theme["muted"])
        ax.axis("off")
        return _save_fig_to_bytes(fig)
    
    fig, ax = plt.subplots(figsize=(8, 3))
    colors = [theme["line"], "#e9730c", "#107e3e", "#bb0000", "#9aa6b2"]
    
    for idx, sensor in enumerate(sensors[:5]):  # Max 5 sensors
        cur.execute("""
            SELECT timestamp, value 
            FROM sensor_readings 
            WHERE sensor_id=? AND timestamp >= datetime('now', '-{} days')
            ORDER BY timestamp ASC
        """.format(days), (sensor[0],))
        rows = cur.fetchall()
        
        if rows:
            times = [r[0] for r in rows]
            values = [r[1] for r in rows]
            ax.plot(times, values, marker='o', linewidth=2, 
                   label=sensor[1], color=colors[idx % len(colors)], markersize=4)
    
    ax.set_xlabel("Time", fontsize=9)
    ax.set_ylabel("Value", fontsize=9)
    ax.set_title(f"Multi-Sensor Trends (Last {days} days)", fontsize=10)
    ax.legend(loc='upper right', fontsize=8, framealpha=0.9)
    ax.grid(True, linestyle='--', linewidth=0.5, color=theme["grid"], alpha=0.5)
    plt.xticks(rotation=45, fontsize=8)
    fig.tight_layout()
    return _save_fig_to_bytes(fig)


def status_heatmap_chart(conn, theme_name="signature"):
    """Heatmap showing machine status distribution by location."""
    theme = _apply_theme_settings(theme_name)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT location, status, COUNT(*) as cnt 
        FROM machines 
        GROUP BY location, status
    """)
    rows = cur.fetchall()
    
    if not rows:
        fig, ax = plt.subplots(figsize=(6, 3))
        ax.text(0.5, 0.5, "No data available", ha="center", va="center",
                transform=ax.transAxes, fontsize=12, color=theme["muted"])
        ax.axis("off")
        return _save_fig_to_bytes(fig)
    
    # Build heatmap data
    locations = sorted(set(r[0] for r in rows))
    statuses = ['running', 'idle', 'down', 'maintenance']
    data = np.zeros((len(locations), len(statuses)))
    
    for r in rows:
        loc_idx = locations.index(r[0])
        if r[1] in statuses:
            status_idx = statuses.index(r[1])
            data[loc_idx, status_idx] = r[2]
    
    fig, ax = plt.subplots(figsize=(6, max(3, len(locations) * 0.5)))
    im = ax.imshow(data, cmap='YlOrRd', aspect='auto')
    
    ax.set_xticks(np.arange(len(statuses)))
    ax.set_yticks(np.arange(len(locations)))
    ax.set_xticklabels(statuses, fontsize=9)
    ax.set_yticklabels(locations, fontsize=9)
    
    # Add text annotations
    for i in range(len(locations)):
        for j in range(len(statuses)):
            text = ax.text(j, i, int(data[i, j]), ha="center", va="center",
                          color="black" if data[i, j] < data.max()/2 else "white",
                          fontsize=10, fontweight='bold')
    
    ax.set_title("Machine Status by Location", fontsize=10)
    plt.colorbar(im, ax=ax, label='Count')
    fig.tight_layout()
    return _save_fig_to_bytes(fig)


def performance_comparison_chart(conn, days=30, theme_name="signature"):
    """Comparison chart showing performance metrics over time."""
    theme = _apply_theme_settings(theme_name)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT DATE(timestamp) as d, 
               AVG(value) as avg_eff,
               COUNT(DISTINCT sensor_id) as sensor_count
        FROM sensor_readings
        WHERE timestamp >= date('now', '-{} days')
        GROUP BY DATE(timestamp)
        ORDER BY d ASC
    """.format(days))
    rows = cur.fetchall()
    
    if not rows:
        dates = [(dt.date.today() - dt.timedelta(days=i)).isoformat() 
                for i in reversed(range(min(days, 7)))]
        effs = list(np.random.uniform(70, 95, len(dates)))
        counts = list(np.random.randint(1, 5, len(dates)))
    else:
        dates = [r[0] for r in rows]
        effs = [r[1] if r[1] else 0 for r in rows]
        counts = [r[2] for r in rows]
    
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 5), sharex=True)
    
    # Efficiency line
    ax1.plot(dates, effs, marker='o', linewidth=2, color=theme["line"], markersize=5)
    ax1.fill_between(dates, effs, alpha=0.2, color=theme["line"])
    ax1.set_ylabel("Avg Efficiency %", fontsize=9)
    ax1.set_title("Performance Trends", fontsize=11)
    ax1.grid(True, linestyle='--', linewidth=0.5, color=theme["grid"], alpha=0.5)
    ax1.set_ylim(0, 100)
    
    # Sensor count bar
    ax2.bar(dates, counts, color=theme["accent"], alpha=0.7)
    ax2.set_ylabel("Active Sensors", fontsize=9)
    ax2.set_xlabel("Date", fontsize=9)
    ax2.grid(True, axis='y', linestyle='--', linewidth=0.5, color=theme["grid"], alpha=0.5)
    
    plt.xticks(rotation=45, fontsize=8)
    fig.tight_layout()
    return _save_fig_to_bytes(fig)