# Scene-Flow React移行計画

## ✅ React移行完了

Scene-FlowのReact移行が完了しました！

### 完了した作業

- ✅ React環境のセットアップ
- ✅ コンポーネント化（JSON入力、シミュレーション制御、位置表示、ログ、レイアウト表示）
- ✅ TypeScript対応
- ✅ カスタムフックによる状態管理
- ✅ GitHub Pagesデプロイ設定
- ✅ GitHub Actions自動デプロイ

### 次のステップ

1. GitHubのリポジトリ設定でGitHub Pagesを有効化
2. mainブランチにプッシュすると自動デプロイ

---

## プロジェクト概要

Scene-Flowは、イマーシブシアターシミュレーターであり、現在はReact + TypeScriptで実装されている。

## 現在の技術スタックとファイル構成

### 技術スタック

- **フロントエンド**:
  - Vanilla JavaScript版 (ルート/index.html内のscriptタグ - 参考実装)
  - TypeScript版 (src/main.ts - 現在のメイン実装)
- **ビルドツール**: Vite
- **テストツール**: Vitest
- **コード品質**: ESLint, Prettier, Husky

### 現在のファイル構成

```
scene-flow/
├── index.html          # Vanilla JS参考実装（インラインscript）
├── src/
│   ├── index.html      # TypeScript版エントリーポイント
│   ├── main.ts         # メインロジック
│   └── modules/        # モジュール化されたコード
├── dist/               # ビルド出力（GitHub Pagesで公開）
└── package.json
```

## 移行後の技術スタックと構成

### 技術スタック

- **フロントエンド**: React 18 + TypeScript
- **状態管理**: React Context API または Zustand（グローバル状態管理が必要な場合）
- **ビルドツール**: Vite（既存を流用）
- **テストツール**: Vitest + React Testing Library
- **コード品質**: 既存の設定を維持
- **デプロイ**: GitHub Actions → GitHub Pages

### 移行後のファイル構成

```
scene-flow/
├── docs/                    # ドキュメント・参考実装
│   └── vanilla-example.html # 現在のルートindex.htmlを移動
├── src/
│   ├── index.html          # Reactアプリのエントリー
│   ├── main.tsx            # React起動ポイント
│   ├── App.tsx             # ルートコンポーネント
│   └── components/         # Reactコンポーネント
├── dist/                   # ビルド出力（.gitignore）
└── .github/
    └── workflows/
        └── deploy.yml      # 自動デプロイ設定
```

## 作業フェーズ

### フェーズ0: ファイル構成の整理（0.5日）

1. **現在の参考実装の移動**

   ```bash
   mkdir -p docs
   mv index.html docs/vanilla-example.html
   ```

2. **README.mdの更新**

   - Vanilla JS版の参考実装の場所を明記
   - 開発方法とビルド方法の説明

3. **.gitignoreの更新**
   - dist/フォルダを追加（ビルド成果物）

### フェーズ1: React環境のセットアップとGitHub Pages準備（1日）

1. **必要なパッケージのインストール**

   ```bash
   npm install react react-dom @types/react @types/react-dom
   npm install -D @vitejs/plugin-react @testing-library/react @testing-library/jest-dom
   ```

2. **Vite設定の更新**

   - vite.config.tsにReactプラグインを追加
   - TypeScript設定でJSX対応を追加
   - GitHub Pages用のbase設定追加

   ```typescript
   export default defineConfig({
     base: '/scene-flow/', // リポジトリ名
     plugins: [react()],
     // ...
   })
   ```

3. **基本的なReactアプリケーション構造の作成**

   - src/App.tsx
   - src/main.tsx（エントリーポイント）
   - src/index.htmlの更新

4. **GitHub Actions設定**
   - .github/workflows/deploy.ymlの作成
   - 自動ビルド・デプロイの設定

### フェーズ2: コンポーネント設計と実装（3-4日）

#### コンポーネント階層構造

```
App
├── Header
├── DataInput
│   └── JsonDataInput
├── SimulationControl
│   ├── PlayPauseButton
│   ├── SpeedControl
│   └── Timeline
├── OutputArea
│   ├── LocationOutput
│   └── LogOutput
├── LocationLayout
│   └── LocationBox
└── ErrorDisplay
```

#### 主要コンポーネントの実装順序

1. **App.tsx** - メインコンテナ
2. **DataInput.tsx** - JSONデータ入力部分
3. **SimulationControl.tsx** - シミュレーション制御部分
4. **LocationLayout.tsx** - 場所レイアウト表示
5. **OutputArea.tsx** - 出力エリア（位置情報、ログ）

### フェーズ3: 状態管理の実装（2日）

#### グローバル状態の設計

