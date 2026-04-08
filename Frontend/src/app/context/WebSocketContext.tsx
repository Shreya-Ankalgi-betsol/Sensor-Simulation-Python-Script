import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import { mockWS, WSMessage } from '../services/WebSocketClient'
import { ThreatLog } from '../types/api'
import { useSensors } from './SensorContext'

interface WebSocketContextType {
  liveThreats: ThreatLog[]        // All threats including new live ones
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  connect: () => void
  disconnect: () => void
  clearLiveThreats: () => void
}

const WebSocketContext = createContext<WebSocketContextType>({
  liveThreats: [],
  isConnected: false,
  connectionStatus: 'disconnected',
  connect: () => {},
  disconnect: () => {},
  clearLiveThreats: () => {},
})

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { updateSensor } = useSensors()
  const [liveThreats, setLiveThreats] = useState<ThreatLog[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [manualDisconnect, setManualDisconnect] = useState(false)

  const connect = useCallback(() => {
    console.log('[WebSocket] Manual connect requested')
    setManualDisconnect(false)
    setConnectionStatus('connecting')
    mockWS.connect()
  }, [])

  const disconnect = useCallback(() => {
    console.log('[WebSocket] Manual disconnect requested')
    setManualDisconnect(true)
    setConnectionStatus('disconnected')
    setIsConnected(false)
    mockWS.disconnect()
  }, [])

  const clearLiveThreats = useCallback(() => {
    setLiveThreats([])
  }, [])

  useEffect(() => {
    // Only auto-connect if not manually disconnected
    if (!manualDisconnect) {
      mockWS.connect()
      setConnectionStatus('connecting')
    }

    // Listen for incoming messages
    const unsubscribe = mockWS.onMessage((message: WSMessage) => {
      if (message.type === 'NEW_THREAT') {
        // Only add threats if not manually disconnected
        if (manualDisconnect) return

        // Only add threats with valid alert_id
        if (!message.payload.alert_id) {
          console.warn('[WebSocket] Received threat without alert_id, skipping:', message.payload)
          return
        }

        // Update connection status
        setConnectionStatus('connected')
        setIsConnected(true)

        // Prepend new threat to the top of the list
        setLiveThreats((prev) => {
          // Avoid duplicates
          if (prev.some((t) => t.alert_id === message.payload.alert_id)) {
            return prev
          }
          return [message.payload, ...prev]
        })
      }
    })

    // Cleanup on unmount
    return () => {
      unsubscribe()
      if (!manualDisconnect) {
        mockWS.disconnect()
        setIsConnected(false)
      }
    }
  }, [manualDisconnect])

  return (
    <WebSocketContext.Provider value={{ 
      liveThreats, 
      isConnected, 
      connectionStatus,
      connect,
      disconnect,
      clearLiveThreats,
    }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  return useContext(WebSocketContext)
}