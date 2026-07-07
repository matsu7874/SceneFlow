// 実 kuromoji 辞書を読み込んで tokenize → extractCandidates まで通す統合テスト。
// 手組みトークン（extractCandidates.test.ts）が前提にしている品詞・格助詞の構造が
// 実際の解析結果と一致していることを保証する回帰テスト。

import { describe, it, expect, beforeAll } from 'vitest'
import { loadTokenizer } from '@matsu7874/kuromoji-web'
import { extractCandidates } from '../../src/modules/nlp/extractCandidates'
import type { KuromojiToken } from '../../src/modules/nlp/types'

// Node テストではファイルシステム上の辞書を読む。
const NODE_DIC_PATH = 'node_modules/kuromoji/dict'

let tokenize: (text: string) => KuromojiToken[]

beforeAll(async () => {
  const tokenizer = await loadTokenizer(NODE_DIC_PATH)
  tokenize = (text: string) => tokenizer.tokenize(text)
}, 30000)

const firstTypes = (text: string) =>
  extractCandidates(tokenize(text), 1).map(c => ({ surface: c.surface, typeGuess: c.typeGuess }))

describe('tokenizer + extractCandidates 統合', () => {
  it('「赤いバンダナを拾った」→ 赤いバンダナ (prop)', () => {
    expect(firstTypes('赤いバンダナを拾った')).toEqual([
      { surface: '赤いバンダナ', typeGuess: 'prop' },
    ])
  })

  it('「古い鍵を見つけた」→ 古い鍵 (prop)', () => {
    expect(firstTypes('古い鍵を見つけた')).toEqual([{ surface: '古い鍵', typeGuess: 'prop' }])
  })

  it('「協会に移動した」→ 協会 (location)', () => {
    expect(firstTypes('協会に移動した')).toEqual([{ surface: '協会', typeGuess: 'location' }])
  })
})
