# SceneFlow 機能拡張 詳細設計提案

> イマーシブシアター作家視点レビュー（`review-shots/` 参照）で挙がった「欲しい機能」の詳細設計。
> 本ドキュメントは**将来開発のための設計メモ**であり、未実装。優先度順に並べる。
> 各機能は「目的 / 現状 / データモデル / 設計 / UI / 実装ステップ / 検証 / 段階リリース」で記述する。

## 背景となる現状アーキテクチャ

- 物語データは `StoryData`（`src/types/StoryData.ts`）。`persons / locations / props / informations / initialStates / acts`。
- 整合性検査エンジン: `src/modules/consistency/checker.ts` の `analyzeStory(story)` が、位置・共在・アイテム・情報・証言矛盾を1パスのリプレイで検出し `ConsistencyReport`（`nodes / edges / breakages / byActId / contradictions`）を返す。
- アクト種別: `getActKind(act)`（`actKinds.ts`）。`type` フィールド（`MOVE/TAKE/GIVE/DROP/USE/LEARN/SPEAK/''`）で検査が分岐。**`type` 未設定（その他）だとアイテム・情報検査は発火しない。**
- 経路探索: `src/components/MapEditor/pathfinding.ts` に `AStar` と各種レイアウト（grid/circle/forceDirected）。ただし MapEditor 専用型（id が string）。
- 状態の永続化: `AppContext`（localStorage `sceneflow.storyData`）。各ページは同じ `storyData` を読む。

---

## 1. 自由文からのアクト種別・対象の半自動推定 ★最優先

### 目的

イベント入力（`QuickLog`）は「誰が・どこで・何をした」を自由文で書くだけで、`type` は常に空。結果、最も強力な**アイテム所持・情報伝播の検査が初期状態では一切働かない**。自由文から種別・対象（prop / information / 相手）を推定し、検査を「書くだけで効く」状態にする。

### 現状

- `QuickActInput`（`src/components/QuickLog/QuickActInput.tsx`）は `description` を素通しで `appendAct` に渡す。
- `ActDetailPanel` で1行ずつ `種類 / 相手 / アイテム / 情報` を手設定するしかない（往復コストが高い）。

### 設計

推定は**決定的ルール＋辞書ベース**から始め、後段で LLM を差し込めるインターフェースにする（オフライン・プライバシー優先のため既定はルール）。

新規モジュール `src/modules/nlp/inferAct.ts`:

```ts
export interface ActInference {
  type?: ActKindValue // 推定種別
  propId?: number // 名寄せできた小道具
  informationId?: number // 名寄せできた情報
  interactedPersonId?: number // 文中に現れた他人物
  confidence: number // 0..1
}

export interface InferenceContext {
  persons: Person[]
  props: Prop[]
  informations: Information[]
}

export function inferAct(description: string, ctx: InferenceContext): ActInference
```

アルゴリズム（ルール版）:

1. **種別キーワード辞書**（日本語語尾・動詞）:
   - 移動: 「向かう/行く/入る/出る/戻る/移動」→ `MOVE`
   - 取得(物): 「拾う/手に取る/取る/受け取る/盗む」→ `TAKE`
   - 受け渡し: 「渡す/手渡す/与える/託す」→ `GIVE`
   - 設置: 「置く/捨てる/隠す/落とす」→ `DROP`
   - 使用: 「使う/飲む/読む(物)/開ける」→ `USE`
   - 取得(情報): 「知る/気づく/盗み聞く/目撃する/読む(情報)」→ `LEARN`
   - 会話: 「話す/教える/伝える/打ち明ける/吹き込む」→ `SPEAK`
2. **エンティティ名寄せ**: `props[].name` / `informations[].name|content` / `persons[].name` を description に対して**最長一致**で照合。ヒットすれば対応 id を埋める。表記揺れは正規化（全半角・送り仮名の単純除去）。
3. **相手推定**: 文中に登場する自分以外の人物名 → `interactedPersonId`。
4. `confidence`: 種別キーワード命中で 0.6、エンティティ名寄せ命中で各 +0.2（上限1.0）。

LLM 版（任意・後付け）: 同インターフェースを満たす `inferActLLM`。`docs/superpowers` のような外部呼び出しは設定で opt-in。

### UI

- 入力バーで Enter 確定時に `inferAct` を実行。**確定はするが上書きはしない**——推定結果は行に淡色のチップ（例: `🚶移動` `📦古い鍵`）で**提案表示**し、ワンクリックで確定 or ✕で却下。
- 既存 `ActTimelineRow` の警告アイコン群の隣に「推定」チップ列を追加。`confidence < 0.5` は提示しない。
- 設定トグル「自由文から種別を自動推定」（既定ON、ルール版）。

### 実装ステップ

