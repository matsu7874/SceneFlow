import React, { useState, useEffect } from 'react'
import type { Act, Prop, Information, Person, Location } from '../../types/StoryData'
import { timeStringToMinutes } from './quickLogLogic'
import styles from './QuickLog.module.css'

interface ActDetailPanelProps {
  act: Act
  persons: Person[]
  locations: Location[]
  props: Prop[]
  informations: Information[]
  onChange: (patch: Partial<Act>) => void
}

const numberOrUndefined = (value: string): number | undefined =>
  value === '' ? undefined : Number(value)

export const ActDetailPanel: React.FC<ActDetailPanelProps> = ({
  act,
  persons,
  locations,
  props,
  informations,
  onChange,
}) => {
  const [timeDraft, setTimeDraft] = useState(act.time)

  useEffect(() => {
    setTimeDraft(act.time)
  }, [act.time])

  return (
    <div className={styles.detailPanel}>
      <label>
        時刻
        <input
          value={timeDraft}
          onChange={event => {
            const next = event.target.value
            setTimeDraft(next)
            const minutes = timeStringToMinutes(next)
            if (minutes !== null) onChange({ startTime: minutes })
          }}
        />
      </label>
      <label>
        場所
        <select
          value={act.locationId}
          onChange={event => onChange({ locationId: Number(event.target.value) })}
        >
          {locations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        タイプ
        <input value={act.type ?? ''} onChange={event => onChange({ type: event.target.value })} />
      </label>
      <label>
        相手
        <select
          value={act.interactedPersonId ?? ''}
          onChange={event =>
            onChange({ interactedPersonId: numberOrUndefined(event.target.value) })
          }
        >
          <option value="">（なし）</option>
          {persons.map(person => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        アイテム
        <select
          value={act.propId ?? ''}
          onChange={event => onChange({ propId: numberOrUndefined(event.target.value) })}
        >
          <option value="">（なし）</option>
          {props.map(prop => (
            <option key={prop.id} value={prop.id}>
              {prop.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        情報
        <select
          value={act.informationId ?? ''}
          onChange={event => onChange({ informationId: numberOrUndefined(event.target.value) })}
        >
          <option value="">（なし）</option>
          {informations.map(info => (
            <option key={info.id} value={info.id}>
              {info.name ?? info.content}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
