import type { StoryData, Act } from '../../types/StoryData'
import { getActKind } from './actKinds'
import { initWorldState } from './worldState'
import { timeToMinutes } from '../utils/timeUtils'

// startTime（分）を解決する。未設定なら time 文字列（"HH:MM" / "HH:MM:SS"）から導出する。
// 桃太郎サンプルやJSONインポートのActは time のみを持つため、startTime だけに依存すると
// 全Actが時刻0に潰れて同時刻共在を誤検出してしまう。
function actMinutes(a: Act): number {
  return a.startTime ?? timeToMinutes(a.time)
}
import type {
  Breakage,
  ClaimRef,
  Contradiction,
  ConsistencyReport,
  DependencyEdge,
  DiagnosticCategory,
  FactRef,
  GraphNode,
  NodeId,
} from './types'

function sortForReplay(acts: Act[]): Act[] {
  return [...acts].sort((a, b) => actMinutes(a) - actMinutes(b) || a.id - b.id)
}

export function analyzeStory(story: StoryData): ConsistencyReport {
  const ws = initWorldState(story)
  const personName = (id: number): string => story.persons.find(p => p.id === id)?.name ?? `#${id}`
  const locName = (id: number): string => story.locations.find(l => l.id === id)?.name ?? `#${id}`
  const propName = (id: number): string => story.props.find(p => p.id === id)?.name ?? `#${id}`
  const infoName = (id: number): string => {
    const i = story.informations.find(x => x.id === id)
    return i?.name ?? i?.content ?? `#${id}`
  }

  const nodes: GraphNode[] = []
  const edges: DependencyEdge[] = []
  const breakages: Breakage[] = []
  const contradictions: Contradiction[] = []

  // 構造化言明の保有追跡。人物 → "subject|aspect" → 保有する言明のリスト。
  const infoById = new Map(story.informations.map(i => [i.id, i]))
  const heldClaims = new Map<number, Map<string, ClaimRef[]>>()

  // person が情報 infoId を取得したとき、構造化言明を持つなら保有slotに追加し、
  // 同一slotで value の異なる言明を既に保有していれば矛盾を記録する。
  const acquireClaim = (
    personId: number,
    infoId: number,
    producer: NodeId,
    actId: number,
    time: number,
  ): void => {
    const info = infoById.get(infoId)
    if (info == null || info.subject == null || info.aspect == null || info.value == null) return
    const slot = `${info.subject}|${info.aspect}`
    let perPerson = heldClaims.get(personId)
    if (!perPerson) {
      perPerson = new Map<string, ClaimRef[]>()
      heldClaims.set(personId, perPerson)
    }
    const held = perPerson.get(slot) ?? []
    if (held.some(h => h.infoId === infoId)) return // 既に保有済み
    const conflict = held.find(h => h.value !== info.value)
    if (conflict) {
      const existingInfo = infoById.get(conflict.infoId)
      const isTruth = info.truth === true || existingInfo?.truth === true
      contradictions.push({
        id: `contradiction:${personId}:${actId}:${info.subject}:${info.aspect}`,
        personId,
        subject: info.subject,
        aspect: info.aspect,
        actId,
        incoming: { infoId, value: info.value, producer },
        existing: { infoId: conflict.infoId, value: conflict.value, producer: conflict.producer },
        kind: isTruth ? 'truth-conflict' : 'testimony-conflict',
        time,
      })
    }
    held.push({ infoId, value: info.value, producer })
    perPerson.set(slot, held)
  }

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
    const key = `${a.personId}@${actMinutes(a)}`
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
      startTime: actMinutes(act),
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
      // 初期位置が未設定の人物（initialStates未登録）の初出MOVEは、起点不明のため
      // 隣接チェックをせず移動先をシードする（非MOVEの初出と同じ初期化扱い）。
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
      const time = actMinutes(act)
      if (kind === 'LEARN') {
        ws.setKnows(act.personId, act.informationId, act.id)
        acquireClaim(act.personId, act.informationId, act.id, act.id, time)
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
        if (act.interactedPersonId != null) {
          ws.setKnows(act.interactedPersonId, act.informationId, act.id)
          acquireClaim(act.interactedPersonId, act.informationId, act.id, act.id, time)
        }
      }
    }
  }

  const byActId = new Map<number, Breakage[]>()
  for (const b of breakages) {
    const arr = byActId.get(b.actId) ?? []
    arr.push(b)
    byActId.set(b.actId, arr)
  }

  return { nodes, edges, breakages, byActId, contradictions }
}
