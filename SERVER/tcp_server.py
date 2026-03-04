# import socket
# import json
# import threading

# HOST = "127.0.0.1"
# PORT = 6000

# server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
# server.bind((HOST, PORT))
# server.listen()

# print(f"TCP Server listening on {HOST}:{PORT}")

# def handle_client(conn, addr):
#     print("Connected by", addr)

#     while True:
#         try:
#             data = conn.recv(4096)
#             if not data:
#                 break

#             message = json.loads(data.decode())
#             print("Received:", message)

#         except Exception as e:
#             print("Error:", e)
#             break

#     conn.close()
#     print("Connection closed:", addr)

# while True:
#     conn, addr = server.accept()
#     threading.Thread(target=handle_client, args=(conn, addr)).start()



import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import socket
import json
import threading
from database import init_db, insert_radar_reading, insert_lidar_reading
HOST = "127.0.0.1"
PORT = 9000

# Initialize database once when server starts
init_db()


def handle_client(conn, addr):
    print("Connected by", addr)

    while True:
        try:
            data = conn.recv(4096)

            if not data:
                break

            message = json.loads(data.decode())

            print("Received:", message)

            try:
                if message.get("sensor_type") == "RADAR":
                    insert_radar_reading(message)

                elif message.get("sensor_type") == "LIDAR":
                    insert_lidar_reading(message)
                    
            except Exception as db_error:
                print("Database error:", db_error)
                # Continue processing other messages instead of breaking
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


# Accept clients continuously
while True:
    conn, addr = server.accept()
    threading.Thread(target=handle_client, args=(conn, addr)).start()