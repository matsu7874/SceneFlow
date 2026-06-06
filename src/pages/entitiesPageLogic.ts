import type { ExtendedEntity, EntityType } from '../types/extendedEntities'

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

/**
 * 各エンティティ種別で、編集フォーム（ExtendedEntityEditor のスキーマ）から
 * トップレベルに書き戻されるドメインフィールド名。
 *
 * 更新時に元データ（updatedEntity.attributes）を再注入すると説明以外の編集が
 * 破棄されるため、ここに挙げたフィールドは編集後のトップレベル値を採用する。
 * name/color/connections/content は呼び出し側で個別に上書きするため除外。
 * location の type は ExtendedEntity の判別子 type と衝突するため、また
 * connectedTo は connections へ変換するため、ここには含めない。
 */
export const editableDomainFields: Partial<Record<EntityType, readonly string[]>> = {
  person: ['description', 'age', 'occupation', 'personality', 'goals', 'relationships'],
  location: ['description', 'capacity', 'properties'],
  prop: [
    'description',
    'category',
    'isPortable',
    'isConsumable',
    'isCombineable',
    'combinesWith',
    'currentLocation',
    'owner',
  ],
  information: [
    'description',
    'category',
    'isSecret',
    'requiresContext',
    'enablesActions',
    'revealsInformation',
    'subject',
    'aspect',
    'value',
    'truth',
    'misinfoType',
  ],
}

/**
 * 編集済みエンティティから、指定フィールドのうち定義済み（undefined 以外）の値だけを
 * 抜き出す。false/0/'' は編集結果として採用し、未指定（undefined）のみ除外する。
 */
export function pickEditedFields(
  entity: ExtendedEntity,
  type: EntityType,
): Record<string, unknown> {
  const keys = editableDomainFields[type] ?? []
  const src = entity as ExtendedEntity & Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of keys) {
    if (src[k] !== undefined) out[k] = src[k]
  }
  return out
}
