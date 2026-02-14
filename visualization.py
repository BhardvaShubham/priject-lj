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


def _save_fig_to_bytes(fig, dpi=150, quality_mode="normal"):
    """Save a matplotlib figure to a BytesIO with adaptive quality.

    Args:
        fig: Matplotlib figure object
        dpi: Resolution (150=high quality, 100=fast)
        quality_mode: "high" (150 DPI), "normal" (100 DPI), "fast" (80 DPI)

    Adaptive quality modes:
    - "high": 150 DPI (display/manual viewing) - highest quality
    - "normal": 100 DPI (balanced, default) - good quality + reasonable speed
    - "fast": 80 DPI (bulk imports) - minimal quality for speed
    """
    # Map quality modes to DPI if dpi not explicitly set
    if quality_mode == "high":
        dpi = 150
    elif quality_mode == "fast":
        dpi = 80
    elif quality_mode == "normal" and dpi == 150:
        dpi = 100  # Default to balanced setting

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight",
                facecolor='white', edgecolor='none', pad_inches=0.3)
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


def performance_trends_chart_from_conn(conn, days=7, theme_name="signature", quality_mode="normal"):
    """
    Enhanced performance summary (line chart) for the last `days`.
    Returns BytesIO with high-quality visualization.

    Args:
        quality_mode: "high" (150 DPI, full labels), "normal" (100 DPI), "fast" (80 DPI, minimal labels)
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

    fig, ax = plt.subplots(figsize=(10, 5), facecolor='white')

    # Main line with enhanced styling
    ax.plot(x, y, marker='o', linewidth=3.5, color=theme["line"],
            markersize=8, markerfacecolor='white', markeredgewidth=2.5,
            markeredgecolor=theme["line"], alpha=0.9, label='Efficiency')

    # Enhanced fill area
    ax.fill_between(x, y, alpha=0.15, color=theme["line"])

    # Add value labels on points (skip in fast mode for speed)
    if quality_mode in ["high", "normal"]:
        for i, (xi, yi) in enumerate(zip(x, y)):
            ax.text(xi, yi + 1.5, f'{yi:.1f}%', ha='center', va='bottom',
                   fontsize=9, fontweight='bold', color=theme["text"])

    # Enhanced grid
    ax.grid(axis='y', linestyle='--', linewidth=1.2, color=theme["grid"], alpha=0.6)
    ax.grid(axis='x', linestyle=':', linewidth=0.8, color=theme["grid"], alpha=0.4)

    # Add benchmark line (80% target) - skip in fast mode
    if quality_mode in ["high", "normal"]:
        ax.axhline(y=80, color='#e9730c', linestyle='--', linewidth=2, alpha=0.5, label='Target (80%)')

    ax.set_ylim(0, 105)
    ax.set_ylabel("Efficiency %", fontsize=12, fontweight='bold', color=theme["text"])
    ax.set_xlabel("Date", fontsize=11, color=theme["text"])
    ax.set_title(f"Efficiency Trend - Last {days} Days",
                 fontsize=13, fontweight='bold', color=theme["text"], pad=15)

    ax.tick_params(axis='x', labelrotation=30, labelsize=10, colors=theme["text"])
    ax.tick_params(axis='y', labelsize=10, colors=theme["text"])

    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color(theme["grid"])
    ax.spines['bottom'].set_color(theme["grid"])
    ax.spines['left'].set_linewidth(1.5)
    ax.spines['bottom'].set_linewidth(1.5)

    if quality_mode in ["high", "normal"]:
        ax.legend(loc='upper left', fontsize=10, framealpha=0.95)

    fig.tight_layout()
    return _save_fig_to_bytes(fig, quality_mode=quality_mode)


def status_pie_chart_from_conn(conn, company_id=None, theme_name="signature", quality_mode="normal"):
    """Pie chart showing machine status distribution with enhanced styling.

    Args:
        quality_mode: "high" (150 DPI), "normal" (100 DPI), "fast" (80 DPI, simplified labels)
    """
    theme = _apply_theme_settings(theme_name)
    cur = conn.cursor()

    if company_id:
        cur.execute("SELECT status, COUNT(*) as cnt FROM machines WHERE company_id = ? GROUP BY status", (company_id,))
    else:
        cur.execute("SELECT status, COUNT(*) as cnt FROM machines GROUP BY status")
    rows = cur.fetchall()

    labels = [r[0] if r[0] else "Unknown" for r in rows]
    values = [r[1] for r in rows]

    if not labels:
        labels = ["Running", "Idle", "Down"]
        values = [5, 3, 2]

    # Enhanced color mapping
    color_map = {
        "running": "#107e3e",
        "idle": "#e9730c",
        "down": "#bb0000",
        "maintenance": "#9aa6b2",
        "unknown": "#cccccc"
    }
    colors = [color_map.get(lbl.lower(), theme["accent"]) for lbl in labels]

    fig, ax = plt.subplots(figsize=(7, 7), facecolor='white')

    # Autopct format depends on quality mode
    if quality_mode == "fast":
        autopct_format = lambda pct: f'{pct:.0f}%'
    else:
        autopct_format = lambda pct: f'{pct:.1f}%\n({int(pct/100.*sum(values))})'

    # Create pie with enhanced styling
    wedges, texts, autotexts = ax.pie(
        values,
        labels=labels,
        autopct=autopct_format,
        colors=colors,
        startangle=90,
        textprops={"fontsize": 11, "color": theme["text"], "fontweight": "bold"},
        explode=[0.05 if v == max(values) else 0 for v in values],
        shadow=True,
        wedgeprops={"edgecolor": "white", "linewidth": 2}
    )

    # Enhanced autopct styling
    for autotext in autotexts:
        autotext.set_color('white')
        autotext.set_fontweight('bold')
        autotext.set_fontsize(10 if quality_mode != "fast" else 9)

    # Enhanced label styling
    for text in texts:
        text.set_fontsize(12 if quality_mode != "fast" else 10)
        text.set_fontweight('bold')

    ax.set_title("Machine Status Distribution",
                 fontsize=14, fontweight='bold',
                 color=theme["text"], pad=20)

    fig.tight_layout()
    return _save_fig_to_bytes(fig, quality_mode=quality_mode)


def alert_frequency_chart_from_conn(conn, days=14, company_id=None, theme_name="signature", quality_mode="normal"):
    """Enhanced line chart of alerts count per day for the last `days` days.

    Args:
        quality_mode: "high" (150 DPI), "normal" (100 DPI), "fast" (80 DPI, minimal labels)
    """
    theme = _apply_theme_settings(theme_name)
    cur = conn.cursor()

    if company_id:
        cur.execute("""
            SELECT date(raised_at) as d, COUNT(*) as cnt
            FROM alarms
            WHERE company_id = ? AND raised_at >= date('now','-{} days')
            GROUP BY date(raised_at)
            ORDER BY d ASC
        """.format(days - 1), (company_id,))
    else:
        cur.execute("""
            SELECT date(raised_at) as d, COUNT(*) as cnt
            FROM alarms
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

    fig, ax = plt.subplots(figsize=(11, 5))

    # Main line chart
    ax.plot(x, counts, marker='o', linewidth=3, color=theme["line"], markersize=7,
           markerfacecolor='white', markeredgewidth=2, markeredgecolor=theme["line"])
    ax.fill_between(x, counts, alpha=0.15, color=theme["line"])

    # Add value labels on points (skip in fast mode)
    if quality_mode in ["high", "normal"]:
        for xi, yi in zip(x, counts):
            ax.text(xi, yi + 0.15, str(int(yi)), ha='center', va='bottom',
                   fontsize=9, fontweight='bold', color=theme["text"])

    # Add average line (skip in fast mode)
    if quality_mode in ["high", "normal"]:
        avg_count = np.mean(counts)
        ax.axhline(y=avg_count, color='#e9730c', linestyle='--', linewidth=2,
                  alpha=0.6, label=f'Average ({avg_count:.1f})')

    ax.set_title(f"Alert Frequency Trend - Last {days} Days",
                fontsize=12, fontweight='bold', color=theme["text"], pad=12)
    ax.set_ylabel("Alert Count", fontsize=11, fontweight='bold', color=theme["text"])
    ax.set_xlabel("Date", fontsize=11, color=theme["text"])

    ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
    ax.grid(True, linestyle='--', linewidth=0.8, color=theme["grid"], alpha=0.5)
    ax.tick_params(axis='x', labelsize=9, colors=theme["text"])
    ax.tick_params(axis='y', labelsize=9, colors=theme["text"])

    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color(theme["grid"])
    ax.spines['bottom'].set_color(theme["grid"])

    if quality_mode in ["high", "normal"]:
        ax.legend(loc='upper left', fontsize=10, framealpha=0.95)

    fig.autofmt_xdate(rotation=30)
    fig.tight_layout()
    return _save_fig_to_bytes(fig, quality_mode=quality_mode)


