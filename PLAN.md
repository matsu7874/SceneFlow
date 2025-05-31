# SceneFlow モダン化チェックリスト

## 🎯 目標
単一HTMLファイルで構成されたSceneFlowを、Viteベースのモダンな開発環境に移行し、テスト可能で保守性の高いアプリケーションにする。

---

## Phase 1: Vite環境のセットアップ

### 1.1 プロジェクト初期化
- [ ] `npm init -y` でpackage.jsonを作成
- [ ] `.gitignore`ファイルを作成（node_modules, dist等を追加）
- [ ] `npm install --save-dev vite` でViteをインストール

### 1.2 Vite設定
- [ ] `vite.config.js`を作成
- [ ] package.jsonにスクリプトを追加:
  ```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
  ```

### 1.3 ディレクトリ構造の作成
- [ ] 以下のディレクトリ構造を作成:
  ```
  scene-flow/
  ├── src/
  │   ├── index.html
  │   ├── main.js
  │   ├── styles/
  │   │   └── main.css
  │   └── modules/
  ├── public/
  └── tests/
  ```

---

## Phase 2: コードの分割とモジュール化

### 2.1 HTMLファイルの整理
- [ ] 現在の`index.html`を`src/index.html`にコピー
- [ ] `<script>`タグの内容を削除
- [ ] `<script type="module" src="/main.js"></script>`を追加
- [ ] `<style>`タグの内容を削除
- [ ] `<link rel="stylesheet" href="/styles/main.css">`を追加

### 2.2 CSSの分離
- [ ] `src/styles/main.css`を作成
- [ ] 元のHTMLから全てのスタイルをコピー

### 2.3 JavaScriptのモジュール分割
- [ ] `src/main.js`を作成（エントリーポイント）
- [ ] `src/modules/`に以下のファイルを作成:
  - [ ] `constants.js` - 定数（MINUTES_PER_SECOND等）
  - [ ] `state.js` - グローバル状態管理
  - [ ] `utils/timeUtils.js` - 時間関連のユーティリティ関数
  - [ ] `utils/domUtils.js` - DOM操作のユーティリティ
  - [ ] `data/parser.js` - JSONデータのパース処理
  - [ ] `data/indexer.js` - データのインデックス化
  - [ ] `simulation/core.js` - シミュレーションのコアロジック
  - [ ] `simulation/events.js` - イベント処理
  - [ ] `ui/controls.js` - 再生コントロール
  - [ ] `ui/locationDisplay.js` - 場所表示
  - [ ] `ui/logDisplay.js` - ログ表示
  - [ ] `ui/layout.js` - レイアウト表示

### 2.4 各モジュールへの関数移動
- [ ] `timeToMinutes`, `minutesToTime` → `utils/timeUtils.js`
- [ ] `getDOMElements`, `displayError`, `clearError` → `utils/domUtils.js`
- [ ] `parseJsonData` → `data/parser.js`
- [ ] `indexStoryData`, `sortEvents` → `data/indexer.js`
- [ ] `getStateAtTime` → `simulation/core.js`
- [ ] `generateLogEntries` → `simulation/events.js`
- [ ] `playSimulation`, `pauseSimulation`, `seekSimulation`, `changeSpeed` → `ui/controls.js`
- [ ] `updateLocationVisualization`, `initializeLocationLayout` → `ui/layout.js`
- [ ] `updateUI` → 適切なモジュールに分割

### 2.5 import/export の設定
- [ ] 各モジュールでexport文を追加
- [ ] main.jsで必要なモジュールをimport
- [ ] 動作確認（`npm run dev`）

---

## Phase 3: テスト環境の構築

### 3.1 Vitestのセットアップ
- [ ] `npm install --save-dev vitest @vitest/ui` をインストール
- [ ] `vite.config.js`にテスト設定を追加
- [ ] package.jsonにテストスクリプトを追加:
  ```json
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "coverage": "vitest --coverage"
  }
  ```

### 3.2 基本的なテストの作成
- [ ] `tests/utils/timeUtils.test.js` - 時間変換関数のテスト
- [ ] `tests/data/parser.test.js` - JSONパーサーのテスト
- [ ] `tests/data/indexer.test.js` - データインデックスのテスト
- [ ] `tests/simulation/core.test.js` - シミュレーションロジックのテスト

### 3.3 テストカバレッジの設定
- [ ] `npm install --save-dev @vitest/coverage-v8`
- [ ] カバレッジレポートの生成確認

---

## Phase 4: TypeScriptの導入

### 4.1 TypeScript環境のセットアップ
- [ ] `npm install --save-dev typescript @types/node`
- [ ] `npx tsc --init` でtsconfig.jsonを生成
- [ ] tsconfig.jsonの設定調整（target: ES2020, module: ESNext等）

### 4.2 型定義ファイルの作成
- [ ] `src/types/index.ts` を作成
- [ ] 基本的な型定義を追加:
  ```typescript
  interface Person { id: number; name: string; color: string; }
  interface Location { id: number; name: string; connections: number[]; }
  interface Act { id: number; personId: number; locationId: number; time: string; description: string; }
  interface Event { id: number; triggerType: string; triggerValue: string; eventTime: string; personId: number; actId: number; }
  ```

### 4.3 段階的な型付け
- [ ] `.js`ファイルを`.ts`に順次リネーム
- [ ] 各関数に型注釈を追加
- [ ] 型エラーの修正

---

## Phase 5: 開発ツールの設定

### 5.1 ESLintの設定
- [ ] `npm install --save-dev eslint @eslint/js`
- [ ] `npx eslint --init` で設定ファイル作成
- [ ] package.jsonにlintスクリプトを追加

### 5.2 Prettierの設定
- [ ] `npm install --save-dev prettier`
- [ ] `.prettierrc`ファイルを作成
- [ ] package.jsonにformatスクリプトを追加

### 5.3 Git Hooksの設定
- [ ] `npm install --save-dev husky lint-staged`
- [ ] pre-commitフックの設定
- [ ] コミット時の自動フォーマット設定

---

## Phase 6: ビルドとデプロイ

### 6.1 ビルド設定の最適化
- [ ] vite.config.jsでビルド設定を調整
- [ ] 本番ビルドの動作確認（`npm run build`）

### 6.2 GitHub Actionsの設定
- [ ] `.github/workflows/ci.yml`を作成
- [ ] テスト自動実行の設定
- [ ] ビルド自動実行の設定

### 6.3 デプロイ設定
- [ ] GitHub Pagesへの自動デプロイ設定
- [ ] または他のホスティングサービスの設定

---

## Phase 7: セキュリティとパフォーマンス

### 7.1 セキュリティ対策
- [ ] innerHTML使用箇所をtextContentに置き換え（可能な場合）
- [ ] 入力検証の強化
- [ ] CSP（Content Security Policy）の設定

### 7.2 パフォーマンス最適化
- [ ] 大量データ時のパフォーマンステスト
- [ ] 必要に応じて仮想スクロールの実装
- [ ] バンドルサイズの最適化

---

## 完了基準
- [ ] すべてのチェックリストが完了
- [ ] テストカバレッジが80%以上
- [ ] 本番ビルドが正常に動作
- [ ] CI/CDパイプラインが機能
- [ ] ドキュメント（README.md）の更新

---

## 注意事項
- 各フェーズは順番に実行することを推奨
- 各ステップ完了後は必ず動作確認を行う
- コミットは細かく行い、問題があれば巻き戻せるようにする