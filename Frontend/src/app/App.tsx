import { RouterProvider } from 'react-router'
import { router } from './routes'
import { SensorProvider } from './context/SensorContext'
import { WebSocketProvider } from './context/WebSocketContext'

function App() {
  return (
    <SensorProvider>
      <WebSocketProvider>
        <RouterProvider router={router} />
      </WebSocketProvider>
    </SensorProvider>
  )
}

export default App