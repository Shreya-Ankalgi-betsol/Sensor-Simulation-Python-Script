const DEFAULT_WS_URL = "ws://localhost:8765";
const wsUrl = new URLSearchParams(window.location.search).get("ws") || DEFAULT_WS_URL;

const sensorMarkers = new Map();
const objectMarkers = new Map();
const sensors = new Map();
const objects = new Map();

const connDot = document.getElementById("conn-dot");
const connText = document.getElementById("conn-text");
const sensorList = document.getElementById("sensor-list");
const objectList = document.getElementById("object-list");

const map = L.map("map", {
  zoomControl: true,
}).setView([19.076, 72.8777], 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

function setConnection(connected, label) {
  connDot.classList.remove("dot-offline", "dot-online");
  connDot.classList.add(connected ? "dot-online" : "dot-offline");
  connText.textContent = label;
}

function sensorColor(active) {
  return active ? "#22c55e" : "#ef4444";
}

function objectColor(isThreat) {
  return isThreat ? "#ef4444" : "#38bdf8";
}

function upsertSensor(sensor) {
  sensors.set(sensor.id, sensor);

  const latLng = [sensor.lat, sensor.lng];
  const color = sensorColor(sensor.active);
  const existing = sensorMarkers.get(sensor.id);

  const popup = `
    <b>Sensor ${sensor.id}</b><br/>
    Name: ${sensor.name || "-"}<br/>
    Status: ${sensor.active ? "ACTIVE" : "INACTIVE"}<br/>
    Last Update: ${sensor.last_seen || "-"}
  `;

  if (!existing) {
    const marker = L.circleMarker(latLng, {
      radius: 10,
      color,
      fillColor: color,
      fillOpacity: 0.8,
      weight: 2,
    }).addTo(map);
    marker.bindPopup(popup);
    sensorMarkers.set(sensor.id, marker);
  } else {
    existing.setLatLng(latLng);
    existing.setStyle({ color, fillColor: color });
    existing.setPopupContent(popup);
  }

  renderLists();
}

function upsertObject(object) {
  objects.set(object.id, object);

  const latLng = [object.lat, object.lng];
  const color = objectColor(object.is_threat);
  const existing = objectMarkers.get(object.id);

  const popup = `
    <b>Object ${object.id}</b><br/>
    Linked Sensor: ${object.sensor_id || "-"}<br/>
    Threat: ${object.is_threat ? "YES" : "NO"}<br/>
    Speed: ${object.speed ?? "-"} m/s
  `;

  if (!existing) {
    const marker = L.circleMarker(latLng, {
      radius: 7,
      color,
      fillColor: color,
      fillOpacity: 0.9,
      weight: 1,
    }).addTo(map);
    marker.bindPopup(popup);
    objectMarkers.set(object.id, marker);
  } else {
    existing.setLatLng(latLng);
    existing.setStyle({ color, fillColor: color });
    existing.setPopupContent(popup);
  }

  renderLists();
}

function renderLists() {
  sensorList.innerHTML = "";
  objectList.innerHTML = "";

  [...sensors.values()].forEach((sensor) => {
    const item = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = sensorColor(sensor.active);
    item.appendChild(dot);

    const label = document.createElement("span");
    label.textContent = `${sensor.name || sensor.id} (${sensor.id})`;
    item.appendChild(label);

    const status = document.createElement("small");
    status.textContent = sensor.active ? "active" : "inactive";
    item.appendChild(status);

    sensorList.appendChild(item);
  });

  [...objects.values()].forEach((object) => {
    const item = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = objectColor(object.is_threat);
    item.appendChild(dot);

    const label = document.createElement("span");
    label.textContent = `${object.id} @ ${object.sensor_id || "sensor?"}`;
    item.appendChild(label);

    const status = document.createElement("small");
    status.textContent = object.is_threat ? "threat" : "normal";
    item.appendChild(status);

    objectList.appendChild(item);
  });
}

function applyMessage(message) {
  if (message.type === "snapshot") {
    (message.sensors || []).forEach(upsertSensor);
    (message.objects || []).forEach(upsertObject);

    if ((message.sensors || []).length > 0) {
      const first = message.sensors[0];
      map.setView([first.lat, first.lng], 13);
    }
    return;
  }

  if (message.type === "sensor_update" && message.sensor) {
    upsertSensor(message.sensor);
    return;
  }

  if (message.type === "object_update" && message.object) {
    upsertObject(message.object);
  }
}

function connectWebSocket() {
  setConnection(false, `Connecting to ${wsUrl}`);
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    setConnection(true, `Connected: ${wsUrl}`);
  };

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      applyMessage(payload);
    } catch (error) {
      console.error("Invalid message", error);
    }
  };

  ws.onerror = () => {
    setConnection(false, "Socket error");
  };

  ws.onclose = () => {
    setConnection(false, "Disconnected. Starting local simulation...");
    runLocalSimulation();
  };
}

let simStarted = false;
function runLocalSimulation() {
  if (simStarted) return;
  simStarted = true;

  const seedSensors = [
    { id: "S-101", name: "Radar North", lat: 19.091, lng: 72.881, active: true, last_seen: new Date().toISOString() },
    { id: "S-102", name: "Lidar East", lat: 19.073, lng: 72.905, active: true, last_seen: new Date().toISOString() },
    { id: "S-103", name: "Radar South", lat: 19.052, lng: 72.873, active: false, last_seen: new Date().toISOString() },
  ];

  const seedObjects = [
    { id: "O-1", sensor_id: "S-101", lat: 19.088, lng: 72.882, is_threat: false, speed: 12.4 },
    { id: "O-2", sensor_id: "S-102", lat: 19.075, lng: 72.901, is_threat: true, speed: 20.1 },
    { id: "O-3", sensor_id: "S-103", lat: 19.053, lng: 72.871, is_threat: false, speed: 9.8 },
  ];

  applyMessage({ type: "snapshot", sensors: seedSensors, objects: seedObjects });

  setInterval(() => {
    const sensorIds = [...sensors.keys()];
    const objectIds = [...objects.keys()];
    if (!sensorIds.length || !objectIds.length) return;

    const sensorId = sensorIds[Math.floor(Math.random() * sensorIds.length)];
    const currentSensor = sensors.get(sensorId);
    upsertSensor({
      ...currentSensor,
      active: Math.random() > 0.25,
      last_seen: new Date().toISOString(),
    });

    const objectId = objectIds[Math.floor(Math.random() * objectIds.length)];
    const currentObject = objects.get(objectId);
    upsertObject({
      ...currentObject,
      is_threat: Math.random() > 0.7,
      lat: currentObject.lat + (Math.random() - 0.5) * 0.002,
      lng: currentObject.lng + (Math.random() - 0.5) * 0.002,
      speed: Number((8 + Math.random() * 25).toFixed(1)),
    });
  }, 1500);
}

connectWebSocket();