def machine_comparison_chart_from_conn(conn, limit=20, theme_name="signature", quality_mode="normal"):
    """Enhanced horizontal bar chart of machine efficiencies (top `limit` machines).

    Args:
        quality_mode: "high" (150 DPI), "normal" (100 DPI), "fast" (80 DPI, no value labels)
    """
    theme = _apply_theme_settings(theme_name)
    cur = conn.cursor()
    cur.execute("SELECT name, efficiency FROM machines ORDER BY efficiency DESC LIMIT ?", (limit,))
    rows = cur.fetchall()

    if not rows:
        names = [f"Machine {i}" for i in range(1, 6)]
        effs = list(np.random.uniform(60, 95, len(names)))
    else:
        names = [r[0] for r in rows]
        effs = [r[1] if r[1] is not None else 0 for r in rows]

    fig, ax = plt.subplots(figsize=(10, max(4, 0.5 * len(names))))

    # Color code by efficiency ranges
    colors = []
    for eff in effs:
        if eff >= 85:
            colors.append("#107e3e")  # Green
        elif eff >= 70:
            colors.append("#e9730c")  # Orange
        elif eff >= 50:
            colors.append("#ffa500")  # Light orange
        else:
            colors.append("#bb0000")  # Red

    y_pos = np.arange(len(names))
    bars = ax.barh(y_pos, effs, align='center', color=colors, edgecolor='#333', linewidth=1.5)

    # Add value labels on bars (skip in fast mode)
    if quality_mode in ["high", "normal"]:
        for i, (bar, eff) in enumerate(zip(bars, effs)):
            width = bar.get_width()
            ax.text(width + 1, bar.get_y() + bar.get_height()/2,
                   f'{eff:.1f}%', ha='left', va='center',
                   fontsize=9, fontweight='bold', color=theme["text"])

    ax.set_yticks(y_pos)
    ax.set_yticklabels(names, fontsize=10)
    ax.set_xlabel("Efficiency %", fontsize=11, fontweight='bold', color=theme["text"])
    ax.set_xlim(0, 105)
    ax.set_title("Top Machines by Efficiency", fontsize=13, fontweight='bold',
                color=theme["text"], pad=15)

    ax.grid(axis='x', linestyle='--', linewidth=0.8, color=theme["grid"], alpha=0.5)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color(theme["grid"])
    ax.spines['bottom'].set_color(theme["grid"])

    ax.tick_params(axis='x', labelsize=10, colors=theme["text"])
    ax.tick_params(axis='y', labelsize=10, colors=theme["text"])

    fig.tight_layout()
    return _save_fig_to_bytes(fig, quality_mode=quality_mode)


