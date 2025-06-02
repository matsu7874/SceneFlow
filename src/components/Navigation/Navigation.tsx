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
          Simulation
        </NavLink>
        <NavLink 
          to="/causality" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          Causality View
        </NavLink>
        <NavLink 
          to="/entities" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          Entity Editor
        </NavLink>
        <NavLink 
          to="/map" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          Map Editor
        </NavLink>
        <NavLink 
          to="/relationships" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          Relationships
        </NavLink>
        <NavLink 
          to="/validation" 
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          Validation
        </NavLink>
      </div>
    </nav>
  )
}