1. `inferAct` とキーワード辞書、ユニットテスト（`tests/modules/nlp/inferAct.test.ts`）。代表20文で種別命中率を回帰固定。
2. `appendAct` 経路で推定を呼び、`Act` に**未確定提案**として保持（`Act` は変えず、別の `suggestionsByActId` を `useQuickLog` 内に持つ）。
3. `ActTimelineRow` に提案チップ＋採用/却下。採用で `updateAct({ type, propId, ... })`。
4. （任意）LLM アダプタとフラグ。

### 検証

- ユニット: 文→推定の表。
- E2E: 「アランに鎮静剤を渡す」を入力→`GIVE`＋`鎮静剤`＋`アラン` が提案され、採用すると検証タブのアイテム検査が発火することを確認。

### 段階リリース

v1: ルール辞書＋提案チップ（破壊的でない）。v2: 名寄せ強化。v3: LLM opt-in。

---

## 2. 移動の自動補完／挿入提案 ★高

### 目的

位置破綻（`位置・動線` カテゴリ）が出たとき、作家は「どこを経由すれば成立するか」を手で埋める必要がある。`AStar` が既にあるので、**最短経路の MOVE アクト列をワンクリック挿入**できるようにする。

### 現状

- `checker.ts:147` が `isAdjacent` で隣接違反を検出し、`位置・動線` の `Breakage` を出す。
- `pathfinding.ts` の `AStar.findPath` は MapEditor 型（string id・要 x/y）依存で、`StoryData` 用には未接続。

### 設計

新規 `src/modules/routing/locationGraph.ts`:

```ts
// StoryData.locations の connections（number[]）から無向グラフを構築し、BFS最短経路を返す。
// 座標不要・重み一律1。x/y がある場合のみ AStar にフォールバックして距離重みを使う。
export function shortestPath(locations: Location[], fromId: number, toId: number): number[] | null // [from, ...経由, to]、到達不能なら null
```

「修復提案」生成 `src/modules/consistency/repairs.ts`:

```ts
export interface RepairSuggestion {
  kind: 'insert-moves'
  actId: number // 破綻アクト
  path: number[] // 挿入すべき経路（中間地点）
  insertAt: number // 挿入する時刻（分）
  acts: AppendActInput[] // 生成する MOVE アクト列
}
export function suggestRepairs(story: StoryData, report: ConsistencyReport): RepairSuggestion[]
```

- 位置破綻ごとに「直前位置 → アクト場所」の `shortestPath` を求め、経由地点を等間隔の時刻で割り付けた MOVE アクト列を提案。
- 経路が存在しない（部屋が未接続）場合は `kind: 'connect-needed'` を返し、**マップエディタで接続を促す**メッセージにする。

### UI

- **検証タブ**（`ValidationReporter`）の各 `位置・動線` エラーに「動線を挿入」ボタン。押下で `RepairSuggestion.acts` を `addAct` 群として適用→再検査で消えることを即確認できる。
- 経路なしの場合は「礼拝堂と中庭は接続されていません。マップエディタで繋ぐ」リンク（該当2ノードを選択した状態で `/map-editor` へ）。

### 実装ステップ

1. `locationGraph.shortestPath`（BFS）＋テスト。
2. `suggestRepairs`＋テスト（隣接なし／1ホップ／複数ホップ／到達不能）。
3. `ValidationReporter` に提案ボタン。
4. （任意）QuickLog 行の📍ツールチップにも同ボタン。

### 検証

- レビューの館ミステリ（厨房→大広間が未接続）で「動線を挿入」→「接続が必要」表示、接続後に再度押すと MOVE 挿入でエラー消滅。

---

## 3. 観客視点（ルート）のシミュレーション ★高（イマーシブ固有価値）

### 目的

イマーシブシアターの核心は「**この観客がこの順路で回ると、何を観られて何を観られないか**」。人物トラックだけでなく**観客を擬似エンティティとして配置・追従**させ、目撃したアクト列・取りこぼしたアクトを抽出する。

### 現状

- `getStateAtTime`（`simulation/core.ts`）は人物の時刻別位置を解決できる。観客の概念は無い。

### データモデル

`StoryData` を壊さず**別レイヤー**で持つ（保存は同 localStorage に別キー、またはエクスポートJSONの拡張フィールド `audienceRoutes`）:

```ts
export interface AudienceRoute {
  id: number
  name: string // 例: 「赤チーム」
  color: string
  // 時刻ごとの滞在場所（区間）。観客は自由移動だが設計上は区間で表す。
  stops: Array<{ locationId: number; fromTime: number; toTime: number }>
}
```

### 設計

新規 `src/modules/audience/observe.ts`:

