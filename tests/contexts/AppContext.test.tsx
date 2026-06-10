import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { AppProvider, useAppContext } from '../../src/contexts/AppContext'
import { STORY_STORAGE_KEY } from '../../src/contexts/storyPersistence'
import { createEmptyStoryData, type StoryData } from '../../src/types/StoryData'

const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <AppProvider>{children}</AppProvider>
)

function makeStory(personName: string): StoryData {
  return {
    ...createEmptyStoryData(),
    persons: [{ id: 1, name: personName, color: '#000' }],
  }
}

describe('AppContext undo/redo', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORY_STORAGE_KEY)
  })

  it('初期状態では undo/redo できない', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper })
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('編集を取り消し、やり直せる', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper })
    const v1 = makeStory('アリス')
    const v2 = makeStory('ボブ')

    act(() => result.current.setStoryData(v1))
    act(() => result.current.setStoryData(v2))
    expect(result.current.storyData).toBe(v2)
    expect(result.current.canUndo).toBe(true)

    act(() => result.current.undo())
    expect(result.current.storyData).toBe(v1)
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.redo())
    expect(result.current.storyData).toBe(v2)
  })

  it('undo 後に新しい編集をすると redo 履歴はクリアされる', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper })
    const v1 = makeStory('アリス')
    const v2 = makeStory('ボブ')
    const v3 = makeStory('キャロル')

    act(() => result.current.setStoryData(v1))
    act(() => result.current.setStoryData(v2))
    act(() => result.current.undo())
    act(() => result.current.setStoryData(v3))

    expect(result.current.canRedo).toBe(false)
    expect(result.current.storyData).toBe(v3)
  })

  it('削除（null設定相当の編集）も取り消せる', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper })
    const v1 = makeStory('アリス')

    act(() => result.current.setStoryData(v1))
    act(() => result.current.setStoryData(null))
    expect(result.current.storyData).toBeNull()

    act(() => result.current.undo())
    expect(result.current.storyData).toBe(v1)
  })

  it('編集が localStorage に保存され saveState が saved になる', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper })
    const v1 = makeStory('アリス')

    act(() => result.current.setStoryData(v1))
    expect(result.current.saveState).toBe('saved')
    const stored = window.localStorage.getItem(STORY_STORAGE_KEY)
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored as string).persons[0].name).toBe('アリス')
  })
})
