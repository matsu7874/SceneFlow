# SceneFlow モダン化チェックリスト

## 📊 進捗状況
- ✅ Phase 1: Vite環境のセットアップ - 完了
- ✅ Phase 2: コードの分割とモジュール化 - 完了  
- ✅ Phase 3: テスト環境の構築 - 完了
- ✅ Phase 4: TypeScriptの導入 - 完了（Phase 2と同時に実施）
- ✅ Phase 5: 開発ツールの設定 - 完了
- ✅ Phase 6: ビルドとデプロイ - 完了
- ✅ Phase 7: セキュリティとパフォーマンス - 完了

## 🎯 目標
単一HTMLファイルで構成されたSceneFlowを、Viteベースのモダンな開発環境に移行し、テスト可能で保守性の高いアプリケーションにする。

---

## Phase 1: Vite環境のセットアップ ✅

### 1.1 プロジェクト初期化
- [x] `npm init -y` でpackage.jsonを作成
- [x] `.gitignore`ファイルを作成（node_modules, dist等を追加）
- [x] `npm install --save-dev vite` でViteをインストール

### 1.2 Vite設定
- [x] `vite.config.ts`を作成（TypeScriptで作成）
- [x] package.jsonにスクリプトを追加:
  ```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
  ```

### 1.3 ディレクトリ構造の作成
- [x] 以下のディレクトリ構造を作成:
  ```
  scene-flow/
  ├── src/
  │   ├── index.html
  │   ├── main.ts
  │   ├── styles/
  │   │   └── main.css
  │   └── modules/
  ├── public/
  └── tests/
  ```

---

## Phase 2: コードの分割とモジュール化 ✅

### 2.1 HTMLファイルの整理
- [x] 現在の`index.html`を`src/index.html`にコピー
- [x] `<script>`タグの内容を削除
- [x] `<script type="module" src="/main.ts"></script>`を追加（TypeScriptに変更）
- [x] `<style>`タグの内容を削除
- [x] `<link rel="stylesheet" href="/styles/main.css">`を追加

### 2.2 CSSの分離
- [x] `src/styles/main.css`を作成
- [x] 元のHTMLから全てのスタイルをコピー

### 2.3 TypeScriptのモジュール分割
- [x] `src/main.ts`を作成（エントリーポイント）
- [x] `src/types/index.ts`を作成（型定義）
- [x] `src/modules/`に以下のファイルを作成:
  - [x] `constants.ts` - 定数（MINUTES_PER_SECOND等）
  - [x] `state.ts` - グローバル状態管理
  - [x] `utils/timeUtils.ts` - 時間関連のユーティリティ関数
  - [x] `utils/domUtils.ts` - DOM操作のユーティリティ
  - [x] `data/parser.ts` - JSONデータのパース処理
  - [x] `data/indexer.ts` - データのインデックス化
  - [x] `simulation/core.ts` - シミュレーションのコアロジック
  - [x] `simulation/events.ts` - イベント処理
  - [x] `ui/controls.ts` - 再生コントロール
  - [x] `ui/layout.ts` - レイアウト表示
  - [x] `ui/display.ts` - UI更新処理

### 2.4 各モジュールへの関数移動
- [x] `timeToMinutes`, `minutesToTime` → `utils/timeUtils.ts`
- [x] `getDOMElements` → `utils/domUtils.ts`
- [x] `parseJsonData` → `data/parser.ts`
- [x] `indexStoryData`, `sortEvents` → `data/indexer.ts`
- [x] `getStateAtTime` → `simulation/core.ts`
- [x] `generateLogEntries` → `simulation/events.ts`
- [x] `playSimulation`, `pauseSimulation`, `seekSimulation`, `changeSpeed` → `ui/controls.ts`
- [x] `updateLocationVisualization`, `initializeLocationLayout` → `ui/layout.ts`
- [x] `updateUI` → `ui/display.ts`

### 2.5 import/export の設定
- [x] 各モジュールでexport文を追加
- [x] main.tsで必要なモジュールをimport
- [x] 動作確認（`npm run dev`）

---

