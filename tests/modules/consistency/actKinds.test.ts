import { describe, it, expect } from 'vitest'
import { ACT_KINDS, getActKind } from '../../../src/modules/consistency/actKinds'

describe('ACT_KINDS', () => {
  it('その他(空)を含み先頭にある', () => {
    expect(ACT_KINDS[0]).toEqual({ value: '', label: 'その他' })
  })
  it('主要な種類を持つ', () => {
    const values = ACT_KINDS.map(k => k.value)
    expect(values).toEqual([
      '',
      'MOVE',
      'TAKE',
      'GIVE',
      'DROP',
      'USE',
      'LEARN',
      'SPEAK',
      'ATTACK',
      'INCAPACITATE',
      'KILL',
      'WAKE',
    ])
  })
})

describe('getActKind', () => {
  it('大文字小文字を無視して既知種別を返す', () => {
    expect(getActKind({ type: 'move' })).toBe('MOVE')
    expect(getActKind({ type: 'GIVE' })).toBe('GIVE')
  })
  it('未設定・語彙外は空(その他)', () => {
    expect(getActKind({})).toBe('')
    expect(getActKind({ type: '殴る' })).toBe('')
  })
})
