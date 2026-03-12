import argparse
import json
import os
import socket
import sys
import threading
from collections import deque

from flask import Flask, jsonify, render_template_string

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.threat_detection_service import ThreatDetectionService


HTML_TEMPLATE = """
<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <title>Threat Monitor</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; background: #f7f7f9; }
    h1 { margin: 0 0 10px 0; }
    .stats { display: flex; gap: 10px; margin: 14px 0 20px; }
    .card { background: white; border-radius: 8px; padding: 10px 14px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .list { display: grid; gap: 10px; }
    .item { background: white; border-left: 4px solid #d32f2f; border-radius: 8px; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .meta { color: #444; font-size: 13px; margin-bottom: 4px; }
    .empty { color: #666; }
    code { background: #f0f1f3; padding: 1px 5px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Live Threat Detection</h1>
  <div>Listening for stream on <code id=\"stream\"></code></div>

  <div class=\"stats\">
    <div class=\"card\">Processed: <strong id=\"processed\">0</strong></div>
    <div class=\"card\">Threats: <strong id=\"threats\">0</strong></div>
    <div class=\"card\">Errors: <strong id=\"errors\">0</strong></div>
  </div>

  <h3>Recent Threats</h3>
  <div id=\"threatList\" class=\"list\"></div>

  <script>
    const streamInfo = document.getElementById("stream");
    const processed = document.getElementById("processed");
    const threats = document.getElementById("threats");
    const errors = document.getElementById("errors");
    const list = document.getElementById("threatList");

    function renderThreats(items) {
      if (!items.length) {
        list.innerHTML = '<div class="empty">No threats detected yet.</div>';
        return;
      }

      list.innerHTML = items.map(item => {
        const detected = (item.detected_objects || []).map(obj => JSON.stringify(obj)).join("<br>");
        const errorText = item.error ? `<div><strong>Error:</strong> ${item.error}</div>` : "";
        return `
          <div class="item">
            <div class="meta">Sensor: <strong>${item.sensor_id}</strong> | Type: <strong>${item.sensor_type}</strong> | Time: ${item.timestamp}</div>
            ${errorText}
            <div>${detected || "No object details"}</div>
          </div>
        `;
      }).join("");
    }

    async function refresh() {
      try {
        const res = await fetch('/api/threats');
        const data = await res.json();
        streamInfo.textContent = `${data.stream.host}:${data.stream.port}`;
        processed.textContent = data.stats.processed;
        threats.textContent = data.stats.threats;
        errors.textContent = data.stats.errors;
        renderThreats(data.threats);
      } catch (e) {
        list.innerHTML = '<div class="empty">Unable to fetch threat data.</div>';
      }
    }

    refresh();
    setInterval(refresh, 1000);
  </script>
</body>
</html>
"""


app = Flask(__name__)
service = ThreatDetectionService()
state_lock = threading.Lock()
recent_threats = deque(maxlen=50)
stats = {
    "processed": 0,
    "threats": 0,
    "errors": 0,
}
stream_config = {
    "host": "127.0.0.1",
    "port": 9100,
}


def record_result(result):
    with state_lock:
        stats["processed"] += 1

        if result.get("error"):
            stats["errors"] += 1
            recent_threats.appendleft(result)
            return

        if result.get("detected_objects"):
            stats["threats"] += 1
            recent_threats.appendleft(result)


def process_message(message):
    result = service.process(message)
    record_result(result)


def handle_stream_connection(conn, addr):
    print(f"Threat stream connected: {addr}")
    buffer = ""

    try:
        while True:
            data = conn.recv(4096)
            if not data:
                break

            buffer += data.decode()

            while "\n" in buffer:
                raw_message, buffer = buffer.split("\n", 1)
                raw_message = raw_message.strip()

                if not raw_message:
                    continue

                try:
                    message = json.loads(raw_message)
                except json.JSONDecodeError as json_error:
                    print(f"Threat stream JSON error: {json_error}")
                    continue

                process_message(message)
    except Exception as stream_error:
        print(f"Threat stream error from {addr}: {stream_error}")
    finally:
        try:
            conn.close()
        except Exception:
            pass
        print(f"Threat stream disconnected: {addr}")


def run_stream_listener(host, port):
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    listener.bind((host, port))
    listener.listen()

    print(f"Threat detection stream listener running on {host}:{port}")

    while True:
        conn, addr = listener.accept()
        threading.Thread(target=handle_stream_connection, args=(conn, addr), daemon=True).start()


@app.get("/")
def index():
    return render_template_string(HTML_TEMPLATE)


@app.get("/api/threats")
def api_threats():
    with state_lock:
        return jsonify(
            {
                "stream": stream_config,
                "stats": dict(stats),
                "threats": list(recent_threats),
            }
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Real-time threat detection + UI")
    parser.add_argument("--stream-host", default="127.0.0.1", help="Host for incoming sensor stream")
    parser.add_argument("--stream-port", type=int, default=9100, help="Port for incoming sensor stream")
    parser.add_argument("--ui-host", default="127.0.0.1", help="Host for web UI")
    parser.add_argument("--ui-port", type=int, default=5050, help="Port for web UI")
    args = parser.parse_args()

    stream_config["host"] = args.stream_host
    stream_config["port"] = args.stream_port

    threading.Thread(
        target=run_stream_listener,
        args=(args.stream_host, args.stream_port),
        daemon=True,
    ).start()

    print(f"Threat UI running at http://{args.ui_host}:{args.ui_port}")
    app.run(host=args.ui_host, port=args.ui_port, debug=False)
