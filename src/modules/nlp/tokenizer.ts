// kuromoji.js を非同期にロードし、テキストをトークナイズするラッパー。
// 辞書ロードは重いので dicPath ごとに Promise をキャッシュ（シングルトン）する。
// ブラウザでは package.json の browser フィールドで BrowserDictionaryLoader に切り替わり、
// dicPath（CDN もしくは同梱パス）から fetch で辞書を取得する。

import { builder, type IpadicFeatures, type Tokenizer } from 'kuromoji'
import type { KuromojiToken } from './types'

// 辞書の既定配信元。同 origin の /dict/ から取得する（public/dict にコピー済み）。
// base（本番は /scene-flow/）を尊重するため import.meta.env.BASE_URL を前置する。
// kuromoji が path.join で URL を組むため、protocol を含む CDN ではなく同 origin 絶対パスにする。
export const DEFAULT_DIC_PATH = `${import.meta.env.BASE_URL}dict`

const cache = new Map<string, Promise<Tokenizer<IpadicFeatures>>>()

/**
 * kuromoji トークナイザをロードする（dicPath ごとにキャッシュ）。
 * 失敗時はキャッシュを破棄し、次回呼び出しで再試行できるようにする。
 */
export function loadTokenizer(
  dicPath: string = DEFAULT_DIC_PATH,
): Promise<Tokenizer<IpadicFeatures>> {
  const cached = cache.get(dicPath)
  if (cached) return cached

  const promise = new Promise<Tokenizer<IpadicFeatures>>((resolve, reject) => {
    builder({ dicPath }).build((err, tokenizer) => {
      if (err) {
        cache.delete(dicPath)
        reject(err instanceof Error ? err : new Error(String(err)))
        return
      }
      resolve(tokenizer)
    })
  })
  cache.set(dicPath, promise)
  return promise
}

/** テキストを形態素解析してトークン列を返す。 */
export async function tokenize(text: string, dicPath?: string): Promise<KuromojiToken[]> {
  const tokenizer = await loadTokenizer(dicPath)
  return tokenizer.tokenize(text) as KuromojiToken[]
}
