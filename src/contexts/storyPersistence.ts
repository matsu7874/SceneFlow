import type { StoryData } from '../types/StoryData'
import { normalizeStoryData } from '../utils/normalizeStoryData'

/** localStorage 互換の最小インターフェース（テスト時に差し替え可能にする）。 */
export interface StoryStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const STORY_STORAGE_KEY = 'sceneflow.storyData'

/**
 * 保存済みの物語データを読み込む。未保存・パース失敗時は null を返し、例外は投げない。
 */
export function loadStoredStory(storage: StoryStorage): StoryData | null {
  try {
    const raw = storage.getItem(STORY_STORAGE_KEY)
    if (raw == null) return null
    return normalizeStoryData(JSON.parse(raw) as StoryData)
  } catch {
    // 壊れたデータでアプリ起動を妨げない
    return null
  }
}

/**
 * 物語データを保存する。null の場合はキーを削除する。
 * 容量超過などの書き込み失敗でも例外は投げない（編集操作をブロックしないため）。
 * 失敗は戻り値 false で通知し、呼び出し側がユーザーへ警告できるようにする。
 */
export function saveStoredStory(storage: StoryStorage, data: StoryData | null): boolean {
  try {
    if (data == null) {
      storage.removeItem(STORY_STORAGE_KEY)
      return true
    }
    storage.setItem(STORY_STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    // 永続化失敗でも編集は継続させる（呼び出し側で警告表示）
    return false
  }
}
