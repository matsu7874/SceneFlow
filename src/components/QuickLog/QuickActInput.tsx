import React, { useRef, useState } from 'react'
import { EntityCombobox, type ComboOption } from './EntityCombobox'
import { timeStringToMinutes, minutesToTimeString } from './quickLogLogic'
import styles from './QuickLog.module.css'

const TIME_INCREMENT = 5

export interface QuickActPayload {
  personId: number
  locationId: number
  description: string
  startTime: number
}

interface QuickActInputProps {
  persons: ComboOption[]
  locations: ComboOption[]
  onAdd: (payload: QuickActPayload) => void
  onCreatePerson: (name: string) => number | null
  onCreateLocation: (name: string) => number | null
}

export const QuickActInput: React.FC<QuickActInputProps> = ({
  persons,
  locations,
  onAdd,
  onCreatePerson,
  onCreateLocation,
}) => {
  const [personId, setPersonId] = useState<number | null>(null)
  const [locationId, setLocationId] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [timeText, setTimeText] = useState('00:00')
  const descriptionRef = useRef<HTMLInputElement>(null)

  const submit = (): void => {
    if (personId === null || locationId === null || !description.trim()) return
    const minutes = timeStringToMinutes(timeText) ?? 0
    onAdd({ personId, locationId, description: description.trim(), startTime: minutes })
    setDescription('')
    setTimeText(minutesToTimeString(minutes + TIME_INCREMENT))
    descriptionRef.current?.focus()
  }

  return (
    <div className={styles.inputBar}>
      <EntityCombobox
        label="誰が"
        options={persons}
        value={personId}
        onSelect={setPersonId}
        onCreate={onCreatePerson}
      />
      <span className={styles.particle}>が</span>
      <EntityCombobox
        label="どこで"
        options={locations}
        value={locationId}
        onSelect={setLocationId}
        onCreate={onCreateLocation}
      />
      <span className={styles.particle}>で</span>
      <input
        ref={descriptionRef}
        aria-label="何をした"
        className={styles.description}
        placeholder="何をした"
        value={description}
        onChange={event => setDescription(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault()
            submit()
          }
        }}
      />
      <input
        aria-label="時刻"
        className={styles.time}
        value={timeText}
        onChange={event => setTimeText(event.target.value)}
      />
      <button type="button" onClick={submit}>
        追加
      </button>
    </div>
  )
}
