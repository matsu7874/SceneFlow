# Act 説明文からのエンティティ候補抽出・名寄せ 設計書

- 日付: 2026-06-04
- 対象: SceneFlow（React 19 + TypeScript + Vite）
- 関連画面: QuickLog（イベントログ入力）／ EntitiesPage（エンティティ一覧・編集）

## 1. 目的

QuickLog 画面で記録する Act の自由記述（`description`）から、日本語の形態素解析＋ルールベース抽出によってエンティティ候補（Person / Location / Prop / Information）を見つけ出し、エンティティ一覧画面で「新規エンティティ化」または「既存エンティティへの名寄せ」を行えるようにする。確定時には候補が出現した Act の参照フィールドを自動で紐付け、因果エンジンが利用できる構造化データに変換する。

抽出の代表例:

- 「赤いバンダナを拾った」→「赤いバンダナ」（Prop）
- 「古い鍵を見つけた」→「古い鍵」（Prop）
- 「協会に移動した」→「協会」（Location）

## 2. スコープ

### やること

- kuromoji.js による形態素解析（ブラウザ完結、辞書は遅延ロード）
- ルールベースの名詞句まとめ＋格助詞・動詞による型推定
- Act 説明文群の解析・候補集約・既存エンティティとの一致判定
- エンティティ一覧画面内の「候補抽出」パネル（型別表示・型付け替え・Actプレビュー・確定操作）
- 確定前の候補の型付け替え（データ移行不要）
- 新規エンティティ化／既存への名寄せ（`aliases` 追記）
- 確定時の Act 参照フィールド自動紐付け（write-back）

### やらないこと（YAGNI）

- 本格的な係り受け解析（CaboCha/GiNZA 相当）。純JSで現実的でないため不採用。
- エンティティ化（確定）した後の型変更（配列間移動＋参照張り替え）。確定前の付け替えのみ対応。
- サーバー/外部API 連携での解析。ブラウザ完結を維持。
- 入力中のリアルタイム候補提示（解析は明示ボタン起動）。

## 3. 全体アーキテクチャ / データフロー

```
storyData.acts[].description (自由記述群)
        │  ① 形態素解析 (kuromoji.js, 非同期ロード)
        ▼
   トークン列
        │  ② ルールベース抽出 (名詞句まとめ + 格助詞/動詞で型推定)
        ▼
   RawCandidate[]  { surface, normalized, typeGuess, actId }
        │  ③ 集約 (正規化形で重複統合・出現Act収集・既存エンティティ一致判定)
        ▼
   Candidate[]  { surface, normalized, typeGuess, actIds[], count, existingMatch? }
        │  ④ エンティティ一覧画面のパネルでユーザーが判断（型付け替え可）
        ▼
   [新規エンティティ化] or [既存へ名寄せ]
        │  ⑤ storyData 更新 (エンティティ追加/aliases追記 + 対象Actの参照フィールド紐付け)
        ▼
   setStoryData()
```

解析はエンティティ一覧画面の「Actから候補を抽出」ボタンで明示的に起動する。kuromoji 辞書ロードが重いため、初期バンドルには含めずパネル起動時に遅延ロードする。

## 4. コンポーネント分割

各ユニットは単一責務・明確なインターフェース・独立テスト可能を満たす。

| ユニット            | 場所                                                  | 責務                                                                                            | 依存                    |
| ------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------- |
| tokenizer           | `src/modules/nlp/tokenizer.ts`                        | kuromoji ラッパー。辞書を非同期シングルトンでロードし `tokenize(text): Promise<Token[]>` を提供 | kuromoji + 辞書ファイル |
| rules               | `src/modules/nlp/rules.ts`                            | 移動系/取得系/発話系の動詞辞書・格助詞→型のマッピング表（データ）                               | なし                    |
| extractCandidates   | `src/modules/nlp/extractCandidates.ts`                | 純関数: (トークン列, actId) → RawCandidate[]（名詞句まとめ・型推定）                            | rules                   |
| aggregateCandidates | `src/modules/nlp/aggregateCandidates.ts`              | 純関数: (RawCandidate[], 既存エンティティ) → Candidate[]（集約・既存一致判定）                  | types                   |
| reconcile           | `src/pages/entityExtraction/reconcile.ts`             | 純関数: (storyData, candidate, decision) → 新 storyData（作成/名寄せ＋Act紐付け）               | types, 色割当           |
| ExtractionPanel     | `src/components/EntityExtraction/ExtractionPanel.tsx` | UI（候補一覧・型付け替え・Actプレビュー・確定操作）                                             | 上記 + AppContext       |

純関数群（extractCandidates / aggregateCandidates / reconcile）は kuromoji 非依存、または Node 上で kuromoji を実行できるため、提示例を使ったユニットテストが容易。

## 5. データ型

