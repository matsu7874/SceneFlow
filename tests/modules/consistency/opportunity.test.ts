import { describe, it, expect } from 'vitest'
import {
  reconstructAt,
  whoWasAt,
  propAccessOpportunity,
  knowledgeByInfo,
  distinctActTimes,
} from '../../../src/modules/consistency/opportunity'
import type { StoryData, Act } from '../../../src/types/StoryData'

function story(over: Partial<StoryData> = {}): StoryData {
  return {
    persons: [
      { id: 1, name: 'A', color: '#000' },
      { id: 2, name: 'B', color: '#111' },
      { id: 3, name: 'C', color: '#222' },
    ],
    locations: [
      { id: 10, name: '広間', connections: [11] },
      { id: 11, name: '書斎', connections: [10] },
    ],
    props: [],
    informations: [],
    initialStates: [
      { personId: 1, locationId: 10, time: '00:00' },
      { personId: 2, locationId: 10, time: '00:00' },
      { personId: 3, locationId: 11, time: '00:00' },
    ],
    acts: [],
    ...over,
  }
}

function act(p: Partial<Act> & { id: number }): Act {
  return { personId: 1, locationId: 10, time: '00:00', description: '', startTime: 0, ...p }
}

describe('distinctActTimes', () => {
  it('行動時刻を昇順・重複なしで返す', () => {
    const r = distinctActTimes(
      story({
        acts: [
          act({ id: 1, startTime: 30 }),
          act({ id: 2, startTime: 10 }),
          act({ id: 3, startTime: 30 }),
        ],
      }),
    )
    expect(r).toEqual([10, 30])
  })
})

describe('whoWasAt（場所×時刻の容疑者）', () => {
  it('初期配置のみなら初期位置で判定する', () => {
    const r = whoWasAt(story(), 10, 0)
    expect(r.map(p => p.personId)).toEqual([1, 2])
  })

  it('移動後はその時刻の所在で判定する', () => {
    const s = story({
      acts: [act({ id: 1, personId: 1, locationId: 11, startTime: 20, type: 'MOVE' })],
    })
    expect(whoWasAt(s, 11, 20).map(p => p.personId)).toEqual([1, 3])
    expect(whoWasAt(s, 10, 20).map(p => p.personId)).toEqual([2])
  })

  it('時刻より後の移動は反映されない', () => {
    const s = story({
      acts: [act({ id: 1, personId: 1, locationId: 11, startTime: 20, type: 'MOVE' })],
    })
    expect(whoWasAt(s, 10, 10).map(p => p.personId)).toEqual([1, 2])
  })

  it('被害者の状態も返す', () => {
    const s = story({
      acts: [
        act({
          id: 1,
          personId: 2,
          locationId: 10,
          startTime: 5,
          type: 'KILL',
          interactedPersonId: 1,
        }),
      ],
    })
    const at = whoWasAt(s, 10, 5).find(p => p.personId === 1)
    expect(at?.status).toBe('dead')
  })
})

describe('propAccessOpportunity（凶器に触れ得た人物）', () => {
  it('所持者と、置かれた場所の居合わせ者を集計する', () => {
    const s = story({
      props: [{ id: 100, name: '燭台', currentLocation: '10', isPortable: true }],
      acts: [
        // C は最初書斎(11)におり、燭台のある広間(10)には居ない
        act({ id: 1, personId: 1, locationId: 10, startTime: 10, type: 'TAKE', propId: 100 }),
      ],
    })
    const access = propAccessOpportunity(s)
    const who = access.get(100) ?? new Set<number>()
    // 置かれている間に広間に居た A・B、取得した A は触れ得る。書斎の C は不可。
    expect(who.has(1)).toBe(true)
    expect(who.has(2)).toBe(true)
    expect(who.has(3)).toBe(false)
  })

  it('受け渡しで所持者が変わると新所持者も加わる', () => {
    const s = story({
      props: [{ id: 100, name: '鍵', owner: '1' }],
      acts: [
        act({
          id: 1,
          personId: 1,
          locationId: 10,
          startTime: 10,
          type: 'GIVE',
          propId: 100,
          interactedPersonId: 2,
        }),
      ],
    })
    const who = propAccessOpportunity(s).get(100) ?? new Set<number>()
    expect(who.has(1)).toBe(true)
    expect(who.has(2)).toBe(true)
  })
})

describe('knowledgeByInfo（秘密を知り得た人物）', () => {
  it('LEARN と SPEAK の伝播を初出時刻つきで集計する', () => {
    const s = story({
      informations: [{ id: 200, content: '秘密' }],
      acts: [
        act({
          id: 1,
          personId: 1,
          locationId: 10,
          startTime: 10,
          type: 'LEARN',
          informationId: 200,
        }),
        act({
          id: 2,
          personId: 1,
          locationId: 10,
          startTime: 20,
          type: 'SPEAK',
          informationId: 200,
          interactedPersonId: 2,
        }),
      ],
    })
    const entries = knowledgeByInfo(s).get(200) ?? []
    expect(entries).toEqual([
      { personId: 1, firstTime: 10 },
      { personId: 2, firstTime: 20 },
    ])
  })

  it('死亡した相手には伝わらない', () => {
    const s = story({
      informations: [{ id: 200, content: '秘密' }],
      acts: [
        act({
          id: 1,
          personId: 1,
          locationId: 10,
          startTime: 5,
          type: 'KILL',
          interactedPersonId: 2,
        }),
        act({
          id: 2,
          personId: 1,
          locationId: 10,
          startTime: 10,
          type: 'LEARN',
          informationId: 200,
        }),
        act({
          id: 3,
          personId: 1,
          locationId: 10,
          startTime: 20,
          type: 'SPEAK',
          informationId: 200,
          interactedPersonId: 2,
        }),
      ],
    })
    const entries = knowledgeByInfo(s).get(200) ?? []
    expect(entries.some(e => e.personId === 2)).toBe(false)
  })
})

describe('reconstructAt', () => {
  it('until を省略すると最終状態を返す', () => {
    const s = story({
      acts: [act({ id: 1, personId: 1, locationId: 11, startTime: 20, type: 'MOVE' })],
    })
    const snap = reconstructAt(s)
    expect(snap.positions.get(1)).toBe(11)
  })
})
