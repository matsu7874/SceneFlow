import { describe, it, expect } from 'vitest'
import {
  nextId,
  timeStringToMinutes,
  minutesToTimeString,
  appendPerson,
  appendLocation,
  appendAct,
  applyActPatch,
  removeAct,
  sortActs,
} from '../../src/components/QuickLog/quickLogLogic'
import type { StoryData, Act } from '../../src/types/StoryData'

function emptyStory(): StoryData {
  return { persons: [], locations: [], props: [], informations: [], initialStates: [], acts: [] }
}

function act(partial: Partial<Act> & { id: number }): Act {
  return { personId: 1, locationId: 1, time: '00:00', description: '', startTime: 0, ...partial }
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
  it('初期座標(x, y)を割り当てる（空間ビューに即時反映するため）', () => {
    const { data } = appendLocation(emptyStory(), '広場')
    expect(typeof data.locations[0].x).toBe('number')
    expect(typeof data.locations[0].y).toBe('number')
  })
  it('複数の場所には重ならない座標を割り当てる', () => {
    const first = appendLocation(emptyStory(), 'A')
    const second = appendLocation(first.data, 'B')
    const a = first.data.locations[0]
    const b = second.data.locations[1]
    expect(a.x === b.x && a.y === b.y).toBe(false)
  })
})

describe('appendAct', () => {
  it('startTimeから時刻文字列を同期して追加する', () => {
    const { data, id } = appendAct(emptyStory(), {
      personId: 1,
      locationId: 2,
      description: '到着した',
      startTime: 570,
    })
    expect(id).toBe(1)
    expect(data.acts[0]).toMatchObject({
      id: 1,
      personId: 1,
      locationId: 2,
      description: '到着した',
      startTime: 570,
      time: '09:30',
    })
  })
  it('初期位置が未設定の人物にはその場所の初期状態を追加する', () => {
    const { data } = appendAct(emptyStory(), {
      personId: 1,
      locationId: 2,
      description: '到着した',
      startTime: 570,
    })
    expect(data.initialStates).toContainEqual({ personId: 1, locationId: 2, time: '00:00' })
  })
  it('既に初期位置がある人物には初期状態を追加しない', () => {
    const base: StoryData = {
      ...emptyStory(),
      initialStates: [{ personId: 1, locationId: 5, time: '00:00' }],
    }
    const { data } = appendAct(base, {
      personId: 1,
      locationId: 2,
      description: '移動した',
      startTime: 570,
    })
    expect(data.initialStates).toHaveLength(1)
    expect(data.initialStates[0]).toMatchObject({ personId: 1, locationId: 5 })
  })
})

describe('applyActPatch', () => {
  it('指定idのActだけを部分更新する', () => {
    const base = appendAct(emptyStory(), {
      personId: 1,
      locationId: 1,
      description: 'a',
      startTime: 0,
    }).data
    const data = applyActPatch(base, 1, { description: 'b', propId: 3 })
    expect(data.acts[0]).toMatchObject({ description: 'b', propId: 3 })
  })
  it('startTimeを変更するとtimeも同期される', () => {
    const base = appendAct(emptyStory(), {
      personId: 1,
      locationId: 1,
      description: 'a',
      startTime: 0,
    }).data
    const data = applyActPatch(base, 1, { startTime: 600 })
    expect(data.acts[0]).toMatchObject({ startTime: 600, time: '10:00' })
  })
})

describe('removeAct', () => {
  it('指定idのActを削除する', () => {
    const base = appendAct(emptyStory(), {
      personId: 1,
      locationId: 1,
      description: 'a',
      startTime: 0,
    }).data
    expect(removeAct(base, 1).acts).toHaveLength(0)
  })
})

describe('sortActs', () => {
  it('startTime昇順に並べる', () => {
    const sorted = sortActs([act({ id: 1, startTime: 30 }), act({ id: 2, startTime: 10 })])
    expect(sorted.map(a => a.id)).toEqual([2, 1])
  })
  it('startTimeが同じ場合はid昇順を維持する', () => {
    const sorted = sortActs([act({ id: 2, startTime: 0 }), act({ id: 1, startTime: 0 })])
    expect(sorted.map(a => a.id)).toEqual([1, 2])
  })
  it('startTimeが未設定ならtime文字列を時刻として並べる', () => {
    const sorted = sortActs([
      act({ id: 1, startTime: undefined, time: '00:10' }),
      act({ id: 2, startTime: undefined, time: '00:00' }),
    ])
    expect(sorted.map(a => a.id)).toEqual([2, 1])
  })
  it('startTime付きとtimeのみのActが混在しても時刻順に並べる', () => {
    const sorted = sortActs([
      act({ id: 1, startTime: undefined, time: '00:10' }),
      act({ id: 2, startTime: 0, time: '00:00' }),
      act({ id: 3, startTime: undefined, time: '00:05' }),
    ])
    expect(sorted.map(a => a.id)).toEqual([2, 3, 1])
  })
})
