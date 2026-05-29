import React, { useMemo, useState } from 'react'
import type { StoryData } from '../../types/StoryData'
import { analyzeStory } from '../../modules/consistency'
import type { GraphNode, NodeId } from '../../modules/consistency'
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

export const CausalityView: React.FC<CausalityViewProps> = ({ storyData }) => {
  const report = useMemo(() => analyzeStory(storyData), [storyData])
  const [selected, setSelected] = useState<string | null>(null)

  const personName = (id: number): string =>
    storyData.persons.find(p => p.id === id)?.name ?? `#${id}`

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

  const highlighted = useMemo(() => {
    if (!selected) return null
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
  }, [selected, inMap, outMap])

  const breakageActIds = report.byActId
  const width = GUTTER + MARGIN_X + Math.max(1, times.length) * COL_W + NODE_W
  const height = MARGIN_Y + Math.max(1, personIds.length) * ROW_H + NODE_H

  const isDimNode = (id: string): boolean => highlighted !== null && !highlighted.has(id)
  const isDimEdge = (from: string, to: string): boolean =>
    highlighted !== null && !(highlighted.has(from) && highlighted.has(to))

  if (report.nodes.length === 0) {
    return <p className={styles.empty}>表示するイベントがありません。</p>
  }

  return (
    <div className={styles.container}>
      <p className={styles.hint}>
        ノードをクリックすると、その事実の上流（供給元）と下流（依存先）が強調されます。赤いノードは破綻（前提が満たされていない箇所）です。
      </p>
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
                className={`${styles.edge} ${isDimEdge(key(e.from), key(e.to)) ? styles.dim : ''}`}
              />
            )
          })}
          {report.nodes.map(n => {
            const id = key(n.id)
            const isSeed = n.actId === null
            const hasBreak = n.actId !== null && breakageActIds.has(n.actId)
            const selectedNow = selected === id
            const breakMsgs =
              n.actId !== null
                ? (breakageActIds.get(n.actId) ?? []).map(b => b.message).join('\n')
                : ''
            const testid = isSeed ? `node-initial-${n.personId}` : `node-act-${n.actId}`
            return (
              <g
                key={id}
                data-testid={testid}
                data-breakage={hasBreak ? 'true' : 'false'}
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
                  className={`${isSeed ? styles.seedRect : hasBreak ? styles.breakRect : styles.actRect} ${selectedNow ? styles.selectedRect : ''}`}
                />
                <text x={8} y={NODE_H / 2 + 4} className={styles.nodeLabel}>
                  {n.label.length > 18 ? `${n.label.slice(0, 17)}…` : n.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
