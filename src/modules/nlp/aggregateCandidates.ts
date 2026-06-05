// 複数 Act から抽出した素の候補（RawCandidate）を、正規化形でまとめて
// UI 提示用の Candidate にする純関数。既存エンティティとの一致判定もここで行う。

import type { StoryData } from '../../types/StoryData'
import type { Candidate, EntityTypeGuess, ExistingMatch, RawCandidate } from './types'

function normalize(surface: string): string {
  return surface.trim()
}

// 既存エンティティの name / aliases（Information は content も）から
// 「正規化キー → 一致情報」の索引を作る。先に登録した型を優先する。
function buildExistingIndex(story: StoryData): Map<string, ExistingMatch> {
  const index = new Map<string, ExistingMatch>()
  const add = (key: string | undefined, match: ExistingMatch): void => {
    if (!key) return
    const norm = normalize(key)
    if (norm && !index.has(norm)) index.set(norm, match)
  }
  const register = (
    items: Array<{ id: number; name?: string; aliases?: string[] }>,
    type: EntityTypeGuess,
    label: (item: { name?: string }) => string,
  ): void => {
    for (const item of items) {
      const match: ExistingMatch = { type, id: item.id, name: label(item) }
      add(item.name, match)
      for (const alias of item.aliases ?? []) add(alias, match)
    }
  }

  register(story.persons, 'person', item => item.name ?? '')
  register(story.locations, 'location', item => item.name ?? '')
  register(story.props, 'prop', item => item.name ?? '')
  for (const info of story.informations) {
    const name = info.name || info.content
    const match: ExistingMatch = { type: 'information', id: info.id, name }
    const norm = normalize(name)
    if (norm && !index.has(norm)) index.set(norm, match)
    for (const alias of info.aliases ?? []) {
      const a = normalize(alias)
      if (a && !index.has(a)) index.set(a, match)
    }
  }
  return index
}

// グループ内で最も多い推定型を選ぶ（同数なら最初に現れた型）。
function majorityType(raws: RawCandidate[]): EntityTypeGuess {
  const counts = new Map<EntityTypeGuess, number>()
  for (const r of raws) counts.set(r.typeGuess, (counts.get(r.typeGuess) ?? 0) + 1)
  let best = raws[0].typeGuess
  let bestCount = 0
  for (const r of raws) {
    const c = counts.get(r.typeGuess) ?? 0
    if (c > bestCount) {
      best = r.typeGuess
      bestCount = c
    }
  }
  return best
}

/**
 * 素の候補を正規化形でまとめ、既存エンティティと突き合わせて Candidate を作る。
 * @param raws 全 Act から抽出した RawCandidate
 * @param story 既存エンティティ参照元（name/aliases 照合に使う）
 */
export function aggregateCandidates(raws: RawCandidate[], story: StoryData): Candidate[] {
  const index = buildExistingIndex(story)
  const groups = new Map<string, RawCandidate[]>()
  for (const r of raws) {
    const list = groups.get(r.normalized)
    if (list) list.push(r)
    else groups.set(r.normalized, [r])
  }

  const result: Candidate[] = []
  for (const [normalized, list] of groups) {
    const actIds = [...new Set(list.map(r => r.actId))].sort((a, b) => a - b)
    const existingMatch = index.get(normalized)
    // 既存一致があればその型に揃える（名寄せ先の型と一致させる）。なければ多数決。
    const typeGuess = existingMatch ? existingMatch.type : majorityType(list)
    result.push({
      surface: list[0].surface,
      normalized,
      typeGuess,
      actIds,
      count: list.length,
      existingMatch,
    })
  }
  return result
}
