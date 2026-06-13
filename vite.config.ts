import { defineConfig, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createReadStream, existsSync, cpSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const dictDir = resolve(projectRoot, 'kuromoji-dict')

// kuromoji 辞書（*.dat.gz）を /dict/ で配信するプラグイン。
// Vite の publicDir(sirv) は .gz に Content-Encoding: gzip を付与し、ブラウザが
// 自動解凍した結果 kuromoji 側の gunzip が二重解凍で失敗する。これを避けるため、
// 辞書は publicDir 外に置き、ここで Content-Encoding を付けない生バイトとして返す。
// dev / preview では中間ミドルウェアで、本番ビルドでは dist/dict へコピーして配る。
function kuromojiDict(): Plugin {
  const serve: Connect.NextHandleFunction = (req, res, next) => {
    const match = /\/dict\/([^/?]+\.gz)(?:\?.*)?$/.exec(req.url ?? '')
    const file = match ? resolve(dictDir, match[1]) : null
    if (!file || !existsSync(file)) {
      next()
      return
    }
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-transform')
    createReadStream(file).pipe(res)
  }
  return {
    name: 'serve-kuromoji-dict',
    configureServer(server) {
      server.middlewares.use(serve)
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve)
    },
    closeBundle() {
      // 本番成果物にも辞書を含める（dist/dict）。
      const out = resolve(projectRoot, 'dist/dict')
      if (existsSync(dictDir)) {
        mkdirSync(out, { recursive: true })
        cpSync(dictDir, out, { recursive: true })
      }
      // GitHub Pages で /scene-flow/space などの深いURLを直接開いても
      // アプリが起動するよう、index.html を 404.html として複製する（SPAフォールバック）。
      const indexHtml = resolve(projectRoot, 'dist/index.html')
      if (existsSync(indexHtml)) {
        cpSync(indexHtml, resolve(projectRoot, 'dist/404.html'))
      }
    },
  }
}

export default defineConfig({
  plugins: [kuromojiDict(), react()],
  root: 'src',
  base: process.env.NODE_ENV === 'production' ? '/scene-flow/' : '/',
  resolve: {
    alias: {
      // kuromoji の DictionaryLoader が Node の path に依存するため、ブラウザ向けにポリフィルを噛ませる。
      path: 'path-browserify',
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
