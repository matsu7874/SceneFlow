import React from 'react'
import type { Act, Prop, Information, Person, Location } from '../../types/StoryData'
import type { Breakage } from '../../modules/consistency'
import { ActTimelineRow } from './ActTimelineRow'
import styles from './QuickLog.module.css'

interface ActTimelineProps {
  acts: Act[]
  persons: Person[]
  locations: Location[]
  props: Prop[]
  informations: Information[]
  breakagesByActId: Map<number, Breakage[]>
  onUpdate: (id: number, patch: Partial<Act>) => void
  onDelete: (id: number) => void
}

export const ActTimeline: React.FC<ActTimelineProps> = ({
  acts,
  persons,
  locations,
  props,
  informations,
  breakagesByActId,
  onUpdate,
  onDelete,
}) => {
  if (acts.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyMark} aria-hidden="true">
          🎭
        </span>
        <p className={styles.emptyTitle}>まだ出来事がありません</p>
        <p className={styles.emptyHint}>
          上のバーから「いつ・誰が・どこで・何をした」を記録しましょう。
        </p>
      </div>
    )
  }
  return (
    <section className={styles.timelineWrap} aria-label="出来事のタイムライン">
      <div className={styles.timelineCaption}>
        <span className={styles.timelineTitle}>タイムライン</span>
        <span className={styles.timelineCount}>{acts.length} 件の出来事</span>
      </div>
      <div className={styles.colHeader} aria-hidden="true">
        <span className={styles.chevronSpacer} />
        <span className={styles.colTime}>時刻</span>
        <span className={styles.colWho}>人物</span>
        <span className={styles.colWhere}>場所</span>
        <span className={styles.colWhat}>出来事</span>
      </div>
      <ul className={styles.timeline}>
        {acts.map(act => (
          <ActTimelineRow
            key={act.id}
            act={act}
            persons={persons}
            locations={locations}
            props={props}
            informations={informations}
            breakages={breakagesByActId.get(act.id) ?? []}
            onUpdate={patch => onUpdate(act.id, patch)}
            onDelete={() => onDelete(act.id)}
          />
        ))}
      </ul>
    </section>
  )
}
