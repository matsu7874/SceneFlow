import { describe, it, expect } from 'vitest'
import {
  nextId,
  timeStringToMinutes,
  minutesToTimeString,
} from '../../src/components/QuickLog/quickLogLogic'

describe('nextId', () => {
  it('空配列なら1を返す', () => {
    expect(nextId([])).toBe(1)
  })
  it('既存idの最大+1を返す', () => {
    expect(nextId([{ id: 1 }, { id: 4 }, { id: 2 }])).toBe(5)
  })
})

describe('timeStringToMinutes', () => {
  it('HH:MMを分に変換する', () => {
    expect(timeStringToMinutes('09:30')).toBe(570)
    expect(timeStringToMinutes('00:00')).toBe(0)
  })
  it('不正な文字列はnullを返す', () => {
    expect(timeStringToMinutes('')).toBeNull()
    expect(timeStringToMinutes('あいう')).toBeNull()
    expect(timeStringToMinutes('25:99')).toBeNull()
  })
})

describe('minutesToTimeString', () => {
  it('分をHH:MMに変換する', () => {
    expect(minutesToTimeString(570)).toBe('09:30')
    expect(minutesToTimeString(0)).toBe('00:00')
    expect(minutesToTimeString(605)).toBe('10:05')
  })
})
