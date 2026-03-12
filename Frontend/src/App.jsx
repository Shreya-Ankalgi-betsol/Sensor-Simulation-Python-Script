import { useEffect, useRef, useState, useCallback } from "react";

// Configure via .env: VITE_WS_URL=ws://localhost:8000/ws/sensors
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/sensors";

export default function App() {
  const [status, setStatus] = useState("disconnected"); // disconnected | connecting | connected | error
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const attemptRef = useRef(0);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) return;
    const base = 1000; // 1s
    const max = 5000;  // 5s
    const delay = Math.min(max, base * Math.pow(1.8, attemptRef.current));
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      attemptRef.current += 1;
      connect();
    }, delay);
  }, []);

  const connect = useCallback(() => {
    // Avoid duplicate sockets
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      attemptRef.current = 0;
      ws.send(JSON.stringify({ type: "client_ready", at: new Date().toISOString() }));
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setMessages((prev) => [...prev, parsed]);
      } catch {
        setMessages((prev) => [...prev, { type: "text", text: event.data }]);
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = () => {
      setStatus("disconnected");
      scheduleReconnect();
    };
  }, [scheduleReconnect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        try {
          wsRef.current.onclose = null; // avoid re-triggering reconnect
          wsRef.current.close();
        } catch {}
      }
    };
  }, [connect]);

  const sendMessage = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !input.trim()) return;
    const msg = { type: "client_note", text: input.trim(), at: new Date().toISOString() };
    ws.send(JSON.stringify(msg));
    setInput("");
    console.log(msg);
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "2rem auto" }}>
      <h1>FastAPI ↔ React (Server Stream)</h1>
      <p>
        Status: <strong>{status}</strong>
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
          placeholder="Send a note to server (will be logged only)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} disabled={status !== "connected"}>
          Send
        </button>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          minHeight: 260,
          background: "#fafafa",
        }}
      >
        {messages.length === 0 ? (
          <em>Waiting for server stream…</em>
        ) : (
          messages.map((m, idx) => (
            <pre key={idx} style={{ margin: 0, marginBottom: 8, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(m, null, 2)}
            </pre>
          ))
        )}
      </div>
    </div>
  );
}