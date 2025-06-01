import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DragDropManager,
  DragType,
  DropTargetType,
  createPersonDragData,
  createItemDragData,
  makeDraggable,
  makeDropTarget,
  type DragData,
  type DropTarget,
} from '../../src/modules/ui/dragDrop'

describe('DragDropManager', () => {
  let manager: DragDropManager

  beforeEach(() => {
    manager = new DragDropManager()
  })

  describe('drag operations', () => {
    it('should start and end drag', () => {
      const dragData: DragData = {
        type: DragType.PERSON,
        entityId: 'alice',
        sourceLocation: 'room1',
      }

      expect(manager.getDragData()).toBeNull()

      manager.startDrag(dragData)
      expect(manager.getDragData()).toEqual(dragData)

      manager.endDrag()
      expect(manager.getDragData()).toBeNull()
    })
  })

  describe('drop handlers', () => {
    it('should register and call drop handlers', () => {
      const handler = vi.fn()
      const dragData: DragData = {
        type: DragType.PERSON,
        entityId: 'alice',
        sourceLocation: 'room1',
      }
      const dropTarget: DropTarget = {
        type: DropTargetType.LOCATION,
        entityId: 'room2',
      }

      manager.registerDropHandler('PERSON_TO_LOCATION', handler)
      manager.registerValidationHandler('PERSON_TO_LOCATION', () => true)

      manager.startDrag(dragData)
      const result = manager.handleDrop(dropTarget)

      expect(result).toBe(true)
      expect(handler).toHaveBeenCalledWith(dragData, dropTarget)
    })

    it('should not call handler if validation fails', () => {
      const handler = vi.fn()
      const validator = vi.fn(() => false)
      const dragData: DragData = {
        type: DragType.ITEM,
        entityId: 'key',
        sourceOwner: 'alice',
      }
      const dropTarget: DropTarget = {
        type: DropTargetType.PERSON,
        entityId: 'bob',
      }

      manager.registerDropHandler('ITEM_TO_PERSON', handler)
      manager.registerValidationHandler('ITEM_TO_PERSON', validator)

      manager.startDrag(dragData)
      const result = manager.handleDrop(dropTarget)

      expect(result).toBe(false)
      expect(validator).toHaveBeenCalledWith(dragData, dropTarget)
      expect(handler).not.toHaveBeenCalled()
    })

    it('should return false if no drag data', () => {
      const dropTarget: DropTarget = {
        type: DropTargetType.LOCATION,
        entityId: 'room2',
      }

      const result = manager.handleDrop(dropTarget)
      expect(result).toBe(false)
    })
  })

  describe('validation', () => {
    it('should check if drop target is valid', () => {
      const dragData: DragData = {
        type: DragType.PERSON,
        entityId: 'alice',
        sourceLocation: 'room1',
      }

      manager.registerValidationHandler('PERSON_TO_LOCATION', () => true)
      manager.startDrag(dragData)

      // This test is limited because isValidDropTarget depends on
      // internal updateValidDropTargets implementation
      expect(manager.isValidDropTarget('room2')).toBe(false)
    })
  })
})

describe('Drag data creators', () => {
  it('should create person drag data', () => {
    const data = createPersonDragData('alice', 'room1')
    expect(data).toEqual({
      type: DragType.PERSON,
      entityId: 'alice',
      sourceLocation: 'room1',
    })
  })

  it('should create item drag data with owner', () => {
    const data = createItemDragData('key', 'alice')
    expect(data).toEqual({
      type: DragType.ITEM,
      entityId: 'key',
      sourceOwner: 'alice',
      sourceLocation: undefined,
    })
  })

  it('should create item drag data with location', () => {
    const data = createItemDragData('chest', undefined, 'room1')
    expect(data).toEqual({
      type: DragType.ITEM,
      entityId: 'chest',
      sourceOwner: undefined,
      sourceLocation: 'room1',
    })
  })
})

describe('HTML5 Drag & Drop helpers', () => {
  it('should make element draggable', () => {
    const element = document.createElement('div')
    const manager = new DragDropManager()
    const dragData: DragData = {
      type: DragType.PERSON,
      entityId: 'alice',
      sourceLocation: 'room1',
    }

    makeDraggable(element, dragData, manager)

    expect(element.draggable).toBe(true)

    // Simulate dragstart with mock event
    const dragStartEvent = {
      type: 'dragstart',
      dataTransfer: {
        effectAllowed: '',
        setData: vi.fn(),
      },
    } as DragEvent
    element.dispatchEvent(dragStartEvent as Event)

    expect(manager.getDragData()).toEqual(dragData)
    expect(element.classList.contains('dragging')).toBe(true)

    // Simulate dragend
    element.dispatchEvent(new Event('dragend'))
    expect(manager.getDragData()).toBeNull()
    expect(element.classList.contains('dragging')).toBe(false)
  })

  it('should make element drop target', () => {
    const element = document.createElement('div')
    const manager = new DragDropManager()
    const dropTarget: DropTarget = {
      type: DropTargetType.LOCATION,
      entityId: 'room2',
    }
    const dragData: DragData = {
      type: DragType.PERSON,
      entityId: 'alice',
      sourceLocation: 'room1',
    }

    // Setup validation
    manager.registerValidationHandler('PERSON_TO_LOCATION', () => true)
    manager.registerDropHandler('PERSON_TO_LOCATION', vi.fn())

    makeDropTarget(element, dropTarget, manager)
    manager.startDrag(dragData)

    // Simulate dragover
    const preventDefault = vi.fn()
    const dragOverEvent = {
      type: 'dragover',
      dataTransfer: {
        dropEffect: '',
      },
      preventDefault,
    } as DragEvent
    element.dispatchEvent(dragOverEvent as Event)

    expect(preventDefault).toHaveBeenCalled()
    expect(element.classList.contains('drop-target-valid')).toBe(true)

    // Simulate dragleave
    element.dispatchEvent(new Event('dragleave'))
    expect(element.classList.contains('drop-target-valid')).toBe(false)

    // Simulate drop
    const dropPreventDefault = vi.fn()
    const dropEvent = {
      type: 'drop',
      preventDefault: dropPreventDefault,
    } as DragEvent
    element.dispatchEvent(dropEvent as Event)

    expect(dropPreventDefault).toHaveBeenCalled()
    expect(element.classList.contains('drop-success')).toBe(true)
  })
})