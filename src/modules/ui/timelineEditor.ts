/**
 * Timeline Editor UI
 *
 * Interactive timeline for managing Acts with drag & drop reordering
 */

import type { Act, EntityId, ValidationResult } from '../../types/causality'
import { CausalityEngine } from '../causality/engine'
import type { InteractiveActionsController } from './interactiveActions'
import { VisualFeedbackManager, FeedbackType } from './visualFeedback'

/**
 * Timeline item data
 */
export interface TimelineItem {
  act: Act
  element: HTMLElement
  valid: boolean
  conflicts: string[]
}

/**
 * Timeline editor options
 */
export interface TimelineEditorOptions {
  container: HTMLElement
  engine: CausalityEngine
  actionsController?: InteractiveActionsController
  onActSelect?: (act: Act) => void
  onActRemove?: (act: Act) => void
  onTimelineChange?: () => void
}

/**
 * Timeline editor UI component
 */
export class TimelineEditor {
  private container: HTMLElement
  private engine: CausalityEngine
  private actionsController?: InteractiveActionsController
  private feedbackManager: VisualFeedbackManager
  private timelineItems: Map<EntityId, TimelineItem> = new Map()
  private selectedActId: EntityId | null = null

  // Callbacks
  private onActSelect?: (act: Act) => void
  private onActRemove?: (act: Act) => void
  private onTimelineChange?: () => void

  constructor(options: TimelineEditorOptions) {
    this.container = options.container
    this.engine = options.engine
    this.actionsController = options.actionsController
    this.feedbackManager = new VisualFeedbackManager()

    this.onActSelect = options.onActSelect
    this.onActRemove = options.onActRemove
    this.onTimelineChange = options.onTimelineChange

    this.setupContainer()
    this.render()
  }

  /**
   * Setup container structure
   */
  private setupContainer(): void {
    this.container.innerHTML = `
      <div class="timeline-editor">
        <div class="timeline-header">
          <h3>Timeline</h3>
          <div class="timeline-controls">
            <button class="btn-validate-all">Validate All</button>
            <button class="btn-clear-conflicts">Clear Conflicts</button>
          </div>
        </div>
        <div class="timeline-content">
          <div class="timeline-acts"></div>
          <div class="timeline-add-placeholder">
            <span>+ Add new act or drag here</span>
          </div>
        </div>
        <div class="timeline-footer">
          <span class="timeline-stats"></span>
        </div>
      </div>
    `

    // Setup event handlers
    const validateBtn = this.container.querySelector('.btn-validate-all')
    validateBtn?.addEventListener('click', () => this.validateAll())

    const clearBtn = this.container.querySelector('.btn-clear-conflicts')
    clearBtn?.addEventListener('click', () => this.clearConflicts())
  }

  /**
   * Render the timeline
   */
  render(): void {
    const actsContainer = this.container.querySelector('.timeline-acts')
    if (!actsContainer) return

    // Clear existing items
    actsContainer.innerHTML = ''
    this.timelineItems.clear()

    // Get all acts sorted by timestamp
    const acts = Array.from(this.engine.getActs().values())
      .sort((a, b) => a.timestamp - b.timestamp)

    // Create timeline items
    acts.forEach(act => {
      const item = this.createTimelineItem(act)
      this.timelineItems.set(act.id, item)
      actsContainer.appendChild(item.element)
    })

    // Update stats
    this.updateStats()

    // Setup drag & drop for reordering
    this.setupDragDrop()
  }

