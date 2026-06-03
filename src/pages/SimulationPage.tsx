import React from 'react'
import { SimulationControls } from '../components/SimulationControls'
import { LocationDisplay } from '../components/LocationDisplay'
import { EventLog } from '../components/EventLog'
import { LocationLayout } from '../components/LocationLayout'
import { JsonDataInput } from '../components/JsonDataInput'
import { useSimulation } from '../hooks/useSimulation'
import { useAppContext } from '../contexts/AppContext'
import './SimulationPage.css'

export const SimulationPage: React.FC = () => {
  const { storyData, setStoryData } = useAppContext()

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
    changeSpeed,
  } = useSimulation(storyData)

  const handleDataLoad = (data: typeof storyData): void => {
    if (data) {
      setStoryData(data)
    }
  }

  return (
    <div className="page simulation-page">
      <header className="simulation-page-header">
        <span className="simulation-page-eyebrow">Simulation</span>
        <h2 className="simulation-page-title">シミュレーション</h2>
      </header>

      <div className="container">
        <div className="input-area">
          <JsonDataInput onDataLoad={handleDataLoad} currentData={storyData} />
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
    </div>
  )
}
