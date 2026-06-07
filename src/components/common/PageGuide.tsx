import React, { useState } from 'react'
import styles from './PageGuide.module.css'

interface PageGuideProps {
  /** サマリー行の見出し（例: "操作ガイド"） */
  summary: string
  children: React.ReactNode
  /** 既定の開閉状態（storageKey に保存がなければこちらを使う） */
  defaultOpen?: boolean
  /** localStorage に開閉状態を記憶するキー（指定時のみ永続化） */
  storageKey?: string
}

/**
 * 常設の操作ガイド（<details> ベース）。
 * 「折りたたまれていて開くボタンが無い」状態を解消し、開閉状態を localStorage に記憶する。
 */
export const PageGuide: React.FC<PageGuideProps> = ({
  summary,
  children,
  defaultOpen = true,
  storageKey,
}) => {
  const [open, setOpen] = useState<boolean>(() => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(storageKey)
      if (stored !== null) return stored === 'true'
    }
    return defaultOpen
  })

  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>): void => {
    const isOpen = e.currentTarget.open
    setOpen(isOpen)
    if (storageKey && typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, String(isOpen))
    }
  }

  return (
    <details className={styles.guide} open={open} onToggle={handleToggle}>
      <summary className={styles.summary}>
        <span className={styles.icon} aria-hidden="true">
          ?
        </span>
        <span className={styles.summaryText}>{summary}</span>
      </summary>
      <div className={styles.content}>{children}</div>
    </details>
  )
}
