import React, { useMemo, useState } from 'react'
import styles from './ExtractionPanel.module.css'
import type { StoryData } from '../../types/StoryData'
import type { Candidate, EntityTypeGuess } from '../../modules/nlp/types'
import { tokenize } from '../../modules/nlp/tokenizer'
import { extractCandidates } from '../../modules/nlp/extractCandidates'
import { aggregateCandidates } from '../../modules/nlp/aggregateCandidates'
import { reconcile } from '../../pages/entityExtraction/reconcile'

export type NotifyType = 'success' | 'warning' | 'error' | 'info'

interface ExtractionPanelProps {
  storyData: StoryData
  onCommit: (next: StoryData) => void
  onNotify?: (message: string, type: NotifyType) => void
}

const TYPE_ORDER: EntityTypeGuess[] = ['person', 'location', 'prop', 'information']
const TYPE_LABEL: Record<EntityTypeGuess, string> = {
  person: '人物',
  location: '場所',
  prop: '小道具',
  information: '情報',
}

// 指定型の既存エンティティを、名寄せ先プルダウン用に { id, name } へ整える。
function entityOptions(
  story: StoryData,
  type: EntityTypeGuess,
): Array<{ id: number; name: string }> {
  switch (type) {
    case 'person':
      return story.persons.map(p => ({ id: p.id, name: p.name }))
    case 'location':
      return story.locations.map(l => ({ id: l.id, name: l.name }))
    case 'prop':
      return story.props.map(p => ({ id: p.id, name: p.name }))
    case 'information':
      return story.informations.map(i => ({ id: i.id, name: i.name || i.content }))
  }
}

