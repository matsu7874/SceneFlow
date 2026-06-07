import { describe, it, expect } from 'vitest'
import { normalizeStoryData } from '../../src/utils/normalizeStoryData'
import { createEmptyStoryData, type StoryData } from '../../src/types/StoryData'

function story(partial: Partial<StoryData>): StoryData {
  return { ...createEmptyStoryData(), ...partial }
}

describe('normalizeStoryData', () => {
  it('欠損した配列フィールドを空配列で補い完全な形を返す', () => {
    const result = normalizeStoryData({ persons: [], locations: [] } as unknown as StoryData)
    expect(result.props).toEqual([])
    expect(result.informations).toEqual([])
    expect(result.initialStates).toEqual([])
    expect(result.acts).toEqual([])
  })

  it('connections を数値化する（文字列で来ても number になる）', () => {
    const data = story({
      locations: [
        { id: 1, name: 'A', connections: ['2'] as unknown as number[] },
        { id: 2, name: 'B', connections: [1] },
      ],
    })
    const result = normalizeStoryData(data)
    expect(result.locations[0].connections).toEqual([2])
    expect(result.locations[1].connections).toEqual([1])
  })

  it('存在しない場所・自己接続・重複を connections から除去する', () => {
    const data = story({
      locations: [
        { id: 1, name: 'A', connections: [1, 2, 2, 99] },
        { id: 2, name: 'B', connections: [] },
      ],
    })
    const result = normalizeStoryData(data)
    expect(result.locations[0].connections).toEqual([2])
  })

  it('relationships.targetId を文字列に統一する', () => {
    const data = story({
      persons: [
        {
          id: 1,
          name: 'A',
          color: '#000',
          relationships: [{ targetId: 2 as unknown as string, type: '友人' }],
        },
        { id: 2, name: 'B', color: '#111' },
      ],
    })
    const result = normalizeStoryData(data)
    expect(result.persons[0].relationships).toEqual([{ targetId: '2', type: '友人' }])
  })

  it('存在しない人物を指す関係（dangling）を除去する', () => {
    const data = story({
      persons: [
        {
          id: 1,
          name: 'A',
          color: '#000',
          relationships: [
            { targetId: '2', type: '友人' },
            { targetId: '99', type: '敵' },
          ],
        },
        { id: 2, name: 'B', color: '#111' },
      ],
    })
    const result = normalizeStoryData(data)
    expect(result.persons[0].relationships).toEqual([{ targetId: '2', type: '友人' }])
  })

  it('空・数値化できない targetId を除去する', () => {
    const data = story({
      persons: [
        {
          id: 1,
          name: 'A',
          color: '#000',
          relationships: [
            { targetId: '', type: 'x' },
            { targetId: 'abc', type: 'y' },
            { targetId: '2', type: '友人' },
          ],
        },
        { id: 2, name: 'B', color: '#111' },
      ],
    })
    const result = normalizeStoryData(data)
    expect(result.persons[0].relationships).toEqual([{ targetId: '2', type: '友人' }])
  })

  it('relationships を持たない人物はそのまま返す', () => {
    const data = story({ persons: [{ id: 1, name: 'A', color: '#000' }] })
    const result = normalizeStoryData(data)
    expect(result.persons[0].relationships).toBeUndefined()
  })

  it('入力を破壊しない（非破壊）', () => {
    const data = story({
      locations: [
        { id: 1, name: 'A', connections: [1, 99] },
        { id: 2, name: 'B', connections: [] },
      ],
    })
    const snapshot = JSON.parse(JSON.stringify(data))
    normalizeStoryData(data)
    expect(data).toEqual(snapshot)
  })
})