```ts
// 各アクトについて「そのアクトの時刻に、その場所に観客がいたか」を判定。
export interface ObservationResult {
  routeId: number
  witnessed: number[] // 目撃した actId（時刻×場所が一致）
  missed: number[] // 同時刻に別場所で起きた actId（取りこぼし）
  coverage: number // witnessed / 全アクト
}
export function observeRoute(story: StoryData, route: AudienceRoute): ObservationResult
```

判定: アクト `a` を観客が目撃 ⇔ 「`a.startTime` が route の区間に含まれ、その区間の `locationId === a.locationId`」。`endTime` があれば区間重なりで判定。

### UI

新規ページ **「観客ルート」**（`/audience`、Navigation に追加）:

- 左: ルート一覧＋区間エディタ（場所×時間のピッカー）。
- 右: タイムライン上で**目撃＝実線／取りこぼし＝淡色**にハイライト。`coverage` バー。
- 既存「空間ビュー」に観客の動線を重畳表示するオプション（別色・破線）。

### 実装ステップ

1. `AudienceRoute` 型＋専用 Context/persistence（`storyData` とは分離）。
2. `observeRoute`＋テスト。
3. `/audience` ページ（一覧・区間エディタ・カバレッジ）。
4. 空間ビューへの重畳（`buildMovementPolylines` の観客版）。

### 検証

- 学院ミステリで「ずっと礼拝堂にいる観客」は礼拝堂アクト群を目撃、図書室の鍵取得を missed に分類することを確認。

### 段階リリース

v1: 単一ルートのカバレッジ＋タイムライン強調。v2: 複数ルート比較。v3: 空間重畳・自動ルート提案（見せ場を最大化する区間最適化）。

---

## 4. 時間×場所の俯瞰マトリクス（密度ビュー） ★中

### 目的

「19:15に大広間が過密／書斎が無人」のような**密度と空白**を一望し、役者・観客の配分を調整する。群像劇の同時進行設計に直結。

### 現状

- 時刻別状態は `getStateAtTime`、または `acts` を時刻でビン分割すれば算出可能。専用の俯瞰ビューは無い。

### 設計

純関数 `src/modules/analytics/occupancy.ts`:

```ts
export interface OccupancyCell {
  locationId: number
  bucket: number
  personIds: number[]
}
// time をビン幅 bucketMinutes で離散化し、各 (場所×ビン) の在室人物を返す。
export function buildOccupancyGrid(
  story: StoryData,
  bucketMinutes: number,
): { buckets: number[]; cells: OccupancyCell[] }
```

在室は initialStates＋acts から各人物の位置を前進解決（`checker` の位置追跡と同ロジックを共有化できると重複が減る）。

### UI

新規ページ **「俯瞰」**（`/overview`）またはシミュレーションタブ内のサブビュー:

- 横軸=時間ビン、縦軸=場所のヒートマップ（セル色=在室人数、ホバーで人物リスト）。
- `capacity` 超過セルは赤縁取り（→ 機能5と連動）。
- セルクリックで該当時刻にシミュレーションをジャンプ。

### 実装ステップ

1. 位置前進解決の共通化（`checker.ts` から `replayPositions` を切り出し再利用）。
2. `buildOccupancyGrid`＋テスト。
3. ヒートマップコンポーネント（SVG、既存の色トークン流用）。

### 検証

- 館ミステリで 19:10–19:20 の大広間セルに3人が集中表示されることを確認。

---

## 5. 収容人数（capacity）超過の警告 ★中（小規模）

### 目的

`Location.capacity` フィールドは存在するのに未使用。狭い空間に役者＋観客が詰まる事故を検出する。

### 現状

- `analyzeStory` は capacity を見ていない。

### 設計

`checker.ts` に新カテゴリ `capacity`（`DiagnosticCategory` に追加）を導入し、各時刻の在室人数が `capacity` を超えたら `Breakage` を出す。機能4の `buildOccupancyGrid` を流用すると実装が軽い。観客ルート（機能3）があれば観客数も加算。

`DiagnosticCategory` 拡張に伴い:

- `ActTimelineRow` の `CATEGORY_ICON` に `capacity: '🚪'` 等を追加。
- `ValidationReporter` のカテゴリ絞り込みに項目追加。

### UI

- 検証タブに「収容超過」カテゴリ。俯瞰ビュー（機能4）の赤縁取りと連動。

### 実装ステップ

1. `DiagnosticCategory` に `capacity` 追加（型・アイコン・ラベルの3箇所）。
2. checker で在室人数集計→超過 breakage。`capacity` 未設定の場所はスキップ。
3. テスト（capacity=2 の部屋に3人）。

### 検証

- サンプルに `capacity` を設定し、同時刻3人で警告が出ることを確認。

### 注意

