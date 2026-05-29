import React from 'react'
import type { Act, Prop, Information, Person } from '../../types/StoryData'
import styles from './QuickLog.module.css'

interface ActDetailPanelProps {
  act: Act
  persons: Person[]
  props: Prop[]
  informations: Information[]
  onChange: (patch: Partial<Act>) => void
}

const numberOrUndefined = (value: string): number | undefined =>
  value === '' ? undefined : Number(value)

export const ActDetailPanel: React.FC<ActDetailPanelProps> = ({
  act,
  persons,
  props,
  informations,
  onChange,
}) => {
  return (
    <div className={styles.detailPanel}>
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
