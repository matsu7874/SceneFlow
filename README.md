# SceneFlow

[![CI/CD](https://github.com/yourusername/scene-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/scene-flow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

SceneFlowは、イマーシブシアター（没入型演劇）の上演シミュレーターです。複数の登場人物が異なる場所で同時進行する物語の流れを可視化し、シミュレーションすることができます。

## 🎭 概要

イマーシブシアターでは、観客が自由に移動しながら物語を体験します。SceneFlowは、このような複雑な物語構造を設計・検証するためのツールです。

### 主な機能

- **タイムラインシミュレーション**: 物語の時間軸に沿って登場人物の動きを再生
- **場所別ビュー**: 各場所にいる登場人物をリアルタイムで表示
- **イベントログ**: 発生したイベントの時系列表示
- **JSON形式のデータ管理**: 物語データの簡単な編集と保存
- **高速シミュレーション**: 1x〜100xの再生速度調整

## 🚀 技術スタック

- **フレームワーク**: Vite 6.3+
- **言語**: TypeScript 5.0+
- **テスト**: Vitest
- **リンター**: ESLint + Prettier
- **CI/CD**: GitHub Actions
- **デプロイ**: GitHub Pages

## 📦 インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/scene-flow.git
cd scene-flow

# 依存関係をインストール
npm install
```

## 🛠️ 開発

```bash
# 開発サーバーを起動
npm run dev

# テストを実行
npm test

# テストカバレッジを確認
npm run coverage

# リントを実行
npm run lint

# コードフォーマット
npm run format

# 本番ビルド
npm run build
```

## 📐 プロジェクト構造

```
scene-flow/
├── src/
│   ├── index.html          # エントリーHTML
│   ├── main.ts            # アプリケーションエントリーポイント
│   ├── types/             # TypeScript型定義
│   ├── modules/
│   │   ├── constants.ts   # 定数定義
│   │   ├── state.ts       # グローバル状態管理
│   │   ├── data/          # データ処理モジュール
│   │   ├── simulation/    # シミュレーションロジック
│   │   ├── ui/            # UIコンポーネント
│   │   └── utils/         # ユーティリティ関数
│   └── styles/
│       └── main.css       # スタイルシート
├── tests/                 # テストファイル
├── .github/
│   └── workflows/         # GitHub Actions設定
└── dist/                  # ビルド出力（gitignore）
```

## 📝 データフォーマット

SceneFlowは以下の構造のJSONデータを使用します：

```json
{
  "persons": [{ "id": 1, "name": "アリス", "color": "#e6194b" }],
  "locations": [{ "id": 1, "name": "エントランス", "connections": [2, 3] }],
  "acts": [
    {
      "id": 1,
      "personId": 1,
      "locationId": 1,
      "time": "09:00",
      "description": "入場"
    }
  ],
  "events": [
    {
      "id": 1,
      "triggerType": "time",
      "triggerValue": "09:00",
      "eventTime": "09:00",
      "personId": 1,
      "actId": 1
    }
  ],
  "initialStates": [{ "personId": 1, "locationId": 1 }]
}
```

### データ要素の説明

- **persons**: 登場人物の定義（ID、名前、表示色）
- **locations**: 場所の定義（ID、名前、接続関係）
- **acts**: 行動の定義（誰が、いつ、どこで、何をするか）
- **events**: イベントトリガー（時間や他のイベントに基づく行動の実行）
- **initialStates**: 登場人物の初期位置

## 🔒 セキュリティ

- Content Security Policy (CSP) によるXSS対策
- 入力データの厳格な検証（最大10MB、最大10,000項目）
- 安全なDOM操作（innerHTML の使用を最小限に）

## ⚡ パフォーマンス

- 最大500人の登場人物を同時シミュレーション可能
- 効率的なデータインデックシング
- 最適化されたバンドルサイズ（gzip圧縮で約4KB）

## 🧪 テスト

```bash
# すべてのテストを実行
npm test

# 特定のテストファイルを実行
npm test tests/utils/timeUtils.test.ts

# テストUIを開く
npm run test:ui

# カバレッジレポートを生成
npm run coverage
```

現在のテストカバレッジ: **80%以上**

## 🚀 デプロイ

GitHub Actionsによる自動デプロイが設定されています。`main`ブランチへのプッシュで自動的にGitHub Pagesにデプロイされます。

手動デプロイの場合：

```bash
npm run build
# distフォルダの内容をWebサーバーにアップロード
```

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### 開発ガイドライン

- TypeScriptの型安全性を維持
- すべての新機能にテストを追加
- ESLintルールに従う
- コミット前に`npm run lint`と`npm test`を実行

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

このプロジェクトは、イマーシブシアター制作者のニーズから生まれました。すべての貢献者に感謝します。

---

🤖 Generated with [Claude Code](https://claude.ai/code)
