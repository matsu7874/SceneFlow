import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { KuromojiToken } from '../../src/modules/nlp/types'

// tokenizer は実辞書ロードを避けてモックする。「赤いバンダナを拾った」の実トークン構造を再現。
const bandanaTokens: KuromojiToken[] = [
  {
    surface_form: '赤い',
    pos: '形容詞',
    pos_detail_1: '自立',
    pos_detail_2: '*',
    basic_form: '赤い',
  },
  {
    surface_form: 'バンダナ',
    pos: '名詞',
    pos_detail_1: '一般',
    pos_detail_2: '*',
    basic_form: '*',
  },
  {
    surface_form: 'を',
    pos: '助詞',
    pos_detail_1: '格助詞',
    pos_detail_2: '一般',
    basic_form: 'を',
  },
  {
    surface_form: '拾っ',
    pos: '動詞',
    pos_detail_1: '自立',
    pos_detail_2: '*',
    basic_form: '拾う',
  },
  { surface_form: 'た', pos: '助動詞', pos_detail_1: '*', pos_detail_2: '*', basic_form: 'た' },
]

// 実 API（KuromojiTokenizer#tokenize）は同期関数なのでモックも同期にする。
const tokenizeMock = vi.fn((_text?: string) => bandanaTokens)
vi.mock('@matsu7874/kuromoji-web', () => ({
  loadTokenizer: async () => ({ tokenize: (text: string) => tokenizeMock(text) }),
}))

import { ExtractionPanel } from '../../src/components/EntityExtraction/ExtractionPanel'
import { createEmptyStoryData, type StoryData } from '../../src/types/StoryData'

const storyWithAct = (): StoryData => ({
  ...createEmptyStoryData(),
  acts: [{ id: 1, personId: 1, locationId: 1, time: '00:00', description: '赤いバンダナを拾った' }],
})

describe('ExtractionPanel', () => {
  beforeEach(() => {
    tokenizeMock.mockClear()
  })

  it('抽出ボタンで候補を提示し、新規エンティティ化で storyData を更新する', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn()
    render(<ExtractionPanel storyData={storyWithAct()} onCommit={onCommit} />)

    await user.click(screen.getByText(/候補抽出/))
    await user.click(screen.getByRole('button', { name: 'Actから候補を抽出' }))

    await waitFor(() => expect(screen.getByText('赤いバンダナ')).toBeInTheDocument())
    // 小道具グループに分類されている。
    expect(screen.getByText(/小道具 \(1\)/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '新規エンティティ化' }))

    expect(onCommit).toHaveBeenCalledTimes(1)
    const next = onCommit.mock.calls[0][0] as StoryData
    expect(next.props).toHaveLength(1)
    expect(next.props[0].name).toBe('赤いバンダナ')
    // 出現 Act の propId に紐付く。
    expect(next.acts[0].propId).toBe(next.props[0].id)
  })

  it('型ドロップダウンで確定前に型を付け替えられる', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn()
    render(<ExtractionPanel storyData={storyWithAct()} onCommit={onCommit} />)

    await user.click(screen.getByText(/候補抽出/))
    await user.click(screen.getByRole('button', { name: 'Actから候補を抽出' }))
    await waitFor(() => expect(screen.getByText('赤いバンダナ')).toBeInTheDocument())

    // prop → location に付け替えてから確定する。
    await user.selectOptions(screen.getByLabelText('赤いバンダナ の型'), 'location')
    await user.click(screen.getByRole('button', { name: '新規エンティティ化' }))

    const next = onCommit.mock.calls[0][0] as StoryData
    expect(next.locations).toHaveLength(1)
    expect(next.props).toHaveLength(0)
    expect(next.acts[0].locationId).toBe(next.locations[0].id)
  })
})
