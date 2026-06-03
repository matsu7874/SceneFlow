.PHONY: up install build preview test lint

# 開発サーバを起動する（http://localhost:3000）
up: node_modules
	npm run dev

# 依存関係をインストールする
install:
	npm install

# node_modules が無ければ install を実行する
node_modules:
	npm install

# 本番ビルド
build: node_modules
	npm run build

# 本番ビルドのプレビュー
preview: node_modules
	npm run preview

# テスト
test: node_modules
	npm test

# Lint
lint: node_modules
	npm run lint
