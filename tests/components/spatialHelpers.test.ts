import { describe, it, expect } from 'vitest'
import {
  breakageLocationIds,
  buildMovementPolylines,
  resolveLocationPositions,
} from '../../src/components/MapBackground/spatial'
import type { Act, Location } from '../../src/types/StoryData'
import type { Breakage } from '../../src/modules/consistency'

function act(p: Partial<Act> & { id: number }): Act {
  return { personId: 1, locationId: 1, time: '00:00', description: '', startTime: 0, ...p }
}

function loc(p: Partial<Location> & { id: number }): Location {
  return { name: `L${p.id}`, connections: [], ...p }
}

describe('breakageLocationIds', () => {
  it('破綻Actのある場所idの集合を返す', () => {
    const acts = [act({ id: 1, locationId: 10 }), act({ id: 2, locationId: 11 })]
    const breakages: Breakage[] = [{ actId: 2, category: 'item', fact: null, message: 'x' }]
    expect(breakageLocationIds(breakages, acts)).toEqual(new Set([11]))
  })
  it('存在しないactIdは無視する', () => {
    const breakages: Breakage[] = [{ actId: 99, category: 'item', fact: null, message: 'x' }]
    expect(breakageLocationIds(breakages, [act({ id: 1, locationId: 10 })])).toEqual(new Set())
  })
})

describe('buildMovementPolylines', () => {
  it('人物ごとに時刻順の場所列を線分化し同一場所連続を畳む', () => {
    const acts = [
      act({ id: 1, personId: 1, locationId: 10, startTime: 0 }),
      act({ id: 2, personId: 1, locationId: 10, startTime: 5 }),
      act({ id: 3, personId: 1, locationId: 11, startTime: 10 }),
      act({ id: 4, personId: 2, locationId: 12, startTime: 0 }),
    ]
    const lines = buildMovementPolylines(acts)
    expect(lines.find(l => l.personId === 1)?.locationIds).toEqual([10, 11])
    expect(lines.find(l => l.personId === 2)?.locationIds).toEqual([12])
  })
})

describe('resolveLocationPositions', () => {
  it('全場所が座標を持つ場合はその座標をそのまま使う', () => {
    const locations = [loc({ id: 1, x: 10, y: 20 }), loc({ id: 2, x: 30, y: 40 })]
    const pos = resolveLocationPositions(locations)
    expect(pos.get(1)).toEqual({ x: 10, y: 20 })
    expect(pos.get(2)).toEqual({ x: 30, y: 40 })
  })

  it('座標未設定でも全場所に位置を補完する（空表示を防ぐ）', () => {
    const locations = [
      loc({ id: 1, connections: [2] }),
      loc({ id: 2, connections: [1, 3] }),
      loc({ id: 3, connections: [2] }),
    ]
    const pos = resolveLocationPositions(locations)
    expect(pos.size).toBe(3)
    for (const id of [1, 2, 3]) {
      const p = pos.get(id)
      expect(p).toBeDefined()
      expect(Number.isFinite(p!.x)).toBe(true)
      expect(Number.isFinite(p!.y)).toBe(true)
    }
  })

  it('決定的: 同じ入力からは同じ座標を返す', () => {
    const build = (): Location[] => [
      loc({ id: 1, connections: [2] }),
      loc({ id: 2, connections: [1, 3] }),
      loc({ id: 3, connections: [2] }),
    ]
    expect([...resolveLocationPositions(build())]).toEqual([...resolveLocationPositions(build())])
  })

  it('座標を持つ場所は固定され、未配置の場所だけが補完される', () => {
    const locations = [
      loc({ id: 1, x: 100, y: 100, connections: [2] }),
      loc({ id: 2, connections: [1] }),
    ]
    const pos = resolveLocationPositions(locations)
    expect(pos.get(1)).toEqual({ x: 100, y: 100 })
    expect(pos.get(2)).toBeDefined()
  })

  it('場所が無ければ空のMapを返す', () => {
    expect(resolveLocationPositions([]).size).toBe(0)
  })
})
