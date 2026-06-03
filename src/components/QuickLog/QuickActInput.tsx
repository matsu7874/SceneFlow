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
  const [error, setError] = useState('')
  const descriptionRef = useRef<HTMLInputElement>(null)

  const submit = (): void => {
    // 未入力・未確定のまま追加されると無反応に見えるため、不足項目を明示する。
    const missing: string[] = []
    if (personId === null) missing.push('誰が')
    if (locationId === null) missing.push('どこで')
    if (!description.trim()) missing.push('何をした')
    if (personId === null || locationId === null || missing.length > 0) {
      setError(`${missing.join('・')}を入力してください（候補を選ぶかEnterで確定）`)
      return
    }
    setError('')
    const minutes = timeStringToMinutes(timeText) ?? 0
    onAdd({ personId, locationId, description: description.trim(), startTime: minutes })
    setDescription('')
    setTimeText(minutesToTimeString(minutes + TIME_INCREMENT))
    descriptionRef.current?.focus()
  }

  return (
    <div className={styles.inputBarWrap}>
      <div className={styles.composer}>
        <span className={styles.composerLabel}>出来事を記録</span>
        <div className={styles.inputBar}>
          <div className={styles.field} data-grow="time">
            <span className={styles.fieldCaption}>いつ</span>
            <input
              aria-label="時刻"
              className={styles.timeInput}
              value={timeText}
              onChange={event => setTimeText(event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldCaption}>誰が</span>
            <EntityCombobox
              label="誰が"
              options={persons}
              value={personId}
              onSelect={id => {
                setPersonId(id)
                setError('')
              }}
              onCreate={onCreatePerson}
            />
          </div>
          <span className={styles.particle}>が</span>
          <div className={styles.field}>
            <span className={styles.fieldCaption}>どこで</span>
            <EntityCombobox
              label="どこで"
              options={locations}
              value={locationId}
              onSelect={id => {
                setLocationId(id)
                setError('')
              }}
              onCreate={onCreateLocation}
            />
          </div>
          <span className={styles.particle}>で</span>
          <div className={styles.field} data-grow="what">
            <span className={styles.fieldCaption}>何をした</span>
            <input
              ref={descriptionRef}
              aria-label="何をした"
              className={styles.description}
              placeholder="例: 鍵を拾った"
              value={description}
              onChange={event => {
                setDescription(event.target.value)
                if (error) setError('')
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  submit()
                }
              }}
            />
          </div>
          <button type="button" className={styles.addButton} onClick={submit}>
            追加
          </button>
        </div>
        {error && (
          <p className={styles.inputError} role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
