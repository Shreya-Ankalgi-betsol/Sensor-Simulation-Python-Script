UI Demo (new files only, original pipeline untouched)

Purpose:
- Show sensor locations on map
- Show sensor coverage radius
- Show recent object trajectory points from radar/lidar readings

Run steps (from project root):

1) Keep your existing pipeline running:
   - python backend_old/server/tcp_server.py
   - python backend_old/threat_detection/main.py
   - python backend_old/python_script/multi_sensor_simulator.py

2) Initialize metadata table:
   - python backend_old/ui_demo/metadata_bootstrap.py

3) Start UI demo server:
   - python backend_old/ui_demo/app.py

4) Open browser:
   - http://127.0.0.1:8080

Notes:
- This creates/uses table: sensor_metadata
- Update latitude/longitude/coverage in sensor_metadata to match real deployment
- Trajectory is computed from recent points; if data is random per frame, paths will look noisy
