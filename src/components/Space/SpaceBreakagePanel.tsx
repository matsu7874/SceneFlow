import React from 'react'
import type { StoryData } from '../../types/StoryData'
import type { Breakage, DiagnosticCategory } from '../../modules/consistency'
import styles from './SpaceBreakagePanel.module.css'

const CATEGORY_LABEL: Record<DiagnosticCategory, string> = {
  position: '位置・動線',
  colocation: '同時刻・共在',
  item: 'アイテム所持',
  info: '情報の知識',
  access: '施錠・鍵',
  timing: '移動時間・アリバイ',
  testimony: '証言の矛盾',
  state: '生死・意識',
}

/** Breakage の category から表示用の重大度を導出する（ValidationReporter と同一規則）。 */
function severityOf(b: Breakage): 'error' | 'warn' | 'info' {
  if (
    b.category === 'position' ||
    b.category === 'item' ||
    b.category === 'access' ||
    b.category === 'state'
  )
    return 'error'
  if (b.category === 'colocation' || b.category === 'timing' || b.category === 'testimony')
    return 'warn'
  return 'info'
}

interface LocationGroup {
  locationId: number
  locationName: string
  breakages: Breakage[]
}

interface SpaceBreakagePanelProps {
  storyData: StoryData
  breakages: Breakage[]
  /** 現在ハイライト中の場所id（地図のリングと連動）。 */
  highlightLocId: number | null
  /** 場所行をクリックしたときに地図側のハイライトを切り替える。 */
  onSelectLocation: (locationId: number | null) => void
}

/**
 * 空間ビューの破綻詳細パネル。
 * 地図上のリング（場所ハイライト）だけでは「何が・なぜ破綻なのか」が読めないため、
 * 破綻を場所ごとにまとめ、メッセージ・カテゴリ・該当アクションを一覧で示す。
 * 場所行をクリックすると地図のリングと相互にハイライトする。
 */
export const SpaceBreakagePanel: React.FC<SpaceBreakagePanelProps> = ({
  storyData,
  breakages,
  highlightLocId,
  onSelectLocation,
}) => {
  const actById = new Map(storyData.acts.map(a => [a.id, a]))
  const locById = new Map(storyData.locations.map(l => [l.id, l]))
  const personById = new Map(storyData.persons.map(p => [p.id, p]))

  // 破綻を「該当アクションの場所」でグルーピングする（地図のリングと同じ割り当て）。
  const groups = new Map<number, LocationGroup>()
  for (const b of breakages) {
    const act = actById.get(b.actId)
    if (!act) continue
    const locationId = act.locationId
    const existing = groups.get(locationId)
    if (existing) {
      existing.breakages.push(b)
    } else {
      groups.set(locationId, {
        locationId,
        locationName: locById.get(locationId)?.name ?? `#${locationId}`,
        breakages: [b],
      })
    }
  }
  const groupList = [...groups.values()].sort((a, b) => b.breakages.length - a.breakages.length)

  const describeAct = (actId: number): string => {
    const act = actById.get(actId)
    if (!act) return `Act ${actId}`
    const person = personById.get(act.personId)?.name ?? `#${act.personId}`
    return `${act.time} ${person}「${act.description}」`
  }

  if (breakages.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.cleanState} role="status">
          <span className={styles.cleanIcon} aria-hidden="true">
            ✓
          </span>
          <span>この物語に破綻は見つかりませんでした。</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>破綻の詳細</h3>
        <span className={styles.total}>{breakages.length} 件</span>
        {highlightLocId !== null && (
          <button type="button" className={styles.clearBtn} onClick={() => onSelectLocation(null)}>
            ハイライト解除
          </button>
        )}
      </div>

      <ul className={styles.groupList}>
        {groupList.map(group => {
          const isActive = group.locationId === highlightLocId
          return (
            <li key={group.locationId} className={styles.group}>
              <button
                type="button"
                className={`${styles.groupHeader} ${isActive ? styles.groupHeaderActive : ''}`}
                aria-pressed={isActive}
                onClick={() => onSelectLocation(isActive ? null : group.locationId)}
              >
                <span className={styles.locName}>{group.locationName}</span>
                <span className={styles.locCount}>{group.breakages.length}</span>
              </button>
              <ul className={styles.issues}>
                {group.breakages.map((b, i) => {
                  const sev = severityOf(b)
                  const sevClass =
                    sev === 'error'
                      ? styles.badgeError
                      : sev === 'warn'
                        ? styles.badgeWarn
                        : styles.badgeInfo
                  return (
                    <li key={`${b.actId}-${i}`} className={styles.issue}>
                      <span className={`${styles.badge} ${sevClass}`}>
                        {CATEGORY_LABEL[b.category]}
                      </span>
                      <div className={styles.issueBody}>
                        <span className={styles.message}>{b.message}</span>
                        <span className={styles.actRef}>{describeAct(b.actId)}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
