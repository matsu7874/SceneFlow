import { describe, it, expect } from 'vitest'
import { analyzeStory } from '../../../src/modules/consistency/checker'
import type { StoryData, Act } from '../../../src/types/StoryData'

function story(over: Partial<StoryData> = {}): StoryData {
  return {
    persons: [
      { id: 1, name: '太郎', color: '#000' },
      { id: 2, name: '花子', color: '#111' },
    ],
    locations: [
      { id: 10, name: '広場', connections: [11] },
      { id: 11, name: '図書館', connections: [10] },
      { id: 12, name: '塔', connections: [] },
    ],
    props: [],
    informations: [],
    initialStates: [
      { personId: 1, locationId: 10, time: '00:00' },
      { personId: 2, locationId: 10, time: '00:00' },
    ],
    acts: [],
    ...over,
  }
}

function act(p: Partial<Act> & { id: number }): Act {
  return { personId: 1, locationId: 10, time: '00:00', description: '', startTime: 0, ...p }
}

const cat = (r: ReturnType<typeof analyzeStory>, actId: number) =>
  (r.byActId.get(actId) ?? []).map(b => b.category).sort()

describe('analyzeStory: position', () => {
  it('移動なしで現在地と違う場所のActを破綻にする', () => {
    const r = analyzeStory(
      story({ acts: [act({ id: 1, personId: 1, locationId: 11, startTime: 10 })] }),
    )
    expect(cat(r, 1)).toContain('position')
  })
  it('MOVEを挟めば破綻しない', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({ id: 1, personId: 1, locationId: 11, startTime: 10, type: 'MOVE' }),
          act({ id: 2, personId: 1, locationId: 11, startTime: 20 }),
        ],
      }),
    )
    expect(cat(r, 2)).not.toContain('position')
  })
  it('隣接していない場所へのMOVEを破綻にする', () => {
    const r = analyzeStory(
      story({ acts: [act({ id: 1, personId: 1, locationId: 12, startTime: 10, type: 'MOVE' })] }),
    )
    expect(cat(r, 1)).toContain('position')
  })
  it('隣接するMOVEは破綻しない', () => {
    const r = analyzeStory(
      story({ acts: [act({ id: 1, personId: 1, locationId: 11, startTime: 10, type: 'MOVE' })] }),
    )
    expect(cat(r, 1)).not.toContain('position')
  })
})

describe('analyzeStory: colocation', () => {
  it('同時刻に別の場所のActを分身として破綻にする', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 10 }),
          act({ id: 2, personId: 1, locationId: 11, startTime: 10 }),
        ],
      }),
    )
    expect(cat(r, 1)).toContain('colocation')
    expect(cat(r, 2)).toContain('colocation')
  })
  it('同時刻同場所は分身ではない', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 10 }),
          act({ id: 2, personId: 1, locationId: 10, startTime: 10 }),
        ],
      }),
    )
    expect(cat(r, 1)).not.toContain('colocation')
  })
  it('別人物は分身に混同しない', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 10 }),
          act({ id: 2, personId: 2, locationId: 10, startTime: 10 }),
        ],
      }),
    )
    expect(cat(r, 1)).not.toContain('colocation')
  })
})

describe('analyzeStory: 対人共在', () => {
  it('その場にいない相手への対人行動を破綻にする', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({ id: 1, personId: 2, locationId: 11, startTime: 5, type: 'MOVE' }),
          act({
            id: 2,
            personId: 1,
            locationId: 10,
            startTime: 10,
            description: '拘束した',
            interactedPersonId: 2,
          }),
        ],
      }),
    )
    expect(cat(r, 2)).toContain('colocation')
  })
  it('共在していれば対人行動は破綻しない', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({
            id: 1,
            personId: 1,
            locationId: 10,
            startTime: 10,
            description: '拘束した',
            interactedPersonId: 2,
          }),
        ],
      }),
    )
    expect(cat(r, 1)).not.toContain('colocation')
  })
})

describe('analyzeStory: nodes/edges/byActId', () => {
  it('初期シードと各Actのノードを持つ', () => {
    const r = analyzeStory(
      story({ acts: [act({ id: 1, personId: 1, locationId: 10, startTime: 10 })] }),
    )
    expect(r.nodes.some(n => n.id === 'initial:1')).toBe(true)
    expect(r.nodes.some(n => n.id === 1)).toBe(true)
  })
  it('満たされた位置requireに来歴エッジが張られる', () => {
    const r = analyzeStory(
      story({ acts: [act({ id: 1, personId: 1, locationId: 10, startTime: 10 })] }),
    )
    expect(r.edges.some(e => e.to === 1 && e.fact.kind === 'at')).toBe(true)
  })
})
