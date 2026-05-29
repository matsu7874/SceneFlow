import React, { useState } from 'react'
import type { Act, Prop, Information, Person, Location } from '../../types/StoryData'
import { ActDetailPanel } from './ActDetailPanel'
import styles from './QuickLog.module.css'

interface ActTimelineRowProps {
  act: Act
  persons: Person[]
  locations: Location[]
  props: Prop[]
  informations: Information[]
  inconsistent: boolean
  onUpdate: (patch: Partial<Act>) => void
  onDelete: () => void
}

export const ActTimelineRow: React.FC<ActTimelineRowProps> = ({
  act,
  persons,
  locations,
  props,
  informations,
  inconsistent,
  onUpdate,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false)
  const personName = persons.find(p => p.id === act.personId)?.name ?? `#${act.personId}`
  const locationName = locations.find(l => l.id === act.locationId)?.name ?? `#${act.locationId}`

  return (
    <li className={styles.row}>
      <div className={styles.rowHeader}>
        <button type="button" className={styles.rowToggle} onClick={() => setExpanded(v => !v)}>
          <span className={styles.time}>{act.time}</span>
          <span className={styles.who}>{personName}</span>
          <span className={styles.where}>{locationName}</span>
          <span className={styles.what}>{act.description}</span>
          {inconsistent && (
            <span className={styles.warningBadge} title="移動Actなしで場所が変化しています">
              ⚠ 動線
            </span>
          )}
        </button>
        <button type="button" aria-label="削除" className={styles.deleteButton} onClick={onDelete}>
          ✕
        </button>
      </div>
      {expanded && (
        <ActDetailPanel
          act={act}
          persons={persons}
          locations={locations}
          props={props}
          informations={informations}
          onChange={onUpdate}
        />
      )}
    </li>
  )
}
