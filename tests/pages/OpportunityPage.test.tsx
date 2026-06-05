import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { OpportunityPage } from '../../src/pages/OpportunityPage'
import type { StoryData } from '../../src/types/StoryData'

// AppContext を差し替えてサンプル相当のデータを注入する。
let mockStory: StoryData | null = null
vi.mock('../../src/contexts/AppContext', () => ({
  useAppContext: () => ({ storyData: mockStory }),
}))

const story: StoryData = {
  persons: [
    { id: 1, name: 'レオ', color: '#6366f1' },
    { id: 2, name: 'ユーリ', color: '#22c55e' },
    { id: 3, name: 'クラウス', color: '#a855f7' },
  ],
  locations: [
    { id: 10, name: '広間', connections: [11] },
    { id: 11, name: '書斎', connections: [10] },
  ],
  props: [{ id: 100, name: '燭台', currentLocation: '10', isPortable: true }],
  informations: [{ id: 200, content: '出生の秘密' }],
  initialStates: [
    { personId: 1, locationId: 10, time: '00:00' },
    { personId: 2, locationId: 10, time: '00:00' },
    { personId: 3, locationId: 11, time: '00:00' },
  ],
  acts: [
    {
      id: 1,
      personId: 1,
      locationId: 10,
      time: '21:00',
      startTime: 1260,
      type: 'LEARN',
      informationId: 200,
      description: '秘密を知る',
    },
  ],
}

describe('OpportunityPage（容疑者・機会）', () => {
  it('データ未読み込みなら空状態を表示', () => {
    mockStory = null
    render(<OpportunityPage />)
    expect(screen.getByText(/データが読み込まれていません/)).toBeInTheDocument()
  })

  it('場所×時刻で現場の在席者を表示する', () => {
    mockStory = story
    render(<OpportunityPage />)
    // 既定で先頭の場所（広間）・最終時刻。広間には初期配置のレオとユーリが居る。
    expect(screen.getByText('容疑者・機会')).toBeInTheDocument()
    expect(screen.getByText('現場に居た（容疑者）')).toBeInTheDocument()
    expect(screen.getByText('レオ')).toBeInTheDocument()
    expect(screen.getByText('ユーリ')).toBeInTheDocument()
  })

  it('情報タブで知り得た人物を表示する', () => {
    mockStory = story
    render(<OpportunityPage />)
    fireEvent.click(screen.getByRole('tab', { name: '情報・秘密' }))
    expect(screen.getByText('知り得た人物（初出時刻順）')).toBeInTheDocument()
    // レオが LEARN しているので少なくとも本人は知り得た人物に出る
    expect(screen.getByText('レオ')).toBeInTheDocument()
  })

  it('道具タブで触れ得た人物を表示する', () => {
    mockStory = story
    render(<OpportunityPage />)
    fireEvent.click(screen.getByRole('tab', { name: '凶器・道具' }))
    expect(screen.getByText('触れ得た人物（全期間）')).toBeInTheDocument()
  })
})