## Phase 3: テスト環境の構築 ✅

### 3.1 Vitestのセットアップ
- [x] `npm install --save-dev vitest @vitest/ui` をインストール
- [x] `vite.config.ts`にテスト設定を追加（jsdom環境設定）
- [x] package.jsonにテストスクリプトを追加:
  ```json
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "coverage": "vitest run --coverage"
  }
  ```

### 3.2 基本的なテストの作成
- [x] `tests/utils/timeUtils.test.ts` - 時間変換関数のテスト
- [x] `tests/data/parser.test.ts` - JSONパーサーのテスト
- [x] `tests/data/indexer.test.ts` - データインデックスのテスト
- [x] `tests/simulation/core.test.ts` - シミュレーションロジックのテスト

### 3.3 テストカバレッジの設定
- [x] `npm install --save-dev @vitest/coverage-v8`
- [x] カバレッジレポートの生成確認

---

## Phase 4: TypeScriptの導入 ✅

### 4.1 TypeScript環境のセットアップ
- [x] `npm install --save-dev typescript @types/node`
- [x] `tsconfig.json`を作成（手動で作成）
- [x] tsconfig.jsonの設定調整（target: ES2020, module: ESNext等）

### 4.2 型定義ファイルの作成
- [x] `src/types/index.ts` を作成
- [x] 基本的な型定義を追加:
  ```typescript
  interface Person { id: number; name: string; color: string; }
  interface Location { id: number; name: string; connections: number[]; }
  interface Act { id: number; personId: number; locationId: number; time: string; description: string; }
  interface Event { id: number; triggerType: string; triggerValue: string; eventTime: string; personId: number; actId: number; }
  ```
- [x] 追加の型定義（StoryData, IndexedData, SimState, DOMElements等）

### 4.3 段階的な型付け
- [x] 最初からTypeScriptで実装（`.ts`ファイル）
- [x] 各関数に型注釈を追加
- [x] 型エラーの修正

---

## Phase 5: 開発ツールの設定 ✅

### 5.1 ESLintの設定
- [x] `npm install --save-dev eslint @eslint/js @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-vitest`
- [x] `.eslintrc.json` で設定ファイル作成（TypeScript対応）
- [x] package.jsonにlintスクリプトを追加

### 5.2 Prettierの設定
- [x] `npm install --save-dev prettier eslint-config-prettier`
- [x] `.prettierrc`ファイルを作成
- [x] package.jsonにformatスクリプトを追加

### 5.3 Git Hooksの設定
- [x] `npm install --save-dev husky lint-staged`
- [x] pre-commitフックの設定（.husky/pre-commit）
- [x] コミット時の自動フォーマット設定（lint-staged設定）

---

## Phase 6: ビルドとデプロイ

### 6.1 ビルド設定の最適化
- [x] vite.config.jsでビルド設定を調整
- [x] 本番ビルドの動作確認（`npm run build`）

### 6.2 GitHub Actionsの設定
- [x] `.github/workflows/ci.yml`を作成
- [x] テスト自動実行の設定
- [x] ビルド自動実行の設定

### 6.3 デプロイ設定
- [x] GitHub Pagesへの自動デプロイ設定
- [x] または他のホスティングサービスの設定

---

## Phase 7: セキュリティとパフォーマンス

### 7.1 セキュリティ対策
- [x] innerHTML使用箇所をtextContentに置き換え（可能な場合）
- [x] 入力検証の強化
- [x] CSP（Content Security Policy）の設定

### 7.2 パフォーマンス最適化
- [x] 大量データ時のパフォーマンステスト
- [x] 必要に応じて仮想スクロールの実装
- [x] バンドルサイズの最適化

---

## 完了基準
- [x] すべてのチェックリストが完了
- [x] テストカバレッジが80%以上
- [x] 本番ビルドが正常に動作
- [x] CI/CDパイプラインが機能
- [ ] ドキュメント（README.md）の更新

---

## 注意事項
- 各フェーズは順番に実行することを推奨
- 各ステップ完了後は必ず動作確認を行う
- コミットは細かく行い、問題があれば巻き戻せるようにする