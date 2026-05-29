# 空間マップ（背景画像下敷き＋動線・破綻可視化）設計

- 日付: 2026-05-30
- ステータス: 承認待ち
- 関連: `docs/superpowers/specs/2026-05-29-consistency-engine-design.md`（整合性エンジン）

## 背景と目的

物理的な部屋の大きさ・配置を「なんとなく」反映しながら、台本の動線と破綻を空間的に把握したい。間取り図などの画像を下敷きに部屋（点）を配置し、その配置を各ビューで共有して、移動の動線や整合性の破綻を物理空間の上で確認できるようにする。

最終成果物（マダミス／イマーシブシアターの台本）の制作・検証の前段ツールとして、SceneFlow 上で空間的破綻（瞬間移動・非到達移動・在室矛盾など）を物理レイアウトで見つけてブラッシュアップできることが狙い。

## スコープ

### やること

- 背景画像（間取り図）をランタイム状態として保持し、各ビューで共通の下敷きとして表示
- MapEditor に画像読込＋簡易キャリブレーション（不透明度・位置・倍率）、部屋（点）を画像上に配置
- シミュレーションの LocationLayout に同じ背景を下敷き表示
- 新規「空間ビュー」：背景＋部屋点＋動線（移動の軌跡）＋破綻ハイライト
- MapEditor と空間ビューで `analyzeStory` の破綻が参照する場所を赤くハイライト

### やらないこと（YAGNI / 決定事項）

- 部屋のサイズデータは持たない（点のまま。大きさは画像上の配置で表現）— 決定済み
- 背景画像を StoryData に保存しない（ローカル・ランタイムのみ。毎セッション再添付）— 決定済み
- 因果ビューを物理配置に置き換えない（時刻×人物のまま据え置き。物理配置の動線は空間ビューに集約）— 決定済み
- 透視・縮尺の厳密なキャリブレーション（あくまで「なんとなく」合わせる簡易調整のみ）
- 画像の永続化・サーバ保存・複数画像レイヤ

## 座標モデル

`location.x/y`（世界座標）は既存で、各ビューが独自の world→screen 変換で描画している（MapEditor は pan/zoom、LocationLayout は location 群の bbox を自動フィット）。背景画像は **世界座標での配置情報** を共有し、各ビューが「点と同じ world→screen 変換」で画像も写す。これにより 1 つの配置定義で全ビューが整合する。

背景配置（世界座標）:

- `offsetX, offsetY`: 画像左上の世界座標
- `scale`: 画像 1px あたりの世界座標単位（uniform）
- `opacity`: 下敷きの不透明度

各ビューでの描画: 画像の四隅を世界座標 `(offsetX + px*scale, offsetY + py*scale)` で求め、そのビューの world→screen 変換を通して描く（点と完全に同じ写像）。

## アーキテクチャ

### ランタイム状態: `MapBackgroundContext`

`src/contexts/MapBackgroundContext.tsx`（新規）。StoryData とは独立したローカル状態。

```typescript
interface MapBackground {
  imageSrc: string | null // アップロード画像の object URL（メモリ内）
  naturalWidth: number // 画像のピクセル幅（読み込み時に取得）
  naturalHeight: number
  offsetX: number // 世界座標：画像左上
  offsetY: number
  scale: number // 世界単位/px
  opacity: number // 0..1
}
```

- `setImage(file: File)`: `URL.createObjectURL` で src を作り、`Image` で natural サイズを取得。既定 offset=0, scale=1, opacity=0.5。
- `update(partial)`: offset/scale/opacity の調整。
- `clear()`: 画像解除（`URL.revokeObjectURL`）。
- Provider は `App` 直下に配置し、MapEditor・SimulationPage・SpatialView から参照。

### 共有描画ヘルパー

座標変換が各ビューで異なるため、描画は 2 系統:

- **canvas 版**（MapEditor 用）: `drawMapBackground(ctx, bg, worldToScreen)` — ctx に画像を world→screen 変換で描画（`drawImage` ＋ globalAlpha）。MapEditor の既存描画ループの最初（グリッド/ノードの前）に挿入。
- **DOM/SVG 版**（LocationLayout・SpatialView 用）: `<MapBackgroundLayer transform={worldToScreen} />` 相当 — `<img>` を絶対配置し、四隅を world→screen で写したサイズ・位置・opacity で表示（背面）。

各ビューは自分の world→screen を持っているので、それを渡すだけでよい。

### MapEditor の追加

