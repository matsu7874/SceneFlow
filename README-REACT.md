# Scene-Flow React版

## 概要

Scene-FlowのReact実装版です。イマーシブシアターのシミュレーションを視覚的に体験できます。

## 機能

- JSONデータによる物語の定義
- 時間軸に沿ったシミュレーション再生
- 登場人物の位置トラッキング
- イベントログの表示
- 場所の視覚的レイアウト表示
- 再生速度の調整（1x, 2x, 5x, 10x）

## 開発

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# ビルド結果のプレビュー
npm run preview
```

## デプロイ

GitHub Actionsを使用して自動的にGitHub Pagesにデプロイされます。
mainブランチにプッシュすると自動的にビルドとデプロイが実行されます。

## 技術スタック

- React 18
- TypeScript
- Vite
- GitHub Pages
- GitHub Actions

## データフォーマット

物語データはJSON形式で定義します。詳細なフォーマットについては、デフォルトで表示されるサンプルデータを参照してください。

主要な要素：
- `persons`: 登場人物の定義
- `locations`: 場所の定義と接続関係
- `props`: 小道具の定義
- `informations`: 情報の定義
- `acts`: 行動の定義
- `events`: イベントのトリガー定義