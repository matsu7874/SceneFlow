import { describe, it, expect } from 'vitest'
import { reconcile } from '../../src/pages/entityExtraction/reconcile'
import type { Candidate } from '../../src/modules/nlp/types'
import { createEmptyStoryData, type Act, type StoryData } from '../../src/types/StoryData'

const act = (id: number, extra: Partial<Act> = {}): Act => ({
  id,
  personId: 1,
  locationId: 1,
  time: '00:00',
  description: '',
  ...extra,
})

const candidate = (over: Partial<Candidate> = {}): Candidate => ({
  surface: '赤いバンダナ',
  normalized: '赤いバンダナ',
  typeGuess: 'prop',
  actIds: [1],
  count: 1,
  ...over,
})

describe('reconcile', () => {
  it('新規 prop を作成し、出現 Act の propId に紐付ける', () => {
    const story: StoryData = { ...createEmptyStoryData(), acts: [act(1), act(2)] }
    const result = reconcile(story, candidate({ actIds: [1] }), { kind: 'create', type: 'prop' })

    expect(result.data.props).toHaveLength(1)
    expect(result.data.props[0].name).toBe('赤いバンダナ')
    expect(result.data.acts.find(a => a.id === 1)?.propId).toBe(result.entityId)
    expect(result.data.acts.find(a => a.id === 2)?.propId).toBeUndefined()
    expect(result.warnings).toEqual([])
  })

  it('location 候補は locationId、person 候補は interactedPersonId に紐付ける', () => {
    // locationId は未設定（0）の Act を使い、空きスロットへの書き込みを確認する。
    const story: StoryData = { ...createEmptyStoryData(), acts: [act(1, { locationId: 0 })] }
    const loc = reconcile(
      story,
      candidate({ surface: '協会', actIds: [1], typeGuess: 'location' }),
      {
        kind: 'create',
        type: 'location',
      },
    )
    expect(loc.data.acts[0].locationId).toBe(loc.entityId)
    expect(loc.data.locations[0].name).toBe('協会')

    const per = reconcile(
      story,
      candidate({ surface: 'アリス', actIds: [1], typeGuess: 'person' }),
      {
        kind: 'create',
        type: 'person',
      },
    )
    expect(per.data.acts[0].interactedPersonId).toBe(per.entityId)
  })

  it('既存へ名寄せすると、表層形が name と違えば aliases に追記する', () => {
    const story: StoryData = {
      ...createEmptyStoryData(),
      locations: [{ id: 5, name: '教会', connections: [] }],
      acts: [act(1, { locationId: 0 })],
    }
    const result = reconcile(story, candidate({ surface: '協会', actIds: [1] }), {
      kind: 'link',
      type: 'location',
      targetId: 5,
    })
    expect(result.data.locations[0].aliases).toEqual(['協会'])
    expect(result.data.acts[0].locationId).toBe(5)
  })

  it('表層形が name と同一なら aliases に重複追加しない', () => {
    const story: StoryData = {
      ...createEmptyStoryData(),
      props: [{ id: 3, name: '鍵' }],
      acts: [act(1)],
    }
    const result = reconcile(story, candidate({ surface: '鍵', actIds: [1] }), {
      kind: 'link',
      type: 'prop',
      targetId: 3,
    })
    expect(result.data.props[0].aliases).toBeUndefined()
    expect(result.data.acts[0].propId).toBe(3)
  })

  it('参照が既に別エンティティで埋まっている場合は上書きせず警告する', () => {
    const story: StoryData = {
      ...createEmptyStoryData(),
      acts: [act(1, { propId: 99 })],
    }
    const result = reconcile(story, candidate({ actIds: [1] }), { kind: 'create', type: 'prop' })
    expect(result.data.acts[0].propId).toBe(99)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('Act 1')
  })

  it('入力 story を破壊しない（イミュータブル）', () => {
    const story: StoryData = { ...createEmptyStoryData(), acts: [act(1)] }
    const before = structuredClone(story)
    reconcile(story, candidate({ actIds: [1] }), { kind: 'create', type: 'prop' })
    expect(story).toEqual(before)
  })

  it('名寄せ先が存在しない場合は story を変えず警告を返す', () => {
    const story: StoryData = { ...createEmptyStoryData(), acts: [act(1)] }
    const result = reconcile(story, candidate({ actIds: [1] }), {
      kind: 'link',
      type: 'prop',
      targetId: 404,
    })
    expect(result.data).toBe(story)
    expect(result.warnings[0]).toContain('見つかりませんでした')
  })
})
