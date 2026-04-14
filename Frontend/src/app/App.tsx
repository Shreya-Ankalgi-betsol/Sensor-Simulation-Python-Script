import { RouterProvider } from 'react-router'
import { router } from './routes'
import { SensorProvider } from './context/SensorContext'
import { WebSocketProvider } from './context/WebSocketContext'
import { ActiveTabProvider } from './context/ActiveTabContext'
import { MapNavigationProvider } from './context/MapNavigationContext'
import { TimezoneProvider } from './context/TimezoneContext'

function App() {
  return (
    <SensorProvider>
      <WebSocketProvider>
        <ActiveTabProvider>
          <MapNavigationProvider>
            <TimezoneProvider>
              <RouterProvider router={router} />
            </TimezoneProvider>
          </MapNavigationProvider>
        </ActiveTabProvider>
      </WebSocketProvider>
    </SensorProvider>
  )
}

export default App