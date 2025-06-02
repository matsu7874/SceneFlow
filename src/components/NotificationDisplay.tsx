import React from 'react'
import { useVisualFeedback } from '../contexts/VisualFeedbackContext'
import styles from './NotificationDisplay.module.css'

export const NotificationDisplay: React.FC = () => {
  const { notifications } = useVisualFeedback()

  if (notifications.length === 0) return null

  return (
    <div className={styles.container}>
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`${styles.notification} ${styles[notification.type || 'info']}`}
        >
          {notification.message}
        </div>
      ))}
    </div>
  )
}