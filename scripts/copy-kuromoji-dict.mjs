// kuromoji の辞書ファイルを kuromoji-dict/ へコピーする。
// この辞書は /dict/ として Vite プラグイン（vite.config.ts）が配信する。
// Vite の publicDir(sirv) は .gz に Content-Encoding: gzip を付けてしまい、
// ブラウザが二重解凍して kuromoji の gunzip が失敗するため、publicDir には置かない。
// 辞書は約13MB と大きいのでリポジトリには含めず（.gitignore）、ここで都度コピーする。
import { existsSync, mkdirSync, cpSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'node_modules/kuromoji/dict')
const dest = resolve(root, 'kuromoji-dict')

if (!existsSync(src)) {
  console.error('[copy-kuromoji-dict] 辞書が見つかりません:', src)
  console.error('[copy-kuromoji-dict] `npm install` を実行してください。')
  process.exit(1)
}

// 既にコピー済み（ファイル数が一致）ならスキップして毎回のコピーを避ける。
const srcCount = readdirSync(src).length
if (existsSync(dest) && readdirSync(dest).length >= srcCount) {
  process.exit(0)
}

mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
console.log(`[copy-kuromoji-dict] ${srcCount} ファイルを ${dest} へコピーしました。`)
