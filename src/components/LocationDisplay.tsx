import React from 'react'
import { Person, Location } from '../types/StoryData'
import './LocationDisplay.css'

interface LocationDisplayProps {
  persons: Person[]
  locations: Location[]
  personPositions: Map<number, number>
  currentTime: string
}

export const LocationDisplay: React.FC<LocationDisplayProps> = ({
  persons,
  locations,
  personPositions,
  currentTime,
}) => {
  const getLocationName = (locationId: number): string => {
    const location = locations.find(l => l.id === locationId)
    return location ? location.name : `不明な場所 (${locationId})`
  }

  const getPersonsAtLocation = (locationId: number): Person[] => {
    return persons.filter(person =>
      personPositions.get(person.id) === locationId,
    )
  }

  return (
    <div className="location-display">
      <h3>登場人物の現在位置 (<span>{currentTime}</span>)</h3>
      <div className="location-output">
        {locations.map(location => {
          const personsHere = getPersonsAtLocation(location.id)
          if (personsHere.length === 0) return null

          return (
            <div key={location.id} className="location-group">
              <strong>{location.name}:</strong>
              <div className="persons-list">
                {personsHere.map(person => (
                  <span
                    key={person.id}
                    className="person-tag"
                    style={{
                      backgroundColor: person.color || '#3B82F6',
                      color: 'white',
                    }}
                  >
                    {person.name}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
        {personPositions.size === 0 && (
          <div className="empty-message">データをロードしてください</div>
        )}
      </div>
    </div>
  )
}