# Sensor Project

Simple Flask server that receives simulated RADAR sensor data and writes each payload to a log file.


## Setup (new venv)



```powershell
python -m venv venv
```

Activate it:
venv\Scripts\Activate.ps1

Install dependencies:

python -m pip install flask requests

If you are missing packages, install them:

python -m pip install flask requests

## Run

1) Start the server:

python server.py

2) In a second terminal, start the simulator:

python sensor_simulator.py

## Port note

`server.py` starts on port 8000, but `sensor_simulator.py` posts to port 5000.

Pick one of these options so they match:

- Update the simulator URL to `http://127.0.0.1:8000/sensor-data`, or
- Change the server port to 5000 by editing the `app.run(...)` call.
