import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react'
import { StoryData } from '../types/StoryData'
import { normalizeStoryData } from '../utils/normalizeStoryData'
import { loadStoredStory, saveStoredStory } from './storyPersistence'

/** 自動保存の状態。idle=未保存データなし, saved=保存済み, error=書き込み失敗 */
export type SaveState = 'idle' | 'saved' | 'error'

interface AppContextType {
  storyData: StoryData | null
  setStoryData: (data: StoryData | null) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  /** 直前の編集を取り消す（全ページ共通の編集履歴） */
  undo: () => void
  /** 取り消した編集をやり直す */
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  /** localStorage への自動保存の状態（失敗時にユーザーへ警告するため） */
  saveState: SaveState
}

const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppProviderProps {
  children: ReactNode
}

/** 編集履歴の最大保持数。スナップショットは参照共有なのでメモリ負荷は小さい。 */
const HISTORY_LIMIT = 100

export const AppProvider: React.FC<AppProviderProps> = ({ children }): React.ReactElement => {
  const [storyData, setStoryDataRaw] = useState<StoryData | null>(() =>
    typeof window !== 'undefined' ? loadStoredStory(window.localStorage) : null,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  // 全ページ共通の undo/redo 履歴。誤削除などをどの画面からでも復元できるようにする。
  // StrictMode の二重実行で履歴が壊れないよう、setState の updater 内では操作しない。
  const currentRef = useRef<StoryData | null>(storyData)
  const undoStack = useRef<Array<StoryData | null>>([])
  const redoStack = useRef<Array<StoryData | null>>([])
  const [, setHistoryVersion] = useState(0)

  const setStoryData = useCallback((data: StoryData | null) => {
    // どの経路から来ても正規化済みデータだけが状態に入ることを保証する。
    // 格納済みと同一参照の再セットは正規化済みなのでそのまま（無変更セットの履歴汚染を防ぐ）。
    const next = data === null || data === currentRef.current ? data : normalizeStoryData(data)
    if (next !== currentRef.current) {
      undoStack.current.push(currentRef.current)
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
      redoStack.current = []
    }
    currentRef.current = next
    setStoryDataRaw(next)
    setHistoryVersion(v => v + 1)
  }, [])

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return
    const prev = undoStack.current.pop() as StoryData | null
    redoStack.current.push(currentRef.current)
    currentRef.current = prev
    setStoryDataRaw(prev)
    setHistoryVersion(v => v + 1)
  }, [])

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return
    const next = redoStack.current.pop() as StoryData | null
    undoStack.current.push(currentRef.current)
    currentRef.current = next
    setStoryDataRaw(next)
    setHistoryVersion(v => v + 1)
  }, [])

  // storyData の変更を localStorage に反映し、リロードしてもデータが消えないようにする。
  // 容量超過などで保存に失敗した場合は saveState='error' とし、UI 側で警告を出す。
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ok = saveStoredStory(window.localStorage, storyData)
      setSaveState(ok ? (storyData ? 'saved' : 'idle') : 'error')
    }
  }, [storyData])

  return (
    <AppContext.Provider
      value={{
        storyData,
        setStoryData,
        isLoading,
        setIsLoading,
        undo,
        redo,
        canUndo: undoStack.current.length > 0,
        canRedo: redoStack.current.length > 0,
        saveState,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
