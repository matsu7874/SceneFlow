// 型推定で使う語彙・マッピングをデータとして外出しする。
// 新しい動詞を増やしたいときはここに追記すれば抽出に反映される。

import type { EntityTypeGuess } from './types'

// 「を」格の対象を取得・操作する動詞 → 対象は Prop。
// kuromoji の basic_form（辞書形）で照合する。
export const ACQUIRE_VERBS = new Set<string>([
  '拾う',
  '見つける',
  '取る',
  '手に入れる',
  '使う',
  '渡す',
  '受け取る',
  '持つ',
  '置く',
  '開ける',
  '閉める',
  '投げる',
  '落とす',
  '作る',
  '壊す',
  '食べる',
  '飲む',
  '読む',
  '隠す',
  '探す',
])

// 「に / へ」格の到達点となる移動系動詞 → 対象は Location。
// サ変動詞（移動する 等）は「名詞サ変接続 + する」を結合した形で照合する。
export const MOVEMENT_VERBS = new Set<string>([
  '移動する',
  '向かう',
  '行く',
  '来る',
  '着く',
  '到着する',
  '戻る',
  '帰る',
  '入る',
  '出る',
  '進む',
  '訪れる',
])

// 発話・認識系動詞。引用「と」や「を知る」と組み合わさると Information の手がかりになる。
export const COGNITION_VERBS = new Set<string>(['知る', '聞く', '理解する', '覚える', '気づく'])

export const SPEECH_VERBS = new Set<string>(['言う', '話す', '伝える', '告げる', '叫ぶ', '教える'])

// 格助詞ごとの、動詞が辞書に当たらなかったときのフォールバック型。
// 「を」は物、「に/へ」は場所、「と」「が/は」は人物、を素朴な既定値とする。
export const PARTICLE_FALLBACK: Record<string, EntityTypeGuess> = {
  を: 'prop',
  に: 'location',
  へ: 'location',
  と: 'person',
  が: 'person',
  は: 'person',
}
