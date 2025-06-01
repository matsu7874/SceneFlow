/**
 * Visual Feedback Module
 *
 * Provides visual indicators for action validity and execution feedback
 */

import type { Act, EntityId } from '../../types/causality'
import type { ActionValidation } from './interactiveActions'

/**
 * Visual feedback types
 */
export enum FeedbackType {
  VALID = 'valid',
  INVALID = 'invalid',
  WARNING = 'warning',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * Feedback display options
 */
export interface FeedbackOptions {
  duration?: number
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  animate?: boolean
}

/**
 * Visual feedback manager
 */
export class VisualFeedbackManager {
  private feedbackContainer: HTMLElement
  private activeFeedback: Map<string, HTMLElement> = new Map()

  constructor(container?: HTMLElement) {
    this.feedbackContainer = container || this.createDefaultContainer()
  }

  /**
   * Show feedback for an entity
   */
  showEntityFeedback(
    entityId: EntityId,
    element: HTMLElement,
    type: FeedbackType,
    message?: string,
    options: FeedbackOptions = {},
  ): void {
    const feedbackId = `entity-${entityId}`

    // Remove existing feedback
    this.removeFeedback(feedbackId)

    // Remove all feedback classes
    Object.values(FeedbackType).forEach(t => {
      element.classList.remove(`feedback-${t}`)
    })

    // Add visual class to element
    element.classList.add(`feedback-${type}`)

    // Create message if provided
    if (message) {
      const tooltip = this.createTooltip(message, type, options)
      this.positionTooltip(tooltip, element, options.position || 'top')
      this.activeFeedback.set(feedbackId, tooltip)

      // Auto-remove after duration
      if (options.duration) {
        setTimeout(() => {
          this.removeFeedback(feedbackId)
          element.classList.remove(`feedback-${type}`)
        }, options.duration)
      }
    }
  }

  /**
   * Show action validation feedback
   */
  showActionFeedback(
    validation: ActionValidation,
    targetElement?: HTMLElement,
  ): void {
    const type = validation.valid ? FeedbackType.VALID : FeedbackType.INVALID
    const messages: string[] = []

    if (!validation.valid && validation.errors.length > 0) {
      messages.push(...validation.errors)
    }

    if (validation.warnings.length > 0) {
      messages.push(...validation.warnings.map(w => `⚠️ ${w}`))
    }

    if (targetElement) {
      this.showEntityFeedback(
        'action-validation',
        targetElement,
        type,
        messages.join('\n'),
        { duration: 3000 },
      )
    } else {
      // Show global notification
      this.showNotification(
        messages.join('\n') || (validation.valid ? 'Action is valid' : 'Action is invalid'),
        type,
        { duration: 3000 },
      )
    }
  }

  /**
   * Highlight available actions
   */
  highlightAvailableActions(
    actions: Act[],
    getElementForEntity: (entityId: EntityId) => HTMLElement | null,
  ): void {
    // Clear existing highlights
    document.querySelectorAll('.action-available').forEach(el => {
      el.classList.remove('action-available')
    })

    // Highlight entities with available actions
    const highlightedEntities = new Set<EntityId>()

    actions.forEach(act => {
      act.getAffectedEntities().forEach(entityId => {
        if (!highlightedEntities.has(entityId)) {
          const element = getElementForEntity(entityId)
          if (element) {
            element.classList.add('action-available')
            highlightedEntities.add(entityId)
          }
        }
      })
    })
  }

  /**
   * Show execution feedback
   */
  showExecutionFeedback(
    act: Act,
    success: boolean,
    getElementForEntity: (entityId: EntityId) => HTMLElement | null,
  ): void {
    const type = success ? FeedbackType.SUCCESS : FeedbackType.ERROR
    const message = success
      ? `✓ ${act.description}`
      : `✗ Failed to execute: ${act.description}`

    // Animate affected entities
    act.getAffectedEntities().forEach(entityId => {
      const element = getElementForEntity(entityId)
      if (element) {
        element.classList.add('execution-effect')
        setTimeout(() => element.classList.remove('execution-effect'), 1000)
      }
    })

    // Show notification
    this.showNotification(message, type, { duration: 2000, animate: true })
  }

  /**
   * Show a notification
   */
  showNotification(
    message: string,
    type: FeedbackType,
    options: FeedbackOptions = {},
  ): void {
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.textContent = message

    if (options.animate) {
      notification.classList.add('notification-animate')
    }

    this.feedbackContainer.appendChild(notification)

    // Position notification
    if (options.position === 'center') {
      notification.classList.add('notification-center')
    }

    // Auto-remove
    const duration = options.duration || 3000
    setTimeout(() => {
      notification.classList.add('notification-fade-out')
      setTimeout(() => notification.remove(), 300)
    }, duration)
  }

  /**
   * Remove feedback
   */
  removeFeedback(feedbackId: string): void {
    const feedback = this.activeFeedback.get(feedbackId)
    if (feedback) {
      feedback.remove()
      this.activeFeedback.delete(feedbackId)
    }
  }

  /**
   * Clear all feedback
   */
  clearAllFeedback(): void {
    this.activeFeedback.forEach(feedback => feedback.remove())
    this.activeFeedback.clear()

    document.querySelectorAll('[class*="feedback-"]').forEach(el => {
      el.className = el.className.replace(/feedback-\w+/g, '')
    })
  }

