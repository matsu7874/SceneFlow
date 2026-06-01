# 誤情報の伝播と矛盾の可視化 — 設計

- 日付: 2026-06-02
- ブランチ: `worktree-feat+misinformation-causality`（最新 main `22bb749` から分岐）
- 対象: 因果関係ビュー(CausalityView)で「誤情報（嘘・見間違い）」の伝播と、真実・他の証言との矛盾の発生／発覚ポイントを可視化する

## 1. 背景と目的

SceneFlow は複数キャラクターが同時並行で進む物語をシミュレートする。情報の受け渡し（SPEAK/LEARN act）は既に実装され、`consistency/checker.ts` が「誰がどの情報を、誰から得たか(producer)」を時系列再生で追跡し、CausalityView が依存エッジ（`kind:'knows'` を含む）として可視化している。

しかし現状の `Information` は `{ id, content }` の自由テキストのみで、**真偽の概念が無い**。そのため「ある情報が誤情報（嘘や見間違い）であり、どこかで真実や他の証言と矛盾する」という物語上の重要な構造を表現・検出・可視化できない。

本機能は、誤情報の発生・伝播と、それが矛盾する瞬間（発覚ポイント）、およびそこに至る流れを可視化する。

## 2. 設計判断の根拠（調査結果）

- 自由テキストの矛盾検知（NLI / de Marneffe の矛盾分類）は機械学習ベースで不確実であり、特に「前から見た姿 vs 横から見た姿」のような視点依存ケースを誤検出しやすく、決定論的オーサリングツールには不向き。
- 代わりに、ナラティブシミュレーションの先行研究 **"Toward Characters Who Observe, Tell, Misremember, and Lie"（Ryan ら, UCSC 2015 / Talk of the Town）** の **belief facet**（1エンティティの1属性についての値）に倣い、情報を構造化言明として表現する。
  - 矛盾 = 同一 `(subject, aspect)` で `value` が異なる、という決定論的判定。
  - aspect の粒度で「同一論点かどうか」を作者が制御でき、「正面の姿(aspect=正面)」と「側面の姿(aspect=側面)」は aspect が異なるため**自動的に矛盾と判定されない**。人手のアノテーションなしに見かけの矛盾と真の矛盾を区別できる。
  - 嘘・見間違いの区別は evidence の origin type（lie / mistake）に対応。
- 真理維持システム(TMS)/信念改訂(AGM) の justification 構造は、SceneFlow 既存の `producer`（状態の生成元 act を辿る依存追跡）に相当し、矛盾点から原因の連鎖を遡る可視化の理論的裏付けとなる。

参考:

- Ryan et al., Toward Characters Who Observe, Tell, Misremember, and Lie (UCSC, 2015)
- de Marneffe らの矛盾検知分類（Antonym/Negation/Numeric/Factive/Structure）
- Belief Revision and Truth Maintenance Systems (Buffalo) / Logic of Belief Revision (SEP)
- Knowledge graph の functional property（同一 subject-predicate で異なる value = 矛盾）

## 3. スコープ（v1）

### やること

- `Information` に構造化言明（subject / aspect / value）と誤情報メタ（truth / misinfoType）を**任意フィールド**として追加（後方互換）。
- 矛盾の自動検出: ある人物が同一 `(subject, aspect)` で異なる `value` の情報を**初めて同時に保有した act** を「矛盾発覚ポイント」として記録。
  - 自分で見た情報（観察）も含める（伝聞同士の食い違いに限らない）。
  - 片方が真実なら `truth-conflict`、両方とも非真実なら `testimony-conflict` に分類。
- 誤情報（真実と value が異なる情報）の判定と、その伝播チェーンの抽出。
- CausalityView での可視化: 誤情報の着色（嘘/見間違いで区別）、伝播チェーンのハイライト、矛盾発覚マーカー、矛盾詳細パネル（食い違う2言明と両者の流れを2色で発生源まで遡る）、凡例。
- EntityEditor の Information 編集フォームに構造化言明・誤情報メタの入力欄を追加。

### やらないこと（v1 では非対象）

- 信念の解決（矛盾後にどちらを信じるか）。strength による信念改訂・候補保持は扱わない。ユーザーがグラフを読んで判断する。
- 記憶の変質(mutation)・忘却(forgetting)・confabulation・transference などの高度な知識現象。
- 自由テキスト同士の意味的矛盾検知（NLI）。構造化言明を持たない情報は従来どおり検出対象外。

## 4. データモデル

`src/types/` の `Information` を拡張する（すべて任意フィールド。既存ストーリーは無変更で動作）。

```ts
interface Information {
  id: number
  content: string
  // --- 構造化言明（省略可） ---
  subject?: EntityId // 何についての情報か（person/location/prop の id）
  aspect?: string // どの観点か（例: "髪色", "居場所"）= 同一論点判定のキー
  value?: string // その観点での値（例: "茶色"）
  // --- 誤情報メタ（省略可） ---
  truth?: boolean // この value が (subject, aspect) の真実か（slot ごとに最大1つ）
  misinfoType?: 'lie' | 'mistake' // 誤情報の発生原因（嘘 / 見間違い）
}
```

定義:

