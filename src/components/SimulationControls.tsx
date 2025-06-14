import React from 'react'
import './SimulationControls.css'

interface SimulationControlsProps {
  isPlaying: boolean
  currentTime: number
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
      <h2>シミュレーション制御</h2>
      <div className="controls">
        <div className="control-group">
          <button
            onClick={onPlayPause}
            disabled={disabled}
            className="play-pause-button"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <label htmlFor="speedControl">速度:</label>
          <select
            id="speedControl"
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
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
        <div className="control-group">
          <input
            type="range"
            className="timeline"
            value={currentTime}
            min="0"
            max={maxTime}
            step="0.0167"
            onChange={(e) => onTimeChange(Number(e.target.value))}
            disabled={disabled}
          />
          <span className="current-time-display">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>
    </div>
  )
}