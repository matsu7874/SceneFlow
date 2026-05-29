import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { CausalityView } from '../../src/components/CausalityView/CausalityView'
import type { StoryData } from '../../src/types/StoryData'

const data: StoryData = {
  persons: [
    { id: 1, name: '太郎', color: '#000' },
    { id: 2, name: '花子', color: '#111' },
  ],
  locations: [
    { id: 10, name: '広場', connections: [11] },
    { id: 11, name: '図書館', connections: [10] },
  ],
  props: [{ id: 100, name: '鍵', currentLocation: '11' }],
  informations: [],
  initialStates: [
    { personId: 1, locationId: 10, time: '00:00' },
    { personId: 2, locationId: 10, time: '00:00' },
  ],
  acts: [
    {
      id: 1,
      personId: 1,
      locationId: 10,
      time: '00:10',
      startTime: 10,
      description: '鍵を渡す',
      type: 'GIVE',
      propId: 100,
      interactedPersonId: 2,
    },
  ],
}

describe('CausalityView（来歴グラフ）', () => {
  it('各Actのノードを描画する', () => {
    render(<CausalityView storyData={data} />)
    expect(screen.getByTestId('node-act-1')).toBeInTheDocument()
  })
  it('破綻ノードを data-breakage=true で示す', () => {
    render(<CausalityView storyData={data} />)
    expect(screen.getByTestId('node-act-1')).toHaveAttribute('data-breakage', 'true')
  })
  it('破綻なしの初期シードノードは data-breakage=false', () => {
    render(<CausalityView storyData={data} />)
    expect(screen.getByTestId('node-initial-1')).toHaveAttribute('data-breakage', 'false')
  })
  it('ノードをクリックすると選択状態になる', async () => {
    const user = userEvent.setup()
    render(<CausalityView storyData={data} />)
    await user.click(screen.getByTestId('node-act-1'))
    expect(screen.getByTestId('node-act-1')).toHaveAttribute('data-selected', 'true')
  })
})
