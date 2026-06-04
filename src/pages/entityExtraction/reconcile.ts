// 候補を「新規エンティティ化」または「既存へ名寄せ」して storyData を更新する純関数。
// 確定したエンティティを、その候補が出現した Act の参照フィールドに自動で紐付ける（write-back）。

import type { Act, StoryData } from '../../types/StoryData'
import type { Candidate, EntityTypeGuess, ReconcileDecision } from '../../modules/nlp/types'
import {
  assignLocationColor,
  assignPersonColor,
  defaultLocationPosition,
  nextId,
} from '../../components/QuickLog/quickLogLogic'

// エンティティ型ごとに、Act 上で参照する外部キーのフィールド名。
const REF_FIELD: Record<EntityTypeGuess, keyof Act> = {
  prop: 'propId',
  location: 'locationId',
  information: 'informationId',
  person: 'interactedPersonId',
}

export interface ReconcileResult {
  data: StoryData
  entityId: number
  warnings: string[] // 上書きを避けた等の注意メッセージ
}

// 候補の actIds が指す Act の参照フィールドに entityId を設定する。
// 既に別エンティティが入っている参照は上書きせず警告する（安全側）。
function writeBackActs(
  acts: Act[],
  actIds: number[],
  field: keyof Act,
  entityId: number,
): { acts: Act[]; warnings: string[] } {
  const targets = new Set(actIds)
  const warnings: string[] = []
  const updated = acts.map(act => {
    if (!targets.has(act.id)) return act
    const current = act[field] as number | undefined
    // locationId/personId は必須フィールドで 0 がプレースホルダになり得るため、
    // falsy（未設定・null・0）はすべて空きスロットとして埋める。
    if (!current) {
      return { ...act, [field]: entityId }
    }
    if (current === entityId) return act
    warnings.push(
      `Act ${act.id} の ${String(field)} は既に別エンティティ(${current})が設定済みのため上書きしませんでした`,
    )
    return act
  })
  return { acts: updated, warnings }
}

// 既存エンティティへ名寄せする際、表層形が name と異なれば aliases に加える。
function withAlias<T extends { name?: string; aliases?: string[] }>(entity: T, surface: string): T {
  const name = entity.name ?? ''
  if (surface === name) return entity
  const aliases = entity.aliases ?? []
  if (aliases.includes(surface)) return entity
  return { ...entity, aliases: [...aliases, surface] }
}

function createEntity(
  story: StoryData,
  type: EntityTypeGuess,
  name: string,
): { story: StoryData; id: number } {
  switch (type) {
    case 'person': {
      const id = nextId(story.persons)
      const person = { id, name, color: assignPersonColor(story.persons) }
      return { story: { ...story, persons: [...story.persons, person] }, id }
    }
    case 'location': {
      const id = nextId(story.locations)
      const { x, y } = defaultLocationPosition(story.locations.length)
      const location = {
        id,
        name,
        connections: [] as number[],
        color: assignLocationColor(story.locations),
        x,
        y,
      }
      return { story: { ...story, locations: [...story.locations, location] }, id }
    }
    case 'prop': {
      const id = nextId(story.props)
      return { story: { ...story, props: [...story.props, { id, name }] }, id }
    }
    case 'information': {
      const id = nextId(story.informations)
      const info = { id, name, content: name }
      return { story: { ...story, informations: [...story.informations, info] }, id }
    }
  }
}

function linkEntity(
  story: StoryData,
  type: EntityTypeGuess,
  targetId: number,
  surface: string,
): { story: StoryData; found: boolean } {
  switch (type) {
    case 'person': {
      let found = false
      const persons = story.persons.map(p => {
        if (p.id !== targetId) return p
        found = true
        return withAlias(p, surface)
      })
      return { story: { ...story, persons }, found }
    }
    case 'location': {
      let found = false
      const locations = story.locations.map(l => {
        if (l.id !== targetId) return l
        found = true
        return withAlias(l, surface)
      })
      return { story: { ...story, locations }, found }
    }
    case 'prop': {
      let found = false
      const props = story.props.map(p => {
        if (p.id !== targetId) return p
        found = true
        return withAlias(p, surface)
      })
      return { story: { ...story, props }, found }
    }
    case 'information': {
      let found = false
      const informations = story.informations.map(i => {
        if (i.id !== targetId) return i
        found = true
        return withAlias(i, surface)
      })
      return { story: { ...story, informations }, found }
    }
  }
}

/**
 * 候補を確定して storyData を更新する。
 * - create: 新規エンティティを作成
 * - link: 既存エンティティへ名寄せ（必要なら aliases 追記）
 * いずれも候補の出現 Act に参照を write-back する。
 */
export function reconcile(
  story: StoryData,
  candidate: Candidate,
  decision: ReconcileDecision,
): ReconcileResult {
  const surface = candidate.surface
  let working = story
  let entityId: number
  const warnings: string[] = []

  if (decision.kind === 'create') {
    const created = createEntity(working, decision.type, surface)
    working = created.story
    entityId = created.id
  } else {
    const linked = linkEntity(working, decision.type, decision.targetId, surface)
    if (!linked.found) {
      return {
        data: story,
        entityId: decision.targetId,
        warnings: [
          `名寄せ先のエンティティ(${decision.type}:${decision.targetId})が見つかりませんでした`,
        ],
      }
    }
    working = linked.story
    entityId = decision.targetId
  }

  const field = REF_FIELD[decision.type]
  const writeBack = writeBackActs(working.acts, candidate.actIds, field, entityId)
  working = { ...working, acts: writeBack.acts }
  warnings.push(...writeBack.warnings)

  return { data: working, entityId, warnings }
}
