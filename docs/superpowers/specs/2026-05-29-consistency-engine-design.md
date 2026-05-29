# 整合性エンジン（来歴グラフ）による機能再定義 設計

- 日付: 2026-05-29
- ステータス: 承認待ち（改訂後）
- 関連: `docs/superpowers/specs/2026-05-29-quick-log-design.md`（イベント入力）

## 背景と問題

SceneFlow は `storyData` を中心に複数ページが並ぶが、各ページは独立したビューの寄せ集めで、エンドツーエンドの価値ループが成立していない。調査で判明した実態:

- 因果関係ビューのエンジンは条件判定が `Math.random() > 0.7`（`src/modules/core/causalityEngine.ts:68`）の偽物。Act の意味（移動・受け渡し・会話）を一切見ず、「同一人物の時系列順」だけで ENABLES を引く。
- 関係性エディタの更新は `() => {}` の空実装（`src/components/RelationshipEditor/useRelationshipEditor.ts:88-91`）で書き戻されない。
- 旧因果エンジン（`src/modules/causality/`）・旧シミュレーション（`src/modules/simulation/core.ts`）・LocalStorage 永続化（`src/modules/state/extendedState.ts`）・旧 UI モジュールはアプリから一切呼ばれない死蔵コード。`Act` 型と `StoryData` 型がそれぞれ二重定義されている。

QuickLog が書く `Act` 自体は AppContext 経由で各機能に届いているが、受け手が空っぽのため価値が返ってこない。

## コア価値（一気通貫の仕事）

**「どこで・誰が・何をした」を入力する → 物語世界の破綻を自動検出する → どこを直すかをグラフで辿って直す」のループ。**

`initialStates` と時刻順の `acts` を再生して各時点の WorldState（位置／所持・所在／知識）を再構築し、**各 Act が要求する事実（require）と産出する事実（provide）の来歴グラフ**を構築する。上流から事実が流れ、下流から require が流れ、その**合流点**で各 require が満たされるかを判定する。満たされない require が破綻。

このひとつのエンジンが 3 つの面を駆動する:

- **QuickLog タイムライン**: 各 Act の破綻をカテゴリ別バッジで即時フィードバック（入力ループ）
- **検証ページ**: 破綻の一覧（カテゴリ別レポート）
- **因果ビュー**: 来歴グラフを可視化し、破綻箇所の上流（なぜその事実が無いのか）と下流（その事実に依存するのは何か）を辿って修正箇所を特定する**ナビゲーション層**

## 事実モデル（上流＝事実フロー / 下流＝require フロー）

「事実（fact）」は WorldState に関する命題。前提条件・事後条件はこの事実の require / provide として表現する。

| 事実                     | 意味                       |
| ------------------------ | -------------------------- |
| `at(person, location)`   | その人物がその場所に居る   |
| `owns(person, prop)`     | その人物がその物を所持する |
| `propAt(prop, location)` | その物がその場所に在る     |
| `knows(person, info)`    | その人物がその情報を知る   |

`adjacent(a, b)`（`connections` による隣接）は事実フローではなく構造制約として扱う（来歴エッジは張らず、違反のみ記録）。

### Act の種類と require / provide

`StoryData.Act` の `type`（自由文字列）に固定語彙を割り当て、`locationId`/`propId`/`informationId`/`interactedPersonId` を引数として解釈する。`type` 未設定/語彙外は「その他（汎用）」。語彙は単一定数 `ACT_KINDS`（value/label/必要フィールド）として持ち、詳細パネルのセレクトとエンジン双方が参照（DRY）。

| type    | ラベル       | requires（下流→）                                                                              | provides（→上流から消費）                                | 構造制約                       |
| ------- | ------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------ |
| （空）  | その他       | `at(行為者, locationId)`                                                                       | （再表明のみ）                                           | —                              |
| `MOVE`  | 移動         | `at(行為者, 現在地)`                                                                           | `at(行為者, locationId)`（旧 at を置換）                 | `adjacent(現在地, locationId)` |
| `TAKE`  | 取得（物）   | `at(行為者, locationId)`, `propAt(propId, locationId)`                                         | `owns(行為者, propId)`（propAt 解除）                    | —                              |
| `GIVE`  | 受け渡し     | `owns(行為者, propId)`, `at(行為者, locationId)`, `at(interactedPersonId, locationId)`         | `owns(interactedPersonId, propId)`（行為者の owns 解除） | —                              |
| `DROP`  | 設置         | `owns(行為者, propId)`, `at(行為者, locationId)`                                               | `propAt(propId, locationId)`（owns 解除）                | —                              |
| `USE`   | 使用         | `owns(行為者, propId)`, `at(行為者, locationId)`                                               | `isConsumable` なら消費                                  | —                              |
| `LEARN` | 取得（情報） | `at(行為者, locationId)`                                                                       | `knows(行為者, informationId)`                           | —                              |
| `SPEAK` | 会話/共有    | `knows(行為者, informationId)`, `at(行為者, locationId)`, `at(interactedPersonId, locationId)` | `knows(interactedPersonId, informationId)`               | —                              |

