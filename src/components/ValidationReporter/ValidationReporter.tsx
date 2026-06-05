import React, { useMemo, useState } from 'react'
import type { StoryData } from '../../types/StoryData'
import { analyzeStory } from '../../modules/consistency'
import type { Breakage, Contradiction, DiagnosticCategory } from '../../modules/consistency'
import styles from './ValidationReporter.module.css'

interface ValidationReporterProps {
  storyData: StoryData
  className?: string
}

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

const CATEGORY_ORDER: DiagnosticCategory[] = [
  'state',
  'position',
  'timing',
  'access',
  'colocation',
  'item',
  'info',
  'testimony',
]

type SeverityFilter = 'all' | 'error' | 'warn' | 'info'
type CategoryFilter = 'all' | DiagnosticCategory

/** Breakage の category から表示用の重大度を導出する */
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

const SEVERITY_LABEL: Record<'error' | 'warn' | 'info', string> = {
  error: 'ERROR',
  warn: 'WARN',
  info: 'INFO',
}

export const ValidationReporter: React.FC<ValidationReporterProps> = ({ storyData, className }) => {
  const breakages = useMemo(() => {
    const report = analyzeStory(storyData)

    // (subject, aspect) の subject を人物・場所・小道具のいずれかの名前に解決する。
    const subjectName = (id: number): string => {
      const p = storyData.persons.find(x => x.id === id)
      if (p) return p.name
      const l = storyData.locations.find(x => x.id === id)
      if (l) return l.name
      const pr = storyData.props.find(x => x.id === id)
      if (pr) return pr.name
      return `#${id}`
    }

    // 証言矛盾（contradictions）を診断リスト用の Breakage 形に変換する。
    // これまで因果ビューでしか見られなかった「食い違う情報の同時保有」を検証ページに出す。
    const contradictionToBreakage = (c: Contradiction): Breakage => {
      const who = storyData.persons.find(p => p.id === c.personId)?.name ?? `#${c.personId}`
      const tail =
        c.kind === 'truth-conflict'
          ? '一方は真実と食い違っています'
          : '証言どうしが食い違っています'
      return {
        actId: c.actId,
        category: 'testimony',
        fact: null,
        message: `${who} は ${subjectName(c.subject)} の「${c.aspect}」について矛盾する情報を保持しています：「${c.existing.value}」と「${c.incoming.value}」。${tail}`,
      }
    }

    return [...report.breakages, ...report.contradictions.map(contradictionToBreakage)]
  }, [storyData])

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  /** Act の説明テキストを生成する */
  const describeAct = (actId: number): string => {
    const act = storyData.acts.find(a => a.id === actId)
    if (!act) return `Act ${actId}`
    const person = storyData.persons.find(p => p.id === act.personId)?.name ?? `#${act.personId}`
    return `${act.time} ${person}「${act.description}」`
  }

  /** Fact 参照を表示用テキスト（種別＋エンティティ名）にする */
  const describeFact = (b: Breakage): { kind: string; label: string } | null => {
    const { fact } = b
    if (!fact) return null
    switch (fact.kind) {
      case 'at': {
        const person =
          storyData.persons.find(p => p.id === fact.personId)?.name ?? `#${fact.personId}`
        const location =
          storyData.locations.find(l => l.id === fact.locationId)?.name ?? `#${fact.locationId}`
        return { kind: 'at', label: `${person} @ ${location}` }
      }
      case 'owns': {
        const person =
          storyData.persons.find(p => p.id === fact.personId)?.name ?? `#${fact.personId}`
        const prop = storyData.props.find(p => p.id === fact.propId)?.name ?? `#${fact.propId}`
        return { kind: 'owns', label: `${person} → ${prop}` }
      }
      case 'propAt': {
        const prop = storyData.props.find(p => p.id === fact.propId)?.name ?? `#${fact.propId}`
        const location =
          storyData.locations.find(l => l.id === fact.locationId)?.name ?? `#${fact.locationId}`
        return { kind: 'propAt', label: `${prop} @ ${location}` }
      }
      case 'knows': {
        const person =
          storyData.persons.find(p => p.id === fact.personId)?.name ?? `#${fact.personId}`
        const info = storyData.informations.find(i => i.id === fact.informationId)
        const infoName = info?.name ?? info?.content ?? `#${fact.informationId}`
        return { kind: 'knows', label: `${person} ← ${infoName}` }
      }
      case 'status': {
        const person =
          storyData.persons.find(p => p.id === fact.personId)?.name ?? `#${fact.personId}`
        const label =
          fact.status === 'dead'
            ? '死亡'
            : fact.status === 'unconscious'
              ? '昏倒'
              : fact.status === 'injured'
                ? '負傷'
                : '健常'
        return { kind: 'status', label: `${person}：${label}` }
      }
      default:
        return null
    }
  }

  // 件数集計（フィルター前）
  const errorCount = breakages.filter(b => severityOf(b) === 'error').length
  const warnCount = breakages.filter(b => severityOf(b) === 'warn').length
  const infoCount = breakages.filter(b => severityOf(b) === 'info').length

  // フィルター適用
  const filtered = breakages.filter(b => {
    const sev = severityOf(b)
    if (severityFilter !== 'all' && sev !== severityFilter) return false
    if (categoryFilter !== 'all' && b.category !== categoryFilter) return false
    return true
  })

  // カテゴリ別グルーピング（フィルター後）
  const grouped = new Map<DiagnosticCategory, Breakage[]>()
  for (const b of filtered) {
    const arr = grouped.get(b.category) ?? []
    arr.push(b)
    grouped.set(b.category, arr)
  }
  const visibleCategories = CATEGORY_ORDER.filter(c => grouped.has(c))

  // クリーン状態
  if (breakages.length === 0) {
    return (
      <div className={[styles.reportRoot, className].filter(Boolean).join(' ')}>
        <div className={styles.cleanState} role="status" aria-live="polite">
          <span className={styles.cleanIcon} aria-hidden="true">
            ✓
          </span>
          <p className={styles.cleanTitle}>破綻は見つかりませんでした</p>
          <p className={styles.cleanHint}>
            すべての制約が満たされています。因果・動線・所持・情報に整合性があります。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={[styles.reportRoot, className].filter(Boolean).join(' ')}>
      {/* サマリーバー */}
      <div className={styles.summaryBar} role="status" aria-label="診断結果サマリー">
        {errorCount > 0 && (
          <span className={`${styles.summaryChip} ${styles.chipError}`}>
            <span className={styles.chipCount}>{errorCount}</span>
            <span className={styles.chipLabel}>エラー</span>
          </span>
        )}
        {warnCount > 0 && (
          <span className={`${styles.summaryChip} ${styles.chipWarn}`}>
            <span className={styles.chipCount}>{warnCount}</span>
            <span className={styles.chipLabel}>警告</span>
          </span>
        )}
        {infoCount > 0 && (
          <span className={`${styles.summaryChip} ${styles.chipInfo}`}>
            <span className={styles.chipCount}>{infoCount}</span>
            <span className={styles.chipLabel}>情報</span>
          </span>
        )}
        {errorCount === 0 && warnCount === 0 && infoCount > 0 && (
          <span className={`${styles.summaryChip} ${styles.chipOk}`}>
            <span className={styles.chipCount}>{breakages.length}</span>
            <span className={styles.chipLabel}>件の診断</span>
          </span>
        )}
      </div>

      {/* フィルターバー */}
      <div className={styles.filterBar} role="group" aria-label="フィルター">
        <span className={styles.filterLabel} id="filter-label">
          絞り込み
        </span>
        <select
          className={styles.filterSelect}
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value as SeverityFilter)}
          aria-label="重大度でフィルター"
        >
          <option value="all">重大度: すべて</option>
          <option value="error">エラーのみ</option>
          <option value="warn">警告のみ</option>
          <option value="info">情報のみ</option>
        </select>
        <select
          className={styles.filterSelect}
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as CategoryFilter)}
          aria-label="カテゴリーでフィルター"
        >
          <option value="all">カテゴリー: すべて</option>
          {CATEGORY_ORDER.map(c => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      {/* 問題リスト */}
      {visibleCategories.length === 0 ? (
        <div className={styles.emptyFilter} role="status">
          <p className={styles.emptyFilterTitle}>該当する問題がありません</p>
          <p className={styles.emptyFilterHint}>フィルター条件を変更してください</p>
        </div>
      ) : (
        <div className={styles.issueList} role="list" aria-label="診断問題リスト">
          {visibleCategories.map(category => {
            const issues = grouped.get(category) ?? []
            return (
              <section
                key={category}
                className={styles.categorySection}
                aria-label={CATEGORY_LABEL[category]}
              >
                <div className={styles.categoryHeader}>
                  <span className={styles.categoryName}>{CATEGORY_LABEL[category]}</span>
                  <span className={styles.categoryCount}>（{issues.length}）</span>
                </div>
                {issues.map((b, i) => {
                  const sev = severityOf(b)
                  const factDesc = describeFact(b)
                  const railClass =
                    sev === 'error'
                      ? styles.railError
                      : sev === 'warn'
                        ? styles.railWarn
                        : styles.railInfo
                  const badgeClass =
                    sev === 'error'
                      ? styles.badgeError
                      : sev === 'warn'
                        ? styles.badgeWarn
                        : styles.badgeInfo

                  return (
                    <div
                      key={`${category}-${b.actId}-${i}`}
                      className={styles.issueRow}
                      role="listitem"
                    >
                      <div className={`${styles.issueRail} ${railClass}`} aria-hidden="true" />
                      <div className={styles.issueBody}>
                        <span
                          className={`${styles.severityBadge} ${badgeClass}`}
                          aria-label={`重大度: ${SEVERITY_LABEL[sev]}`}
                        >
                          {SEVERITY_LABEL[sev]}
                        </span>
                        <div className={styles.issueContent}>
                          <span className={styles.issueMessage}>{b.message}</span>
                          <span className={styles.issueActRef}>
                            <span className={styles.issueActId}>Act {b.actId}</span>
                            {describeAct(b.actId)}
                          </span>
                          {factDesc && (
                            <div className={styles.issueFact}>
                              <span className={styles.factPill}>
                                <span className={styles.factKind}>{factDesc.kind}</span>
                                {factDesc.label}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className={styles.categoryPill} aria-hidden="true">
                          {CATEGORY_LABEL[category]}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
