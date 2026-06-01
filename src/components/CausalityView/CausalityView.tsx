import React, { useMemo, useState } from 'react'
import type { StoryData } from '../../types/StoryData'
import {
  analyzeStory,
  isMisinformation,
  misinfoChain,
  duplicateTruthSlots,
} from '../../modules/consistency'
import type { GraphNode, NodeId, Contradiction } from '../../modules/consistency'
import styles from './CausalityView.module.css'

interface CausalityViewProps {
  storyData: StoryData
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

export const CausalityView: React.FC<CausalityViewProps> = ({ storyData }) => {
  const report = useMemo(() => analyzeStory(storyData), [storyData])
  const [selected, setSelected] = useState<string | null>(null)

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

  if (report.nodes.length === 0) {
    return <p className={styles.empty}>表示するイベントがありません。</p>
  }

  return (
    <div className={styles.container}>
      <p className={styles.hint}>
        ノードをクリックすると、その事実の上流（供給元）と下流（依存先）が強調されます。赤いノードは破綻（前提が満たされていない箇所）、⚡は矛盾の発覚点です。矛盾ノードを選ぶと、食い違う2つの証言の流れが2色で表示されます。
      </p>
      {truthWarnings.length > 0 && (
        <div className={styles.truthWarning} data-testid="truth-warning">
          ⚠ 同一の対象・観点に「真実」が複数指定されています（
          {truthWarnings.map(s => `${entityName(s.subject)}/${s.aspect}`).join('、')}
          ）。誤情報の判定が不安定になります。
        </div>
      )}
      <div className={styles.legend} data-testid="causality-legend">
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchTruth}`} />
          真実
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchLie}`} />
          誤情報(嘘)
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchMistake}`} />
          誤情報(見間違い)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendMark}>⚡</span>
          矛盾発覚点
        </span>
      </div>
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
            const breakMsgs =
              n.actId !== null
                ? (breakageActIds.get(n.actId) ?? []).map(b => b.message).join('\n')
                : ''
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
              >
                <title>{hasBreak ? breakMsgs : n.label}</title>
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  className={`${isSeed ? styles.seedRect : hasBreak ? styles.breakRect : styles.actRect} ${misinfoClass} ${selectedNow ? styles.selectedRect : ''}`}
                />
                {misinfo !== 'none' && (
                  <text x={NODE_W - 30} y={16} className={styles.misinfoIcon}>
                    {misinfo === 'lie' ? '🚫' : '❓'}
                  </text>
                )}
                {hasContradiction && (
                  <text x={NODE_W - 16} y={16} className={styles.contradictionIcon}>
                    ⚡
                  </text>
                )}
                <text x={8} y={NODE_H / 2 + 4} className={styles.nodeLabel}>
                  {n.label.length > 16 ? `${n.label.slice(0, 15)}…` : n.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      {selectedContradictions && selectedContradictions.length > 0 && (
        <div className={styles.panel} data-testid="contradiction-panel">
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
