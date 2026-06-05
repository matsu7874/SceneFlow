import { describe, it, expect } from 'vitest'
import { analyzeStory } from '../../../src/modules/consistency/checker'
import type { StoryData, Act } from '../../../src/types/StoryData'

function story(over: Partial<StoryData> = {}): StoryData {
  return {
    persons: [
      { id: 1, name: '犯人', color: '#000' },
      { id: 2, name: '被害者', color: '#111' },
      { id: 3, name: '医師', color: '#222' },
    ],
    locations: [{ id: 10, name: '現場', connections: [] }],
    props: [],
    informations: [],
    initialStates: [
      { personId: 1, locationId: 10, time: '00:00' },
      { personId: 2, locationId: 10, time: '00:00' },
      { personId: 3, locationId: 10, time: '00:00' },
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

const kill = (id: number, t: number, victim: number): Act =>
  act({
    id,
    personId: 1,
    startTime: t,
    type: 'KILL',
    interactedPersonId: victim,
    description: '殺害',
  })

describe('analyzeStory: 生死・意識 (state)', () => {
  it('死亡した人物のその後の行動を破綻にする', () => {
    const r = analyzeStory(
      story({
        acts: [
          kill(1, 10, 2),
          act({ id: 2, personId: 2, startTime: 20, description: '被害者が歩き回る' }),
        ],
      }),
    )
    expect(cats(r, 2)).toContain('state')
  })

  it('殺害前の被害者の行動は破綻しない', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({ id: 1, personId: 2, startTime: 5, description: '被害者が証言する' }),
          kill(2, 10, 2),
        ],
      }),
    )
    expect(cats(r, 1)).not.toContain('state')
  })

  it('昏倒中の人物は行動できない', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({ id: 1, personId: 1, startTime: 5, type: 'INCAPACITATE', interactedPersonId: 2 }),
          act({ id: 2, personId: 2, startTime: 10, description: '昏倒者が動く' }),
        ],
      }),
    )
    expect(cats(r, 2)).toContain('state')
  })

  it('蘇生・覚醒すれば再び行動できる', () => {
    const r = analyzeStory(
      story({
        acts: [
          act({ id: 1, personId: 1, startTime: 5, type: 'INCAPACITATE', interactedPersonId: 2 }),
          act({ id: 2, personId: 3, startTime: 10, type: 'WAKE', interactedPersonId: 2 }),
          act({ id: 3, personId: 2, startTime: 15, description: '意識を取り戻して動く' }),
        ],
      }),
    )
    expect(cats(r, 3)).not.toContain('state')
  })

  it('死亡者は蘇生できない', () => {
    const r = analyzeStory(
      story({
        acts: [
          kill(1, 10, 2),
          act({ id: 2, personId: 3, startTime: 20, type: 'WAKE', interactedPersonId: 2 }),
        ],
      }),
    )
    expect(cats(r, 2)).toContain('state')
  })

  it('既に死亡した人物の再殺害を破綻にする', () => {
    const r = analyzeStory(story({ acts: [kill(1, 10, 2), kill(2, 20, 2)] }))
    expect(cats(r, 2)).toContain('state')
  })

  it('死亡者には情報を伝えられない（SPEAK の相手）', () => {
    const r = analyzeStory(
      story({
        informations: [{ id: 50, content: '真相' }],
        acts: [
          kill(1, 10, 2),
          act({ id: 2, personId: 3, startTime: 20, type: 'LEARN', informationId: 50 }),
          act({
            id: 3,
            personId: 3,
            startTime: 30,
            type: 'SPEAK',
            informationId: 50,
            interactedPersonId: 2,
          }),
        ],
      }),
    )
    expect(cats(r, 3)).toContain('state')
  })

  it('状態を変えるアクトを行う加害者自身は健常なら破綻しない', () => {
    const r = analyzeStory(story({ acts: [kill(1, 10, 2)] }))
    expect(cats(r, 1)).not.toContain('state')
  })
})
