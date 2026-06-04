// Act 説明文からエンティティ候補を抽出するための共通型。
// 形態素解析（kuromoji）→ 抽出 → 集約 → 名寄せ の各段で共有する。

export type EntityTypeGuess = 'person' | 'location' | 'prop' | 'information'

// kuromoji の IpadicFeatures が持つフィールドのうち、抽出に必要な部分集合。
// 実 kuromoji のトークン（追加フィールドを持つ）も構造的に代入可能で、
// テストでは必要なフィールドだけを組み立てて使える。
export interface KuromojiToken {
  surface_form: string // 表層形（例: 赤い, バンダナ, を）
  pos: string // 品詞（名詞 / 動詞 / 形容詞 / 連体詞 / 助詞 / 助動詞 ...）
  pos_detail_1: string // 品詞細分類1（自立 / 非自立 / 格助詞 / 一般 / 固有名詞 / サ変接続 ...）
  pos_detail_2: string // 品詞細分類2（人名 / 引用 ...）
  basic_form: string // 原形（動詞・形容詞の辞書形。例: 拾う, する）
}

// 1 つの Act 説明文から抽出した、まだ集約していない素の候補。
export interface RawCandidate {
  surface: string // 表層形（名詞句。例: 赤いバンダナ）
  normalized: string // 集約キー（正規化した表層形）
  typeGuess: EntityTypeGuess // ルールによる型の初期推定
  actId: number // 出現元の Act id
}

// 候補が既存エンティティの name / aliases と一致したことを表す。
export interface ExistingMatch {
  type: EntityTypeGuess
  id: number
  name: string // 一致した既存エンティティの表示名
}

// 複数 Act にまたがる出現をまとめた、UI に提示する候補。
export interface Candidate {
  surface: string
  normalized: string
  typeGuess: EntityTypeGuess // UI 上で確定前に付け替え可能
  actIds: number[] // この候補が出現した全 Act
  count: number // 出現回数
  existingMatch?: ExistingMatch // 既存 name/aliases と一致した場合のみ
}

// 候補を確定する際のユーザー判断。
export type ReconcileDecision =
  | { kind: 'create'; type: EntityTypeGuess } // 新規エンティティ化
  | { kind: 'link'; type: EntityTypeGuess; targetId: number } // 既存へ名寄せ
