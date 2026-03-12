# app/main.py
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from .ws import sensors_ws

app = FastAPI(title="Backend")

# Allow your React dev server while developing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health():
    return {"status": "ok"}

# WebSocket route (simple: implemented inline)
@app.websocket("/ws/sensors")
async def ws_sensors(websocket: WebSocket):
    await sensors_ws(websocket)