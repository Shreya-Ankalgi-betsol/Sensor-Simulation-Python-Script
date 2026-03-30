# Map Integration Test (Free)

This test module gives you a **free map integration** for your dashboard using:

- **Leaflet** (frontend map library)
- **OpenStreetMap** tiles (no Google billing)
- Optional **WebSocket** stream for live sensor/object status

## Features

- Plot sensors by latitude/longitude
- Plot tracked objects by latitude/longitude
- Sensor color:
  - **Green** = active
  - **Red** = inactive / alert
- Object color:
  - **Blue** = normal
  - **Red** = threat
- Real-time updates via WebSocket
- Auto-fallback simulation if WebSocket server is not available

## Files

- `index.html` - test dashboard page
- `styles.css` - map/dashboard styles
- `app.js` - map + marker + WebSocket logic
- `mock_ws_server.py` - optional Python mock event stream

## Run (quick test)

From workspace root:

```powershell
cd map_integration_test
python -m http.server 8080
```

Open in browser:

- `http://localhost:8080`

If no WebSocket backend is running, the page starts local simulation automatically.

## Run with WebSocket stream (optional)

Install package once:

```powershell
pip install -r requirements.txt
```

Run mock server:

```powershell
cd map_integration_test
python mock_ws_server.py
```

Then open:

- `http://localhost:8080?ws=ws://localhost:8765`

## Message format (for your real backend)

Send JSON messages in this shape:

```json
{
  "type": "snapshot",
  "sensors": [
    {"id":"S-101","name":"Radar North","lat":19.091,"lng":72.881,"active":true,"last_seen":"2026-03-26T10:20:00Z"}
  ],
  "objects": [
    {"id":"O-1","sensor_id":"S-101","lat":19.088,"lng":72.882,"is_threat":false,"speed":12.4}
  ]
}
```

Incremental updates:

```json
{"type":"sensor_update","sensor":{"id":"S-101","lat":19.091,"lng":72.881,"active":false,"last_seen":"2026-03-26T10:21:00Z"}}
```

```json
{"type":"object_update","object":{"id":"O-1","sensor_id":"S-101","lat":19.089,"lng":72.883,"is_threat":true,"speed":19.8}}
```

## Next integration step

Connect your existing threat-detection backend WebSocket endpoint to this message format, then embed this map view in your main dashboard UI.