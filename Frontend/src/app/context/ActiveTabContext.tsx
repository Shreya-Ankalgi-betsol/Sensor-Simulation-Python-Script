import { createContext, useContext, useState, ReactNode } from 'react'

interface ActiveTabContextType {
  activeTab: 'live' | 'logs' | null
  setActiveTab: (tab: 'live' | 'logs' | null) => void
  logsRefreshToken: number
  requestLogsRefresh: () => void
  isLiveStreamPaused: boolean
  setLiveStreamPaused: (paused: boolean) => void
}

const ActiveTabContext = createContext<ActiveTabContextType>({
  activeTab: null,
  setActiveTab: () => {},
  logsRefreshToken: 0,
  requestLogsRefresh: () => {},
  isLiveStreamPaused: false,
  setLiveStreamPaused: () => {},
})

export function ActiveTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<'live' | 'logs' | null>(null)
  const [logsRefreshToken, setLogsRefreshToken] = useState(0)
  const [isLiveStreamPaused, setLiveStreamPaused] = useState(false)

  const requestLogsRefresh = () => {
    setLogsRefreshToken((prev) => prev + 1)
  }

  return (
    <ActiveTabContext.Provider value={{
      activeTab,
      setActiveTab,
      logsRefreshToken,
      requestLogsRefresh,
      isLiveStreamPaused,
      setLiveStreamPaused,
    }}>
      {children}
    </ActiveTabContext.Provider>
  )
}

export function useActiveTab() {
  return useContext(ActiveTabContext)
}
