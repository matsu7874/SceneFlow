import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  VisualFeedbackManager,
  FeedbackType,
} from '../../src/modules/ui/visualFeedback'
import type { ActionValidation } from '../../src/modules/ui/interactiveActions'

describe('VisualFeedbackManager', () => {
  let manager: VisualFeedbackManager
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    manager = new VisualFeedbackManager(container)
  })

  afterEach(() => {
    manager.clearAllFeedback()
    document.body.removeChild(container)
  })

  describe('entity feedback', () => {
    it('should show feedback on entity', () => {
      const element = document.createElement('div')
      container.appendChild(element)

      manager.showEntityFeedback(
        'entity1',
        element,
        FeedbackType.VALID,
        'This is valid',
      )

      expect(element.classList.contains('feedback-valid')).toBe(true)
      expect(container.querySelector('.feedback-tooltip')).toBeTruthy()
      expect(container.querySelector('.feedback-tooltip')?.textContent).toBe('This is valid')
    })

    it('should remove feedback after duration', async () => {
      const element = document.createElement('div')
      container.appendChild(element)

      manager.showEntityFeedback(
        'entity1',
        element,
        FeedbackType.INVALID,
        'Error message',
        { duration: 100 },
      )

      expect(element.classList.contains('feedback-invalid')).toBe(true)

      await new Promise<void>((resolve) => setTimeout(resolve, 150))

      expect(element.classList.contains('feedback-invalid')).toBe(false)
      expect(container.querySelector('.feedback-tooltip')).toBeFalsy()
    })

    it('should replace existing feedback', () => {
      const element = document.createElement('div')
      container.appendChild(element)

      manager.showEntityFeedback('entity1', element, FeedbackType.VALID)
      manager.showEntityFeedback('entity1', element, FeedbackType.INVALID)

      expect(element.classList.contains('feedback-valid')).toBe(false)
      expect(element.classList.contains('feedback-invalid')).toBe(true)
    })
  })

  describe('action feedback', () => {
    it('should show validation feedback on element', () => {
      const element = document.createElement('div')
      container.appendChild(element)

      const validation: ActionValidation = {
        valid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: ['Warning 1'],
      }

      manager.showActionFeedback(validation, element)

      expect(element.classList.contains('feedback-invalid')).toBe(true)
      const tooltip = container.querySelector('.feedback-tooltip')
      expect(tooltip?.textContent).toContain('Error 1')
      expect(tooltip?.textContent).toContain('Error 2')
      expect(tooltip?.textContent).toContain('⚠️ Warning 1')
    })

    it('should show global notification when no element', () => {
      const validation: ActionValidation = {
        valid: true,
        errors: [],
        warnings: [],
      }

      manager.showActionFeedback(validation)

      const notification = container.querySelector('.notification')
      expect(notification).toBeTruthy()
      expect(notification?.textContent).toBe('Action is valid')
    })
  })

  describe('highlight available actions', () => {
    it('should highlight entities with available actions', () => {
      const element1 = document.createElement('div')
      const element2 = document.createElement('div')
      container.appendChild(element1)
      container.appendChild(element2)

      const mockAct = {
        getAffectedEntities: (): string[] => ['entity1', 'entity2'],
      }

      const getElement = (id: string): HTMLElement | null => {
        if (id === 'entity1') return element1
        if (id === 'entity2') return element2
        return null
      }

      manager.highlightAvailableActions([mockAct as never], getElement)

      expect(element1.classList.contains('action-available')).toBe(true)
      expect(element2.classList.contains('action-available')).toBe(true)
    })

    it('should clear previous highlights', () => {
      const element = document.createElement('div')
      element.classList.add('action-available')
      container.appendChild(element)

      manager.highlightAvailableActions([], (): HTMLElement | null => null)

      expect(element.classList.contains('action-available')).toBe(false)
    })
  })

  describe('execution feedback', () => {
    it('should show success feedback', () => {
      const element = document.createElement('div')
      container.appendChild(element)

      const mockAct = {
        description: 'Move to room2',
        getAffectedEntities: (): string[] => ['entity1'],
      }

      const getElement = (id: string): HTMLElement | null => id === 'entity1' ? element : null

      manager.showExecutionFeedback(mockAct as never, true, getElement)

      expect(element.classList.contains('execution-effect')).toBe(true)
      const notification = container.querySelector('.notification')
      expect(notification?.textContent).toContain('✓ Move to room2')
      expect(notification?.classList.contains('notification-success')).toBe(true)
    })

    it('should show error feedback', () => {
      const mockAct = {
        description: 'Invalid action',
        getAffectedEntities: (): string[] => [],
      }

      manager.showExecutionFeedback(mockAct as never, false, (): HTMLElement | null => null)

      const notification = container.querySelector('.notification')
      expect(notification?.textContent).toContain('✗ Failed to execute: Invalid action')
      expect(notification?.classList.contains('notification-error')).toBe(true)
    })
  })

  describe('notifications', () => {
    it('should show notification with auto-remove', async () => {
      manager.showNotification('Test message', FeedbackType.SUCCESS, { duration: 100 })

      const notification = container.querySelector('.notification')
      expect(notification).toBeTruthy()
      expect(notification?.textContent).toBe('Test message')

      await new Promise<void>((resolve) => setTimeout(resolve, 150))

      // Should start fade out
      expect(notification?.classList.contains('notification-fade-out')).toBe(true)

      await new Promise<void>((resolve) => setTimeout(resolve, 350))

      // Should be removed
      expect(container.querySelector('.notification')).toBeFalsy()
    })

    it('should position notification in center', () => {
      manager.showNotification('Centered', FeedbackType.WARNING, { position: 'center' })

      const notification = container.querySelector('.notification')
      expect(notification?.classList.contains('notification-center')).toBe(true)
    })

    it('should animate notification', () => {
      manager.showNotification('Animated', FeedbackType.ERROR, { animate: true })

      const notification = container.querySelector('.notification')
      expect(notification?.classList.contains('notification-animate')).toBe(true)
    })
  })

  describe('feedback management', () => {
    it('should remove specific feedback', () => {
      const element = document.createElement('div')
      container.appendChild(element)

      manager.showEntityFeedback('test-entity', element, FeedbackType.VALID, 'Message')
      expect(container.querySelector('.feedback-tooltip')).toBeTruthy()

      manager.removeFeedback('entity-test-entity') // feedbackId format is 'entity-{entityId}'
      expect(container.querySelector('.feedback-tooltip')).toBeFalsy()
    })

    it('should clear all feedback', () => {
      const element1 = document.createElement('div')
      const element2 = document.createElement('div')
      container.appendChild(element1)
      container.appendChild(element2)

      manager.showEntityFeedback('id1', element1, FeedbackType.VALID)
      manager.showEntityFeedback('id2', element2, FeedbackType.INVALID)
      manager.showNotification('Test', FeedbackType.SUCCESS)

      manager.clearAllFeedback()

      expect(element1.classList.contains('feedback-valid')).toBe(false)
      expect(element2.classList.contains('feedback-invalid')).toBe(false)
      expect(container.querySelector('.feedback-tooltip')).toBeFalsy()
    })
  })

  describe('tooltip positioning', () => {
    it('should position tooltip on top by default', () => {
      const element = document.createElement('div')
      element.style.position = 'fixed'
      element.style.top = '100px'
      element.style.left = '100px'
      element.style.width = '50px'
      element.style.height = '50px'
      container.appendChild(element)

      // Force layout
      element.getBoundingClientRect()

      manager.showEntityFeedback('test', element, FeedbackType.VALID, 'Top tooltip')

      const tooltip = container.querySelector('.feedback-tooltip') as HTMLElement
      expect(tooltip).toBeTruthy()
      const tooltipStyle = window.getComputedStyle(tooltip)
      expect(tooltipStyle.position).toBe('fixed')
    })
  })
})