import { WS_URL } from './apiClient'
import { WebSocketMessage, NewThreatMessage, SensorUpdateMessage } from '../types/api'

export type WSMessage = NewThreatMessage | SensorUpdateMessage | WebSocketMessage

// ─────────────────────────────────────────────
// WebSocketService
// Real WebSocket connection to FastAPI backend
// with automatic reconnection and error handling
// ─────────────────────────────────────────────
export class WebSocketService {
  private listeners: ((message: WSMessage) => void)[] = []
  private ws: WebSocket | null = null
  private isConnected = false
  private reconnectAttempt = 0
  private maxReconnectAttempts = 30 // 30 seconds max wait
  private messageQueue: WSMessage[] = []

  private reconnectDelay(): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, etc., up to 30s max
    const delay = Math.min(Math.pow(2, this.reconnectAttempt) * 1000, 30000)
    return delay
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.isConnected || this.ws) {
      console.log('[WebSocket] Already connected or connecting')
      return
    }

    console.log('[WebSocket] Connecting to', WS_URL)

    try {
      this.ws = new WebSocket(WS_URL)

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected')
        this.isConnected = true
        this.reconnectAttempt = 0

        // Send any queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift()
          if (message && this.ws) {
            this.ws.send(JSON.stringify(message))
          }
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data)
          console.log('[WebSocket] Message received:', message.type, message.payload)
          this.emit(message)
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error)
      }

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected')
        this.isConnected = false
        this.ws = null

        // Auto-reconnect with exponential backoff
        if (this.reconnectAttempt < 30) {
          const delay = this.reconnectDelay()
          console.log(`[WebSocket] Reconnecting in ${delay}ms...`)
          this.reconnectAttempt++

          setTimeout(() => {
            this.connect()
          }, delay)
        } else {
          console.error('[WebSocket] Max reconnection attempts reached')
        }
      }
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error)
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.listeners = []
    console.log('[WebSocket] Disconnected')
  }

  /**
   * Subscribe to incoming messages
   * @param listener - Callback function to receive messages
   * @returns Unsubscribe function
   */
  onMessage(listener: (message: WSMessage) => void) {
    this.listeners.push(listener)
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  /**
   * Send a message to the server
   * @param message - Message object to send
   */
  send(message: WSMessage) {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message))
    } else {
      // Queue message if not connected
      this.messageQueue.push(message)
      console.log('[WebSocket] Message queued - not connected')
    }
  }

  /**
   * Get connection status
   */
  getIsConnected(): boolean {
    return this.isConnected
  }

  /**
   * Emit message to all listeners
   */
  private emit(message: WSMessage) {
    this.listeners.forEach((listener) => {
      try {
        listener(message)
      } catch (error) {
        console.error('[WebSocket] Listener error:', error)
      }
    })
  }
}

// Export a single shared instance — used across the whole app
export const mockWS = new WebSocketService()