import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { mockWS, WSMessage } from '../services/WebSocketClient'
import { ThreatLog, ThreatSummaryOut } from '../types/api'

interface WebSocketContextType {
  liveThreats: ThreatLog[]        // All threats including new live ones
  threatSummary: ThreatSummaryOut | null  // Real-time threat summary from backend
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
}

const WebSocketContext = createContext<WebSocketContextType>({
  liveThreats: [],
  threatSummary: null,
  isConnected: false,
  connectionStatus: 'disconnected',
})

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const maxLiveThreats = 500
  const [liveThreats, setLiveThreats] = useState<ThreatLog[]>([])
  const [threatSummary, setThreatSummary] = useState<ThreatSummaryOut | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  useEffect(() => {
    // Auto-connect on mount and keep connection always open
    console.log('[WebSocket] Auto-connecting on app load')
    mockWS.connect()

    const unsubscribeStatus = mockWS.onStatusChange((status) => {
      setConnectionStatus(status)
      setIsConnected(status === 'connected')
    })

    // Listen for incoming messages
    const unsubscribe = mockWS.onMessage((message: WSMessage) => {
      if (message.type === 'CONNECTION_CONFIRMED') {
        return
      }

      if (message.type === 'THREAT_SUMMARY_UPDATE') {
        setThreatSummary(message.payload as ThreatSummaryOut)
        return
      }

      if (message.type === 'NEW_THREAT') {
        // Only process threats with valid alert_id
        if (!message.payload.alert_id) {
          console.warn('[WebSocket] Received threat without alert_id, skipping:', message.payload)
          return
        }

        // Prepend new threat to the list (global state - all pages can access)
        setLiveThreats((prev) => {
          // Avoid duplicates
          if (prev.some((t) => t.alert_id === message.payload.alert_id)) {
            return prev
          }
          return [message.payload, ...prev].slice(0, maxLiveThreats)
        })
      }
    })

    // Cleanup on unmount - do NOT disconnect to keep connection alive
    return () => {
      unsubscribe()
      unsubscribeStatus()
    }
  }, [])

  // Calculate threat summary from live threats for the live stream tab
  const derivedThreatSummary: ThreatSummaryOut = {
    total_threats: liveThreats.length,
    high_severity_count: liveThreats.filter(t => t.severity === 'high').length,
    active_sensor_count: 0, // This will be calculated in Threats.tsx using sensor list
  }

  return (
    <WebSocketContext.Provider value={{ 
      liveThreats, 
      threatSummary: threatSummary ?? derivedThreatSummary,
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