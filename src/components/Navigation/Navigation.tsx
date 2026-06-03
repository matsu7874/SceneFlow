import React from 'react'
import { NavLink } from 'react-router-dom'
import styles from './Navigation.module.css'

export const Navigation: React.FC = () => {
  return (
    <nav className={styles.nav}>
      <div className={styles.links}>
        <NavLink
          to="/log"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          イベント入力
        </NavLink>
        <NavLink
          to="/entities"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          エンティティ編集
        </NavLink>
        <NavLink
          to="/relationships"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          関係性
        </NavLink>
        <NavLink
          to="/map-editor"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          マップエディタ
        </NavLink>
        <NavLink
          to="/causality"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          因果関係ビュー
        </NavLink>
        <NavLink
          to="/validation"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          検証
        </NavLink>
        <NavLink
          to="/simulation"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          シミュレーション
        </NavLink>
        <NavLink
          to="/spatial"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          空間ビュー
        </NavLink>
      </div>
    </nav>
  )
}