```ts
type EntityTypeGuess = 'person' | 'location' | 'prop' | 'information'

interface RawCandidate {
  surface: string // 表層形（例: 赤いバンダナ）
  normalized: string // 正規化形（集約キー。トリム等）
  typeGuess: EntityTypeGuess
  actId: number // 出現元 Act
}

interface ExistingMatch {
  type: EntityTypeGuess
  id: number
  name: string // 一致した既存エンティティ名（または別名）
}

interface Candidate {
  surface: string
  normalized: string
  typeGuess: EntityTypeGuess // UI 上で付け替え可能（確定前のみ）
  actIds: number[] // 出現した全 Act
  count: number // 出現回数
  existingMatch?: ExistingMatch // 既存 name/aliases と一致した場合
}

type ReconcileDecision =
  | { kind: 'create'; type: EntityTypeGuess }
  | { kind: 'link'; type: EntityTypeGuess; targetId: number }
```

## 6. 抽出ルール

### 名詞句まとめ

連体詞・形容詞（連体形）・名詞の連続を1つの名詞句にまとめる。

- 「赤い（形容詞）＋バンダナ（名詞）」→「赤いバンダナ」
- 「古い（形容詞）＋鍵（名詞）」→「古い鍵」
- 「協会（名詞）」→「協会」

### 型推定（名詞句直後の格助詞＋動詞で判定）

- 「**を**」格 ＋ 取得/操作系動詞（拾う・見つける・使う・渡す・取る 等）→ **Prop**
- 「**に / へ**」格 ＋ 移動系動詞（移動する・向かう・行く・着く・到着する 等）→ **Location**
- 「**が / は**」主語、または「**と**」格（話す・会う相手）→ **Person**（人名判定は弱いので候補止まり）
- 「**と**言った / と話した / を知った」等 引用・認識系 → **Information**

動詞辞書・格助詞マップは `rules.ts` にデータとして外出しし、後から語彙を追加しやすくする。推定はあくまで初期値で、UI 上でユーザーが型を変更できる。

## 7. 型変更（名寄せ対応）

`src/types/StoryData.ts` の Person / Location / Prop / Information に `aliases?: string[]` を追加する。

- 名寄せ時、候補の表層形がエンティティ名と異なれば `aliases` に追記（例: 「協会」を既存 Location「教会」に名寄せ → aliases に「協会」を追加）
- 集約時の既存一致判定は、エンティティの `name`（Information は `name`/`content`）と `aliases` の両方を照合
- オプショナル追加のため、既存データ・JSON 入出力の互換性は維持される

## 8. Act 自動紐付け（write-back）

候補確定時、その候補の `actIds` が指す全 Act の参照フィールドを設定する。

- Prop → `propId` / Location → `locationId` / Information → `informationId` / Person → `interactedPersonId`
- 確定前に対象 Act 一覧をパネルにプレビュー表示（どの行が紐付くか可視化）
- 既に別エンティティが設定済みの参照は上書きせず、警告表示する（安全側）
- reconcile は immutable に新 storyData を返す

## 9. UI 配置・ルーティング

- エンティティ一覧画面（`/entities`, `EntitiesPage.tsx`）内に折りたたみ可能な「候補抽出」パネルを追加する。新ルートは作らず既存画面に統合する。
- パネル構成:
  - 「Actから候補を抽出」ボタン（押下で辞書ロード → 解析）
  - 型別にグルーピングした候補リスト: `表層形 / 出現回数 / 推定型（ドロップダウンで変更可） / 対象Actプレビュー / [新規エンティティ化] [既存へ名寄せ ▼]`
  - 既存エンティティ名・aliases と一致する候補は「既存と一致」を既定表示し、名寄せを促す
- 既存の ID 採番（`nextId`）・色割り当て（`assignPersonColor` / `assignLocationColor`）の仕組みを再利用する。

## 10. エラーハンドリング

- 辞書ロード失敗（ネットワーク等）: パネルにエラーを表示し抽出を無効化する。サイレント失敗にしない。
- 辞書は初期ロードに含めず、パネル起動時に遅延ロードする（バンドル肥大化防止）。
- `description` が空の Act はスキップする。
- 紐付け対象 Act の参照が既に別エンティティで埋まっている場合は上書きせず警告する。

## 11. テスト戦略

- **extractCandidates**: 提示3例（赤いバンダナ / 古い鍵 / 協会）＋ Person / Information 例をユニットテスト。Node 上で実 kuromoji を実行するか、トークン列をモックする。
- **aggregateCandidates**: 重複統合・出現Act収集・既存 name/aliases 一致判定を純関数テスト。
- **reconcile**: 新規作成・名寄せ（aliases 追記）・Act write-back・上書き警告を純関数テスト。
- **ExtractionPanel**: 候補表示・型付け替え・確定操作のコンポーネントテスト。

## 12. 未決事項

- kuromoji 辞書の同梱方法: `public/dict/` に同梱（オフライン動作・確実）か CDN 参照（バンドル軽量）か。実装フェーズで選択する。デフォルトは `public/dict/` 同梱を想定。
