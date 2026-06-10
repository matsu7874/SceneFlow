import React, { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { NAV_SECTIONS } from './navConfig'
import { useAppContext } from '../../contexts/AppContext'
import { useVisualFeedback } from '../../contexts/VisualFeedbackContext'
import { validateStoryData } from '../../utils/validation'
import { normalizeStoryData } from '../../utils/normalizeStoryData'
import type { StoryData } from '../../types/StoryData'
import styles from './Navigation.module.css'

/** 入力欄での Ctrl+Z（テキストの取り消し）を奪わないための判定。 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export const Navigation: React.FC = () => {
  const { storyData, setStoryData, undo, redo, canUndo, canRedo, saveState } = useAppContext()
  const { showNotification } = useVisualFeedback()
  const { pathname } = useLocation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 全画面共通の undo/redo ショートカット。
  // /space はマップエディタが独自の Ctrl+Z 履歴を持つため委ねる。
  const onSpacePage = pathname === '/space'
  useEffect(() => {
    if (onSpacePage) return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey) || isEditableTarget(e.target)) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (e.key === 'Z' || (e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSpacePage, undo, redo])

  const handleExport = (): void => {
    if (!storyData) return
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13)
    const blob = new Blob([JSON.stringify(storyData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `sceneflow-story-${stamp}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    showNotification('物語データをJSONファイルとして書き出しました', { type: 'success' })
  }

  const handleImportFile = async (file: File): Promise<void> => {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as StoryData
      const result = validateStoryData(data)
      if (!result.isValid) {
        showNotification(`読み込めませんでした: ${result.errors[0]}`, {
          type: 'error',
          duration: 6000,
        })
        return
      }
      setStoryData(normalizeStoryData(data))
      showNotification(`「${file.name}」を読み込みました`, { type: 'success' })
    } catch {
      showNotification(
        `「${file.name}」はJSONとして読み込めませんでした。書き出したファイルを指定してください`,
        { type: 'error', duration: 6000 },
      )
    }
  }

  return (
    <nav className={styles.nav}>
      {NAV_SECTIONS.map(section => (
        <div key={section.id} className={styles.section}>
          <span className={styles.sectionLabel}>{section.label}</span>
          <div className={styles.links}>
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.hint}
                className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}

      {/* データ全体の操作。どの画面からでも取り消し・バックアップできるようにする。 */}
      <div className={styles.globalActions}>
        {!onSpacePage && (
          <>
            <button
              type="button"
              className={styles.actionButton}
              onClick={undo}
              disabled={!canUndo}
              title="直前の編集を取り消す (Ctrl+Z)"
            >
              ↩ 元に戻す
            </button>
            <button
              type="button"
              className={styles.actionButton}
              onClick={redo}
              disabled={!canRedo}
              title="取り消した編集をやり直す (Ctrl+Shift+Z)"
            >
              ↪ やり直す
            </button>
          </>
        )}
        <button
          type="button"
          className={styles.actionButton}
          onClick={handleExport}
          disabled={!storyData}
          title="物語データをJSONファイルとしてダウンロードする"
        >
          ⬇ 書き出し
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => fileInputRef.current?.click()}
          title="書き出したJSONファイルを読み込む（現在のデータは置き換え。Ctrl+Zで戻せます）"
        >
          ⬆ 読み込み
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className={styles.fileInput}
          aria-label="物語データのJSONファイルを読み込む"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) void handleImportFile(file)
            // 同じファイルを選び直しても change が発火するようリセットする
            e.target.value = ''
          }}
        />
        {saveState === 'error' ? (
          <span className={`${styles.saveStatus} ${styles.saveError}`} role="alert">
            ⚠ 保存失敗（容量超過の可能性。書き出しでバックアップを）
          </span>
        ) : (
          <span className={styles.saveStatus} title="編集はこのブラウザに自動保存されます">
            {saveState === 'saved' ? '✓ 自動保存' : ''}
          </span>
        )}
      </div>
    </nav>
  )
}
