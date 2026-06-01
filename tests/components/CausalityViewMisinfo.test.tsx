import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { CausalityView } from '../../src/components/CausalityView/CausalityView'
import type { StoryData } from '../../src/types/StoryData'

// 次郎(3)が真実(黒)を観察した後、太郎(1)が嘘(茶)を吹き込み矛盾が発覚するシナリオ。
const data: StoryData = {
  persons: [
    { id: 1, name: '太郎', color: '#000' },
    { id: 2, name: '花子', color: '#111' },
    { id: 3, name: '次郎', color: '#222' },
    { id: 4, name: '容疑者', color: '#333' },
  ],
  locations: [{ id: 10, name: '広場', connections: [] }],
  props: [],
  informations: [
    { id: 601, content: '髪は黒', subject: 4, aspect: '髪色', value: '黒', truth: true },
    { id: 602, content: '髪は茶', subject: 4, aspect: '髪色', value: '茶', misinfoType: 'lie' },
  ],
  initialStates: [
    { personId: 1, locationId: 10, time: '00:00' },
    { personId: 3, locationId: 10, time: '00:00' },
  ],
  acts: [
    {
      id: 1,
      personId: 3,
      locationId: 10,
      time: '00:01',
      startTime: 1,
      description: '次郎が真実を見る',
      type: 'LEARN',
      informationId: 601,
    },
    {
      id: 2,
      personId: 1,
      locationId: 10,
      time: '00:02',
      startTime: 2,
      description: '太郎が嘘を仕入れる',
      type: 'LEARN',
      informationId: 602,
    },
    {
      id: 3,
      personId: 1,
      locationId: 10,
      time: '00:03',
      startTime: 3,
      description: '太郎が次郎に嘘を吹き込む',
      type: 'SPEAK',
      informationId: 602,
      interactedPersonId: 3,
    },
  ],
}

describe('CausalityView 誤情報・矛盾の可視化', () => {
  it('誤情報を伝える act ノードに data-misinfo を付与する（嘘）', () => {
    render(<CausalityView storyData={data} />)
    expect(screen.getByTestId('node-act-2')).toHaveAttribute('data-misinfo', 'lie')
    expect(screen.getByTestId('node-act-3')).toHaveAttribute('data-misinfo', 'lie')
  })

  it('真実を伝える act ノードには data-misinfo を付けない', () => {
    render(<CausalityView storyData={data} />)
    expect(screen.getByTestId('node-act-1')).toHaveAttribute('data-misinfo', 'none')
  })

  it('矛盾発覚 act ノードに data-contradiction=true を付与する', () => {
    render(<CausalityView storyData={data} />)
    expect(screen.getByTestId('node-act-3')).toHaveAttribute('data-contradiction', 'true')
    expect(screen.getByTestId('node-act-1')).toHaveAttribute('data-contradiction', 'false')
  })

  it('矛盾ノードをクリックすると詳細パネルに観点と両方の値が表示される', async () => {
    const user = userEvent.setup()
    render(<CausalityView storyData={data} />)
    await user.click(screen.getByTestId('node-act-3'))
    const panel = screen.getByTestId('contradiction-panel')
    expect(panel).toHaveTextContent('髪色')
    expect(panel).toHaveTextContent('黒')
    expect(panel).toHaveTextContent('茶')
  })

  it('矛盾ノードを選択すると2つの流れが data-flow で色分けされる', async () => {
    const user = userEvent.setup()
    render(<CausalityView storyData={data} />)
    await user.click(screen.getByTestId('node-act-3'))
    // 既存の言明（真実・次郎の観察 act1）の流れ
    expect(screen.getByTestId('node-act-1')).toHaveAttribute('data-flow', 'existing')
    // 後から来た言明（嘘・太郎の伝播 act2→act3）の流れ
    expect(screen.getByTestId('node-act-2')).toHaveAttribute('data-flow', 'incoming')
  })

  it('凡例を表示する', () => {
    render(<CausalityView storyData={data} />)
    const legend = screen.getByTestId('causality-legend')
    expect(legend).toHaveTextContent('真実')
    expect(legend).toHaveTextContent('誤情報')
    expect(legend).toHaveTextContent('矛盾発覚点')
  })

  it('誤情報(嘘)ノードは赤いビックリマーク(❗)で示す', () => {
    render(<CausalityView storyData={data} />)
    const node = screen.getByTestId('node-act-2')
    expect(node).toHaveTextContent('❗')
    expect(node).not.toHaveTextContent('🚫')
  })

  it('凡例のアイコンがノードと一致する（嘘=❗・矛盾=⚡）', () => {
    render(<CausalityView storyData={data} />)
    const legend = screen.getByTestId('causality-legend')
    expect(legend).toHaveTextContent('❗')
    expect(legend).toHaveTextContent('⚡')
  })
})
