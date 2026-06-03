import React, { useState } from 'react'
import type { Act, Prop, Information, Person, Location } from '../../types/StoryData'
import type { Breakage, DiagnosticCategory } from '../../modules/consistency'
import { ActDetailPanel } from './ActDetailPanel'
import { pickLocationColor } from './quickLogLogic'
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
  const person = persons.find(p => p.id === act.personId)
  const personName = person?.name ?? `#${act.personId}`
  const personColor = person?.color ?? 'var(--ink-faint)'
  const location = locations.find(l => l.id === act.locationId)
  const locationName = location?.name ?? `#${act.locationId}`
  // 保存済みの色を優先し、未設定（旧データ）は id から導いた色でフォールバックする。
  const locationColor = location?.color ?? pickLocationColor(act.locationId)

  const CATEGORY_ICON: Record<DiagnosticCategory, string> = {
    position: '📍',
    colocation: '👥',
    item: '📦',
    info: '💬',
  }
  const categories = Array.from(new Set(breakages.map(b => b.category)))
  const tooltip = breakages.map(b => b.message).join('\n')

  return (
    <li className={`${styles.row} ${expanded ? styles.rowExpanded : ''}`}>
      <div className={styles.rowHeader} data-warn={categories.length > 0 || undefined}>
        <button
          type="button"
          className={styles.rowToggle}
          aria-expanded={expanded}
          aria-label={`${personName}・${locationName}・${act.description} の詳細を${expanded ? '閉じる' : '開く'}`}
          onClick={() => setExpanded(v => !v)}
        />
        <span className={styles.chevron} aria-hidden="true">
          ›
        </span>
        <span className={styles.time}>{act.time}</span>
        <span className={styles.who}>
          <span className={styles.swatch} style={{ background: personColor }} aria-hidden="true" />
          {personName}
        </span>
        <span className={styles.where} style={{ '--loc': locationColor } as React.CSSProperties}>
          <span className={styles.whereDot} aria-hidden="true" />
          {locationName}
        </span>
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
