import React from 'react'
import { SimulationControls } from '../components/SimulationControls'
import { LocationDisplay } from '../components/LocationDisplay'
import { EventLog } from '../components/EventLog'
import { LocationLayout } from '../components/LocationLayout'
import { useSimulation } from '../hooks/useSimulation'
import { useAppContext } from '../contexts/AppContext'
import { PageHeader } from '../components/common/PageHeader'
import { EmptyState } from '../components/common/EmptyState'
import { useLoadSample } from '../hooks/useLoadSample'
import './SimulationPage.css'

const HINT = '入力済みの物語を時間軸に沿って再生し、各時刻の人物の居場所と出来事を確認します。'

export const SimulationPage: React.FC = () => {
  const { storyData } = useAppContext()
  const loadSample = useLoadSample()

  const {
    isPlaying,
    speed,
    currentTime,
    personPositions,
    logEntries,
    minTime,
    maxTime,
    formatTime,
    togglePlayPause,
    setCurrentTime,
    changeSpeed,
  } = useSimulation(storyData)

  if (!storyData) {
    return (
      <div className="page simulation-page">
        <PageHeader eyebrow="検証・分析" title="シミュレーション" hint={HINT} />
        <EmptyState
          icon="▶"
          title="物語データが読み込まれていません"
          description="再生するには物語データが必要です。データ入出力で読み込むか、サンプルを投入してください。"
          actions={[
            { label: 'データ入出力で読み込む', to: '/data' },
            {
              label: 'サンプルを読み込む',
              onClick: () => loadSample('mansion'),
              variant: 'secondary',
            },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="page simulation-page">
      <PageHeader eyebrow="検証・分析" title="シミュレーション" hint={HINT} />

      <div className="container">
        <div className="output-area">
          <SimulationControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            minTime={minTime}
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
