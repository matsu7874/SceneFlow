import React, { useRef, useEffect } from 'react'
import { Person, Act } from '../types/StoryData'
import './EventLog.css'

interface LogEntry {
  time: string
  personId: number
  text: string
}

interface EventLogProps {
  logEntries: LogEntry[]
  persons: Person[]
  currentTime: string
}

export const EventLog: React.FC<EventLogProps> = ({
  logEntries,
  persons,
  currentTime,
}) => {
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logEntries])

  const getPersonColor = (personId: number): string => {
    const person = persons.find(p => p.id === personId)
    return person?.color || '#000'
  }

  const getPersonName = (personId: number): string => {
    const person = persons.find(p => p.id === personId)
    return person?.name || `不明な人物 (${personId})`
  }

  return (
    <div className="event-log">
      <h3>実行ログ (<span>{currentTime}</span>まで)</h3>
      <div className="log-output" ref={logRef}>
        {logEntries.length === 0 ? (
          <div className="empty-message">ログはありません</div>
        ) : (
          logEntries.map((entry, index) => (
            <div key={index} className="log-entry">
              <span className="log-time">[{entry.time}]</span>
              <strong
                className="log-person"
                style={{ color: getPersonColor(entry.personId) }}
              >
                {getPersonName(entry.personId)}
              </strong>
              <span className="log-text">{entry.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}