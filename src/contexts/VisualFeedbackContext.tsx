import React, { createContext, useContext, useCallback, useRef, useState, ReactNode } from 'react'

export interface FeedbackOptions {
  duration?: number
  type?: 'success' | 'error' | 'warning' | 'info'
  position?: { x: number; y: number }
}

export interface Notification {
  id: string
  message: string
  type: FeedbackOptions['type']
  timestamp: number
}

interface VisualFeedbackContextType {
  showNotification: (message: string, options?: FeedbackOptions) => void
  clearNotifications: () => void
  notifications: Notification[]
  highlightElement: (element: HTMLElement, options?: FeedbackOptions) => void
  animateTransition: (element: HTMLElement, from: DOMRect, to: DOMRect, duration?: number) => Promise<void>
}

const VisualFeedbackContext = createContext<VisualFeedbackContextType | undefined>(undefined)

export const useVisualFeedback = () => {
  const context = useContext(VisualFeedbackContext)
  if (!context) {
    throw new Error('useVisualFeedback must be used within a VisualFeedbackProvider')
  }
  return context
}

export const VisualFeedbackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const notificationIdRef = useRef(0)

  const showNotification = useCallback((message: string, options: FeedbackOptions = {}) => {
    const { duration = 3000, type = 'info' } = options
    const id = `notification-${notificationIdRef.current++}`

    const notification: Notification = {
      id,
      message,
      type,
      timestamp: Date.now(),
    }

    setNotifications(prev => [...prev, notification])

    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, duration)
    }
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const highlightElement = useCallback((element: HTMLElement, options: FeedbackOptions = {}) => {
    const { duration = 1000, type = 'info' } = options

    const colorMap = {
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    }

    const originalBoxShadow = element.style.boxShadow
    const originalTransition = element.style.transition

    element.style.transition = 'box-shadow 0.3s ease-in-out'
    element.style.boxShadow = `0 0 0 3px ${colorMap[type]}, 0 0 20px ${colorMap[type]}40`

    setTimeout(() => {
      element.style.boxShadow = originalBoxShadow
      setTimeout(() => {
        element.style.transition = originalTransition
      }, 300)
    }, duration)
  }, [])

  const animateTransition = useCallback((element: HTMLElement, from: DOMRect, to: DOMRect, duration = 300): Promise<void> => {
    return new Promise(resolve => {
      const deltaX = to.left - from.left
      const deltaY = to.top - from.top
      const scaleX = to.width / from.width
      const scaleY = to.height / from.height

      element.style.transformOrigin = 'top left'
      element.style.transition = `transform ${duration}ms ease-in-out`
      element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`

      setTimeout(() => {
        element.style.transform = ''
        element.style.transition = ''
        element.style.transformOrigin = ''
        resolve()
      }, duration)
    })
  }, [])

  const value: VisualFeedbackContextType = {
    showNotification,
    clearNotifications,
    notifications,
    highlightElement,
    animateTransition,
  }

  return (
    <VisualFeedbackContext.Provider value={value}>
      {children}
    </VisualFeedbackContext.Provider>
  )
}