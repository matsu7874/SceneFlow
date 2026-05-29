import { describe, it, expect } from 'vitest'
import {
  nextId,
  timeStringToMinutes,
  minutesToTimeString,
  appendPerson,
  appendLocation,
} from '../../src/components/QuickLog/quickLogLogic'
import type { StoryData } from '../../src/types/StoryData'

function emptyStory(): StoryData {
  return { persons: [], locations: [], props: [], informations: [], initialStates: [], acts: [] }
}

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

describe('appendPerson', () => {
  it('新規人物を追加しidと色を割り当てる', () => {
    const { data, id } = appendPerson(emptyStory(), '太郎')
    expect(id).toBe(1)
    expect(data.persons).toHaveLength(1)
    expect(data.persons[0]).toMatchObject({ id: 1, name: '太郎' })
    expect(data.persons[0].color).toMatch(/^#/)
  })
  it('元データを変更しない（不変）', () => {
    const story = emptyStory()
    appendPerson(story, '太郎')
    expect(story.persons).toHaveLength(0)
  })
})

describe('appendLocation', () => {
  it('新規場所を追加し空connectionsを持つ', () => {
    const { data, id } = appendLocation(emptyStory(), '広場')
    expect(id).toBe(1)
    expect(data.locations[0]).toMatchObject({ id: 1, name: '広場', connections: [] })
  })
})
