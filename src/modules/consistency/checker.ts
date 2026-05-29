import type { StoryData, Act } from '../../types/StoryData'
import { getActKind } from './actKinds'
import { initWorldState } from './worldState'
import type {
  Breakage,
  ConsistencyReport,
  DependencyEdge,
  DiagnosticCategory,
  FactRef,
  GraphNode,
} from './types'

function sortForReplay(acts: Act[]): Act[] {
  return [...acts].sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0) || a.id - b.id)
}

export function analyzeStory(story: StoryData): ConsistencyReport {
  const ws = initWorldState(story)
  const personName = (id: number): string => story.persons.find(p => p.id === id)?.name ?? `#${id}`
  const locName = (id: number): string => story.locations.find(l => l.id === id)?.name ?? `#${id}`

  const nodes: GraphNode[] = []
  const edges: DependencyEdge[] = []
  const breakages: Breakage[] = []

  for (const s of story.initialStates) {
    nodes.push({
      id: `initial:${s.personId}`,
      actId: null,
      personId: s.personId,
      locationId: s.locationId,
      startTime: -1,
      label: `${personName(s.personId)} 初期位置: ${locName(s.locationId)}`,
    })
  }

  const adjacency = new Map<number, Set<number>>()
  for (const l of story.locations) adjacency.set(l.id, new Set(l.connections ?? []))
  const isAdjacent = (from: number, to: number): boolean =>
    from === to ||
    (adjacency.get(from)?.has(to) ?? false) ||
    (adjacency.get(to)?.has(from) ?? false)

  const sorted = sortForReplay(story.acts)

  const groups = new Map<string, Act[]>()
  for (const a of sorted) {
    const key = `${a.personId}@${a.startTime ?? 0}`
    const arr = groups.get(key) ?? []
    arr.push(a)
    groups.set(key, arr)
  }
  const colocated = new Set<number>()
  for (const arr of groups.values()) {
    if (new Set(arr.map(a => a.locationId)).size > 1) arr.forEach(a => colocated.add(a.id))
  }

  for (const act of sorted) {
    const kind = getActKind(act)
    nodes.push({
      id: act.id,
      actId: act.id,
      personId: act.personId,
      locationId: act.locationId,
      startTime: act.startTime ?? 0,
      label: act.description || `Act ${act.id}`,
    })

    const brek = (category: DiagnosticCategory, fact: FactRef | null, message: string): void => {
      breakages.push({ actId: act.id, category, fact, message })
    }

    if (colocated.has(act.id)) {
      brek('colocation', null, `${personName(act.personId)} が同時刻に複数の場所に存在しています`)
    }

    const cur = ws.positionOf(act.personId)
    if (kind === 'MOVE') {
      if (cur) {
        edges.push({
          from: cur.producer,
          to: act.id,
          fact: { kind: 'at', personId: act.personId, locationId: cur.locationId },
        })
        if (!isAdjacent(cur.locationId, act.locationId)) {
          brek(
            'position',
            null,
            `${personName(act.personId)} は ${locName(cur.locationId)} から ${locName(act.locationId)} へ直接移動できません（隣接していません）`,
          )
        }
      }
      ws.setPosition(act.personId, act.locationId, act.id)
    } else {
      if (!cur) {
        ws.setPosition(act.personId, act.locationId, act.id)
      } else if (cur.locationId !== act.locationId) {
        brek(
          'position',
          { kind: 'at', personId: act.personId, locationId: act.locationId },
          `${personName(act.personId)} は ${locName(cur.locationId)} におり ${locName(act.locationId)} にいないため「${act.description}」ができません`,
        )
        ws.setPosition(act.personId, act.locationId, act.id)
      } else {
        edges.push({
          from: cur.producer,
          to: act.id,
          fact: { kind: 'at', personId: act.personId, locationId: act.locationId },
        })
      }
    }

    if (act.interactedPersonId != null) {
      const tgt = ws.positionOf(act.interactedPersonId)
      if (!tgt || tgt.locationId !== act.locationId) {
        brek(
          'colocation',
          { kind: 'at', personId: act.interactedPersonId, locationId: act.locationId },
          `相手 ${personName(act.interactedPersonId)} が ${locName(act.locationId)} にいないため「${act.description}」ができません`,
        )
      } else {
        edges.push({
          from: tgt.producer,
          to: act.id,
          fact: { kind: 'at', personId: act.interactedPersonId, locationId: act.locationId },
        })
      }
    }

    // item / info は Task 5 で追加
  }

  const byActId = new Map<number, Breakage[]>()
  for (const b of breakages) {
    const arr = byActId.get(b.actId) ?? []
    arr.push(b)
    byActId.set(b.actId, arr)
  }

  return { nodes, edges, breakages, byActId }
}