- ツールバーに「背景画像を読み込む」（file input）、不透明度スライダー、倍率・位置の微調整（数値 or ドラッグ）、画像クリア。
- 既存 canvas 描画ループの先頭で `drawMapBackground` を呼ぶ。
- 部屋（点）を画像上にドラッグ配置（既存のノードドラッグをそのまま活用）。
- 破綻ハイライト（下記）。

### シミュレーション（LocationLayout）の追加

- `MapBackgroundLayer` を LocationLayout の最背面に追加し、同じ world→screen（既存の bbox フィット変換を関数化して流用）で表示。
- 既存の人物アニメーション・位置表示はそのまま。

### 新規ページ: 空間ビュー `SpatialView`

`src/pages/SpatialPage.tsx` ＋ `src/components/SpatialView/SpatialView.tsx`（新規）、ナビに「空間ビュー」追加、ルート `/spatial`。

- 背景画像レイヤ（`MapBackgroundLayer`）。
- 部屋点（`location.x/y`）＋ラベル。
- **動線**: 各人物について、時刻順 acts の `locationId` 列から連続する位置を線で結ぶ（人物色）。同一場所の連続はまとめる。移動の軌跡を物理空間に重ねる。
- **破綻ハイライト**: 破綻に関与する場所を赤く強調（点＋必要なら動線の該当区間）。
- 任意（v1 最小）: 時刻スライダーで「その時刻の各人物位置」を表示（LocationLayout 同等）。最小実装では全動線の重ね描きで可とし、時刻再生は後追加でもよい。

### 破綻 → 場所の導出

`analyzeStory(storyData).breakages` から、各破綻が起きた Act の `locationId` を集めて「ハイライト対象の場所集合」を作る:

```
const breakLocationIds = new Set(
  breakages.map(b => storyData.acts.find(a => a.id === b.actId)?.locationId).filter(Boolean)
)
```

MapEditor と SpatialView はこの集合の場所を赤く描く。エンジン側で在室・到達可能性の破綻が増えても（次のエンジンスペック）、この導出は自動で反映される。

## エラー処理・エッジケース

- 画像未設定: 下敷きは描かない（各ビューは従来どおり点のみ表示）。
- `location.x/y` 未設定の場所: 背景の有無に関わらず、従来の挙動（LocationLayout は円形フォールバック、MapEditor は配置済み座標）に従う。空間ビューは x/y 未設定の場所を簡易フォールバック配置（円形）し注記。
- `storyData` が null: 各ページは従来のデータ未読込メッセージ。
- 画像解放: `clear()`／アンマウント時に `revokeObjectURL` でリーク防止。

## テスト方針

- 単体（純粋関数）:
  - 破綻→場所集合の導出（`breakLocationIds` 相当のヘルパー）を `analyzeStory` の結果＋storyData から正しく作る
  - world→screen と画像四隅の写像ヘルパー（offset/scale を世界座標へ変換する純粋関数）
  - 動線の構築（人物ごとの時刻順 location 列→線分列、同一場所連続の畳み込み）
- コンポーネント:
  - `MapBackgroundContext`: setImage/update/clear の状態遷移（object URL 生成・解放はモック）
  - `SpatialView`: storyData＋破綻を与えると、各 Act の動線要素と破綻場所のハイライト要素が描画される（要素存在で検証）
- E2E（Playwright）:
  - 空間ビューを開き、サンプル（学院ミステリ）で破綻場所がハイライトされ動線が見える
  - （画像アップロードは file input のため E2E では最小確認に留める）

## 受け入れ基準

1. MapEditor で背景画像を読み込み、不透明度・位置・倍率を調整して部屋点を画像上に配置できる。
2. 同じ背景画像が、シミュレーションの LocationLayout と空間ビューでも同じ配置で表示される（ローカル・非保存）。
3. 空間ビューで、各人物の動線が物理配置上に描かれる。
4. MapEditor と空間ビューで、`analyzeStory` の破綻が起きた場所が赤くハイライトされる。
5. 因果ビューは時刻×人物のまま変更なし。
6. 既存テスト・lint・型チェックが通る。

## 実装フェーズ（順序）

1. `MapBackgroundContext`（ランタイム状態・object URL 管理）＋ Provider 配置
2. 共有描画ヘルパー（canvas 版 `drawMapBackground` / DOM 版 `MapBackgroundLayer`）と座標写像の純粋関数＋テスト
3. MapEditor 統合（画像読込 UI・下敷き描画・既存ノードドラッグ活用）
4. LocationLayout 下敷き表示
5. 破綻→場所導出ヘルパー＋テスト、MapEditor の破綻ハイライト
6. 空間ビュー `SpatialView`（背景＋点＋動線＋破綻ハイライト）＋ナビ/ルート
7. E2E と通し確認（学院ミステリサンプル）
