import { describe, it, expect } from 'vitest'
import { analyzeStory } from '../../../src/modules/consistency/checker'
import type { StoryData, Act, Location, Prop } from '../../../src/types/StoryData'

function story(over: Partial<StoryData> = {}): StoryData {
  return {
    persons: [
      { id: 1, name: '太郎', color: '#000' },
      { id: 2, name: '花子', color: '#111' },
    ],
    locations: [
      { id: 10, name: '廊下', connections: [11] },
      { id: 11, name: '書庫', connections: [10] },
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

const cats = (r: ReturnType<typeof analyzeStory>, actId: number): string[] =>
  (r.byActId.get(actId) ?? []).map(b => b.category).sort()

describe('analyzeStory: 施錠・鍵 (access)', () => {
  const lockedLocs: Location[] = [
    { id: 10, name: '廊下', connections: [11] },
    {
      id: 11,
      name: '書庫',
      connections: [10],
      properties: { isLocked: true, requiredItem: '100' },
    },
  ]
  const key: Prop = { id: 100, name: '書庫の鍵', currentLocation: '10', isPortable: true }

  it('鍵を持たずに施錠空間へ移動すると access 破綻', () => {
    const r = analyzeStory(
      story({
        locations: lockedLocs,
        props: [key],
        acts: [act({ id: 1, personId: 1, locationId: 11, startTime: 10, type: 'MOVE' })],
      }),
    )
    expect(cats(r, 1)).toContain('access')
  })

  it('鍵を取得してから移動すれば破綻しない', () => {
    const r = analyzeStory(
      story({
        locations: lockedLocs,
        props: [key],
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 5, type: 'TAKE', propId: 100 }),
          act({ id: 2, personId: 1, locationId: 11, startTime: 10, type: 'MOVE' }),
        ],
      }),
    )
    expect(cats(r, 2)).not.toContain('access')
  })

  it('鍵未設定で施錠だけなら誰も入れない', () => {
    const r = analyzeStory(
      story({
        locations: [
          { id: 10, name: '廊下', connections: [11] },
          { id: 11, name: '開かずの間', connections: [10], properties: { isLocked: true } },
        ],
        acts: [act({ id: 1, personId: 1, locationId: 11, startTime: 10, type: 'MOVE' })],
      }),
    )
    expect(cats(r, 1)).toContain('access')
  })
})

describe('analyzeStory: 移動所要時間 (timing)', () => {
  const slow: Location[] = [
    { id: 10, name: '廊下', connections: [11] },
    { id: 11, name: '遠い塔', connections: [10], travelTime: 10 },
  ]

  it('所要時間に満たない移動は timing 破綻（アリバイ崩し）', () => {
    const r = analyzeStory(
      story({
        locations: slow,
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 0, description: '居る' }),
          act({ id: 2, personId: 1, locationId: 11, startTime: 5, type: 'MOVE' }), // 5分 < 10分
        ],
      }),
    )
    expect(cats(r, 2)).toContain('timing')
  })

  it('十分な時間が経っていれば破綻しない', () => {
    const r = analyzeStory(
      story({
        locations: slow,
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 0, description: '居る' }),
          act({ id: 2, personId: 1, locationId: 11, startTime: 12, type: 'MOVE' }),
        ],
      }),
    )
    expect(cats(r, 2)).not.toContain('timing')
  })

  it('travelTime 未設定なら所要時間チェックは発火しない', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 0, description: '居る' }),
          act({ id: 2, personId: 1, locationId: 11, startTime: 0, type: 'MOVE' }),
        ],
      }),
    )
    expect(cats(r, 2)).not.toContain('timing')
  })
})

describe('analyzeStory: 可搬性 (item)', () => {
  it('isPortable:false の道具は取得できず item 破綻', () => {
    const r = analyzeStory(
      story({
        props: [{ id: 200, name: '据付の燭台', currentLocation: '10', isPortable: false }],
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 10, type: 'TAKE', propId: 200 }),
        ],
      }),
    )
    expect(cats(r, 1)).toContain('item')
  })

  it('取得に失敗した非可搬の道具は所有が移らない', () => {
    const r = analyzeStory(
      story({
        props: [{ id: 200, name: '据付の燭台', currentLocation: '10', isPortable: false }],
        acts: [
          act({ id: 1, personId: 1, locationId: 10, startTime: 10, type: 'TAKE', propId: 200 }),
          act({
            id: 2,
            personId: 1,
            locationId: 10,
            startTime: 20,
            type: 'GIVE',
            propId: 200,
            interactedPersonId: 2,
          }),
        ],
      }),
    )
    // 取得できていないので、その後の受け渡しも所持なしで破綻する
    expect(cats(r, 2)).toContain('item')
  })
})
