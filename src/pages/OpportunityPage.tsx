import React, { useMemo, useState } from 'react'
import { useAppContext } from '../contexts/AppContext'
import {
  distinctActTimes,
  whoWasAt,
  reconstructAt,
  propAccessOpportunity,
  knowledgeByInfo,
} from '../modules/consistency'
import type { PersonStatus } from '../modules/consistency/worldState'
import type { KnowledgeEntry } from '../modules/consistency'
import { minutesToTime } from '../modules/utils/timeUtils'
import { EmptyState } from '../components/common/EmptyState'
import { NextSteps } from '../components/common/NextSteps'
import { useLoadSample } from '../hooks/useLoadSample'
import styles from './OpportunityPage.module.css'

type Mode = 'place' | 'prop' | 'info'

const STATUS_LABEL: Record<PersonStatus, string> = {
  normal: '健常',
  injured: '負傷',
  unconscious: '昏倒',
  dead: '死亡',
}

export const OpportunityPage: React.FC = () => {
  const { storyData } = useAppContext()
  const [mode, setMode] = useState<Mode>('place')
  const [locationId, setLocationId] = useState<number | null>(null)
  const [time, setTime] = useState<number | null>(null)
  const [propId, setPropId] = useState<number | null>(null)
  const [infoId, setInfoId] = useState<number | null>(null)
  const loadSample = useLoadSample()

  const times = useMemo(() => (storyData ? distinctActTimes(storyData) : []), [storyData])

  // 既定値の決定（データ未読み込みでも安全に評価できるよう null 許容）
  const effectiveLoc = locationId ?? storyData?.locations[0]?.id ?? null
  const effectiveTime = time ?? times[times.length - 1] ?? 0
  const effectiveProp = propId ?? storyData?.props[0]?.id ?? null
  const effectiveInfo = infoId ?? storyData?.informations[0]?.id ?? null

  // 場所×時刻
  const snapshot = useMemo(
    () => (storyData ? reconstructAt(storyData, effectiveTime) : null),
    [storyData, effectiveTime],
  )
  const present = useMemo(
    () =>
      storyData && effectiveLoc != null ? whoWasAt(storyData, effectiveLoc, effectiveTime) : [],
    [storyData, effectiveLoc, effectiveTime],
  )
  const elsewhere = useMemo(() => {
    if (!storyData || !snapshot) return []
    const rows: Array<{ personId: number; locationId: number | null; status: PersonStatus }> = []
    for (const p of storyData.persons) {
      const loc = snapshot.positions.get(p.id) ?? null
      if (loc !== effectiveLoc) {
        rows.push({
          personId: p.id,
          locationId: loc,
          status: snapshot.status.get(p.id) ?? 'normal',
        })
      }
    }
    return rows.sort((a, b) => a.personId - b.personId)
  }, [storyData, snapshot, effectiveLoc])

  // 道具
  const propAccess = useMemo(
    () => (storyData ? propAccessOpportunity(storyData) : new Map<number, Set<number>>()),
    [storyData],
  )
  const propTouchers = useMemo(() => {
    if (effectiveProp == null) return []
    return Array.from(propAccess.get(effectiveProp) ?? []).sort((a, b) => a - b)
  }, [propAccess, effectiveProp])
  const propFinal = useMemo(() => {
    if (!storyData || effectiveProp == null) return null
    const snap = reconstructAt(storyData)
    const owner = snap.propOwners.get(effectiveProp)
    if (owner != null) return { kind: 'owner' as const, id: owner }
    const loc = snap.propLocations.get(effectiveProp)
    if (loc != null) return { kind: 'loc' as const, id: loc }
    return { kind: 'gone' as const, id: -1 }
  }, [storyData, effectiveProp])

  // 情報
  const knowledge = useMemo<Map<number, KnowledgeEntry[]>>(
    () => (storyData ? knowledgeByInfo(storyData) : new Map<number, KnowledgeEntry[]>()),
    [storyData],
  )

  if (!storyData) {
    return (
      <div className={`page ${styles.pageRoot}`}>
        <header className={styles.pageHeader}>
          <span className={styles.pageEyebrow}>Opportunity</span>
          <h2 className={styles.pageTitle}>容疑者・機会</h2>
        </header>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            ◍
          </span>
          <p className={styles.emptyTitle}>データが読み込まれていません</p>
          <p className={styles.emptyHint}>
            先にシミュレーションページで物語データを読み込んでください。
          </p>
        </div>
      </div>
    )
  }

  const { persons, locations, props, informations } = storyData
  const personName = (id: number): string => persons.find(p => p.id === id)?.name ?? `#${id}`
  const personColor = (id: number): string => persons.find(p => p.id === id)?.color ?? '#888'
  const locName = (id: number): string => locations.find(l => l.id === id)?.name ?? `#${id}`
  const infoName = (id: number): string => {
    const i = informations.find(x => x.id === id)
    return i?.name ?? i?.content ?? `#${id}`
  }
  const infoKnowers = effectiveInfo != null ? (knowledge.get(effectiveInfo) ?? []) : []

  const PersonChip: React.FC<{ id: number; suffix?: string }> = ({ id, suffix }) => (
    <span className={styles.personChip}>
      <span className={styles.swatch} style={{ background: personColor(id) }} aria-hidden="true" />
      <span className={styles.personName}>{personName(id)}</span>
      <span className={styles.personId}>#{id}</span>
      {suffix && <span className={styles.chipSuffix}>{suffix}</span>}
    </span>
  )

  const StatusBadge: React.FC<{ status: PersonStatus }> = ({ status }) =>
    status === 'normal' ? null : (
      <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>
        {STATUS_LABEL[status]}
      </span>
    )

  if (!storyData) {
    return (
      <div className={`page ${styles.pageRoot}`}>
        <header className={styles.pageHeader}>
          <span className={styles.pageEyebrow}>Opportunity</span>
          <h2 className={styles.pageTitle}>容疑者・機会</h2>
          <p className={styles.pageHint}>
            「犯行時刻に現場に居られたのは誰か」「凶器に触れ得たのは誰か」「秘密を知り得たのは誰か」を逆引きします。
          </p>
        </header>
        <EmptyState
          icon="◎"
          title="物語データが読み込まれていません"
          description="人物・場所・行動を登録すると、時刻×場所や道具・情報から逆引きできます。"
          actions={[
            { label: 'イベント入力で書き始める', to: '/log' },
            {
              label: 'サンプルを読み込む',
              onClick: () => loadSample('mansion'),
              variant: 'secondary',
            },
          ]}
        />
      </div>
    )
  }

  return (
    <div className={`page ${styles.pageRoot}`}>
      <header className={styles.pageHeader}>
        <span className={styles.pageEyebrow}>Opportunity</span>
        <h2 className={styles.pageTitle}>容疑者・機会</h2>
        <p className={styles.pageHint}>
          「犯行時刻に現場に居られたのは誰か」「凶器に触れ得たのは誰か」「秘密を知り得たのは誰か」を逆引きします。
        </p>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="逆引きの種類">
        <button
          className={`${styles.tab} ${mode === 'place' ? styles.active : ''}`}
          role="tab"
          aria-selected={mode === 'place'}
          onClick={() => setMode('place')}
        >
          場所×時刻
        </button>
        <button
          className={`${styles.tab} ${mode === 'prop' ? styles.active : ''}`}
          role="tab"
          aria-selected={mode === 'prop'}
          onClick={() => setMode('prop')}
        >
          凶器・道具
        </button>
        <button
          className={`${styles.tab} ${mode === 'info' ? styles.active : ''}`}
          role="tab"
          aria-selected={mode === 'info'}
          onClick={() => setMode('info')}
        >
          情報・秘密
        </button>
      </div>

      {/* 場所×時刻 */}
      {mode === 'place' && (
        <section className={styles.panel} aria-label="場所×時刻の在席者">
          <div className={styles.controls}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>場所</span>
              <select
                className={styles.select}
                value={effectiveLoc ?? ''}
                onChange={e => setLocationId(Number(e.target.value))}
              >
                {locations.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>時刻</span>
              <select
                className={styles.select}
                value={effectiveTime}
                onChange={e => setTime(Number(e.target.value))}
              >
                {times.length === 0 && <option value={0}>00:00</option>}
                {times.map(t => (
                  <option key={t} value={t}>
                    {minutesToTime(t)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.resultGrid}>
            <div className={styles.resultBlock}>
              <div className={styles.blockHeader}>
                <span className={styles.blockTitle}>現場に居た（容疑者）</span>
                <span className={styles.blockCount}>{present.length}</span>
              </div>
              {present.length === 0 ? (
                <p className={styles.noneHint}>
                  この時刻に {effectiveLoc != null ? locName(effectiveLoc) : '—'}{' '}
                  に居た人物はいません
                </p>
              ) : (
                <ul className={styles.personList}>
                  {present.map(p => (
                    <li key={p.personId} className={styles.personRow}>
                      <PersonChip id={p.personId} />
                      <StatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.resultBlock}>
              <div className={styles.blockHeader}>
                <span className={styles.blockTitle}>他の場所に居た（アリバイ）</span>
                <span className={styles.blockCount}>{elsewhere.length}</span>
              </div>
              <ul className={styles.personList}>
                {elsewhere.map(p => (
                  <li key={p.personId} className={styles.personRow}>
                    <PersonChip id={p.personId} />
                    <StatusBadge status={p.status} />
                    <span className={styles.alibiLoc}>
                      {p.locationId != null ? locName(p.locationId) : '所在不明'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* 凶器・道具 */}
      {mode === 'prop' && (
        <section className={styles.panel} aria-label="道具に触れ得た人物">
          {props.length === 0 ? (
            <p className={styles.noneHint}>道具が登録されていません</p>
          ) : (
            <>
              <div className={styles.controls}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>道具</span>
                  <select
                    className={styles.select}
                    value={effectiveProp ?? ''}
                    onChange={e => setPropId(Number(e.target.value))}
                  >
                    {props.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                {propFinal && (
                  <span className={styles.finalState}>
                    最終的な所在:{' '}
                    {propFinal.kind === 'owner'
                      ? `${personName(propFinal.id)} が所持`
                      : propFinal.kind === 'loc'
                        ? `${locName(propFinal.id)} に設置`
                        : '消費済み'}
                  </span>
                )}
              </div>
              <div className={styles.resultBlock}>
                <div className={styles.blockHeader}>
                  <span className={styles.blockTitle}>触れ得た人物（全期間）</span>
                  <span className={styles.blockCount}>{propTouchers.length}</span>
                </div>
                {propTouchers.length === 0 ? (
                  <p className={styles.noneHint}>この道具に触れ得た人物はいません</p>
                ) : (
                  <ul className={styles.personList}>
                    {propTouchers.map(id => (
                      <li key={id} className={styles.personRow}>
                        <PersonChip id={id} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* 情報・秘密 */}
      {mode === 'info' && (
        <section className={styles.panel} aria-label="情報を知り得た人物">
          {informations.length === 0 ? (
            <p className={styles.noneHint}>情報が登録されていません</p>
          ) : (
            <>
              <div className={styles.controls}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>情報</span>
                  <select
                    className={styles.select}
                    value={effectiveInfo ?? ''}
                    onChange={e => setInfoId(Number(e.target.value))}
                  >
                    {informations.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name ?? i.content}
                      </option>
                    ))}
                  </select>
                </label>
                {effectiveInfo != null && (
                  <span className={styles.finalState}>「{infoName(effectiveInfo)}」</span>
                )}
              </div>
              <div className={styles.resultBlock}>
                <div className={styles.blockHeader}>
                  <span className={styles.blockTitle}>知り得た人物（初出時刻順）</span>
                  <span className={styles.blockCount}>{infoKnowers.length}</span>
                </div>
                {infoKnowers.length === 0 ? (
                  <p className={styles.noneHint}>この情報を知り得た人物はいません</p>
                ) : (
                  <ul className={styles.personList}>
                    {infoKnowers.map(e => (
                      <li key={e.personId} className={styles.personRow}>
                        <span className={styles.firstTime}>{minutesToTime(e.firstTime)}</span>
                        <PersonChip id={e.personId} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      )}

      <NextSteps
        steps={[
          {
            label: '矛盾・破綻を検査する',
            description: 'アリバイや動線の整合性は検証で',
            to: '/validation',
          },
          {
            label: '行動を追加・修正する',
            description: 'イベント入力で記録',
            to: '/log',
          },
        ]}
      />
    </div>
  )
}