```typescript
interface SimulationState {
  // 時間管理
  currentTimeMinutes: number
  minTimeMinutes: number
  maxTimeMinutes: number

  // 再生状態
  isPlaying: boolean
  speed: number

  // データ
  indexedData: IndexedData | null
  sortedEvents: Event[] | null
  eventLogEntries: LogEntry[]

  // UI状態
  isDetailsOpen: boolean
}
```

#### Context APIまたはZustandでの実装

- シミュレーション状態の管理
- アクション（play, pause, seek, changeSpeed, loadData）の実装

### フェーズ4: 既存ロジックの移植（2-3日）

1. **ユーティリティ関数の移植**

   - 時間変換関数（timeToMinutes, minutesToTime）
   - データパース関数（parseJsonData）
   - インデックス関数（indexStoryData, sortEvents）

2. **シミュレーションロジックの移植**

   - getStateAtTime
   - generateLogEntries
   - updateLocationVisualization

3. **カスタムフックの作成**
   - useSimulation - シミュレーション制御
   - useStoryData - データ管理
   - useLocationLayout - レイアウト管理

### フェーズ5: スタイリングの移植（1日）

1. **CSS Modulesへの移行**

   - インラインスタイルをCSS Modulesに変換
   - レスポンシブデザインの維持

2. **スタイルの整理**
   - コンポーネント単位でのスタイル管理
   - 共通スタイルの抽出

### フェーズ6: テストの実装（2日）

1. **ユニットテスト**

   - ユーティリティ関数のテスト
   - カスタムフックのテスト

2. **コンポーネントテスト**

   - 各コンポーネントの表示テスト
   - インタラクションテスト

3. **統合テスト**
   - シミュレーション全体の動作テスト

### フェーズ7: 最適化と仕上げ（1日）

1. **パフォーマンス最適化**

   - React.memo の適用
   - useMemo / useCallback の適用
   - 不要な再レンダリングの削減

2. **アクセシビリティの改善**

   - ARIA属性の追加
   - キーボード操作のサポート

3. **ドキュメントの更新**
   - README.mdの更新
   - コンポーネントのドキュメント

## 今後の拡張機能（REQUIREMENTS.mdより）

移行完了後に実装を検討する機能：

1. **画面操作での物語データ編集**

   - ドラッグ&ドロップでの人物移動
   - 場所の追加・削除

2. **部屋の接続関係の可視化**

   - グラフ表示での接続関係

3. **エンティティ一覧機能**

   - 登場人物、場所、小道具などの一覧表示

4. **因果ビュー**

   - アイテムの所有履歴追跡
   - 行動の前提条件・事後条件の検証

5. **人物ごとの所有物表示**
   - 各人物が持っているアイテムの表示

## GitHub Pagesデプロイ設定

### ビルドプロセス

1. **開発時**: `npm run dev`でsrc/index.htmlを起点に開発
2. **ビルド時**: `npm run build`でdist/に最適化されたファイルを出力
3. **デプロイ時**: GitHub Actionsがdist/の内容をGitHub Pagesに公開

### GitHub Actions設定（.github/workflows/deploy.yml）

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### デプロイ後のURL

- https://[username].github.io/scene-flow/

## 作業見積もり

- **総作業日数**: 約12-16日（GitHub Pages設定含む）
- **優先度**:
  1. ファイル構成整理とGitHub Pages準備（フェーズ0-1）
  2. 基本機能の移植（フェーズ2-4）
  3. UI/UXの改善（フェーズ5）
  4. 品質保証（フェーズ6-7）

## リスクと対策

### リスク

1. **状態管理の複雑性**

   - 対策: 段階的な移行とテストの充実

2. **パフォーマンスの低下**

   - 対策: 初期段階からの最適化意識

3. **既存機能の漏れ**
   - 対策: 詳細な機能一覧の作成とチェックリスト

### 成功指標

1. 既存の全機能がReactで動作する
2. パフォーマンスが既存版と同等以上
3. コードの保守性・拡張性が向上
4. テストカバレッジ80%以上

## 次のステップ

1. この計画のレビューと承認
2. フェーズ0のファイル構成整理から開始
3. GitHub Pagesの設定確認
4. フェーズ1の環境セットアップ
5. 各フェーズ完了時の動作確認とフィードバック

## 開発からデプロイまでのフロー

1. **ローカル開発**

   ```bash
   npm run dev  # http://localhost:3000で確認
   ```

2. **ビルド確認**

   ```bash
   npm run build    # dist/にビルド
   npm run preview  # ビルド結果をローカルで確認
   ```

3. **デプロイ**

   ```bash
   git add .
   git commit -m "feat: implement feature"
   git push origin main  # GitHub Actionsが自動でデプロイ
   ```

4. **公開確認**
   - https://[username].github.io/scene-flow/ にアクセス
