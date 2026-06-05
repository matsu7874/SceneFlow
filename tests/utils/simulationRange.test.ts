import { describe, it, expect } from 'vitest'
import { computeSimulationRange } from '../../src/utils/simulationRange'
import type { StoryData } from '../../src/types/StoryData'

function story(over: Partial<StoryData> = {}): StoryData {
  return {
    persons: [{ id: 1, name: '太郎', color: '#000' }],
    locations: [
      { id: 1, name: 'A', connections: [2] },
      { id: 2, name: 'B', connections: [1] },
    ],
    props: [],
    informations: [],
    initialStates: [{ personId: 1, locationId: 1, time: '21:00' }],
    acts: [],
    ...over,
  }
}

describe('computeSimulationRange', () => {
  it('storyDataがnullなら0-0を返す', () => {
    expect(computeSimulationRange(null)).toEqual({ minTime: 0, maxTime: 0 })
  })
  it('Actが無ければ0-0を返す', () => {
    expect(computeSimulationRange(story({ acts: [] }))).toEqual({ minTime: 0, maxTime: 0 })
  })
  it('範囲を最初のイベント手前〜最後のイベント直後にフィットさせる', () => {
    const r = computeSimulationRange(
      story({
        acts: [
          { id: 1, personId: 1, locationId: 1, time: '21:00', description: '', startTime: 1260 },
          { id: 2, personId: 1, locationId: 2, time: '22:00', description: '', startTime: 1320 },
        ],
      }),
    )
    // 21:00 = 1260分, 22:00 = 1320分。物語がバーの大半を占めるよう手前/直後に小さな余白のみ。
    expect(r.minTime).toBeGreaterThan(1200)
    expect(r.minTime).toBeLessThanOrEqual(1260)
    expect(r.maxTime).toBeGreaterThanOrEqual(1320)
    expect(r.maxTime).toBeLessThan(1380)
    expect(r.maxTime - r.minTime).toBeLessThan(120)
  })
  it('minTimeは負にならない', () => {
    const r = computeSimulationRange(
      story({
        acts: [{ id: 1, personId: 1, locationId: 1, time: '00:00', description: '', startTime: 0 }],
      }),
    )
    expect(r.minTime).toBe(0)
  })
})
