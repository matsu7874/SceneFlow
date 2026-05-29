import React, { useState } from 'react'
import type { Act, Prop, Information, Person, Location } from '../../types/StoryData'
import type { Breakage, DiagnosticCategory } from '../../modules/consistency'
import { ActDetailPanel } from './ActDetailPanel'
import styles from './QuickLog.module.css'

interface ActTimelineRowProps {
  act: Act
  persons: Person[]
  locations: Location[]
  props: Prop[]
  informations: Information[]
  breakages: Breakage[]
  onUpdate: (patch: Partial<Act>) => void
  onDelete: () => void
}

export const ActTimelineRow: React.FC<ActTimelineRowProps> = ({
  act,
  persons,
  locations,
  props,
  informations,
  breakages,
  onUpdate,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false)
  const personName = persons.find(p => p.id === act.personId)?.name ?? `#${act.personId}`
  const locationName = locations.find(l => l.id === act.locationId)?.name ?? `#${act.locationId}`

  const CATEGORY_ICON: Record<DiagnosticCategory, string> = {
    position: '📍',
    colocation: '👥',
    item: '📦',
    info: '💬',
  }
  const categories = Array.from(new Set(breakages.map(b => b.category)))
  const tooltip = breakages.map(b => b.message).join('\n')

  return (
    <li className={styles.row}>
      <div className={styles.rowHeader}>
        <button type="button" className={styles.rowToggle} onClick={() => setExpanded(v => !v)}>
          <span className={styles.time}>{act.time}</span>
          <span className={styles.who}>{personName}</span>
          <span className={styles.where}>{locationName}</span>
          <span className={styles.what}>{act.description}</span>
          {categories.length > 0 && (
            <span
              className={styles.breakIcons}
              title={tooltip}
              role="img"
              aria-label={`整合性の警告: ${categories.join(', ')}`}
            >
              {categories.map(c => (
                <span key={c} className={styles.breakIcon} aria-hidden="true">
                  {CATEGORY_ICON[c]}
                </span>
              ))}
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
