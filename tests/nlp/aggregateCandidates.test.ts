import { describe, it, expect } from 'vitest'
import { aggregateCandidates } from '../../src/modules/nlp/aggregateCandidates'
import type { RawCandidate } from '../../src/modules/nlp/types'
import { createEmptyStoryData, type StoryData } from '../../src/types/StoryData'

const raw = (
  surface: string,
  typeGuess: RawCandidate['typeGuess'],
  actId: number,
): RawCandidate => ({
  surface,
  normalized: surface.trim(),
  typeGuess,
  actId,
})

describe('aggregateCandidates', () => {
  it('同じ正規化形を 1 候補にまとめ、出現 Act と回数を集約する', () => {
    const raws = [raw('赤いバンダナ', 'prop', 1), raw('赤いバンダナ', 'prop', 3)]
    const result = aggregateCandidates(raws, createEmptyStoryData())
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      surface: '赤いバンダナ',
      typeGuess: 'prop',
      actIds: [1, 3],
      count: 2,
    })
    expect(result[0].existingMatch).toBeUndefined()
  })

  it('出現 Act id を重複排除して昇順にする', () => {
    const raws = [raw('鍵', 'prop', 3), raw('鍵', 'prop', 1), raw('鍵', 'prop', 3)]
    const result = aggregateCandidates(raws, createEmptyStoryData())
    expect(result[0].actIds).toEqual([1, 3])
    expect(result[0].count).toBe(3)
  })

  it('既存エンティティの name と一致したら existingMatch を立て、型をそれに揃える', () => {
    const story: StoryData = {
      ...createEmptyStoryData(),
      props: [{ id: 7, name: '古い鍵' }],
    }
    // 抽出側は location と誤推定していても、既存一致で prop に矯正される。
    const result = aggregateCandidates([raw('古い鍵', 'location', 2)], story)
    expect(result[0].typeGuess).toBe('prop')
    expect(result[0].existingMatch).toEqual({ type: 'prop', id: 7, name: '古い鍵' })
  })

  it('既存エンティティの aliases とも照合する', () => {
    const story: StoryData = {
      ...createEmptyStoryData(),
      locations: [{ id: 5, name: '教会', connections: [], aliases: ['協会'] }],
    }
    const result = aggregateCandidates([raw('協会', 'location', 1)], story)
    expect(result[0].existingMatch).toEqual({ type: 'location', id: 5, name: '教会' })
  })

  it('型推定が割れたら多数決で決める', () => {
    const raws = [raw('箱', 'prop', 1), raw('箱', 'prop', 2), raw('箱', 'location', 3)]
    const result = aggregateCandidates(raws, createEmptyStoryData())
    expect(result[0].typeGuess).toBe('prop')
  })
})