## 来歴グラフと破綻判定

WorldState 再生中、各事実について「現在の産出元（producer）」を保持する: `at` の産出元（直近の MOVE / 初期状態 / 汎用）、`owns`/`propAt` の産出元、`knows` の産出元。

1. `acts` を `startTime`（昇順）→ `id`（昇順）で安定ソート。
2. 各 Act 処理時、その require ごとに現在の producer を引く:
   - producer があれば **来歴エッジ**（producer → 当該 Act、ラベル＝事実）を張る。
   - producer が無い／一致しない（例: `at(太郎, 会議室)` を要求するが現在 producer は `at(太郎, 給湯室)`）→ その require は満たされず **破綻**として記録。
3. require の充足可否に関わらず provide を適用して WorldState（と producer）を前進させる（破綻後も連鎖を最小化しつつ以降の検査を継続）。
4. 別途、構造チェック:
   - **分身（colocation）**: 同一人物・同一 `startTime` で異なる `locationId` の Act → 該当 Act を全て破綻記録（来歴とは独立の時間的矛盾）。
   - **隣接違反**: `MOVE` の移動先が現在地と非隣接・非同一 → 破綻記録。

破綻のカテゴリ:

- `position`: `at` の require 不充足、隣接違反
- `colocation`: 分身
- `item`: `owns` / `propAt` の require 不充足
- `info`: `knows` の require 不充足

「合流点」: ある Act が複数の require（異なる上流 producer 由来）を束ねる点。破綻＝そのうち少なくとも一つの流入が欠落している点。因果ビューはこれを可視化する。

## アーキテクチャ

### 新設: 整合性エンジン（純粋）