- 既存の `DiagnosticCategory` を使う全箇所（`ActTimelineRow`・`ValidationReporter`・関連テスト）を網羅更新する。型を増やすと TS が漏れを教えてくれるので、まず型→コンパイルエラー潰しの順で進める。

---

## 6. 台本・香盤表エクスポート ★中

### 目的

現状エクスポートは JSON 中心。**役者・演出が使える成果物**（人物別動線表、場所別進行表、時系列台本）を出力したい。

### 現状

- マップエディタに JSON エクスポートあり。物語全体の人間可読エクスポートは無い。

### 設計

純関数群 `src/modules/export/script.ts`:

```ts
export function toTimelineMarkdown(story: StoryData): string // 時系列の進行台本
export function toPersonSheets(story: StoryData): Map<number, string> // 役者別「自分の動線だけ」
export function toLocationSheets(story: StoryData): Map<number, string> // 場所別の出入り表
```

- いずれも `acts` を時刻ソートし、人物色・場所・種別アイコン・破綻注記（`analyzeStory` の結果）を併記。
- 出力は Markdown を一次形式に（依存ゼロ）。PDF は後段で `print` CSS or 既存依存のみで対応。

### UI

- 共通ヘッダーまたはシミュレーションタブに「書き出し」メニュー: `時系列台本(.md)` / `役者別シート(.zip or 連結md)` / `場所別シート`。
- ブラウザの Blob ダウンロード（既存のエクスポート実装に倣う）。

### 実装ステップ

1. `toTimelineMarkdown`＋スナップショットテスト。
2. 人物別・場所別。
3. ダウンロードUI。

### 検証

- スナップショットで体裁固定。役者別シートに本人のアクトだけが時刻順で並ぶことを確認。

---

## 7. リハーサル注釈（尺・キュー・仕込み） ★低

### 目的

各アクトに**所要時間・キュー・小道具仕込みメモ**を持たせ、実運用の香盤表に近づける。

### データモデル

`Act` に任意フィールドを追加（後方互換）:

```ts
durationMinutes?: number   // 尺。endTime と相互変換可
cue?: string               // 音響・照明などのキュー
notes?: string             // 仕込み・演出メモ
```

- `endTime`（既存）と `durationMinutes` の整合は片方から導出。

### 設計・UI

- `ActDetailPanel` に「尺 / キュー / メモ」欄を追加（既存の編集パターンを踏襲）。
- 機能6のエクスポートに反映（香盤表に尺・キュー列）。
- 機能4の俯瞰で尺を持つアクトを帯（バー）で表示できると更に良い。

### 実装ステップ

1. 型追加＋ `applyActPatch` 経路の対応（既存で `Partial<Act>` なので素直）。
2. `ActDetailPanel` UI。
3. エクスポート列追加。

### 検証

- 注釈を入れて保存→リロードで保持、エクスポートに出ることを確認。

---

## 横断的な設計指針

- **純粋関数を優先**: 解析・推定・経路・集計は副作用のない関数（`src/modules/**`）に置き、React 層は表示に徹する。テストとデモが容易になり、既存の `analyzeStory` の流儀に合う。
- **`StoryData` は最小限しか拡張しない**: 観客ルート（機能3）や注釈（機能7）のような演出レイヤーは、可能な限り別キー/別Contextに分離し、コアの物語データを軽く保つ。
- **位置前進解決ロジックの共通化**: 機能2・4・5・3 すべてが「各時刻の在室位置」を必要とする。`checker.ts` の位置追跡を `replayPositions(story)` として切り出し再利用すると、検査と可視化の食い違いを防げる（今回修正した空間ビューの座標フォールバックと同じ「単一の真実源」方針）。
- **段階的・非破壊的に**: 推定・提案系（機能1・2）は「勝手に書き換えない・提案して採用させる」ことで、作家の意図を尊重する。

## 優先度まとめ

| 優先    | 機能                | 規模   | 価値                                                                                     |
| ------- | ------------------- | ------ | ---------------------------------------------------------------------------------------- |
| ★最優先 | 1. 種別自動推定     | 中     | 既存検査エンジンを「書くだけで」起動させる。投資対効果が最大                             |
| ★高     | 2. 移動の自動補完   | 小〜中 | `AStar` 既存。破綻の解決体験を一変させる                                                 |
| ★高     | 3. 観客ルート       | 大     | イマーシブ固有の価値。ツールの位置づけを「整合性チェッカー」から「体験設計」へ引き上げる |
| ★中     | 4. 俯瞰マトリクス   | 中     | 配分設計に直結                                                                           |
| ★中     | 5. capacity 警告    | 小     | 4の副産物として安価                                                                      |
| ★中     | 6. 台本エクスポート | 中     | 現場で使える成果物                                                                       |
| ★低     | 7. リハーサル注釈   | 小     | 香盤表化の仕上げ                                                                         |
