import React, { useState } from 'react'
import { JsonDataInput } from './components/JsonDataInput'
import { SimulationControls } from './components/SimulationControls'
import { LocationDisplay } from './components/LocationDisplay'
import { EventLog } from './components/EventLog'
import { LocationLayout } from './components/LocationLayout'
import { StoryData } from './types/StoryData'
import { useSimulation } from './hooks/useSimulation'
import './App.css'

/**
 * Scene-Flow メインアプリケーションコンポーネント
 */
function App() {
  const [storyData, setStoryData] = useState<StoryData | null>(null)
  
  const {
    isPlaying,
    speed,
    currentTime,
    personPositions,
    logEntries,
    maxTime,
    formatTime,
    togglePlayPause,
    setCurrentTime,
    changeSpeed
  } = useSimulation(storyData)

  const handleDataLoad = (data: StoryData) => {
    setStoryData(data)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Scene-Flow</h1>
      </header>
      <main className="app-main">
        <div className="container">
          <div className="input-area">
            <JsonDataInput onDataLoad={handleDataLoad} />
          </div>
          
          <div className="output-area">
            <SimulationControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              maxTime={maxTime}
              speed={speed}
              onPlayPause={togglePlayPause}
              onTimeChange={setCurrentTime}
              onSpeedChange={changeSpeed}
              disabled={!storyData}
            />
            
            <LocationDisplay
              persons={storyData?.persons || []}
              locations={storyData?.locations || []}
              personPositions={personPositions}
              currentTime={formatTime(currentTime)}
            />
            
            <EventLog
              logEntries={logEntries}
              persons={storyData?.persons || []}
              currentTime={formatTime(currentTime)}
            />
          </div>
          
          <div className="layout-area">
            <LocationLayout
              persons={storyData?.persons || []}
              locations={storyData?.locations || []}
              personPositions={personPositions}
              currentTime={formatTime(currentTime)}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App