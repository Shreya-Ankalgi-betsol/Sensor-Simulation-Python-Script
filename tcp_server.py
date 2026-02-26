import socket
import json
import threading

HOST = "127.0.0.1"
PORT = 6000

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind((HOST, PORT))
server.listen()

print(f"TCP Server listening on {HOST}:{PORT}")

def handle_client(conn, addr):
    print("Connected by", addr)

    while True:
        try:
            data = conn.recv(4096)
            if not data:
                break

            message = json.loads(data.decode())
            print("Received:", message)

        except Exception as e:
            print("Error:", e)
            break

    conn.close()
    print("Connection closed:", addr)

while True:
    conn, addr = server.accept()
    threading.Thread(target=handle_client, args=(conn, addr)).start()