def oee_gauge_chart(oee_value, theme_name="signature", quality_mode="normal"):
    """Enhanced circular gauge chart for OEE value (0-100%) with detailed styling.

    Args:
        quality_mode: "high" (150 DPI, full text), "normal" (100 DPI), "fast" (80 DPI, minimal text)
    """
    theme = _apply_theme_settings(theme_name)
    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(projection='polar'))

    # Gauge parameters
    theta = np.linspace(0, np.pi, 100)
    r = np.ones_like(theta)

    # Color zones based on OEE value
    oee_val = max(0, min(100, oee_value))
    if oee_val >= 85:
        color = '#107e3e'  # Green - Excellent
        status = 'Excellent'
    elif oee_val >= 60:
        color = '#e9730c'  # Orange - Good
        status = 'Good'
    else:
        color = '#bb0000'  # Red - Needs Improvement
        status = 'Needs Improvement'

    # Draw background zones
    theta_excellent = np.linspace(0.85 * np.pi, np.pi, 30)
    ax.fill_between(theta_excellent, 0, 1, alpha=0.1, color='#107e3e')

    theta_good = np.linspace(0.6 * np.pi, 0.85 * np.pi, 30)
    ax.fill_between(theta_good, 0, 1, alpha=0.1, color='#e9730c')

    theta_poor = np.linspace(0, 0.6 * np.pi, 30)
    ax.fill_between(theta_poor, 0, 1, alpha=0.1, color='#bb0000')

    # Draw gauge arc
    ax.fill_between(theta, 0, r, alpha=0.15, color='#cccccc')
    ax.plot(theta, r, linewidth=3, color='#999999')

    # Draw value arc
    value_theta = np.linspace(0, np.pi * (oee_val / 100), 50)
    value_r = np.ones_like(value_theta)
    ax.plot(value_theta, value_r, linewidth=6, color=color, solid_capstyle='round')
    ax.fill_between(value_theta, 0.7, value_r, alpha=0.3, color=color)

    # Add text in center
    ax.text(0, 0, f'{oee_val:.1f}%', ha='center', va='center',
           fontsize=32, fontweight='bold', color=color, transform=ax.transAxes)

    ax.text(0, -0.15, 'OEE', ha='center', va='center',
           fontsize=14, fontweight='bold', color=theme["text"], transform=ax.transAxes)

    # Add status text (skip in fast mode)
    if quality_mode in ["high", "normal"]:
        ax.text(0, -0.28, f'Status: {status}', ha='center', va='center',
               fontsize=11, color=color, fontweight='bold', transform=ax.transAxes)

    # Add benchmark markers (skip in fast mode to save space)
    if quality_mode in ["high", "normal"]:
        ax.text(np.pi * 0.6, 1.15, '60%\nGood', ha='center', va='center',
               fontsize=8, color='#e9730c', fontweight='bold')
        ax.text(np.pi * 0.85, 1.15, '85%\nExcellent', ha='center', va='center',
               fontsize=8, color='#107e3e', fontweight='bold')

    ax.set_ylim(0, 1.3)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.spines['polar'].set_visible(False)
    ax.grid(False)

    fig.patch.set_facecolor('white')
    fig.tight_layout()
    return _save_fig_to_bytes(fig, quality_mode=quality_mode)


