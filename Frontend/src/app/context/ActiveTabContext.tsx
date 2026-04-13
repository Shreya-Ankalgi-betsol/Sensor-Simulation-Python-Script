import { createContext, useContext, useState, ReactNode } from 'react'

interface ActiveTabContextType {
  activeTab: 'live' | 'logs' | null
  setActiveTab: (tab: 'live' | 'logs' | null) => void
}

const ActiveTabContext = createContext<ActiveTabContextType>({
  activeTab: null,
  setActiveTab: () => {},
})

export function ActiveTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<'live' | 'logs' | null>(null)

  return (
    <ActiveTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </ActiveTabContext.Provider>
  )
}

export function useActiveTab() {
  return useContext(ActiveTabContext)
}
