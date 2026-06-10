import { describe, it, expect, vi } from 'vitest'
import { loadStoredStory, saveStoredStory } from '../../src/contexts/storyPersistence'
import type { StoryData } from '../../src/types/StoryData'

function makeStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    _store: store,
  }
}

const sample: StoryData = {
  persons: [{ id: 1, name: 'アリス', color: '#000' }],
  locations: [{ id: 1, name: '公園', connections: [] }],
  props: [],
  informations: [],
  initialStates: [],
  acts: [],
}

describe('loadStoredStory', () => {
  it('キーが無ければnullを返す', () => {
    expect(loadStoredStory(makeStorage())).toBeNull()
  })

  it('保存済みデータをパースして返す', () => {
    const storage = makeStorage()
    saveStoredStory(storage, sample)
    expect(loadStoredStory(storage)).toEqual(sample)
  })

  it('壊れたJSONでも例外を投げずnullを返す', () => {
    const storage = makeStorage({ 'sceneflow.storyData': '{壊れた' })
    expect(() => loadStoredStory(storage)).not.toThrow()
    expect(loadStoredStory(storage)).toBeNull()
  })
})

describe('saveStoredStory', () => {
  it('データをJSONで書き込む', () => {
    const storage = makeStorage()
    saveStoredStory(storage, sample)
    expect(JSON.parse(storage._store.get('sceneflow.storyData') as string)).toEqual(sample)
  })

  it('nullを渡すとキーを削除する', () => {
    const storage = makeStorage()
    saveStoredStory(storage, sample)
    saveStoredStory(storage, null)
    expect(storage._store.has('sceneflow.storyData')).toBe(false)
  })

  it('書き込み成功で true を返す', () => {
    expect(saveStoredStory(makeStorage(), sample)).toBe(true)
  })

  it('書き込み失敗（容量超過など）でも例外を投げず false を返す', () => {
    const storage = {
      getItem: () => null,
      setItem: vi.fn(() => {
        throw new Error('QuotaExceeded')
      }),
      removeItem: () => undefined,
    }
    expect(() => saveStoredStory(storage, sample)).not.toThrow()
    expect(saveStoredStory(storage, sample)).toBe(false)
  })
})