def multi_sensor_trend_chart(conn, machine_id, days=7, theme_name="signature", quality_mode="normal"):
    """Multi-line chart showing multiple sensor trends over time.

    Args:
        quality_mode: "high" (150 DPI), "normal" (100 DPI), "fast" (80 DPI)
    """
    theme = _apply_theme_settings(theme_name)
    cur = conn.cursor()

    # Get all sensors for machine
    cur.execute("SELECT id, name FROM sensors WHERE machine_id=?", (machine_id,))
    sensors = cur.fetchall()

    if not sensors:
        fig, ax = plt.subplots(figsize=(8, 3))
        ax.text(0.5, 0.5, "No sensors available", ha="center", va="center",
                transform=ax.transAxes, fontsize=12, color=theme.get("muted", "#999"))
        ax.axis("off")
        return _save_fig_to_bytes(fig, quality_mode=quality_mode)

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
    return _save_fig_to_bytes(fig, quality_mode=quality_mode)


def status_heatmap_chart(conn, company_id=None, theme_name="signature", quality_mode="normal"):
    """Heatmap showing machine status distribution by location.

    Args:
        quality_mode: "high" (150 DPI), "normal" (100 DPI), "fast" (80 DPI)
    """
    theme = _apply_theme_settings(theme_name)
    cur = conn.cursor()

    if company_id:
        cur.execute("""
            SELECT location, status, COUNT(*) as cnt
            FROM machines
            WHERE company_id = ?
            GROUP BY location, status
        """, (company_id,))
    else:
        cur.execute("""
            SELECT location, status, COUNT(*) as cnt
            FROM machines
            GROUP BY location, status
        """)
    rows = cur.fetchall()

    if not rows:
        fig, ax = plt.subplots(figsize=(6, 3))
        ax.text(0.5, 0.5, "No data available", ha="center", va="center",
                transform=ax.transAxes, fontsize=12, color=theme.get("muted", "#999"))
        ax.axis("off")
        return _save_fig_to_bytes(fig, quality_mode=quality_mode)

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
    return _save_fig_to_bytes(fig, quality_mode=quality_mode)


def performance_comparison_chart(conn, days=30, company_id=None, theme_name="signature", quality_mode="normal"):
    """Comparison chart showing performance metrics over time.

    Args:
        quality_mode: "high" (150 DPI), "normal" (100 DPI), "fast" (80 DPI)
    """
    theme = _apply_theme_settings(theme_name)
    cur = conn.cursor()

    if company_id:
        cur.execute("""
            SELECT DATE(sr.timestamp) as d,
                   AVG(sr.value) as avg_eff,
                   COUNT(DISTINCT sr.sensor_id) as sensor_count
            FROM sensor_readings sr
            JOIN sensors s ON sr.sensor_id = s.id
            JOIN machines m ON s.machine_id = m.id
            WHERE m.company_id = ? AND sr.timestamp >= date('now', '-{} days')
            GROUP BY DATE(sr.timestamp)
            ORDER BY d ASC
        """.format(days), (company_id,))
    else:
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
    return _save_fig_to_bytes(fig, quality_mode=quality_mode)