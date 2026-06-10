import React, { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { NAV_SECTIONS } from './navConfig'
import styles from './Navigation.module.css'

/**
 * グローバルナビ。作業フェーズ（書く→組む→検証・分析）ごとに
 * プルダウンへ折りたたみ、狭い横幅でも各カテゴリの項目を一覧できるようにする。
 * トリガーには現在地のページ名を出し、開いていなくても「いまどこか」が分かる。
 */
export const Navigation: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const location = useLocation()

  // ルート遷移したらメニューを閉じる。
  useEffect(() => {
    setOpenId(null)
  }, [location.pathname])

  // 外側クリック・Esc で閉じる。
  useEffect(() => {
    if (!openId) return
    const onPointerDown = (e: MouseEvent): void => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenId(null)
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpenId(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openId])

  return (
    <nav className={styles.nav} ref={navRef} aria-label="メインナビゲーション">
      {NAV_SECTIONS.map(section => {
        const isOpen = openId === section.id
        const activeItem = section.items.find(item => item.to === location.pathname)
        return (
          <div key={section.id} className={styles.section}>
            <button
              type="button"
              className={`${styles.trigger} ${activeItem ? styles.triggerActive : ''} ${
                isOpen ? styles.triggerOpen : ''
              }`}
              aria-haspopup="true"
              aria-expanded={isOpen}
              onClick={() => setOpenId(prev => (prev === section.id ? null : section.id))}
            >
              <span className={styles.triggerLabel}>{section.label}</span>
              {activeItem && <span className={styles.triggerCurrent}>{activeItem.label}</span>}
              <span className={styles.caret} aria-hidden="true">
                ▾
              </span>
            </button>

            {isOpen && (
              <div className={styles.menu}>
                {section.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.hint}
                    // アクセシブル名はラベルのみにする（ヒント文を連結しない）。
                    aria-label={item.label}
                    className={({ isActive }) =>
                      `${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`
                    }
                    onClick={() => setOpenId(null)}
                  >
                    <span className={styles.menuItemLabel}>{item.label}</span>
                    <span className={styles.menuItemHint}>{item.hint}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
