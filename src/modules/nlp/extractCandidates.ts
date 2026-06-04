// トークン列から名詞句を切り出し、直後の格助詞と動詞で型を推定する純関数。
// kuromoji に依存せず、トークン配列だけを入力に取るのでユニットテストしやすい。

import type { EntityTypeGuess, KuromojiToken, RawCandidate } from './types'
import {
  ACQUIRE_VERBS,
  COGNITION_VERBS,
  MOVEMENT_VERBS,
  PARTICLE_FALLBACK,
  SPEECH_VERBS,
} from './rules'

// 名詞句の先頭に立てる連体修飾語（赤い・古い・大きな 等）。
function isModifier(t: KuromojiToken): boolean {
  return (t.pos === '形容詞' && t.pos_detail_1 === '自立') || t.pos === '連体詞'
}

// 名詞句の核になれる名詞。代名詞・非自立・数詞・接尾辞などは候補にしない。
const EXCLUDED_NOUN_DETAILS = new Set(['非自立', '代名詞', '数', '接尾', '副詞可能'])
function isPlainNoun(t: KuromojiToken): boolean {
  return t.pos === '名詞' && !EXCLUDED_NOUN_DETAILS.has(t.pos_detail_1)
}

// 「移動」+「する」のようなサ変動詞の語幹は名詞ではなく動詞として扱う。
function isSahenVerbHead(tokens: KuromojiToken[], i: number): boolean {
  const t = tokens[i]
  const next = tokens[i + 1]
  return (
    t.pos === '名詞' &&
    t.pos_detail_1 === 'サ変接続' &&
    !!next &&
    next.pos === '動詞' &&
    next.basic_form === 'する'
  )
}

interface Governing {
  particle?: string // 名詞句直後の格助詞（を / に / へ / と / が / は）
  verbKey?: string // 支配する動詞の辞書形（サ変は「語幹+する」）
}

// 名詞句の末尾位置から、直後の格助詞と支配動詞を前方数トークンの範囲で探す。
function findGoverning(tokens: KuromojiToken[], lastNounIdx: number): Governing {
  let k = lastNounIdx + 1
  let particle: string | undefined
  if (k < tokens.length && tokens[k].pos === '助詞' && tokens[k].pos_detail_1 === '格助詞') {
    particle = tokens[k].surface_form
    k++
  }
  const limit = Math.min(tokens.length, k + 4)
  for (; k < limit; k++) {
    const t = tokens[k]
    if (isSahenVerbHead(tokens, k)) {
      return { particle, verbKey: t.surface_form + 'する' }
    }
    if (t.pos === '動詞' && t.pos_detail_1 === '自立') {
      return { particle, verbKey: t.basic_form }
    }
    // 別の名詞句や文末に達したら、これ以上は支配動詞ではないので打ち切る。
    if (t.pos === '名詞' || t.surface_form === '。') break
  }
  return { particle }
}

// 名詞句の核・格助詞・支配動詞から型を推定する。推定は初期値で、UI で変更できる。
function classify(headNoun: KuromojiToken, g: Governing): EntityTypeGuess {
  // 固有名詞-人名 は他の手がかりより優先して Person とみなす。
  if (headNoun.pos_detail_1 === '固有名詞' && headNoun.pos_detail_2 === '人名') {
    return 'person'
  }
  const { particle, verbKey } = g
  if (verbKey) {
    if (MOVEMENT_VERBS.has(verbKey) && (particle === 'に' || particle === 'へ')) return 'location'
    if (ACQUIRE_VERBS.has(verbKey) && particle === 'を') return 'prop'
    if (COGNITION_VERBS.has(verbKey)) return 'information'
    if (SPEECH_VERBS.has(verbKey)) return particle === 'と' ? 'person' : 'information'
    if (MOVEMENT_VERBS.has(verbKey)) return 'location'
    if (ACQUIRE_VERBS.has(verbKey)) return 'prop'
  }
  if (particle && PARTICLE_FALLBACK[particle]) return PARTICLE_FALLBACK[particle]
  // 手がかりがない素の名詞は、物である可能性が高いので Prop を既定にする。
  return 'prop'
}

function normalize(surface: string): string {
  return surface.trim()
}

/**
 * 1 つの Act 説明文のトークン列から、エンティティ候補（未集約）を抽出する。
 * @param tokens kuromoji でトークナイズした結果
 * @param actId 出現元の Act id
 */
export function extractCandidates(tokens: KuromojiToken[], actId: number): RawCandidate[] {
  const out: RawCandidate[] = []
  let i = 0
  while (i < tokens.length) {
    const start = i
    const mods: KuromojiToken[] = []
    while (i < tokens.length && isModifier(tokens[i])) {
      mods.push(tokens[i])
      i++
    }
    const nouns: KuromojiToken[] = []
    while (i < tokens.length && isPlainNoun(tokens[i]) && !isSahenVerbHead(tokens, i)) {
      nouns.push(tokens[i])
      i++
    }
    if (nouns.length === 0) {
      // 名詞句にならなかった（述語的な形容詞など）。1 トークン進めて再走査。
      i = start + 1
      continue
    }
    const surface = [...mods, ...nouns].map(t => t.surface_form).join('')
    const headNoun = nouns[nouns.length - 1]
    const governing = findGoverning(tokens, i - 1)
    out.push({
      surface,
      normalized: normalize(surface),
      typeGuess: classify(headNoun, governing),
      actId,
    })
  }
  return out
}
