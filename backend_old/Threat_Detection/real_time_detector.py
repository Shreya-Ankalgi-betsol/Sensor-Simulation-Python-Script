# Threat Detection Real-Time Client
# Connects directly to TCP Server and processes data immediately as it arrives

import sys
import os
import socket
import json
import threading

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.threat_detection_service import ThreatDetectionService

HOST = "127.0.0.1"
PORT = 9000

def real_time_threat_detection():
    """
    Connect to TCP Server and process sensor data in real-time
    as it arrives from sensors
    """
    service = ThreatDetectionService()
    
    print(f"Connecting to TCP Server at {HOST}:{PORT}...")
    print("Waiting for sensor data...\n")
    
    while True:
        try:
            # Connect to TCP Server
            client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            client.connect((HOST, PORT))
            
            print(f"✓ Connected to TCP Server at {HOST}:{PORT}")
            
            while True:
                try:
                    # Receive data from TCP Server as it arrives
                    data = client.recv(4096)
                    
                    if not data:
                        print("Connection closed by server")
                        break
                    
                    # Parse sensor payload
                    message = json.loads(data.decode())
                    
                    # ⚡ REAL-TIME THREAT DETECTION
                    # Process immediately as data arrives
                    result = service.process(message)
                    
                    # Print alert if threat detected
                    if result.get("detected_objects"):
                        print(f"\n🚨 THREAT ALERT: {json.dumps(result, indent=2)}\n")
                    
                except json.JSONDecodeError as je:
                    print(f"JSON decode error: {je}")
                    continue
                    
                except Exception as e:
                    print(f"Error processing data: {e}")
                    break
            
            client.close()
            
        except ConnectionRefusedError:
            print(f"Cannot connect to TCP Server. Retrying in 5 seconds...")
            import time
            time.sleep(5)
            
        except Exception as e:
            print(f"Fatal error: {e}")
            import time
            time.sleep(5)


if __name__ == "__main__":
    real_time_threat_detection()
