import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { StoryData } from '../types/StoryData'
import { loadStoredStory, saveStoredStory } from './storyPersistence'

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
  const [storyData, setStoryData] = useState<StoryData | null>(() =>
    typeof window !== 'undefined' ? loadStoredStory(window.localStorage) : null,
  )
  const [isLoading, setIsLoading] = useState(false)

  // storyData の変更を localStorage に反映し、リロードしてもデータが消えないようにする。
  useEffect(() => {
    if (typeof window !== 'undefined') {
      saveStoredStory(window.localStorage, storyData)
    }
  }, [storyData])

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

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
