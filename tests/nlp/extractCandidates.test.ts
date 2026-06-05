import { describe, it, expect } from 'vitest'
import { extractCandidates } from '../../src/modules/nlp/extractCandidates'
import type { KuromojiToken } from '../../src/modules/nlp/types'

// kuromoji の実トークンから必要なフィールドだけを組み立てるヘルパー。
// 実トークン構造（pos / pos_detail_1 / pos_detail_2 / basic_form）は token ダンプで確認済み。
const t = (surface: string, pos: string, d1 = '*', d2 = '*', basic = surface): KuromojiToken => ({
  surface_form: surface,
  pos,
  pos_detail_1: d1,
  pos_detail_2: d2,
  basic_form: basic,
})

const types = (tokens: KuromojiToken[]) =>
  extractCandidates(tokens, 1).map(c => ({ surface: c.surface, typeGuess: c.typeGuess }))

describe('extractCandidates', () => {
  it('「赤いバンダナを拾った」→ 赤いバンダナ (prop)', () => {
    const tokens = [
      t('赤い', '形容詞', '自立', '*', '赤い'),
      t('バンダナ', '名詞', '一般'),
      t('を', '助詞', '格助詞', '一般', 'を'),
      t('拾っ', '動詞', '自立', '*', '拾う'),
      t('た', '助動詞', '*', '*', 'た'),
    ]
    expect(types(tokens)).toEqual([{ surface: '赤いバンダナ', typeGuess: 'prop' }])
  })

  it('「古い鍵を見つけた」→ 古い鍵 (prop)', () => {
    const tokens = [
      t('古い', '形容詞', '自立', '*', '古い'),
      t('鍵', '名詞', '一般'),
      t('を', '助詞', '格助詞', '一般', 'を'),
      t('見つけ', '動詞', '自立', '*', '見つける'),
      t('た', '助動詞', '*', '*', 'た'),
    ]
    expect(types(tokens)).toEqual([{ surface: '古い鍵', typeGuess: 'prop' }])
  })

  it('「協会に移動した」→ 協会 (location)。サ変動詞「移動する」を認識する', () => {
    const tokens = [
      t('協会', '名詞', '一般'),
      t('に', '助詞', '格助詞', '一般', 'に'),
      t('移動', '名詞', 'サ変接続'),
      t('し', '動詞', '自立', '*', 'する'),
      t('た', '助動詞', '*', '*', 'た'),
    ]
    // サ変語幹「移動」自体は候補にせず、協会だけを location として抽出する。
    expect(types(tokens)).toEqual([{ surface: '協会', typeGuess: 'location' }])
  })

  it('連体詞「大きな箱」を名詞句としてまとめる (prop)', () => {
    const tokens = [
      t('大きな', '連体詞'),
      t('箱', '名詞', '一般'),
      t('を', '助詞', '格助詞', '一般', 'を'),
      t('開け', '動詞', '自立', '*', '開ける'),
      t('た', '助動詞', '*', '*', 'た'),
    ]
    expect(types(tokens)).toEqual([{ surface: '大きな箱', typeGuess: 'prop' }])
  })

  it('固有名詞-人名は格助詞に関わらず person', () => {
    const tokens = [
      t('アリス', '名詞', '固有名詞', '人名'),
      t('と', '助詞', '格助詞', '引用', 'と'),
      t('話し', '動詞', '自立', '*', '話す'),
      t('た', '助動詞', '*', '*', 'た'),
    ]
    expect(types(tokens)).toEqual([{ surface: 'アリス', typeGuess: 'person' }])
  })

  it('未知動詞でも格助詞でフォールバックする（を→prop, に→location）', () => {
    const wo = [
      t('石', '名詞', '一般'),
      t('を', '助詞', '格助詞', '一般', 'を'),
      t('なめ', '動詞', '自立', '*', 'なめる'),
      t('た', '助動詞', '*', '*', 'た'),
    ]
    expect(types(wo)).toEqual([{ surface: '石', typeGuess: 'prop' }])

    const ni = [
      t('公園', '名詞', '一般'),
      t('に', '助詞', '格助詞', '一般', 'に'),
      t('集合', '名詞', 'サ変接続'),
      t('し', '動詞', '自立', '*', 'する'),
      t('た', '助動詞', '*', '*', 'た'),
    ]
    expect(types(ni)).toEqual([{ surface: '公園', typeGuess: 'location' }])
  })

  it('1 文から複数候補を抽出する', () => {
    const tokens = [
      t('古い', '形容詞', '自立', '*', '古い'),
      t('鍵', '名詞', '一般'),
      t('を', '助詞', '格助詞', '一般', 'を'),
      t('持っ', '動詞', '自立', '*', '持つ'),
      t('て', '助詞', '接続助詞', '*', 'て'),
      t('部屋', '名詞', '一般'),
      t('へ', '助詞', '格助詞', '一般', 'へ'),
      t('向かっ', '動詞', '自立', '*', '向かう'),
      t('た', '助動詞', '*', '*', 'た'),
    ]
    expect(types(tokens)).toEqual([
      { surface: '古い鍵', typeGuess: 'prop' },
      { surface: '部屋', typeGuess: 'location' },
    ])
  })

  it('述語的な形容詞だけの文では候補を出さない', () => {
    const tokens = [
      t('とても', '副詞', '助詞類接続'),
      t('嬉しい', '形容詞', '自立', '*', '嬉しい'),
      t('た', '助動詞', '*', '*', 'た'),
    ]
    expect(types(tokens)).toEqual([])
  })

  it('空のトークン列では空配列を返す', () => {
    expect(extractCandidates([], 1)).toEqual([])
  })
})
