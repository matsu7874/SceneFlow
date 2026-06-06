import { describe, it, expect } from 'vitest'
import { replaceEntityInList, pickEditedFields } from '../../src/pages/entitiesPageLogic'
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

describe('pickEditedFields', () => {
  it('編集後のトップレベル値（名前以外のドメインフィールド）を採用する', () => {
    const updated = {
      ...ent('1', 'person', 'アリス'),
      // フォームが書き戻すトップレベルの編集値
      age: 42,
      occupation: '探偵',
    } as ExtendedEntity & Record<string, unknown>

    const edited = pickEditedFields(updated, 'person')

    expect(edited).toMatchObject({ age: 42, occupation: '探偵' })
  })

  it('false/0/空文字は採用し、未指定（undefined）のみ除外する', () => {
    const updated = {
      ...ent('1', 'prop', '鍵'),
      isPortable: false,
      description: '',
      // category は未指定 → 除外される
    } as ExtendedEntity & Record<string, unknown>

    const edited = pickEditedFields(updated, 'prop')

    expect(edited).toEqual({ isPortable: false, description: '' })
    expect('category' in edited).toBe(false)
  })

  it('location の type は判別子と衝突するため対象外', () => {
    const updated = {
      ...ent('1', 'location', '図書室'),
      capacity: 10,
      type: 'location',
    } as ExtendedEntity & Record<string, unknown>

    const edited = pickEditedFields(updated, 'location')

    expect(edited).toMatchObject({ capacity: 10 })
    expect('type' in edited).toBe(false)
  })
})
