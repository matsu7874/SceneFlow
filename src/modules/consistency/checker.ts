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

    if (
      act.propId != null &&
      (kind === 'TAKE' || kind === 'GIVE' || kind === 'DROP' || kind === 'USE')
    ) {
      const propName = (id: number): string => story.props.find(p => p.id === id)?.name ?? `#${id}`
      const owner = ws.ownerOf(act.propId)
      const ploc = ws.propLocationOf(act.propId)
      if (kind === 'TAKE') {
        if (!ploc || ploc.locationId !== act.locationId) {
          brek(
            'item',
            { kind: 'propAt', propId: act.propId, locationId: act.locationId },
            `${propName(act.propId)} は ${locName(act.locationId)} に無いため取得できません`,
          )
        } else {
          edges.push({
            from: ploc.producer,
            to: act.id,
            fact: { kind: 'propAt', propId: act.propId, locationId: act.locationId },
          })
        }
        ws.setOwner(act.propId, act.personId, act.id)
      } else if (kind === 'GIVE') {
        if (!owner || owner.ownerId !== act.personId) {
          brek(
            'item',
            { kind: 'owns', personId: act.personId, propId: act.propId },
            `${personName(act.personId)} は ${propName(act.propId)} を所持していないため渡せません`,
          )
        } else {
          edges.push({
            from: owner.producer,
            to: act.id,
            fact: { kind: 'owns', personId: act.personId, propId: act.propId },
          })
        }
        if (act.interactedPersonId != null) ws.setOwner(act.propId, act.interactedPersonId, act.id)
      } else if (kind === 'DROP') {
        if (!owner || owner.ownerId !== act.personId) {
          brek(
            'item',
            { kind: 'owns', personId: act.personId, propId: act.propId },
            `${personName(act.personId)} は ${propName(act.propId)} を所持していないため置けません`,
          )
        } else {
          edges.push({
            from: owner.producer,
            to: act.id,
            fact: { kind: 'owns', personId: act.personId, propId: act.propId },
          })
        }
        ws.setPropLocation(act.propId, act.locationId, act.id)
      } else {
        if (!owner || owner.ownerId !== act.personId) {
          brek(
            'item',
            { kind: 'owns', personId: act.personId, propId: act.propId },
            `${personName(act.personId)} は ${propName(act.propId)} を所持していないため使えません`,
          )
        } else {
          edges.push({
            from: owner.producer,
            to: act.id,
            fact: { kind: 'owns', personId: act.personId, propId: act.propId },
          })
        }
        if (story.props.find(p => p.id === act.propId)?.isConsumable) ws.consume(act.propId)
      }
    }

    if (act.informationId != null && (kind === 'LEARN' || kind === 'SPEAK')) {
      const infoName = (id: number): string => {
        const i = story.informations.find(x => x.id === id)
        return i?.name ?? i?.content ?? `#${id}`
      }
      if (kind === 'LEARN') {
        ws.setKnows(act.personId, act.informationId, act.id)
      } else {
        const kp = ws.knowerProducer(act.personId, act.informationId)
        if (!kp) {
          brek(
            'info',
            { kind: 'knows', personId: act.personId, informationId: act.informationId },
            `${personName(act.personId)} は「${infoName(act.informationId)}」を知らないため話せません`,
          )
        } else {
          edges.push({
            from: kp,
            to: act.id,
            fact: { kind: 'knows', personId: act.personId, informationId: act.informationId },
          })
        }
        if (act.interactedPersonId != null)
          ws.setKnows(act.interactedPersonId, act.informationId, act.id)
      }
    }
  }

  const byActId = new Map<number, Breakage[]>()
  for (const b of breakages) {
    const arr = byActId.get(b.actId) ?? []
    arr.push(b)
    byActId.set(b.actId, arr)
  }

  return { nodes, edges, breakages, byActId }
}
