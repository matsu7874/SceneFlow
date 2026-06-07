import { describe, it, expect } from 'vitest'
import { analyzeStory } from '../../../src/modules/consistency/checker'
import { validateStoryData } from '../../../src/utils/validation'
import type { StoryData } from '../../../src/types/StoryData'
import mansionMystery from '../../../src/data/sample-mansion-mystery.json'

// 機能テスト用リファレンス・ストーリー「嵐の洋館ミステリ」の品質保証。
// 設計方針: 物理因果（位置・移動・所持・状態）は完全整合（破綻ゼロ）。
// 矛盾は情報層のみ（犯人の嘘・目撃者の誤認）に意図的に配置し、ちょうど4件 truth-conflict を発火させる。
describe('sample-mansion-mystery（リファレンス・ストーリー）', () => {
  const report = analyzeStory(mansionMystery as unknown as StoryData)

  it('UIロードの検証（validateStoryData）を通過する', () => {
    const result = validateStoryData(mansionMystery as unknown as StoryData)
    expect(result.errors).toEqual([])
    expect(result.isValid).toBe(true)
  })

  it('物理整合は完全：検証破綻がゼロ件', () => {
    expect(report.breakages).toEqual([])
  })

  it('情報矛盾はちょうど4件、すべて truth-conflict', () => {
    expect(report.contradictions).toHaveLength(4)
    expect(report.contradictions.every(c => c.kind === 'truth-conflict')).toBe(true)
  })

  it('4矛盾は 透の居場所 / 怜子の居場所 / 凶器の所在 / 死亡時刻 を被覆する', () => {
    const slots = report.contradictions.map(c => `${c.subject}|${c.aspect}`).sort()
    expect(slots).toEqual(
      ['1|死亡時刻', '101|凶器の所在', '2|22:30の居場所', '3|22:30の居場所'].sort(),
    )
  })
})
