import React, { useMemo, useRef, useState } from 'react'
import type { StoryData } from '../../types/StoryData'
import {
  analyzeStory,
  isMisinformation,
  misinfoChain,
  duplicateTruthSlots,
} from '../../modules/consistency'
import type { GraphNode, NodeId, Contradiction } from '../../modules/consistency'
import { ExtendedEntityEditor } from '../EntityEditor/ExtendedEntityEditor'
import { actToEntity, applyActUpdate, createAct, deleteAct } from './actEditing'
import type { ExtendedEntity } from '../../types/extendedEntities'
import styles from './CausalityView.module.css'

interface CausalityViewProps {
  storyData: StoryData
  /** 編集（追加・修正・削除）を storyData に反映するためのコールバック。省略時は編集 UI を出さない。 */
  onStoryDataChange?: (data: StoryData) => void
}

interface HoverState {
  id: string
  x: number
  y: number
}

const GUTTER = 96
const MARGIN_X = 16
const MARGIN_Y = 16
const COL_W = 200
const ROW_H = 84
const NODE_W = 168
const NODE_H = 48

const key = (id: NodeId): string => String(id)
const isActKey = (k: string): boolean => /^\d+$/.test(k)

export const CausalityView: React.FC<CausalityViewProps> = ({ storyData, onStoryDataChange }) => {
  const report = useMemo(() => analyzeStory(storyData), [storyData])
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered, setHovered] = useState<HoverState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const updateHover = (e: React.MouseEvent, id: string): void => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setHovered({ id, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const personName = (id: number): string =>
    storyData.persons.find(p => p.id === id)?.name ?? `#${id}`
  const entityName = (id: number): string => {
    const p = storyData.persons.find(e => e.id === id)
    if (p) return p.name
    const l = storyData.locations.find(e => e.id === id)
    if (l) return l.name
    const pr = storyData.props.find(e => e.id === id)
    if (pr) return pr.name
    return `#${id}`
  }

  const actById = useMemo(() => new Map(storyData.acts.map(a => [a.id, a])), [storyData])
  const infoById = useMemo(() => new Map(storyData.informations.map(i => [i.id, i])), [storyData])

  // 各情報が誤情報か（嘘/見間違い）を判定。
  const misinfoTypeOfInfo = useMemo(() => {
    const m = new Map<number, 'lie' | 'mistake' | 'unknown'>()
    for (const info of storyData.informations) {
      if (isMisinformation(info, storyData)) m.set(info.id, info.misinfoType ?? 'unknown')
    }
    return m
  }, [storyData])

  // act ノードが誤情報を運んでいるか。
  const misinfoOfNode = (node: GraphNode): 'lie' | 'mistake' | 'unknown' | 'none' => {
    if (node.actId == null) return 'none'
    const infoId = actById.get(node.actId)?.informationId
    if (infoId == null) return 'none'
    return misinfoTypeOfInfo.get(infoId) ?? 'none'
  }

  const contradictionByActId = useMemo(() => {
    const m = new Map<number, Contradiction[]>()
    for (const c of report.contradictions) {
      const arr = m.get(c.actId) ?? []
      arr.push(c)
      m.set(c.actId, arr)
    }
    return m
  }, [report])

  const personIds = useMemo(() => {
    const ids = Array.from(new Set(report.nodes.map(n => n.personId)))
    return ids.sort((a, b) => a - b)
  }, [report])
  const times = useMemo(() => {
    const ts = Array.from(new Set(report.nodes.map(n => n.startTime)))
    return ts.sort((a, b) => a - b)
  }, [report])

  const rowOf = (personId: number): number => Math.max(0, personIds.indexOf(personId))
  const colOf = (startTime: number): number => Math.max(0, times.indexOf(startTime))
  const xOf = (n: GraphNode): number => GUTTER + MARGIN_X + colOf(n.startTime) * COL_W
  const yOf = (n: GraphNode): number => MARGIN_Y + rowOf(n.personId) * ROW_H

  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>()
    for (const n of report.nodes) m.set(key(n.id), n)
    return m
  }, [report])

  const { outMap, inMap } = useMemo(() => {
    const out = new Map<string, string[]>()
    const inc = new Map<string, string[]>()
    for (const e of report.edges) {
      const f = key(e.from)
      const t = key(e.to)
      if (!out.has(f)) out.set(f, [])
      out.get(f)!.push(t)
      if (!inc.has(t)) inc.set(t, [])
      inc.get(t)!.push(f)
    }
    return { outMap: out, inMap: inc }
  }, [report])

  const selectedActId = selected != null && isActKey(selected) ? Number(selected) : null
  const selectedContradictions =
    selectedActId != null ? (contradictionByActId.get(selectedActId) ?? null) : null

  // 矛盾選択時: 食い違う2つの言明それぞれの伝播経路を2色で辿る。
  const flow = useMemo(() => {
    if (!selectedContradictions || selectedContradictions.length === 0) return null
    const existing = new Set<string>()
    const incoming = new Set<string>()
    for (const c of selectedContradictions) {
      misinfoChain(c.existing.infoId, report).nodes.forEach(n => existing.add(n))
      existing.add(String(c.existing.producer))
      misinfoChain(c.incoming.infoId, report).nodes.forEach(n => incoming.add(n))
      incoming.add(String(c.incoming.producer))
    }
    if (selected) incoming.add(selected)
    return { existing, incoming }
  }, [selectedContradictions, report, selected])

  const flowOf = (id: string): 'existing' | 'incoming' | 'none' => {
    if (!flow) return 'none'
    if (flow.incoming.has(id)) return 'incoming'
    if (flow.existing.has(id)) return 'existing'
    return 'none'
  }

  // 矛盾モードでないときの汎用ハイライト（上流/下流）。
  const highlighted = useMemo(() => {
    if (!selected || selectedContradictions) return null
    const hi = new Set<string>([selected])
    const up = [selected]
    while (up.length) {
      const n = up.pop() as string
      for (const f of inMap.get(n) ?? []) {
        if (!hi.has(f)) {
          hi.add(f)
          up.push(f)
        }
      }
    }
    const dn = [selected]
    while (dn.length) {
      const n = dn.pop() as string
      for (const t of outMap.get(n) ?? []) {
        if (!hi.has(t)) {
          hi.add(t)
          dn.push(t)
        }
      }
    }
    return hi
  }, [selected, selectedContradictions, inMap, outMap])

  const breakageActIds = report.byActId
  const width = GUTTER + MARGIN_X + Math.max(1, times.length) * COL_W + NODE_W
  const height = MARGIN_Y + Math.max(1, personIds.length) * ROW_H + NODE_H

  const inAnyFlow = (id: string): boolean =>
    flow !== null && (flow.existing.has(id) || flow.incoming.has(id))
  const isDimNode = (id: string): boolean => {
    if (flow) return !inAnyFlow(id)
    if (highlighted) return !highlighted.has(id)
    return false
  }
  const isDimEdge = (from: string, to: string): boolean => {
    if (flow) return !(inAnyFlow(from) && inAnyFlow(to))
    if (highlighted) return !(highlighted.has(from) && highlighted.has(to))
    return false
  }
  const edgeFlowClass = (from: string, to: string): string => {
    if (!flow) return ''
    if (flow.incoming.has(from) && flow.incoming.has(to)) return styles.edgeIncoming
    if (flow.existing.has(from) && flow.existing.has(to)) return styles.edgeExisting
    return ''
  }

  const truthWarnings = useMemo(() => duplicateTruthSlots(storyData), [storyData])

  const claimSource = (producer: NodeId): string => {
    if (typeof producer === 'number') {
      const a = actById.get(producer)
      if (a) return personName(a.personId)
    }
    return '初期'
  }

  const locationName = (id: number): string =>
    storyData.locations.find(l => l.id === id)?.name ?? `#${id}`

  // --- ビュー内編集 ---
  const editingAct =
    selectedActId != null ? (storyData.acts.find(a => a.id === selectedActId) ?? null) : null
  // EntityEditor は entityData の参照が変わるたびフォームを初期化するため、
  // ホバー等の無関係な再描画で入力が失われないよう editingAct 単位で identity を固定する。
  const editingEntity = useMemo(() => (editingAct ? actToEntity(editingAct) : null), [editingAct])

  const handleAddAct = (): void => {
    if (!onStoryDataChange) return
    const { story, newActId } = createAct(storyData)
    onStoryDataChange(story)
    setSelected(String(newActId))
  }
  const handleActUpdate = (entity: ExtendedEntity): void => {
    if (!onStoryDataChange) return
    onStoryDataChange(applyActUpdate(storyData, entity))
  }
  const handleActDelete = (): void => {
    if (!onStoryDataChange || selectedActId == null) return
    onStoryDataChange(deleteAct(storyData, selectedActId))
    setSelected(null)
  }

  // --- ホバー時ツールチップの内容 ---
  const hoveredNode = hovered ? (nodeById.get(hovered.id) ?? null) : null
  const hoveredActId =
    hovered && isActKey(hovered.id) && hoveredNode?.actId != null ? hoveredNode.actId : null
  const hoveredAct = hoveredActId != null ? (actById.get(hoveredActId) ?? null) : null
  const hoveredBreakMsgs =
    hoveredActId != null ? (breakageActIds.get(hoveredActId) ?? []).map(b => b.message) : []
  const hoveredContradictions =
    hoveredActId != null ? (contradictionByActId.get(hoveredActId) ?? []) : []

  if (report.nodes.length === 0) {
    return <p className={styles.empty}>表示するイベントがありません。</p>
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <p className={styles.hint}>
        このビューは <strong>破綻箇所</strong>（前提が満たされない＝赤いノード）と{' '}
        <strong>矛盾の発覚点</strong>（真実と誤情報が食い違う＝
        <span className={styles.hintContradiction}>⚡</span>
        ）を見つけるためのものです。ノードをクリックすると上流（供給元）・下流（依存先）が強調され、矛盾ノードでは食い違う2つの証言の流れが2色で示されます。各情報の真贋（嘘
        ❗ / 見間違い ❓）は補助情報として控えめに表示します。
      </p>
      {truthWarnings.length > 0 && (
        <div className={styles.truthWarning} data-testid="truth-warning">
          ⚠ 同一の対象・観点に「真実」が複数指定されています（
          {truthWarnings.map(s => `${entityName(s.subject)}/${s.aspect}`).join('、')}
          ）。誤情報の判定が不安定になります。
        </div>
      )}
      <div className={styles.legend} data-testid="causality-legend">
        <span className={styles.legendCaption}>凡例</span>
        <span className={styles.legendDivider} aria-hidden="true" />
        {/* 主役: 破綻・矛盾 */}
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchBreak}`} />
          破綻
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchContradiction}`} />
          <span className={`${styles.legendMark} ${styles.contradictionMark}`}>⚡</span>
          矛盾発覚点
        </span>
        <span className={styles.legendDivider} aria-hidden="true" />
        {/* 補助: 真贋 */}
        <span className={`${styles.legendItem} ${styles.legendSecondary}`}>真贋</span>
        <span className={`${styles.legendItem} ${styles.legendSecondary}`}>
          <span className={`${styles.swatch} ${styles.swatchTruth}`} />
          真実
        </span>
        <span className={`${styles.legendItem} ${styles.legendSecondary}`}>
          <span className={`${styles.legendMark} ${styles.misinfoIconLie}`}>❗</span>
          誤情報(嘘)
        </span>
        <span className={`${styles.legendItem} ${styles.legendSecondary}`}>
          <span className={styles.legendMark}>❓</span>
          誤情報(見間違い)
        </span>
      </div>
      {onStoryDataChange && (
        <div className={styles.toolbar}>
          <button type="button" className={styles.addButton} onClick={handleAddAct}>
            ＋ 行動を追加
          </button>
          <span className={styles.toolbarHint}>
            ノードを選ぶと右側で編集できます。破綻・矛盾箇所をその場で修正しましょう。
          </span>
        </div>
      )}
      <div className={styles.workspace}>
        <div className={styles.scroll}>
          <svg width={width} height={height} className={styles.svg}>
            {personIds.map((pid, i) => (
              <text
                key={`row-${pid}`}
                x={MARGIN_X}
                y={MARGIN_Y + i * ROW_H + NODE_H / 2}
                className={styles.rowLabel}
              >
                {personName(pid)}
              </text>
            ))}
            {report.edges.map((e, i) => {
              const from = nodeById.get(key(e.from))
              const to = nodeById.get(key(e.to))
              if (!from || !to) return null
              return (
                <line
                  key={`edge-${i}`}
                  x1={xOf(from) + NODE_W}
                  y1={yOf(from) + NODE_H / 2}
                  x2={xOf(to)}
                  y2={yOf(to) + NODE_H / 2}
                  className={`${styles.edge} ${edgeFlowClass(key(e.from), key(e.to))} ${isDimEdge(key(e.from), key(e.to)) ? styles.dim : ''}`}
                />
              )
            })}
            {report.nodes.map(n => {
              const id = key(n.id)
              const isSeed = n.actId === null
              const hasBreak = n.actId !== null && breakageActIds.has(n.actId)
              const hasContradiction = n.actId !== null && contradictionByActId.has(n.actId)
              const misinfo = misinfoOfNode(n)
              const selectedNow = selected === id
              const testid = isSeed ? `node-initial-${n.personId}` : `node-act-${n.actId}`
              const misinfoClass =
                misinfo === 'lie'
                  ? styles.misinfoLie
                  : misinfo === 'mistake' || misinfo === 'unknown'
                    ? styles.misinfoMistake
                    : ''
              return (
                <g
                  key={id}
                  data-testid={testid}
                  data-breakage={hasBreak ? 'true' : 'false'}
                  data-contradiction={hasContradiction ? 'true' : 'false'}
                  data-misinfo={misinfo}
                  data-flow={flowOf(id)}
                  data-selected={selectedNow ? 'true' : 'false'}
                  transform={`translate(${xOf(n)}, ${yOf(n)})`}
                  className={`${styles.node} ${isDimNode(id) ? styles.dim : ''}`}
                  onClick={() => setSelected(prev => (prev === id ? null : id))}
                  onMouseEnter={e => updateHover(e, id)}
                  onMouseMove={e => updateHover(e, id)}
                  onMouseLeave={() => setHovered(null)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selectedNow}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelected(prev => (prev === id ? null : id))
                    }
                  }}
                >
                  <title>{n.label}</title>
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={6}
                    className={`${isSeed ? styles.seedRect : hasBreak ? styles.breakRect : styles.actRect} ${misinfoClass} ${hasContradiction ? styles.contradictionRect : ''} ${selectedNow ? styles.selectedRect : ''}`}
                  />
                  {/* 等幅で時刻を右下に小さく表示 */}
                  <text x={8} y={NODE_H - 7} className={styles.nodeTime}>
                    {`t=${n.startTime}`}
                  </text>
                  {misinfo !== 'none' && (
                    <text
                      x={NODE_W - 30}
                      y={16}
                      className={`${styles.misinfoIcon} ${misinfo === 'lie' ? styles.misinfoIconLie : ''}`}
                    >
                      {misinfo === 'lie' ? '❗' : '❓'}
                    </text>
                  )}
                  {hasContradiction && (
                    <>
                      <circle
                        cx={NODE_W - 15}
                        cy={15}
                        r={11}
                        className={styles.contradictionBadge}
                      />
                      <text x={NODE_W - 15} y={19} className={styles.contradictionIcon}>
                        ⚡
                      </text>
                    </>
                  )}
                  <text x={8} y={NODE_H / 2 - 1} className={styles.nodeLabel}>
                    {n.label.length > 16 ? `${n.label.slice(0, 15)}…` : n.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
        {onStoryDataChange && editingEntity && (
          <aside className={styles.editPanel} data-testid="causality-edit-panel">
            <div className={styles.editPanelHead}>
              <span className={styles.panelEyebrow}>ノード編集</span>
              <button
                type="button"
                className={styles.editClose}
                onClick={() => setSelected(null)}
                aria-label="編集を閉じる"
              >
                ✕
              </button>
            </div>
            <ExtendedEntityEditor
              entity={editingEntity}
              onUpdate={handleActUpdate}
              onDelete={handleActDelete}
            />
          </aside>
        )}
      </div>
      {hovered && hoveredNode && (
        <div
          className={styles.tooltip}
          style={{ left: hovered.x + 14, top: hovered.y + 14 }}
          role="tooltip"
        >
          <div className={styles.tooltipLabel}>{hoveredNode.label}</div>
          <div className={styles.tooltipMeta}>
            t={hoveredNode.startTime} ・ {personName(hoveredNode.personId)}
            {hoveredAct?.locationId != null ? ` ・ ${locationName(hoveredAct.locationId)}` : ''}
          </div>
          {hoveredBreakMsgs.length > 0 && (
            <div className={styles.tooltipBreak}>
              <span className={styles.tooltipTag}>破綻</span>
              {hoveredBreakMsgs.map((m, i) => (
                <div key={i}>{m}</div>
              ))}
            </div>
          )}
          {hoveredContradictions.length > 0 && (
            <div className={styles.tooltipContradiction}>
              <span className={styles.tooltipTagContradiction}>矛盾発覚</span>
              {hoveredContradictions.map(c => (
                <div key={c.id}>
                  {entityName(c.subject)}／{c.aspect}: 「{c.existing.value}」と「{c.incoming.value}
                  」が食い違い
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {selectedContradictions && selectedContradictions.length > 0 && (
        <div className={styles.panel} data-testid="contradiction-panel">
          <span className={styles.panelEyebrow}>矛盾レポート</span>
          <h4 className={styles.panelTitle}>矛盾の発覚</h4>
          {selectedContradictions.map(c => {
            const existingInfo = infoById.get(c.existing.infoId)
            const incomingInfo = infoById.get(c.incoming.infoId)
            return (
              <div key={c.id} className={styles.panelItem}>
                <div className={styles.panelHead}>
                  <strong>{personName(c.personId)}</strong> が「{entityName(c.subject)}」の「
                  {c.aspect}」について食い違う証言を得た（
                  {c.kind === 'truth-conflict' ? '真実との矛盾' : '証言同士の食い違い'}）
                </div>
                <ul className={styles.panelClaims}>
                  <li className={styles.claimExisting}>
                    既に保有: <strong>{c.existing.value}</strong>
                    {existingInfo?.truth ? '（真実）' : ''} — {claimSource(c.existing.producer)}{' '}
                    より
                  </li>
                  <li className={styles.claimIncoming}>
                    新たに取得: <strong>{c.incoming.value}</strong>
                    {incomingInfo?.truth ? '（真実）' : ''} — {claimSource(c.incoming.producer)}{' '}
                    より
                  </li>
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
