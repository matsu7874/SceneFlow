import React from 'react'
import { NavLink } from 'react-router-dom'
import { NAV_SECTIONS } from './navConfig'
import styles from './Navigation.module.css'

export const Navigation: React.FC = () => {
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
    </nav>
  )
}
