import type { Information, StoryData } from '../../types/StoryData'
import type { ConsistencyReport, DependencyEdge } from './types'

// (subject, aspect) slot の真実 value を返す。真実が無ければ undefined。
export function truthValueFor(
  story: StoryData,
  subject: number,
  aspect: string,
): string | undefined {
  const t = story.informations.find(
    i => i.truth === true && i.subject === subject && i.aspect === aspect,
  )
  return t?.value
}

// 構造化言明を持ち、同一 slot の真実と value が異なる情報を誤情報とみなす。
// 真実そのもの・真実未指定の slot・非構造化情報は誤情報ではない。
export function isMisinformation(info: Information, story: StoryData): boolean {
  if (info.subject == null || info.aspect == null || info.value == null) return false
  if (info.truth === true) return false
  const truthValue = truthValueFor(story, info.subject, info.aspect)
  return truthValue != null && truthValue !== info.value
}

export interface TruthSlot {
  subject: number
  aspect: string
}

// 同一 (subject, aspect) に truth:true が複数ある slot を返す（オーサリングの不整合警告用）。
export function duplicateTruthSlots(story: StoryData): TruthSlot[] {
  const counts = new Map<string, { slot: TruthSlot; count: number }>()
  for (const i of story.informations) {
    if (i.truth === true && i.subject != null && i.aspect != null) {
      const key = `${i.subject}|${i.aspect}`
      const entry = counts.get(key) ?? { slot: { subject: i.subject, aspect: i.aspect }, count: 0 }
      entry.count += 1
      counts.set(key, entry)
    }
  }
  return Array.from(counts.values())
    .filter(e => e.count > 1)
    .map(e => e.slot)
}

export interface MisinfoChain {
  nodes: Set<string>
  edges: DependencyEdge[]
}

// 情報 infoId の伝播経路を、来歴グラフの knows エッジから辿って返す。
// 各 knows エッジは「発生源/中継 → 取得した act」を表すため、from/to を辿れば
// 発生源から全ての又聞きまでの経路ノードが得られる。
export function misinfoChain(infoId: number, report: ConsistencyReport): MisinfoChain {
  const edges = report.edges.filter(e => e.fact.kind === 'knows' && e.fact.informationId === infoId)
  const nodes = new Set<string>()
  for (const e of edges) {
    nodes.add(String(e.from))
    nodes.add(String(e.to))
  }
  return { nodes, edges }
}
