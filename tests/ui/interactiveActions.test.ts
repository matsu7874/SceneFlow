import { describe, it, expect, beforeEach, vi } from 'vitest'
import { InteractiveActionsController } from '../../src/modules/ui/interactiveActions'
import { CausalityEngine } from '../../src/modules/causality/engine'
import { MoveAct } from '../../src/modules/causality/acts'
import type { WorldState } from '../../src/types/causality'
import { DragType, DropTargetType, type DragData, type DropTarget } from '../../src/modules/ui/dragDrop'

describe('InteractiveActionsController', () => {
  let engine: CausalityEngine
  let controller: InteractiveActionsController
  let initialState: WorldState

  beforeEach(() => {
    initialState = {
      timestamp: 0,
      personPositions: {
        'alice': 'room1',
        'bob': 'room2',
      },
      itemOwnership: {
        'key': 'alice',
        'book': 'bob',
      },
      knowledge: {
        'alice': [],
        'bob': [],
      },
      itemLocations: {},
    }
    engine = new CausalityEngine(initialState)
    controller = new InteractiveActionsController(engine, initialState)
  })

  describe('world state management', () => {
    it('should update world state', () => {
      const newState: WorldState = {
        ...initialState,
        timestamp: 100,
        personPositions: {
          'alice': 'room2',
          'bob': 'room1',
        },
      }

      controller.updateWorldState(newState)
      // State is updated internally
      expect(controller['currentWorldState']).toEqual(newState)
    })
  })

  describe('validation callbacks', () => {
    it('should register and call validation callbacks', () => {
      const callback = vi.fn()
      controller.onValidation(callback)

      // Trigger a validation by attempting a move
      const act = new MoveAct('act1', 'alice', 100, {
        fromLocationId: 'room1',
        toLocationId: 'room2',
      })

      controller.canExecuteAct(act)

      expect(callback).toHaveBeenCalledWith({
        valid: true,
        errors: [],
        warnings: [],
        act,
      })
    })
  })

  describe('drag & drop handlers', () => {
    it('should handle person move via drag & drop', () => {
      const dragData: DragData = {
        type: DragType.PERSON,
        entityId: 'alice',
        sourceLocation: 'room1',
      }
      const dropTarget: DropTarget = {
        type: DropTargetType.LOCATION,
        entityId: 'room2',
      }

      const manager = controller.getDragDropManager()
      manager.startDrag(dragData)
      const result = manager.handleDrop(dropTarget)

      expect(result).toBe(true)
      expect(engine.getActs().size).toBe(1)
      const act = Array.from(engine.getActs().values())[0]
      expect(act.type).toBe('MOVE')
      expect(act.personId).toBe('alice')
    })

    it('should handle item give via drag & drop', () => {
      // First move bob to same location as alice
      const moveAct = new MoveAct('move-bob', 'bob', 50, {
        fromLocationId: 'room2',
        toLocationId: 'room1',
      })
      controller.executeAct(moveAct)

      const dragData: DragData = {
        type: DragType.ITEM,
        entityId: 'key',
        sourceOwner: 'alice',
      }
      const dropTarget: DropTarget = {
        type: DropTargetType.PERSON,
        entityId: 'bob',
      }

      const manager = controller.getDragDropManager()
      manager.startDrag(dragData)
      const result = manager.handleDrop(dropTarget)

      expect(result).toBe(true)
      expect(engine.getActs().size).toBe(2) // move + give

      const acts = Array.from(engine.getActs().values())
      const giveAct = acts.find(a => a.type === 'GIVE_ITEM')
      expect(giveAct).toBeDefined()
      expect(giveAct?.personId).toBe('alice')
    })

    it('should handle item place via drag & drop', () => {
      const dragData: DragData = {
        type: DragType.ITEM,
        entityId: 'key',
        sourceOwner: 'alice',
      }
      const dropTarget: DropTarget = {
        type: DropTargetType.LOCATION,
        entityId: 'room1',
      }

      const manager = controller.getDragDropManager()
      manager.startDrag(dragData)
      const result = manager.handleDrop(dropTarget)

      expect(result).toBe(true)
      expect(engine.getActs().size).toBe(1)
      const act = Array.from(engine.getActs().values())[0]
      expect(act.type).toBe('PLACE_ITEM')
      expect(act.personId).toBe('alice')
    })

    it('should reject invalid moves', () => {
      const dragData: DragData = {
        type: DragType.PERSON,
        entityId: 'alice',
        sourceLocation: 'room3', // Wrong source location
      }
      const dropTarget: DropTarget = {
        type: DropTargetType.LOCATION,
        entityId: 'room2',
      }

      const callback = vi.fn()
      controller.onValidation(callback)

      const manager = controller.getDragDropManager()
      manager.startDrag(dragData)
      const result = manager.handleDrop(dropTarget)

      expect(result).toBe(false)
      expect(engine.getActs().size).toBe(0)
      expect(callback).toHaveBeenCalled()
      const callArgs = callback.mock.calls[0]?.[0] as { valid: boolean; errors: string[] }
      expect(callArgs.valid).toBe(false)
      expect(callArgs.errors.some((error: string) => error.includes('not room3'))).toBe(true)
    })
  })

  describe('act execution', () => {
    it('should check if act can be executed', () => {
      const act = new MoveAct('act1', 'alice', 100, {
        fromLocationId: 'room1',
        toLocationId: 'room2',
      })

      const validation = controller.canExecuteAct(act)
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should execute valid act', () => {
      const act = new MoveAct('act1', 'alice', 100, {
        fromLocationId: 'room1',
        toLocationId: 'room2',
      })

      const success = controller.executeAct(act)
      expect(success).toBe(true)
      expect(engine.getActs().has('act1')).toBe(true)
    })

    it('should reject invalid act', () => {
      const act = new MoveAct('act1', 'alice', 100, {
        fromLocationId: 'room3', // Wrong location
        toLocationId: 'room2',
      })

      const success = controller.executeAct(act)
      expect(success).toBe(false)
      expect(engine.getActs().has('act1')).toBe(false)
    })
  })

  describe('available actions', () => {
    it('should get available actions for person', () => {
      const actions = controller.getAvailableActions('person', 'alice')

      // Alice can move to room2 (where bob is)
      expect(actions.length).toBeGreaterThan(0)
      expect(actions.some(a => a.type === 'MOVE')).toBe(true)
    })

    it('should include give actions when people are at same location', () => {
      controller.updateWorldState({
        ...initialState,
        personPositions: {
          'alice': 'room1',
          'bob': 'room1',
        },
      })

      const actions = controller.getAvailableActions('person', 'alice')

      // Alice can give key to bob
      expect(actions.some(a => a.type === 'GIVE_ITEM')).toBe(true)
    })

    it('should get available actions for item', () => {
      // Items don't have actions in current implementation
      const actions = controller.getAvailableActions('item', 'key')
      expect(actions).toHaveLength(0)
    })
  })
})