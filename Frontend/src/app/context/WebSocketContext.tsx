import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { mockWS, WSMessage } from '../services/mockWebSocket'
import { ThreatLog } from '../types/api'
import { useSensors } from './SensorContext'

interface WebSocketContextType {
  liveThreats: ThreatLog[]        // All threats including new live ones
  isConnected: boolean
}

const WebSocketContext = createContext<WebSocketContextType>({
  liveThreats: [],
  isConnected: false,
})

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { updateSensor } = useSensors()
  const [liveThreats, setLiveThreats] = useState<ThreatLog[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Start the real WebSocket connection
    mockWS.connect()

    // Listen for incoming messages
    const unsubscribe = mockWS.onMessage((message: WSMessage) => {
      if (message.type === 'NEW_THREAT') {
        // Only add threats with valid alert_id
        if (!message.payload.alert_id) {
          console.warn('[WebSocket] Received threat without alert_id, skipping:', message.payload)
          return
        }

        // Prepend new threat to the top of the list
        setLiveThreats((prev) => {
          // Avoid duplicates
          if (prev.some((t) => t.alert_id === message.payload.alert_id)) {
            return prev
          }
          return [message.payload, ...prev]
        })
        // Update connection status
        setIsConnected(true)
      }

      if (message.type === 'SENSOR_UPDATE') {
        // Update the sensor status in SensorContext
        updateSensor(message.payload.sensor_id, {
          status: message.payload.status,
        })
      }
    })

    // Set connected status after initial setup
    setIsConnected(true)

    // Cleanup on unmount
    return () => {
      unsubscribe()
      mockWS.disconnect()
      setIsConnected(false)
    }
  }, [updateSensor])

  return (
    <WebSocketContext.Provider value={{ liveThreats, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  return useContext(WebSocketContext)
}