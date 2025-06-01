/**
 * Drag & Drop functionality for SceneFlow
 *
 * Enables interactive manipulation of persons and items through drag and drop
 */

import type { EntityId } from '../../types/causality'

/**
 * Drag data types
 */
export enum DragType {
  PERSON = 'PERSON',
  ITEM = 'ITEM',
}

/**
 * Data transferred during drag operations
 */
export interface DragData {
  type: DragType
  entityId: EntityId
  sourceLocation?: EntityId
  sourceOwner?: EntityId
}

/**
 * Drop target types
 */
export enum DropTargetType {
  LOCATION = 'LOCATION',
  PERSON = 'PERSON',
}

/**
 * Drop target information
 */
export interface DropTarget {
  type: DropTargetType
  entityId: EntityId
}

/**
 * Drag state management
 */
export class DragDropManager {
  private dragData: DragData | null = null
  private validDropTargets: Set<string> = new Set()
  private dropHandlers: Map<string, (data: DragData, target: DropTarget) => void> = new Map()
  private validationHandlers: Map<string, (data: DragData, target: DropTarget) => boolean> = new Map()

  /**
   * Start a drag operation
   */
  startDrag(data: DragData): void {
    this.dragData = data
    this.updateValidDropTargets()
  }

  /**
   * End the current drag operation
   */
  endDrag(): void {
    this.dragData = null
    this.validDropTargets.clear()
  }

  /**
   * Get current drag data
   */
  getDragData(): DragData | null {
    return this.dragData
  }

  /**
   * Check if a target is valid for the current drag
   */
  isValidDropTarget(targetId: string): boolean {
    return this.validDropTargets.has(targetId)
  }

  /**
   * Register a drop handler
   */
  registerDropHandler(
    key: string,
    handler: (data: DragData, target: DropTarget) => void,
  ): void {
    this.dropHandlers.set(key, handler)
  }

  /**
   * Register a validation handler
   */
  registerValidationHandler(
    key: string,
    handler: (data: DragData, target: DropTarget) => boolean,
  ): void {
    this.validationHandlers.set(key, handler)
  }

  /**
   * Handle a drop operation
   */
  handleDrop(target: DropTarget): boolean {
    if (!this.dragData) return false

    const key = this.getHandlerKey(this.dragData.type, target.type)
    const handler = this.dropHandlers.get(key)

    if (handler && this.validateDrop(this.dragData, target)) {
      handler(this.dragData, target)
      this.endDrag()
      return true
    }

    return false
  }

  /**
   * Validate if a drop is allowed
   */
  private validateDrop(data: DragData, target: DropTarget): boolean {
    const key = this.getHandlerKey(data.type, target.type)
    const validator = this.validationHandlers.get(key)

    return validator ? validator(data, target) : false
  }

  /**
   * Update valid drop targets based on current drag data
   */
  private updateValidDropTargets(): void {
    this.validDropTargets.clear()

    if (!this.dragData) return

    // This would be populated based on validation rules
    // For now, it's a placeholder
  }

  /**
   * Get handler key for drag and drop types
   */
  private getHandlerKey(dragType: DragType, dropType: DropTargetType): string {
    return `${dragType}_TO_${dropType}`
  }
}

/**
 * Create drag data for a person
 */
export function createPersonDragData(
  personId: EntityId,
  currentLocation: EntityId,
): DragData {
  return {
    type: DragType.PERSON,
    entityId: personId,
    sourceLocation: currentLocation,
  }
}

/**
 * Create drag data for an item
 */
export function createItemDragData(
  itemId: EntityId,
  sourceOwner?: EntityId,
  sourceLocation?: EntityId,
): DragData {
  return {
    type: DragType.ITEM,
    entityId: itemId,
    sourceOwner,
    sourceLocation,
  }
}

/**
 * HTML5 Drag & Drop helpers
 */

export function makeDraggable(
  element: HTMLElement,
  dragData: DragData,
  manager: DragDropManager,
): void {
  element.draggable = true

  element.addEventListener('dragstart', (e) => {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('application/json', JSON.stringify(dragData))
      manager.startDrag(dragData)
      element.classList.add('dragging')
    }
  })

  element.addEventListener('dragend', () => {
    manager.endDrag()
    element.classList.remove('dragging')
  })
}

export function makeDropTarget(
  element: HTMLElement,
  dropTarget: DropTarget,
  manager: DragDropManager,
): void {
  element.addEventListener('dragover', (e) => {
    const dragData = manager.getDragData()
    if (dragData) {
      const key = `${dragData.type}_TO_${dropTarget.type}`
      const validator = manager['validationHandlers'].get(key)

      if (validator && validator(dragData, dropTarget)) {
        e.preventDefault()
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move'
        }
        element.classList.add('drop-target-valid')
      } else {
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'none'
        }
        element.classList.add('drop-target-invalid')
      }
    }
  })

  element.addEventListener('dragleave', () => {
    element.classList.remove('drop-target-valid', 'drop-target-invalid')
  })

  element.addEventListener('drop', (e) => {
    e.preventDefault()
    element.classList.remove('drop-target-valid', 'drop-target-invalid')

    const success = manager.handleDrop(dropTarget)
    if (success) {
      element.classList.add('drop-success')
      setTimeout(() => element.classList.remove('drop-success'), 500)
    }
  })
}

/**
 * CSS classes for drag and drop
 */
export const dragDropStyles = `
  .draggable {
    cursor: move;
    transition: opacity 0.2s;
  }

  .draggable:hover {
    opacity: 0.9;
  }

  .dragging {
    opacity: 0.5;
    cursor: grabbing;
  }

  .drop-target-valid {
    outline: 2px solid #4caf50;
    outline-offset: 2px;
    background-color: rgba(76, 175, 80, 0.1);
  }

  .drop-target-invalid {
    outline: 2px solid #f44336;
    outline-offset: 2px;
    background-color: rgba(244, 67, 54, 0.1);
  }

  .drop-success {
    animation: dropSuccess 0.5s ease-out;
  }

  @keyframes dropSuccess {
    0% {
      transform: scale(1);
      background-color: rgba(76, 175, 80, 0.3);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
      background-color: transparent;
    }
  }
`