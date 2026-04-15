import { createContext, useContext, useState, ReactNode } from 'react'

interface TimezoneContextType {
  timezone: string
  setTimezone: (tz: string) => void
}

const TimezoneContext = createContext<TimezoneContextType>({
  timezone: 'Asia/Calcutta',
  setTimezone: () => {},
})

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezone] = useState<string>('Asia/Calcutta')

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone }}>
      {children}
    </TimezoneContext.Provider>
  )
}

export function useTimezone() {
  return useContext(TimezoneContext)
}
