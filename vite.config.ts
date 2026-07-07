import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, cpSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { kuromojiDictPlugin, kuromojiAlias } from '@matsu7874/kuromoji-web/vite'

const projectRoot = dirname(fileURLToPath(import.meta.url))

// GitHub Pages で /scene-flow/space などの深いURLを直接開いてもアプリが起動するよう、
// index.html を 404.html として複製する（SPAフォールバック）。
// kuromoji 辞書配信とは無関係なアプリ固有の関心事のため @matsu7874/kuromoji-web には含まれておらず、
// ここで別途実装する（パッケージ側の [移植時の意図的なスコープ除外] を参照）。
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    closeBundle() {
      const indexHtml = resolve(projectRoot, 'dist/index.html')
      if (existsSync(indexHtml)) {
        cpSync(indexHtml, resolve(projectRoot, 'dist/404.html'))
      }
    },
  }
}

// 本番（GH Pages）は /scene-flow/ 配下で配信される。vite preview ではプラグインの
// ミドルウェアが Vite の base 除去より先に実行されるため、urlPath を base に
// 追随させないと base 付き URL の辞書リクエストが素通りして二重 gzip 復活する。
const base = process.env.NODE_ENV === 'production' ? '/scene-flow/' : '/'

export default defineConfig({
  // root が 'src' のため、kuromoji-dict/ はプロジェクトルート直下にある前提で絶対パスを渡す
  // （既定の 'kuromoji-dict' は config.root 基準で解決され、src/kuromoji-dict を指してしまうため）。
  plugins: [
    kuromojiDictPlugin({ dictDir: resolve(projectRoot, 'kuromoji-dict'), urlPath: `${base}dict/` }),
    spaFallback(),
    react(),
  ],
  root: 'src',
  base,
  resolve: {
    alias: {
      // kuromoji の DictionaryLoader が Node の path に依存するため、ブラウザ向けにポリフィルを噛ませる。
      ...kuromojiAlias(),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      // チャンク分割は App.tsx のルート単位 dynamic import に任せる
      // （旧 manualChunks: undefined は単一バンドル化の意図ではなくデフォルト挙動と同義だった）
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    root: './',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: './tests/setup.ts',
  },
})
