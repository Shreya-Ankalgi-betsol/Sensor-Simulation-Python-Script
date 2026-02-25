import requests
import random
import time
from datetime import datetime

SERVER_URL = "http://127.0.0.1:5000/sensor-data"

def generate_radar():
    return {
        "sensor_id": "RADAR_01",
        "sensor_type": "RADAR",
        "range_m": round(random.uniform(1, 100), 2),
        "angle_deg": round(random.uniform(-45, 45), 2),
        "velocity_mps": round(random.uniform(-20, 20), 2),
        "signal_strength": round(random.uniform(0.1, 1.0), 2),
        "timestamp": datetime.utcnow().isoformat()
    }

print("Simulator started...")

while True:
    try:
        data = generate_radar()
        print("Generated:", data)

        response = requests.post(SERVER_URL, json=data)
        print("Server Response:", response.status_code)

    except Exception as e:
        print("ERROR:", e)

    time.sleep(2)