| ファイル                                | 責務                                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/modules/consistency/actKinds.ts`   | `ACT_KINDS` 語彙と `getActKind(act)`                                                    |
| `src/modules/consistency/facts.ts`      | 事実型（`FactRef`）と等価判定・整形                                                     |
| `src/modules/consistency/worldState.ts` | WorldState 型・初期化・provide 適用（純粋）                                             |
| `src/modules/consistency/checker.ts`    | `analyzeStory(storyData): ConsistencyReport` 本体（再生＋require 評価＋来歴グラフ構築） |
| `src/modules/consistency/index.ts`      | re-export                                                                               |
| `tests/modules/consistency/*.test.ts`   | 単体テスト                                                                              |

型:

```typescript
type DiagnosticCategory = 'position' | 'colocation' | 'item' | 'info'

type FactRef =
  | { kind: 'at'; personId: number; locationId: number }
  | { kind: 'owns'; personId: number; propId: number }
  | { kind: 'propAt'; propId: number; locationId: number }
  | { kind: 'knows'; personId: number; informationId: number }

// グラフのノード: 初期状態シードと各 Act
type NodeId = number | `initial:${number}` // act.id か initial:<personId>

interface GraphNode {
  id: NodeId
  actId: number | null // 初期シードは null
  personId: number
  locationId: number | null
  startTime: number
  label: string // 表示用（説明 or 「初期位置」）
}

interface DependencyEdge {
  from: NodeId // 事実の産出元（上流）
  to: number // 事実を要求する Act（下流）
  fact: FactRef
}

interface Breakage {
  actId: number
  category: DiagnosticCategory
  fact: FactRef | null // colocation/隣接は null 可
  message: string // 日本語の具体説明
}

interface ConsistencyReport {
  nodes: GraphNode[]
  edges: DependencyEdge[]
  breakages: Breakage[]
  byActId: Map<number, Breakage[]> // タイムライン行が O(1) 参照
}
```

`analyzeStory` は副作用なしの純粋関数。入力は `storyData` のみ。

WorldState 初期化:

- 位置: `initialStates`（`personId` → `locationId`）。各初期状態は `initial:<personId>` ノードとして `at` の産出元になる。`initialStates` に無い人物は、最初に現れた Act の `locationId` を初期位置と見なし、その Act 自身を起点とする（位置 require はその時点では満たされたものとして扱い、以降の不一致のみ破綻）。
- 物: `Prop.owner`/`Prop.currentLocation`（文字列 ID を数値解釈）を初期 `owns`/`propAt` の産出元（`initial:` 由来）として登録。両方未設定なら未所持・所在なし。
- 知識: 空（`LEARN`/`SPEAK` の provide で付与）。

### QuickLog 統合

- `useQuickLog` は旧 `detectMovementInconsistencies` の呼び出しを `analyzeStory(storyData)` に置き換え、`report.byActId` を返す（`inconsistentActIds: Set<number>` は廃止）。
- `ActTimelineRow` は当該 Act の `Breakage[]` を受け取り、カテゴリ別バッジ（位置=⚠動線／分身=⚠分身／物=⚠所持／情報=⚠情報）を表示。`title` に `message`。
- `ActDetailPanel` 先頭付近に「種類」セレクト（`ACT_KINDS` から生成、既定＝その他）を追加。既存の場所/時刻/相手/アイテム/情報はそのまま。
- `quickLogLogic.ts` の `detectMovementInconsistencies`/`isMoveAct` は削除（エンジンへ移管）。`sortActs` 等は残す。

### 因果ビューの作り直し（再定義）

偽の `modules/core/causalityEngine.ts` を廃し、`CausalityView` を `analyzeStory` の `nodes`/`edges`/`breakages` を描画するグラフに作り直す:

- ノード = 初期シード＋各 Act。時刻順（左→右 or 上→下）に配置。
- エッジ = 来歴（産出元→要求 Act）。ラベルに事実種別（at/owns/propAt/knows）。
- 破綻の require は赤い「欠落流入」として該当 Act に表示（合流点の欠け）。
- ノード選択で上流（その Act が依存する事実の供給元へ遡る）・下流（その Act の産出に依存する Act へ辿る）をハイライトし、「どこを直すか」を辿れる。
- 既存 `CausalityView` の描画基盤（SVG/canvas いずれか現行のもの）は流用し、データ供給だけ新エンジンへ差し替える。レイアウトが流用困難なら最小の縦並びレイアウトで可。

### 検証ページの作り直し

`ValidationPage`/`ValidationReporter` を整合性レポート表示に作り直す。`analyzeStory(storyData).breakages` をカテゴリ別にグルーピングして一覧（各行: 時刻・人物・場所・説明＋違反メッセージ）。各行クリックで因果ビューの該当ノードへ誘導できると望ましい（最小実装ではテキスト一覧で可）。既存の参照整合性チェック（存在しない personId/locationId 等、`utils/validation.ts`）は有用なので前段チェックとして残すか別カテゴリで表示。

### 凍結・削除

- 関係性: `App.tsx` の `/relationships` ルートと `Navigation` リンクを除去（凍結）。コンポーネント（`RelationshipEditor`/`CharacterRelationshipDiagram`）ファイルは据え置く（将来再開余地、害なし）。
- 偽因果エンジン `src/modules/core/causalityEngine.ts` は削除（`CausalityView` が新エンジンへ移行後）。
- 死蔵コード削除（限定・検証付き）: 各削除前に「リポジトリ全体で import されていない」ことを grep 確認してから削除。確認できないものは残す。候補:
  - `src/modules/causality/`（旧エンジン・旧 Act クラス群）と対応テスト `tests/causality/acts/*`。**これらのテストはセッション開始時点で未コミット変更があるため、削除前にユーザー確認（無断削除しない）。**
  - `src/modules/simulation/core.ts`、`src/modules/ui/*`、`src/modules/validation/reporter.ts`（旧）、`src/modules/state/extendedState.ts`。
  - 二重型解消: `types/causality.ts`（未使用化後）と `types/index.ts` の重複 `StoryData`/`Act` を整理し `src/types/StoryData.ts` を単一の正にする。まだ使われる `Event` 等は残す。
- 削除フェーズは独立させ、各削除で型チェック・全テスト緑を確認。

## エラー処理・エッジケース

- `storyData` が `null`: 各ページは既存どおりデータ未読込メッセージ。エンジン未呼び出し。
- `acts` が空: 破綻・エッジ空。検証ページは「破綻なし」。
- 参照先 ID が存在しない（例: `propId` が props に無い）: その Act の該当 require はスキップし、参照整合性カテゴリ（または既存 validation）で別途報告。エンジンはクラッシュしない。
- `startTime` 未設定: `0` とみなしてソート。
- 同時刻・同場所の複数 Act（正当）: 分身ではない（場所同一なら flag しない）。

## テスト方針（TDD）

- 単体（`tests/modules/consistency/`）:
  - `actKinds`: `getActKind`（語彙外→その他）
  - `worldState`: 初期化（initialStates / Prop.owner 反映）、各 provide 適用
  - `checker`（4 カテゴリ＋来歴）:
    - position: 移動なしの場所変化を破綻 / MOVE 挟みで非破綻 / 非隣接 MOVE を破綻 / 隣接 MOVE 非破綻
    - colocation: 同時刻別場所を破綻 / 同時刻同場所は非破綻 / 別人物は混同しない
    - item: 未所持 GIVE を破綻 / 所持後 GIVE 非破綻 / その場にない TAKE を破綻 / 非共在相手への GIVE を破綻
    - info: 未知 SPEAK を破綻 / LEARN 後 SPEAK 非破綻 / 非共在相手への SPEAK を破綻
    - 来歴エッジ: TAKE→GIVE で `owns` エッジが張られる / LEARN→SPEAK で `knows` エッジ / 満たされない require はエッジを張らず breakage になる
- コンポーネント:
  - `ActDetailPanel`: 種類セレクトで `onChange({type})`
  - `ActTimelineRow`: 与えた Breakage に応じカテゴリ別バッジ
  - `CausalityView`: 与えた nodes/edges/breakages を描画し、破綻ノードを強調（スナップショット or 要素存在で検証）
- E2E（Playwright）: イベント入力で position 警告 → 種類 MOVE で消える / 種類 GIVE で未所持の受け渡しに item 警告 / 因果ビューで破綻ノードが見える
- 既存テスト・lint・型チェックが緑（削除フェーズ含む）

## 受け入れ基準

1. `analyzeStory` が WorldState を再生し、4 種の破綻と来歴グラフ（nodes/edges）を返す（単体テストで網羅）。
2. QuickLog タイムラインで各破綻がカテゴリ別バッジ＋説明として該当行に出る。
3. 詳細パネルで「種類」を選ぶと所持・知識検査が効き、種類を直す（例: MOVE）と警告が消える。
4. 検証ページが整合性レポート（カテゴリ別一覧）を表示する。
5. 因果ビューが来歴グラフを表示し、破綻箇所の上流・下流を辿れる（偽エンジンは置換済み）。
6. 関係性がナビ/ルートから消えている。
7. 死蔵コード削除後も型チェック・lint・全テスト緑（テスト削除はユーザー確認の上）。

## 関連サブプロジェクト（将来・本スペック対象外）

ラフな自由テキストの `description` から、エンティティ（人物/場所/物/情報）の抽出・種別分類・名寄せ（表記ゆれの統合）・種類（MOVE/GIVE/SPEAK 等）の推定を行い、構造化済み Act に「切り出す」アシスタント層。QuickLog（ラフ入力）と本エンジン（構造化済み Act の検査）の間に挟まる上流層で、出力は**ユーザーがレビューして採用する提案**とする（自動確定はしない）。「同時に起こっていること」の整理（同時刻帯の Act をシーンとしてまとめる）も含みうる。

方式候補: ローカル形態素解析（kuromoji.js 等、候補抽出・曖昧マッチ名寄せ）／LLM 抽出（種別分類・共参照解決・種類推定まで高精度、要 API 基盤）／ハイブリッド。

**本スペックの整合性エンジンが「構造化済み Act の目標形と検査」を定義するため、本エンジンを先に作る。抽出・構造化層はそれを土台に別スペックで設計する**（決定: コア先行）。

## 実装フェーズ（順序）

1. エンジン（`actKinds`/`facts`/`worldState`/`checker`）を TDD で新設（来歴グラフ含む）
2. QuickLog 統合（`useQuickLog` 置換、`ActTimelineRow` バッジ、`ActDetailPanel` 種類セレクト、旧検出削除）
3. 検証ページ作り直し（整合性レポート）
4. 因果ビュー作り直し（来歴グラフ、偽エンジン削除）
5. 関係性の凍結（ナビ/ルート除外）
6. 死蔵コード・二重型の削除（検証付き、テスト削除は要確認）
7. E2E と Playwright での通し確認
