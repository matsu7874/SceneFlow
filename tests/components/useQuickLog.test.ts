import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { StoryData } from '../../src/types/StoryData'

const { ctx } = vi.hoisted(() => ({
  ctx: {
    storyData: null as StoryData | null,
    setStoryData: vi.fn((data: StoryData | null) => {
      ctx.storyData = data
    }),
  },
}))

vi.mock('../../src/contexts/AppContext', () => ({
  useAppContext: () => ctx,
}))

import { useQuickLog } from '../../src/components/QuickLog/useQuickLog'

beforeEach(() => {
  ctx.storyData = null
  ctx.setStoryData.mockClear()
})

describe('useQuickLog ゼロからの入力', () => {
  it('データ未読み込みでも空の物語データを土台に表示できる', () => {
    const { result } = renderHook(() => useQuickLog())

    expect(result.current.storyData).toEqual({
      persons: [],
      locations: [],
      props: [],
      informations: [],
      initialStates: [],
      acts: [],
    })
    expect(result.current.sortedActs).toEqual([])
  })

  it('データ未読み込みから人物・場所・イベントを追加できる', () => {
    // setStoryData は AppContext の再レンダーを引き起こすため、テストでは rerender で同等の挙動を再現する
    const { result, rerender } = renderHook(() => useQuickLog())

    let personId: number | null = null
    act(() => {
      personId = result.current.createPerson('太郎')
    })
    expect(personId).toBe(1)
    expect(ctx.setStoryData).toHaveBeenLastCalledWith(
      expect.objectContaining({ persons: [expect.objectContaining({ id: 1, name: '太郎' })] }),
    )
    rerender()

    let locationId: number | null = null
    act(() => {
      locationId = result.current.createLocation('広場')
    })
    expect(locationId).toBe(1)
    rerender()

    let actId: number | null = null
    act(() => {
      actId = result.current.addAct({
        personId: 1,
        locationId: 1,
        description: '到着した',
        startTime: 540,
      })
    })
    expect(actId).toBe(1)

    // 人物・場所・イベントがすべて保持されている（後の入力で前の入力が消えない）
    expect(ctx.storyData).not.toBeNull()
    expect(ctx.storyData?.persons).toHaveLength(1)
    expect(ctx.storyData?.locations).toHaveLength(1)
    expect(ctx.storyData?.acts).toHaveLength(1)
    expect(ctx.storyData?.acts[0]).toMatchObject({
      id: 1,
      personId: 1,
      locationId: 1,
      description: '到着した',
      time: '09:00',
    })
  })
})
