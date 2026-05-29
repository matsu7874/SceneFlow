import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ValidationReporter } from '../../src/components/ValidationReporter/ValidationReporter'
import type { StoryData } from '../../src/types/StoryData'

vi.mock('../../src/contexts/VisualFeedbackContext', () => ({
  useVisualFeedback: vi.fn(() => ({ showNotification: vi.fn(), showError: vi.fn() })),
}))

const base: StoryData = {
  persons: [
    { id: 1, name: '太郎', color: '#000' },
    { id: 2, name: '花子', color: '#111' },
  ],
  locations: [
    { id: 10, name: '広場', connections: [11] },
    { id: 11, name: '図書館', connections: [10] },
  ],
  props: [],
  informations: [],
  initialStates: [{ personId: 1, locationId: 10, time: '00:00' }],
  acts: [],
}

describe('ValidationReporter（整合性レポート）', () => {
  it('破綻が無ければ「破綻なし」を表示', () => {
    render(<ValidationReporter storyData={base} />)
    expect(screen.getByText(/破綻は見つかりません/)).toBeInTheDocument()
  })
  it('破綻があればメッセージを表示する', () => {
    const data: StoryData = {
      ...base,
      acts: [
        {
          id: 1,
          personId: 1,
          locationId: 11,
          time: '00:10',
          startTime: 10,
          description: '本を読む',
        },
      ],
    }
    render(<ValidationReporter storyData={data} />)
    expect(screen.getByText(/いないため/)).toBeInTheDocument()
  })
})
