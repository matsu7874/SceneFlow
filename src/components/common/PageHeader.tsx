import React from 'react'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  /** 小さな英字ラベル（例: "Visualization"） */
  eyebrow: string
  /** ページタイトル（例: "空間ビュー"） */
  title: string
  /** ページの目的を1〜2文で説明する補助文。「何のための画面か」を必ず伝える。 */
  hint?: React.ReactNode
  /** 見出し右側に置くアクション（タブ・ボタンなど）。 */
  actions?: React.ReactNode
}

/**
 * 全ページ共通のページ見出し。eyebrow + title + hint を統一様式で表示する。
 * 「使い所が分からない」を防ぐため、hint で目的を明示する運用を標準化する。
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, hint, actions }) => {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.left}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h2 className={styles.title}>{title}</h2>
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
