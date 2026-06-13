import React from 'react'
import './SimulationControls.css'

interface SimulationControlsProps {
  isPlaying: boolean
  currentTime: number
  minTime?: number
  maxTime: number
  speed: number
  onPlayPause: () => void
  onTimeChange: (time: number) => void
  onSpeedChange: (speed: number) => void
  disabled?: boolean
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isPlaying,
  currentTime,
  minTime = 0,
  maxTime,
  speed,
  onPlayPause,
  onTimeChange,
  onSpeedChange,
  disabled = false,
}) => {
  const formatTime = (minutes: number): string => {
    const totalSeconds = Math.round(minutes * 60)
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="simulation-controls">
      <div className="simulation-controls-header">
        <span className="simulation-controls-eyebrow">再生コントロール</span>
      </div>
      <div className="controls">
        <div className="control-group">
          <button
            onClick={onPlayPause}
            disabled={disabled}
            className="play-pause-button"
            data-playing={isPlaying ? 'true' : 'false'}
            aria-label={isPlaying ? '一時停止' : '再生'}
          >
            {isPlaying ? '⏸ 一時停止' : '▶ 再生'}
          </button>
          <label htmlFor="speedControl" className="speed-label">
            速度:
          </label>
          <select
            id="speedControl"
            value={speed}
            onChange={e => onSpeedChange(Number(e.target.value))}
            disabled={disabled}
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="5">5x</option>
            <option value="10">10x</option>
            <option value="20">20x</option>
          </select>
        </div>
        <div className="control-group timeline-row">
          <input
            type="range"
            className="timeline"
            value={currentTime}
            min={minTime}
            max={maxTime}
            step="0.0167"
            onChange={e => onTimeChange(Number(e.target.value))}
            disabled={disabled}
            aria-label="再生位置"
          />
          <span className="current-time-display">{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  )
}
