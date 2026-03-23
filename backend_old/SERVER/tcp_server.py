# segrigating db operations in db 


import socket
import json
import threading
import sys
import os

# Allow importing modules from backend_old and project root
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_old_root = os.path.dirname(current_dir)
project_root = os.path.dirname(backend_old_root)

sys.path.insert(0, backend_old_root)
sys.path.insert(0, project_root)

from database import Database


HOST = "127.0.0.1"
PORT = 9000
THREAT_HOST = "127.0.0.1"
THREAT_PORT = 9100
threat_socket = None
threat_socket_lock = threading.Lock()

# Initialize database
db = Database()


def forward_to_threat_detection(message):
    global threat_socket

    payload = (json.dumps(message) + "\n").encode()

    with threat_socket_lock:
        try:
            if threat_socket is None:
                threat_socket = socket.create_connection(
                    (THREAT_HOST, THREAT_PORT), timeout=1)

            threat_socket.sendall(payload)
            return
        except Exception:
            try:
                if threat_socket is not None:
                    threat_socket.close()
            except Exception:
                pass
            threat_socket = None

        try:
            threat_socket = socket.create_connection(
                (THREAT_HOST, THREAT_PORT), timeout=1)
            threat_socket.sendall(payload)
        except Exception:
            try:
                if threat_socket is not None:
                    threat_socket.close()
            except Exception:
                pass
            threat_socket = None


def handle_client(conn, addr):
    print("Connected by", addr)
    buffer = ""

    while True:
        try:
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
                except json.JSONDecodeError as je:
                    print("JSON decode error:", je)
                    continue

                print("Received:", message)

                try:
                    db.register_sensor(message)

                    if message.get("type") == "radar":
                        db.insert_radar_reading(message)
                    elif message.get("type") == "lidar":
                        db.insert_lidar_reading(message)

                    forward_to_threat_detection(message)

                except Exception as db_error:
                    print("Database error:", db_error)
                    continue

        except json.JSONDecodeError as je:
            print("JSON decode error:", je)
            continue

        except Exception as e:
            print("Error:", e)
            break

    try:
        conn.close()
    except:
        pass

    print("Connection closed:", addr)


# Create TCP server
server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind((HOST, PORT))
server.listen()

print(f"TCP Server listening on {HOST}:{PORT}")


# Accept clients
while True:
    conn, addr = server.accept()

    threading.Thread(
        target=handle_client,
        args=(conn, addr),
        daemon=True
    ).start()
