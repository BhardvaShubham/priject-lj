from flask import Flask, send_file, jsonify
import matplotlib.pyplot as plt
import random
import io

app = Flask(__name__)

# ---------- SAMPLE MACHINE DATA ----------
machines = [
    {"name": "Machine A", "uptime": 85, "alerts": 10},
    {"name": "Machine B", "uptime": 70, "alerts": 22},
    {"name": "Machine C", "uptime": 92, "alerts": 6},
    {"name": "Machine D", "uptime": 66, "alerts": 18},
]


# ---------- GENERATE BAR CHART ----------
@app.route("/machine_chart")
def machine_chart():
    names = [m["name"] for m in machines]
    uptimes = [m["uptime"] for m in machines]

    plt.figure(figsize=(6,4))
    plt.bar(names, uptimes)
    plt.title("Machine Uptime (%)")
    plt.ylabel("Uptime %")
    plt.ylim(0,100)

    img = io.BytesIO()
    plt.savefig(img, format="png", bbox_inches="tight")
    plt.close()
    img.seek(0)

    return send_file(img, mimetype="image/png")


# ---------- SIMPLE DATA API ----------
@app.route("/api/summary")
def summary():
    total = len(machines)
    avg = sum(m["uptime"] for m in machines) / total
    peak = max(m["uptime"] for m in machines)

    return jsonify({
        "total_records": total,
        "average_value": round(avg,2),
        "peak_value": peak,
        "machines": machines
    })


# ---------- RUN ----------
if __name__ == "__main__":
    app.run(debug=True)
