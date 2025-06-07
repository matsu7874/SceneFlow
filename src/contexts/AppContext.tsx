import React, { createContext, useContext, useState, ReactNode } from 'react'
import { StoryData } from '../types/StoryData'

interface AppContextType {
  storyData: StoryData | null
  setStoryData: (data: StoryData | null) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppProviderProps {
  children: ReactNode
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }): React.ReactElement => {
  const [storyData, setStoryData] = useState<StoryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  return (
    <AppContext.Provider
      value={{
        storyData,
        setStoryData,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}