export const ExtractionPanel: React.FC<ExtractionPanelProps> = ({
  storyData,
  onCommit,
  onNotify,
}) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [linkTargets, setLinkTargets] = useState<Record<string, number>>({})

  // Act id → 説明文。プレビュー表示に使う。
  const actDescriptions = useMemo(() => {
    const map = new Map<number, string>()
    for (const act of storyData.acts) map.set(act.id, act.description)
    return map
  }, [storyData.acts])

  const notify = (message: string, type: NotifyType): void => onNotify?.(message, type)

  const runExtraction = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const raws = []
      for (const act of storyData.acts) {
        const text = act.description?.trim()
        if (!text) continue
        const tokens = await tokenize(text)
        raws.push(...extractCandidates(tokens, act.id))
      }
      setCandidates(aggregateCandidates(raws, storyData))
    } catch {
      setError(
        '形態素解析辞書の読み込みに失敗しました。ネットワーク接続を確認して再試行してください。',
      )
      setCandidates(null)
    } finally {
      setLoading(false)
    }
  }

  const updateType = (normalized: string, type: EntityTypeGuess): void => {
    setCandidates(prev =>
      prev ? prev.map(c => (c.normalized === normalized ? { ...c, typeGuess: type } : c)) : prev,
    )
    // 型を変えたら名寄せ先の選択はリセットする（型が変われば候補も変わるため）。
    setLinkTargets(prev => {
      const next = { ...prev }
      delete next[normalized]
      return next
    })
  }

  const removeCandidate = (normalized: string): void => {
    setCandidates(prev => (prev ? prev.filter(c => c.normalized !== normalized) : prev))
  }

  const applyDecision = (candidate: Candidate, decision: Parameters<typeof reconcile>[2]): void => {
    const result = reconcile(storyData, candidate, decision)
    onCommit(result.data)
    removeCandidate(candidate.normalized)
    const verb = decision.kind === 'create' ? '作成' : '名寄せ'
    notify(`「${candidate.surface}」を${TYPE_LABEL[decision.type]}として${verb}しました`, 'success')
    for (const w of result.warnings) notify(w, 'warning')
  }

  const handleCreate = (candidate: Candidate): void => {
    applyDecision(candidate, { kind: 'create', type: candidate.typeGuess })
  }

  const handleLink = (candidate: Candidate): void => {
    const targetId = linkTargets[candidate.normalized]
    if (!targetId) {
      notify('名寄せ先のエンティティを選択してください', 'warning')
      return
    }
    applyDecision(candidate, { kind: 'link', type: candidate.typeGuess, targetId })
  }

  const toggleExpand = (normalized: string): void => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(normalized)) next.delete(normalized)
      else next.add(normalized)
      return next
    })
  }

  const grouped = TYPE_ORDER.map(type => ({
    type,
    items: (candidates ?? []).filter(c => c.typeGuess === type),
  })).filter(g => g.items.length > 0)

  return (
    <div className={styles.panel}>
      <div
        className={styles.header}
        onClick={() => setOpen(o => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o)
        }}
      >
        <span className={styles.headerTitle}>
          {open ? '▾' : '▸'} 候補抽出
          <span className={styles.headerHint}>Act の説明文からエンティティ候補を見つけます</span>
        </span>
      </div>

      {open && (
        <div className={styles.body}>
          <div className={styles.runRow}>
            <button
              className={styles.runButton}
              onClick={() => void runExtraction()}
              disabled={loading}
            >
              {loading ? '解析中…' : 'Actから候補を抽出'}
            </button>
            {candidates && <span className={styles.count}>{candidates.length} 件の候補</span>}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {candidates && candidates.length === 0 && !error && (
            <div className={styles.empty}>
              候補が見つかりませんでした。Act の説明文を入力してから再試行してください。
            </div>
          )}

          {grouped.map(group => (
            <div key={group.type} className={styles.group}>
              <h4 className={styles.groupTitle}>
                {TYPE_LABEL[group.type]} ({group.items.length})
              </h4>
              {group.items.map(candidate => (
                <div key={candidate.normalized} className={styles.candidate}>
                  <div className={styles.candidateMain}>
                    <span className={styles.surface}>{candidate.surface}</span>
                    <span className={styles.count}>×{candidate.count}</span>
                    {candidate.existingMatch && (
                      <span className={styles.existingBadge}>
                        既存と一致: {candidate.existingMatch.name}
                      </span>
                    )}
                    <span className={styles.spacer} />
                    <select
                      className={styles.typeSelect}
                      value={candidate.typeGuess}
                      aria-label={`${candidate.surface} の型`}
                      onChange={e =>
                        updateType(candidate.normalized, e.target.value as EntityTypeGuess)
                      }
                    >
                      {TYPE_ORDER.map(type => (
                        <option key={type} value={type}>
                          {TYPE_LABEL[type]}
                        </option>
                      ))}
                    </select>
                    <button
                      className={`${styles.actionButton} ${styles.primary}`}
                      onClick={() => handleCreate(candidate)}
                    >
                      新規エンティティ化
                    </button>
                  </div>

                  <div className={styles.linkRow}>
                    <span className={styles.count}>既存へ名寄せ:</span>
                    <select
                      className={styles.linkSelect}
                      aria-label={`${candidate.surface} の名寄せ先`}
                      value={linkTargets[candidate.normalized] ?? ''}
                      onChange={e =>
                        setLinkTargets(prev => ({
                          ...prev,
                          [candidate.normalized]: Number(e.target.value),
                        }))
                      }
                    >
                      <option value="">選択…</option>
                      {entityOptions(storyData, candidate.typeGuess).map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                    <button className={styles.actionButton} onClick={() => handleLink(candidate)}>
                      名寄せ
                    </button>
                  </div>

                  <button
                    className={styles.previewToggle}
                    onClick={() => toggleExpand(candidate.normalized)}
                  >
                    {expanded.has(candidate.normalized)
                      ? '対象Actを隠す'
                      : `対象Act ${candidate.actIds.length} 件を表示`}
                  </button>
                  {expanded.has(candidate.normalized) && (
                    <ul className={styles.previewList}>
                      {candidate.actIds.map(id => (
                        <li key={id}>
                          #{id} {actDescriptions.get(id) || '(説明なし)'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
