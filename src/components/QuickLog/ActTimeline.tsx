import React from 'react'
import type { Act, Prop, Information, Person, Location } from '../../types/StoryData'
import { ActTimelineRow } from './ActTimelineRow'
import styles from './QuickLog.module.css'

interface ActTimelineProps {
  acts: Act[]
  persons: Person[]
  locations: Location[]
  props: Prop[]
  informations: Information[]
  inconsistentActIds: Set<number>
  onUpdate: (id: number, patch: Partial<Act>) => void
  onDelete: (id: number) => void
}

export const ActTimeline: React.FC<ActTimelineProps> = ({
  acts,
  persons,
  locations,
  props,
  informations,
  inconsistentActIds,
  onUpdate,
  onDelete,
}) => {
  if (acts.length === 0) {
    return <p className={styles.empty}>まだイベントがありません。上のバーから入力してください。</p>
  }
  return (
    <ul className={styles.timeline}>
      {acts.map(act => (
        <ActTimelineRow
          key={act.id}
          act={act}
          persons={persons}
          locations={locations}
          props={props}
          informations={informations}
          inconsistent={inconsistentActIds.has(act.id)}
          onUpdate={patch => onUpdate(act.id, patch)}
          onDelete={() => onDelete(act.id)}
        />
      ))}
    </ul>
  )
}
