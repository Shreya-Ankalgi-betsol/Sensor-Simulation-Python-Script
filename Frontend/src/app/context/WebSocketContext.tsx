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
}

const WebSocketContext = createContext<WebSocketContextType>({
  liveThreats: [],
  isConnected: false,
  connectionStatus: 'disconnected',
})

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { updateSensor } = useSensors()
  const [liveThreats, setLiveThreats] = useState<ThreatLog[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  useEffect(() => {
    // Auto-connect on mount and keep connection always open
    console.log('[WebSocket] Auto-connecting on app load')
    mockWS.connect()
    setConnectionStatus('connecting')

    // Listen for incoming messages
    const unsubscribe = mockWS.onMessage((message: WSMessage) => {
      if (message.type === 'NEW_THREAT') {
        // Only process threats with valid alert_id
        if (!message.payload.alert_id) {
          console.warn('[WebSocket] Received threat without alert_id, skipping:', message.payload)
          return
        }

        // Update connection status
        setConnectionStatus('connected')
        setIsConnected(true)

        // Prepend new threat to the list (global state - all pages can access)
        setLiveThreats((prev) => {
          // Avoid duplicates
          if (prev.some((t) => t.alert_id === message.payload.alert_id)) {
            return prev
          }
          return [message.payload, ...prev]
        })
      }
    })

    // Cleanup on unmount - do NOT disconnect to keep connection alive
    return () => {
      unsubscribe()
    }
  }, [updateSensor])

  return (
    <WebSocketContext.Provider value={{ 
      liveThreats, 
      isConnected, 
      connectionStatus,
    }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  return useContext(WebSocketContext)
}