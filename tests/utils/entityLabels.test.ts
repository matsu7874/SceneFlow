import { describe, it, expect } from 'vitest'
import { missingEntityLabel } from '../../src/utils/entityLabels'

describe('missingEntityLabel', () => {
  it('id<=0（未設定）は「〇〇未設定」を返す', () => {
    expect(missingEntityLabel('場所', 0)).toBe('場所未設定')
    expect(missingEntityLabel('人物', 0)).toBe('人物未設定')
  })
  it('正のid（参照先が存在しない）は「不明な〇〇（#id）」を返す', () => {
    expect(missingEntityLabel('人物', 7)).toBe('不明な人物（#7）')
    expect(missingEntityLabel('小道具', 12)).toBe('不明な小道具（#12）')
  })
})
