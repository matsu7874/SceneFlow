import { describe, it, expect } from 'vitest'
import {
  breakageLocationIds,
  buildMovementPolylines,
} from '../../src/components/MapBackground/spatial'
import type { Act } from '../../src/types/StoryData'
import type { Breakage } from '../../src/modules/consistency'

function act(p: Partial<Act> & { id: number }): Act {
  return { personId: 1, locationId: 1, time: '00:00', description: '', startTime: 0, ...p }
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
