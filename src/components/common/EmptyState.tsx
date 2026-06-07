import React from 'react'
import { Link } from 'react-router-dom'
import styles from './EmptyState.module.css'

export interface EmptyStateAction {
  label: string
  /** 内部リンク先（指定時は <Link>） */
  to?: string
  /** ボタンとして使う場合のハンドラ（to 未指定時） */
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: React.ReactNode
  /** 「次にやること」を必ずボタン/リンクで示す。死に文言を避けるための要。 */
  actions?: EmptyStateAction[]
}

/**
 * 空状態の統一コンポーネント。
 * 「データが読み込まれていません」で終わらせず、次の具体アクションへ誘導する。
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actions }) => {
  return (
    <div className={styles.emptyState} role="status">
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {actions && actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map((action, i) => {
            const variantClass = action.variant === 'secondary' ? styles.secondary : styles.primary
            const cls = `${styles.action} ${variantClass}`
            return action.to ? (
              <Link key={i} to={action.to} className={cls}>
                {action.label}
              </Link>
            ) : (
              <button key={i} type="button" className={cls} onClick={action.onClick}>
                {action.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
