import { describe, it, expect } from 'vitest'
import {
  storyDataToMapEditor,
  mapEditorToStoryData,
} from '../../src/components/MapEditor/storyDataAdapter'
import { createEmptyStoryData, type StoryData } from '../../src/types/StoryData'
import type { MapData } from '../../src/components/MapEditor/types'

function story(partial: Partial<StoryData>): StoryData {
  return { ...createEmptyStoryData(), ...partial }
}

describe('storyDataToMapEditor', () => {
  it('場所を文字列 id のノードへ変換し、座標を引き継ぐ', () => {
    const data = story({
      locations: [
        { id: 1, name: 'A', connections: [2], x: 10, y: 20 },
        { id: 2, name: 'B', connections: [1] },
      ],
    })
    const map = storyDataToMapEditor(data)
    expect(map.locations[0]).toMatchObject({ id: '1', name: 'A', x: 10, y: 20 })
    expect(map.locations[1]).toMatchObject({ id: '2', name: 'B' })
  })

  it('座標未設定でも決定的に仮配置する（同じ入力なら同じ座標）', () => {
    const data = story({
      locations: [
        { id: 1, name: 'A', connections: [2] },
        { id: 2, name: 'B', connections: [1] },
      ],
    })
    const a = storyDataToMapEditor(data)
    const b = storyDataToMapEditor(data)
    expect(a.locations[0].x).toBe(b.locations[0].x)
    expect(a.locations[0].y).toBe(b.locations[0].y)
    expect(Number.isFinite(a.locations[0].x)).toBe(true)
    expect(Number.isFinite(a.locations[0].y)).toBe(true)
  })

  it('座標を持つ場所はその座標をそのまま使う', () => {
    const data = story({
      locations: [
        { id: 1, name: 'A', connections: [], x: 123, y: 456 },
        { id: 2, name: 'B', connections: [], x: 50, y: 60 },
      ],
    })
    const map = storyDataToMapEditor(data)
    expect(map.locations[0]).toMatchObject({ x: 123, y: 456 })
    expect(map.locations[1]).toMatchObject({ x: 50, y: 60 })
  })

  it('双方向接続を重複なく1本に畳む', () => {
    const data = story({
      locations: [
        { id: 1, name: 'A', connections: [2] },
        { id: 2, name: 'B', connections: [1] },
      ],
    })
    const map = storyDataToMapEditor(data)
    expect(map.connections).toHaveLength(1)
    expect(map.connections[0]).toMatchObject({ from: '1', to: '2', bidirectional: true })
  })
})

describe('mapEditorToStoryData', () => {
  it('name・x・y・connections のみ上書きし、付帯フィールドを保全する（非破壊マージ）', () => {
    const prev = story({
      locations: [
        {
          id: 1,
          name: '旧名',
          connections: [],
          x: 0,
          y: 0,
          type: 'indoor',
          capacity: 5,
          travelTime: 3,
          color: '#abc',
          description: '説明',
        },
      ],
    })
    const map: MapData = {
      locations: [{ id: '1', name: '新名', x: 100, y: 200 }],
      connections: [],
    }
    const result = mapEditorToStoryData(map, prev)
    const loc = result.locations[0]
    expect(loc).toMatchObject({ id: 1, name: '新名', x: 100, y: 200 })
    // 付帯フィールドは保全
    expect(loc.type).toBe('indoor')
    expect(loc.capacity).toBe(5)
    expect(loc.travelTime).toBe(3)
    expect(loc.color).toBe('#abc')
    expect(loc.description).toBe('説明')
  })

  it('双方向接続を両側の connections に反映する', () => {
    const prev = story({
      locations: [
        { id: 1, name: 'A', connections: [] },
        { id: 2, name: 'B', connections: [] },
      ],
    })
    const map: MapData = {
      locations: [
        { id: '1', name: 'A', x: 0, y: 0 },
        { id: '2', name: 'B', x: 0, y: 0 },
      ],
      connections: [{ from: '1', to: '2', weight: 1, bidirectional: true }],
    }
    const result = mapEditorToStoryData(map, prev)
    expect(result.locations[0].connections).toEqual([2])
    expect(result.locations[1].connections).toEqual([1])
  })

  it('単方向接続は from 側のみに反映する', () => {
    const prev = story({
      locations: [
        { id: 1, name: 'A', connections: [] },
        { id: 2, name: 'B', connections: [] },
      ],
    })
    const map: MapData = {
      locations: [
        { id: '1', name: 'A', x: 0, y: 0 },
        { id: '2', name: 'B', x: 0, y: 0 },
      ],
      connections: [{ from: '1', to: '2', weight: 1, bidirectional: false }],
    }
    const result = mapEditorToStoryData(map, prev)
    expect(result.locations[0].connections).toEqual([2])
    expect(result.locations[1].connections).toEqual([])
  })

  it('新規ノードには既存と衝突しない数値 id を採番する', () => {
    const prev = story({ locations: [{ id: 1, name: 'A', connections: [] }] })
    // MapEditor の新規ノードは "101" のような採番 id を持つ
    const map: MapData = {
      locations: [
        { id: '1', name: 'A', x: 0, y: 0 },
        { id: '101', name: '新規', x: 50, y: 50 },
      ],
      connections: [{ from: '1', to: '101', weight: 1, bidirectional: true }],
    }
    const result = mapEditorToStoryData(map, prev)
    const created = result.locations.find(l => l.name === '新規')
    expect(created).toBeDefined()
    expect(typeof created!.id).toBe('number')
    expect(created!.id).not.toBe(1)
  })

  it('storyDataToMapEditor → mapEditorToStoryData の往復で id/接続/座標が保たれる', () => {
    const prev = story({
      locations: [
        { id: 1, name: 'A', connections: [2], x: 10, y: 10 },
        { id: 2, name: 'B', connections: [1], x: 20, y: 20 },
      ],
    })
    const round = mapEditorToStoryData(storyDataToMapEditor(prev), prev)
    expect(round.locations.map(l => l.id).sort()).toEqual([1, 2])
    expect(round.locations.find(l => l.id === 1)?.connections).toEqual([2])
    expect(round.locations.find(l => l.id === 2)?.connections).toEqual([1])
  })
})
