import type { StoryData } from '../types/StoryData'

/**
 * 読み込んだ物語データの参照整合性を整える（非破壊・新しいオブジェクトを返す）。
 *
 * - すべての配列フィールドを欠損時に空配列で補い、常に完全な StoryData 形を返す。
 * - Location.connections を数値化し、自己参照・重複・存在しない場所への接続を除去する。
 * - Person.relationships の targetId を文字列に統一し（型・参照側に合わせる）、
 *   空・数値化できない・存在しない人物を指す関係（dangling）を除去する。
 *
 * localStorage 読込・サンプル読込・JSON 貼付の3経路すべてに通すことで、
 * 手編集や旧データに混入した不正参照でアプリが乱れないようにする。
 * targetId を number へ変更しないのは、型と既存コンシューマ（相関図・エンティティ編集の
 * reference フィールド）が文字列前提のため。整合性という目的は文字列統一＋dangling 除去で達成する。
 */
export function normalizeStoryData(data: StoryData): StoryData {
  const persons = data.persons ?? []
  const locations = data.locations ?? []
  const personIds = new Set(persons.map(p => p.id))
  const locationIds = new Set(locations.map(l => l.id))

  const normalizedLocations = locations.map(loc => {
    const seen = new Set<number>()
    const connections: number[] = []
    for (const raw of loc.connections ?? []) {
      const id = Number(raw)
      if (!Number.isFinite(id)) continue
      if (id === loc.id) continue // 自己接続は無視
      if (!locationIds.has(id)) continue // 存在しない場所への接続は除去
      if (seen.has(id)) continue // 重複除去
      seen.add(id)
      connections.push(id)
    }
    return { ...loc, connections }
  })

  const normalizedPersons = persons.map(person => {
    if (!person.relationships) return person
    const seen = new Set<string>()
    const relationships = person.relationships
      .map(rel => ({ ...rel, targetId: String(rel.targetId) }))
      .filter(rel => {
        if (rel.targetId === '') return false
        const numericId = Number(rel.targetId)
        if (!Number.isFinite(numericId)) return false
        if (!personIds.has(numericId)) return false // dangling 除去
        const key = `${rel.targetId}:${rel.type}`
        if (seen.has(key)) return false // 重複除去
        seen.add(key)
        return true
      })
    return { ...person, relationships }
  })

  return {
    persons: normalizedPersons,
    locations: normalizedLocations,
    props: data.props ?? [],
    informations: data.informations ?? [],
    initialStates: data.initialStates ?? [],
    acts: data.acts ?? [],
  }
}