  /**
   * Create default container
   */
  private createDefaultContainer(): HTMLElement {
    const container = document.createElement('div')
    container.id = 'visual-feedback-container'
    container.className = 'feedback-container'
    document.body.appendChild(container)
    return container
  }

  /**
   * Create tooltip element
   */
  private createTooltip(
    message: string,
    type: FeedbackType,
    options: FeedbackOptions,
  ): HTMLElement {
    const tooltip = document.createElement('div')
    tooltip.className = `feedback-tooltip feedback-tooltip-${type}`
    tooltip.textContent = message

    if (options.animate) {
      tooltip.classList.add('feedback-tooltip-animate')
    }

    this.feedbackContainer.appendChild(tooltip)
    return tooltip
  }

  /**
   * Position tooltip relative to element
   */
  private positionTooltip(
    tooltip: HTMLElement,
    targetElement: HTMLElement,
    position: string,
  ): void {
    const targetRect = targetElement.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()

    let top = 0
    let left = 0

    switch (position) {
    case 'top':
      top = targetRect.top - tooltipRect.height - 8
      left = targetRect.left + (targetRect.width - tooltipRect.width) / 2
      break
    case 'bottom':
      top = targetRect.bottom + 8
      left = targetRect.left + (targetRect.width - tooltipRect.width) / 2
      break
    case 'left':
      top = targetRect.top + (targetRect.height - tooltipRect.height) / 2
      left = targetRect.left - tooltipRect.width - 8
      break
    case 'right':
      top = targetRect.top + (targetRect.height - tooltipRect.height) / 2
      left = targetRect.right + 8
      break
    }

    tooltip.style.position = 'fixed'
    tooltip.style.top = `${top}px`
    tooltip.style.left = `${left}px`
  }
}

/**
 * CSS styles for visual feedback
 */
export const visualFeedbackStyles = `
  /* Feedback container */
  .feedback-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    pointer-events: none;
  }

  /* Entity feedback states */
  .feedback-valid {
    outline: 2px solid #4caf50 !important;
    outline-offset: 2px;
    box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
  }

  .feedback-invalid {
    outline: 2px solid #f44336 !important;
    outline-offset: 2px;
    box-shadow: 0 0 8px rgba(244, 67, 54, 0.3);
  }

  .feedback-warning {
    outline: 2px solid #ff9800 !important;
    outline-offset: 2px;
    box-shadow: 0 0 8px rgba(255, 152, 0, 0.3);
  }

  .feedback-success {
    outline: 2px solid #2196f3 !important;
    outline-offset: 2px;
    animation: successPulse 0.5s ease-out;
  }

  .feedback-error {
    outline: 2px solid #f44336 !important;
    outline-offset: 2px;
    animation: errorShake 0.5s ease-out;
  }

  /* Action availability */
  .action-available {
    position: relative;
    cursor: pointer;
  }

  .action-available::after {
    content: '✋';
    position: absolute;
    top: -8px;
    right: -8px;
    width: 20px;
    height: 20px;
    background: #2196f3;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    animation: actionPulse 2s infinite;
  }

  /* Execution effects */
  .execution-effect {
    animation: executionFlash 1s ease-out;
  }

  /* Tooltips */
  .feedback-tooltip {
    position: fixed;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 14px;
    color: white;
    white-space: pre-line;
    max-width: 300px;
    pointer-events: all;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .feedback-tooltip-valid {
    background-color: #4caf50;
  }

  .feedback-tooltip-invalid {
    background-color: #f44336;
  }

  .feedback-tooltip-warning {
    background-color: #ff9800;
  }

  .feedback-tooltip-animate {
    animation: tooltipFadeIn 0.3s ease-out;
  }

  /* Notifications */
  .notification {
    background: white;
    padding: 12px 20px;
    margin-bottom: 10px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-left: 4px solid;
    pointer-events: all;
    max-width: 400px;
  }

  .notification-valid {
    border-left-color: #4caf50;
    color: #2e7d32;
  }

  .notification-invalid {
    border-left-color: #f44336;
    color: #c62828;
  }

  .notification-warning {
    border-left-color: #ff9800;
    color: #e65100;
  }

  .notification-success {
    border-left-color: #2196f3;
    color: #1565c0;
  }

  .notification-error {
    border-left-color: #f44336;
    color: #c62828;
  }

  .notification-animate {
    animation: notificationSlideIn 0.3s ease-out;
  }

  .notification-fade-out {
    animation: notificationFadeOut 0.3s ease-out forwards;
  }

  .notification-center {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
  }

  /* Animations */
  @keyframes successPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  @keyframes errorShake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }

  @keyframes actionPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.8; }
  }

  @keyframes executionFlash {
    0% { background-color: rgba(33, 150, 243, 0); }
    50% { background-color: rgba(33, 150, 243, 0.3); }
    100% { background-color: rgba(33, 150, 243, 0); }
  }

  @keyframes tooltipFadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes notificationSlideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes notificationFadeOut {
    to { opacity: 0; transform: translateX(20px); }
  }
`