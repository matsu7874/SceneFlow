import type { ExtendedEntity } from '../types/extendedEntities'

/**
 * 同一タイプかつ同一idのエンティティだけを置き換える。
 *
 * エンティティのidはタイプごとに独立採番されるため、人物・場所・行動・イベントが
 * 同じid（例: いずれも"1"）を持つことがある。idのみで一致判定すると、1つの
 * エンティティの更新が別タイプの同一idエンティティまで上書きし、一覧でReactの
 * key重複やデータ破壊を引き起こす。
 */
export function replaceEntityInList(
  list: ExtendedEntity[],
  updated: ExtendedEntity,
): ExtendedEntity[] {
  return list.map(e => (e.id === updated.id && e.type === updated.type ? updated : e))
}
