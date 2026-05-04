# Sensor Project

Simple Flask server that receives simulated RADAR sensor data and writes each payload to a log file.

## Requirements

- Windows with PowerShell
- Python 3.10+ (project has a venv folder included)

## Setup (new venv)

If you want to create a fresh virtual environment:

```powershell
python -m venv venv
```

Activate it:

```powershell
venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
python -m pip install flask requests
```

## Setup (use existing venv)

If you want to use the included venv folder (named `venvs`):

```powershell
.\venvs\Scripts\Activate.ps1
```

If you are missing packages, install them:

```powershell
python -m pip install flask requests
```

## Run

1) Start the server:

```powershell
python server.py
```

2) In a second terminal, start the simulator:

```powershell
python sensor_simulator.py
```

The server writes received payloads to `sensor_log.json` in the project root.

## Port note

`server.py` starts on port 8000, but `sensor_simulator.py` posts to port 5000.

Pick one of these options so they match:

- Update the simulator URL to `http://127.0.0.1:8000/sensor-data`, or
- Change the server port to 5000 by editing the `app.run(...)` call.

## Troubleshooting

- If PowerShell blocks script activation, run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

- If you see `ModuleNotFoundError`, make sure the venv is activated and re-run the install step.
