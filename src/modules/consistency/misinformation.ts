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