  /**
   * Create a timeline item element
   */
  private createTimelineItem(act: Act): TimelineItem {
    const element = document.createElement('div')
    element.className = 'timeline-item'
    element.draggable = true
    element.dataset.actId = String(act.id)

    const item: TimelineItem = {
      act,
      element,
      valid: true,
      conflicts: [],
    }

    // Build content
    element.innerHTML = `
      <div class="timeline-item-header">
        <span class="timeline-item-time">${this.formatTimestamp(act.timestamp)}</span>
        <span class="timeline-item-type">${act.type}</span>
      </div>
      <div class="timeline-item-content">
        <div class="timeline-item-description">${act.description}</div>
        <div class="timeline-item-entities">
          ${this.formatEntities(act.getAffectedEntities())}
        </div>
      </div>
      <div class="timeline-item-actions">
        <button class="btn-item-validate" title="Validate">✓</button>
        <button class="btn-item-remove" title="Remove">×</button>
      </div>
      <div class="timeline-item-errors" style="display: none;"></div>
    `

    // Event handlers
    element.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).matches('button')) {
        this.selectAct(act.id)
      }
    })

    const validateBtn = element.querySelector('.btn-item-validate')
    validateBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.validateAct(act.id)
    })

    const removeBtn = element.querySelector('.btn-item-remove')
    removeBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.removeAct(act.id)
    })

    return item
  }

  /**
   * Setup drag & drop for timeline reordering
   */
  private setupDragDrop(): void {
    let draggedItem: TimelineItem | null = null

    this.timelineItems.forEach(item => {
      const element = item.element

      element.addEventListener('dragstart', (e) => {
        draggedItem = item
        element.classList.add('dragging')
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move'
        }
      })

      element.addEventListener('dragend', () => {
        element.classList.remove('dragging')
        draggedItem = null
      })

      element.addEventListener('dragover', (e) => {
        if (!draggedItem || draggedItem === item || !element.parentElement) return

        e.preventDefault()
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move'
        }

        const afterElement = this.getDragAfterElement(
          element.parentElement,
          e.clientY,
        )

        if (afterElement === null) {
          element.parentElement.appendChild(draggedItem.element)
        } else {
          element.parentElement.insertBefore(
            draggedItem.element,
            afterElement,
          )
        }
      })
    })

    // Handle drop on placeholder
    const placeholder = this.container.querySelector('.timeline-add-placeholder')

    placeholder?.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy'
      }
      placeholder.classList.add('drag-over')
    })

    placeholder?.addEventListener('dragleave', () => {
      placeholder.classList.remove('drag-over')
    })

    placeholder?.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault()
      placeholder.classList.remove('drag-over')

      // Handle act creation from external drag
      const data = e.dataTransfer?.getData('application/json')
      if (data) {
        try {
          const dragData = JSON.parse(data) as unknown
          // This would trigger act creation UI
          // eslint-disable-next-line no-console
          console.log('Create new act from:', dragData)
        } catch {
          // Invalid data - silently ignore
        }
      }
    })
  }

  /**
   * Get element after which to insert during drag
   */
  private getDragAfterElement(
    container: HTMLElement,
    y: number,
  ): Element | null {
    const draggableElements = [
      ...container.querySelectorAll('.timeline-item:not(.dragging)'),
    ]

    type ClosestElement = { offset: number; element: Element | null }

    const result = draggableElements.reduce<ClosestElement>((closest, child) => {
      const box = child.getBoundingClientRect()
      const offset = y - box.top - box.height / 2

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child }
      } else {
        return closest
      }
    }, { offset: Number.NEGATIVE_INFINITY, element: null })

    return result.element
  }

  /**
   * Select an act
   */
  private selectAct(actId: EntityId): void {
    // Update selection
    this.timelineItems.forEach((item, id) => {
      if (id === actId) {
        item.element.classList.add('selected')
      } else {
        item.element.classList.remove('selected')
      }
    })

    this.selectedActId = actId

    const act = this.engine.getActs().get(actId)
    if (act && this.onActSelect) {
      this.onActSelect(act)
    }
  }

  /**
   * Validate a single act
   */
  private validateAct(actId: EntityId): void {
    const item = this.timelineItems.get(actId)
    if (!item) return

    // Get current world state at act's timestamp
    // (simplified - in reality would use engine's getStateAt)

    // Build world state up to this point
    // This is simplified - in reality would use engine's getStateAt
    const validation = item.act.checkPreconditions({
      timestamp: item.act.timestamp - 1,
      personPositions: {},
      itemOwnership: {},
      knowledge: {},
      itemLocations: {},
    })

    this.updateActValidation(item, validation)
  }

  /**
   * Validate all acts
   */
  private validateAll(): void {
    const validation = this.engine.validateTimeline({
      timestamp: 0,
      personPositions: {},
      itemOwnership: {},
      knowledge: {},
      itemLocations: {},
    })

    // Update all items based on conflicts
    validation.conflicts.forEach(conflict => {
      const item1 = this.timelineItems.get(conflict.actId1)
      const item2 = this.timelineItems.get(conflict.actId2)

      if (item1) {
        item1.valid = false
        item1.conflicts.push(conflict.description)
        this.updateActDisplay(item1)
      }

      if (item2 && conflict.actId1 !== conflict.actId2) {
        item2.valid = false
        item2.conflicts.push(conflict.description)
        this.updateActDisplay(item2)
      }
    })

    // Show feedback
    if (validation.valid) {
      this.feedbackManager.showNotification(
        'Timeline is valid!',
        FeedbackType.SUCCESS,
      )
    } else {
      this.feedbackManager.showNotification(
        `Found ${validation.conflicts.length} conflicts`,
        FeedbackType.ERROR,
      )
    }

    this.updateStats()
  }

  /**
   * Clear conflict displays
   */
  private clearConflicts(): void {
    this.timelineItems.forEach(item => {
      item.valid = true
      item.conflicts = []
      this.updateActDisplay(item)
    })
  }

  /**
   * Update act validation display
   */
  private updateActValidation(item: TimelineItem, validation: ValidationResult): void {
    item.valid = validation.valid
    item.conflicts = validation.errors.map(e => e.message)
    this.updateActDisplay(item)

    // Show feedback
    this.feedbackManager.showEntityFeedback(
      item.act.id,
      item.element,
      validation.valid ? FeedbackType.VALID : FeedbackType.INVALID,
      validation.errors.map(e => e.message).join('\n'),
      { duration: 3000 },
    )
  }

  /**
   * Update act display based on state
   */
  private updateActDisplay(item: TimelineItem): void {
    const element = item.element
    const errorsDiv = element.querySelector('.timeline-item-errors') as HTMLElement

    if (item.valid) {
      element.classList.remove('invalid')
      element.classList.add('valid')
      errorsDiv.style.display = 'none'
    } else {
      element.classList.remove('valid')
      element.classList.add('invalid')
      errorsDiv.style.display = 'block'
      errorsDiv.innerHTML = item.conflicts
        .map(c => `<div class="error-message">⚠️ ${c}</div>`)
        .join('')
    }
  }

  /**
   * Remove an act
   */
  private removeAct(actId: EntityId): void {
    const result = this.engine.removeAct(actId)

    if (result.valid) {
      const act = this.engine.getActs().get(actId)
      if (act && this.onActRemove) {
        this.onActRemove(act)
      }

      this.render()

      if (this.onTimelineChange) {
        this.onTimelineChange()
      }

      this.feedbackManager.showNotification(
        'Act removed successfully',
        FeedbackType.SUCCESS,
      )
    } else {
      this.feedbackManager.showNotification(
        result.errors.map(e => e.message).join('\n'),
        FeedbackType.ERROR,
      )
    }
  }

  /**
   * Update timeline statistics
   */
  private updateStats(): void {
    const stats = this.container.querySelector('.timeline-stats')
    if (!stats) return

    const totalActs = this.timelineItems.size
    const invalidActs = Array.from(this.timelineItems.values())
      .filter(item => !item.valid).length

    stats.textContent = `${totalActs} acts${
      invalidActs > 0 ? ` (${invalidActs} invalid)` : ''
    }`
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(timestamp: number): string {
    return `T${timestamp}`
  }

  /**
   * Format entity list for display
   */
  private formatEntities(entities: EntityId[]): string {
    return entities
      .map(id => `<span class="entity-tag">${id}</span>`)
      .join(' ')
  }

  /**
   * Add a new act to the timeline
   */
  addAct(act: Act): void {
    const result = this.engine.addAct(act)

    if (result.valid) {
      this.render()

      if (this.onTimelineChange) {
        this.onTimelineChange()
      }

      // Select the new act
      this.selectAct(act.id)

      // Scroll to the new act
      const item = this.timelineItems.get(act.id)
      if (item) {
        item.element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } else {
      this.feedbackManager.showNotification(
        result.errors.map(e => e.message).join('\n'),
        FeedbackType.ERROR,
      )
    }
  }

  /**
   * Get selected act
   */
  getSelectedAct(): Act | null {
    if (!this.selectedActId) return null
    return this.engine.getActs().get(this.selectedActId) || null
  }
}

/**
 * CSS styles for timeline editor
 */
export const timelineEditorStyles = `
  .timeline-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f5f5f5;
    border-radius: 8px;
    overflow: hidden;
  }

  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: white;
    border-bottom: 1px solid #e0e0e0;
  }

  .timeline-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .timeline-controls button {
    padding: 6px 12px;
    margin-left: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 14px;
  }

  .timeline-controls button:hover {
    background: #f5f5f5;
  }

  .timeline-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .timeline-acts {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .timeline-item {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .timeline-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .timeline-item.selected {
    border-color: #2196f3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
  }

  .timeline-item.dragging {
    opacity: 0.5;
  }

  .timeline-item.valid {
    border-left: 3px solid #4caf50;
  }

  .timeline-item.invalid {
    border-left: 3px solid #f44336;
  }

  .timeline-item-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .timeline-item-time {
    font-size: 12px;
    color: #666;
    font-family: monospace;
  }

  .timeline-item-type {
    font-size: 12px;
    padding: 2px 8px;
    background: #e3f2fd;
    color: #1976d2;
    border-radius: 12px;
    font-weight: 500;
  }

  .timeline-item-description {
    font-size: 14px;
    margin-bottom: 8px;
  }

  .timeline-item-entities {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .entity-tag {
    font-size: 12px;
    padding: 2px 6px;
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }

  .timeline-item-actions {
    position: absolute;
    top: 12px;
    right: 12px;
    display: none;
    gap: 4px;
  }

  .timeline-item:hover .timeline-item-actions {
    display: flex;
  }

  .timeline-item-actions button {
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .timeline-item-actions button:hover {
    background: #f5f5f5;
  }

  .timeline-item-errors {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #ffebee;
  }

  .error-message {
    font-size: 12px;
    color: #d32f2f;
    margin-bottom: 4px;
  }

  .timeline-add-placeholder {
    margin-top: 12px;
    padding: 24px;
    border: 2px dashed #ddd;
    border-radius: 8px;
    text-align: center;
    color: #999;
    cursor: pointer;
    transition: all 0.2s;
  }

  .timeline-add-placeholder:hover {
    border-color: #2196f3;
    color: #2196f3;
  }

  .timeline-add-placeholder.drag-over {
    background: #e3f2fd;
    border-color: #2196f3;
  }

  .timeline-footer {
    padding: 12px 16px;
    background: white;
    border-top: 1px solid #e0e0e0;
    font-size: 14px;
    color: #666;
  }
`