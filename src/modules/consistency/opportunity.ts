import type { StoryData, Act } from '../../types/StoryData'
import { getActKind } from './actKinds'
import type { PersonStatus } from './worldState'
import { timeToMinutes } from '../utils/timeUtils'

// 「容疑者・機会」逆引きのための世界再構築。
// analyzeStory が破綻検出のために行う再生と同じ状態遷移を、診断なしで再現し、
// 「ある時刻に誰がどこにいたか」「凶器に触れ得たのは誰か」「秘密を知り得たのは誰か」
// を逆引きできるようにする。

function actMinutes(a: Act): number {
  return a.startTime ?? timeToMinutes(a.time)
}

function sortForReplay(acts: Act[]): Act[] {
  return [...acts].sort((a, b) => actMinutes(a) - actMinutes(b) || a.id - b.id)
}

export interface WorldSnapshot {
  // personId -> locationId（初期位置も未行動も無い人物は含まれない）
  positions: Map<number, number>
  // personId -> 生体状態
  status: Map<number, PersonStatus>
  // propId -> locationId（地面に置かれている道具）
  propLocations: Map<number, number>
  // propId -> personId（所持されている道具）
  propOwners: Map<number, number>
  // personId -> 知っている情報 id の集合
  knows: Map<number, Set<number>>
}

function statusOf(snap: WorldSnapshot, personId: number): PersonStatus {
  return snap.status.get(personId) ?? 'normal'
}

/** 物語に登場する行動時刻（分）を昇順・重複なしで返す。 */
export function distinctActTimes(story: StoryData): number[] {
  const set = new Set<number>()
  for (const a of story.acts) set.add(actMinutes(a))
  return Array.from(set).sort((a, b) => a - b)
}

/**
 * 指定時刻まで（その時刻に発生した行動を含む）の状態を再構築する。
 * until を省略すると全行動を適用した最終状態を返す。
 */
export function reconstructAt(story: StoryData, until?: number): WorldSnapshot {
  const snap: WorldSnapshot = {
    positions: new Map(),
    status: new Map(),
    propLocations: new Map(),
    propOwners: new Map(),
    knows: new Map(),
  }

  for (const s of story.initialStates) snap.positions.set(s.personId, s.locationId)
  for (const p of story.props) {
    const ownerId = p.owner != null && p.owner !== '' ? Number(p.owner) : NaN
    const locId =
      p.currentLocation != null && p.currentLocation !== '' ? Number(p.currentLocation) : NaN
    if (Number.isFinite(ownerId)) snap.propOwners.set(p.id, ownerId)
    else if (Number.isFinite(locId)) snap.propLocations.set(p.id, locId)
  }

  const setOwner = (propId: number, personId: number): void => {
    snap.propOwners.set(propId, personId)
    snap.propLocations.delete(propId)
  }
  const setPropLoc = (propId: number, locId: number): void => {
    snap.propLocations.set(propId, locId)
    snap.propOwners.delete(propId)
  }
  const learn = (personId: number, infoId: number): void => {
    let s = snap.knows.get(personId)
    if (!s) {
      s = new Set<number>()
      snap.knows.set(personId, s)
    }
    s.add(infoId)
  }
  const propById = new Map(story.props.map(p => [p.id, p]))

  for (const act of sortForReplay(story.acts)) {
    if (until != null && actMinutes(act) > until) break
    const kind = getActKind(act)

    // 位置: どの行動でも、行為者は最終的にその行動の場所に居る（analyzeStory と同じ）。
    snap.positions.set(act.personId, act.locationId)

    if (act.propId != null) {
      if (kind === 'TAKE') {
        if (propById.get(act.propId)?.isPortable !== false) setOwner(act.propId, act.personId)
      } else if (kind === 'GIVE') {
        if (act.interactedPersonId != null) setOwner(act.propId, act.interactedPersonId)
      } else if (kind === 'DROP') {
        setPropLoc(act.propId, act.locationId)
      } else if (kind === 'USE') {
        if (propById.get(act.propId)?.isConsumable) {
          snap.propOwners.delete(act.propId)
          snap.propLocations.delete(act.propId)
        }
      }
    }

    if (act.informationId != null) {
      if (kind === 'LEARN') {
        learn(act.personId, act.informationId)
      } else if (kind === 'SPEAK' && act.interactedPersonId != null) {
        const ls = statusOf(snap, act.interactedPersonId)
        if (ls !== 'dead' && ls !== 'unconscious') learn(act.interactedPersonId, act.informationId)
      }
    }

    if (act.interactedPersonId != null) {
      const victim = act.interactedPersonId
      const prev = statusOf(snap, victim)
      if (kind === 'KILL') snap.status.set(victim, 'dead')
      else if (kind === 'INCAPACITATE') {
        if (prev !== 'dead') snap.status.set(victim, 'unconscious')
      } else if (kind === 'ATTACK') {
        if (prev === 'normal' || prev === 'injured') snap.status.set(victim, 'injured')
      } else if (kind === 'WAKE') {
        if (prev === 'unconscious' || prev === 'injured') snap.status.set(victim, 'normal')
      }
    }
  }

  return snap
}

