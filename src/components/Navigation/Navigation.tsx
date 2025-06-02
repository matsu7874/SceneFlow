import React from 'react'
import { NavLink } from 'react-router-dom'
import styles from './Navigation.module.css'

export const Navigation: React.FC = () => {
  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <h1>Scene-Flow</h1>
      </div>
      <div className={styles.links}>
        <NavLink 
          to="/" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          シミュレーション
        </NavLink>
        <NavLink 
          to="/causality" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          因果関係ビュー
        </NavLink>
        <NavLink 
          to="/entities" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          エンティティ編集
        </NavLink>
        <NavLink 
          to="/map-editor" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          マップエディタ
        </NavLink>
        <NavLink 
          to="/relationships" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          関係性
        </NavLink>
        <NavLink 
          to="/validation" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          検証
        </NavLink>
      </div>
    </nav>
  )
}