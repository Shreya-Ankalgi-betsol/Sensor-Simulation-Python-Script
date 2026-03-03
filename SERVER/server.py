from flask import Flask, request, jsonify
import json
from datetime import datetime

app = Flask(__name__)

LOG_FILE = "sensor_log.json"

def save_to_file(data):
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(data) + "\n")

def check_alert(data):
    alerts = []

    if data["sensor_type"] == "RADAR":
        if data["range_m"] < 5:
            alerts.append("Object too close!")
        if abs(data["velocity_mps"]) > 15:
            alerts.append("High speed detected!")

    return alerts

@app.route('/')
def home():
    return "Server is running"

@app.route('/sensor-data', methods=['POST'])
def receive_data():
    data = request.json
    data["received_at"] = datetime.utcnow().isoformat()

    alerts = check_alert(data)
    data["alerts"] = alerts

    save_to_file(data)

    return jsonify({
        "status": "Data received",
        "alerts": alerts
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8000)