export interface PersonPresence {
  personId: number
  status: PersonStatus
}

/** 指定時刻に指定場所に居た人物を返す。 */
export function whoWasAt(story: StoryData, locationId: number, time: number): PersonPresence[] {
  const snap = reconstructAt(story, time)
  const result: PersonPresence[] = []
  for (const [personId, loc] of snap.positions) {
    if (loc === locationId) result.push({ personId, status: statusOf(snap, personId) })
  }
  return result.sort((a, b) => a.personId - b.personId)
}

/**
 * 物語の全期間を通じて、各道具に「触れ得た」人物の集合を返す。
 * 触れ得た = その道具を所持していた / 道具が置かれた場所に居合わせた、のいずれか。
 * 状態は行動時刻の境界でのみ変化するため、各行動時刻でサンプリングすれば漏れなく集計できる。
 */
export function propAccessOpportunity(story: StoryData): Map<number, Set<number>> {
  const result = new Map<number, Set<number>>()
  for (const p of story.props) result.set(p.id, new Set<number>())

  const add = (propId: number, personId: number): void => {
    let s = result.get(propId)
    if (!s) {
      s = new Set<number>()
      result.set(propId, s)
    }
    s.add(personId)
  }

  const times = distinctActTimes(story)
  // 初期配置のみの状態（最初の行動前）も評価対象に含める。
  const samplePoints = times.length > 0 ? [times[0] - 1, ...times] : [0]
  for (const t of samplePoints) {
    const snap = reconstructAt(story, t)
    for (const p of story.props) {
      const owner = snap.propOwners.get(p.id)
      if (owner != null) {
        add(p.id, owner)
        continue
      }
      const loc = snap.propLocations.get(p.id)
      if (loc != null) {
        for (const [personId, ploc] of snap.positions) {
          if (ploc === loc) add(p.id, personId)
        }
      }
    }
  }
  return result
}

export interface KnowledgeEntry {
  personId: number
  firstTime: number // この情報を初めて知った時刻（分）
}

/**
 * 各情報を「知り得た」人物と、初めて知った時刻を返す。
 * 情報は単調増加（一度知れば忘れない）なので、最終状態の knows に対して
 * 初出時刻を二分探索的に求める代わりに、行動を順に走査して最初の獲得時刻を記録する。
 */
export function knowledgeByInfo(story: StoryData): Map<number, KnowledgeEntry[]> {
  const firstAt = new Map<number, Map<number, number>>() // infoId -> (personId -> time)
  const record = (infoId: number, personId: number, time: number): void => {
    let m = firstAt.get(infoId)
    if (!m) {
      m = new Map<number, number>()
      firstAt.set(infoId, m)
    }
    if (!m.has(personId)) m.set(personId, time)
  }

  // SPEAK の「死亡・昏倒した相手には伝わらない」を反映するため、状態も並行追跡する。
  const status = new Map<number, PersonStatus>()
  const statusGet = (id: number): PersonStatus => status.get(id) ?? 'normal'

  for (const act of sortForReplay(story.acts)) {
    const kind = getActKind(act)
    const time = actMinutes(act)
    if (act.informationId != null) {
      if (kind === 'LEARN') {
        record(act.informationId, act.personId, time)
      } else if (kind === 'SPEAK' && act.interactedPersonId != null) {
        const ls = statusGet(act.interactedPersonId)
        if (ls !== 'dead' && ls !== 'unconscious')
          record(act.informationId, act.interactedPersonId, time)
      }
    }
    if (act.interactedPersonId != null) {
      const victim = act.interactedPersonId
      const prev = statusGet(victim)
      if (kind === 'KILL') status.set(victim, 'dead')
      else if (kind === 'INCAPACITATE') {
        if (prev !== 'dead') status.set(victim, 'unconscious')
      } else if (kind === 'ATTACK') {
        if (prev === 'normal' || prev === 'injured') status.set(victim, 'injured')
      } else if (kind === 'WAKE') {
        if (prev === 'unconscious' || prev === 'injured') status.set(victim, 'normal')
      }
    }
  }

  const result = new Map<number, KnowledgeEntry[]>()
  for (const [infoId, m] of firstAt) {
    const entries = Array.from(m, ([personId, firstTime]) => ({ personId, firstTime }))
    entries.sort((a, b) => a.firstTime - b.firstTime || a.personId - b.personId)
    result.set(infoId, entries)
  }
  return result
}
