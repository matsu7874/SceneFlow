import { describe, it, expect } from 'vitest'
import { replaceEntityInList } from '../../src/pages/entitiesPageLogic'
import type { ExtendedEntity, EntityType } from '../../src/types/extendedEntities'

function ent(id: string, type: EntityType, name: string): ExtendedEntity {
  return {
    id,
    type,
    name,
    description: '',
    created_at: '',
    updated_at: '',
    attributes: {},
    relationships: [],
  }
}

describe('replaceEntityInList', () => {
  it('同一idでもタイプが違うエンティティは置き換えない', () => {
    const list = [ent('1', 'person', 'アリス'), ent('1', 'location', '公園')]
    const updated = ent('1', 'person', 'アリス改')

    const result = replaceEntityInList(list, updated)

    expect(result.find(e => e.type === 'person')?.name).toBe('アリス改')
    // 同じid="1"の場所が人物に巻き込まれて壊れていないこと
    expect(result.find(e => e.type === 'location')?.name).toBe('公園')
    expect(result.filter(e => e.type === 'location')).toHaveLength(1)
  })

  it('同一タイプ同一idのエンティティだけを置き換える', () => {
    const list = [ent('1', 'person', 'アリス'), ent('2', 'person', 'ボブ')]
    const updated = ent('2', 'person', 'ボブ改')

    const result = replaceEntityInList(list, updated)

    expect(result.find(e => e.id === '1')?.name).toBe('アリス')
    expect(result.find(e => e.id === '2')?.name).toBe('ボブ改')
  })
})