- **真実(ground truth)**: `truth: true` の情報。`(subject, aspect)` ごとに1つ。物語中で誰にも伝わらなくてもよい（着色の基準として存在）。
- **誤情報**: `subject`/`aspect` を持ち、同じ slot の真実と `value` が異なる情報。`misinfoType` で嘘/見間違いを区別。
- **矛盾**: ある人物が保有する情報のうち、同一 `(subject, aspect)` で `value` が異なる組。
- **非構造化情報**: `subject`/`aspect` の無い情報。従来どおり自由テキスト扱いで検出対象外。

バリデーション（`src/utils/validation.ts`）: 同一 `(subject, aspect)` に `truth: true` が複数あれば警告。

## 5. 検出ロジック

`src/modules/consistency/checker.ts` の `analyzeStory` 時系列再生を拡張する。既存の `knowledge: Map<personId, Map<infoId, producer>>` に加え、人物ごとに保有 slot を追跡する。

- 補助構造: `heldClaims: Map<personId, Map<"subject|aspect", { value, infoId, producer }[]>>`
- 情報を取得する act（LEARN / SPEAK の受け手側、および観察）で、取得情報が構造化言明を持つ場合:
  1. その情報の `(subject, aspect)` slot を引く。
  2. 既に保有する同 slot の中に `value` が異なるものがあれば、**矛盾(Contradiction)** を1件記録。
  3. その情報を slot に追加。
- 分類: 矛盾を構成する2情報のいずれかが `truth: true` なら `truth-conflict`、そうでなければ `testimony-conflict`。

新しい型（`src/modules/consistency/types.ts`）:

```ts
interface Contradiction {
  id: string // 例: `contradiction:${personId}:${actId}:${subject}:${aspect}`
  personId: number // 矛盾に気づいた人物
  subject: number
  aspect: string
  actId: number // 発覚ポイントとなった act（後から来た言明を取得した act）
  incoming: { infoId: number; value: string; producer: NodeId } // 後から来た言明
  existing: { infoId: number; value: string; producer: NodeId } // 既に保有していた言明
  kind: 'truth-conflict' | 'testimony-conflict'
  time: number
}
```

`ConsistencyReport` に `contradictions: Contradiction[]` を追加する。

誤情報の判定・伝播チェーン抽出は `src/modules/consistency/misinformation.ts` に分離:

- `isMisinformation(info, story)`: その情報が誤情報か（同 slot の真実と value が異なるか）。
- `misinfoChain(infoId, report)`: 既存の `kind:'knows'` 依存エッジを辿り、発生源から全又聞きまでの伝播経路（node/edge 集合）を返す。

## 6. 可視化（CausalityView）

`src/components/CausalityView/CausalityView.tsx` を拡張する。既存の SVG グリッド（時間×人物）、上流/下流ハイライト機構を再利用する。

1. **誤情報の着色**: 誤情報を発生／伝播する act ノード・エッジを専用スタイルに。`misinfoType` で色・アイコンを分ける（例: 嘘=赤系アイコン、見間違い=橙系アイコン）。
2. **伝播チェーンのハイライト**: 誤情報（またはその発生源ノード）をクリックすると、`misinfoChain` を使い発生源から全又聞きまでの流れを強調。
3. **矛盾発覚マーカー**: `contradictions` の `actId` に対応する act ノードに ⚡/警告バッジを重畳。既存の赤い breakage（precondition 違反）とは別概念として視覚的に区別する。
4. **矛盾の詳細パネル**: 矛盾マーカーをクリックすると、食い違う2つの言明（subject / aspect / value / 誰から得たか）を表示し、**両方の流れを2色で発生源まで遡って**ハイライトする（真実の流れ vs 誤情報の流れ）。
5. **凡例**: 「真実」「誤情報(嘘)」「誤情報(見間違い)」「矛盾発覚点」を追加。

## 7. オーサリング UI（EntityEditor）

`src/components/EntityEditor/` の Information 編集に以下の入力欄を追加する:

- subject: エンティティ選択（person/location/prop）
- aspect: テキスト
- value: テキスト
- truth: チェックボックス
- misinfoType: 選択（なし / 嘘 / 見間違い）

これらは任意入力で、未入力なら従来の自由テキスト情報として扱う。

## 8. テスト戦略（TDD）

- 検出ロジック単体テスト（`tests/modules/consistency/`）:
  - 同 slot 異 value → 矛盾を1件記録（発覚 act が正しい）。
  - aspect 違い → 矛盾を記録しない（「正面 vs 側面」非矛盾）。
  - subject 違い → 矛盾を記録しない。
  - 自分の観察 vs 伝聞の食い違い → 矛盾を記録。
  - `truth-conflict` / `testimony-conflict` の分類。
  - `isMisinformation` 判定、`misinfoChain` の経路抽出。
- `CausalityView` コンポーネントテスト（`tests/components/`）: 矛盾マーカー描画、誤情報着色、詳細パネル表示。
- 必要に応じて矛盾シナリオの E2E（Playwright）。

## 9. 影響ファイル

- `src/types/`（`Information` 拡張）
- `src/modules/consistency/types.ts`（`Contradiction`、`ConsistencyReport` 拡張）
- `src/modules/consistency/checker.ts`（検出ロジック）
- `src/modules/consistency/misinformation.ts`（新規: 誤情報判定・伝播チェーン）
- `src/components/CausalityView/CausalityView.tsx`（可視化）
- `src/components/EntityEditor/`（Information フォーム）
- `src/utils/validation.ts`（truth 重複の警告）
- 対応する各テスト
