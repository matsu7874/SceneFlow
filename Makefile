.PHONY: up install build preview test lint

# 開発サーバを起動する（http://localhost:3000）
up: node_modules
	pnpm run dev

# 依存関係をインストールする
install:
	pnpm install

# node_modules が無ければ install を実行する
node_modules:
	pnpm install

# 本番ビルド
build: node_modules
	pnpm run build

# 本番ビルドのプレビュー
preview: node_modules
	pnpm run preview

# テスト
test: node_modules
	pnpm test

# Lint
lint: node_modules
	pnpm run lint
