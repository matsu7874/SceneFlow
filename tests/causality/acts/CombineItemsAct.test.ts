import { describe, it, expect } from 'vitest'
import { CombineItemsAct } from '../../../src/modules/causality/acts/CombineItemsAct'
import type { WorldState } from '../../../src/types/causality'

describe('CombineItemsAct', () => {
  const createInitialState = (): WorldState => ({
    timestamp: 0,
    personPositions: {
      alice: 'room1',
      bob: 'room2',
    },
    itemOwnership: {
      stick: 'alice',
      string: 'alice',
      rock: 'alice',
      metal: 'bob',
    },
    knowledge: {},
    itemLocations: {
      glue: 'room1',
    },
  })

  describe('checkPreconditions', () => {
    it('should pass when combining two owned items', () => {
      const state = createInitialState()
      const act = new CombineItemsAct('act1', 'alice', 100, {
        itemIds: ['stick', 'string'],
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should pass when combining multiple owned items', () => {
      const state = createInitialState()
      const act = new CombineItemsAct('act1', 'alice', 100, {
        itemIds: ['stick', 'string', 'rock'],
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(true)
    })

    it('should fail when combiner does not exist', () => {
      const state = createInitialState()
      const act = new CombineItemsAct('act1', 'unknown', 100, {
        itemIds: ['stick', 'string'],
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('COMBINER_NOT_FOUND')
    })

    it('should fail with insufficient items', () => {
      const state = createInitialState()
      const act = new CombineItemsAct('act1', 'alice', 100, {
        itemIds: ['stick'],
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('INSUFFICIENT_ITEMS')
    })

    it('should fail with duplicate items', () => {
      const state = createInitialState()
      const act = new CombineItemsAct('act1', 'alice', 100, {
        itemIds: ['stick', 'stick'],
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('DUPLICATE_ITEMS')
    })

    it('should fail when not owning all items', () => {
      const state = createInitialState()
      const act = new CombineItemsAct('act1', 'alice', 100, {
        itemIds: ['stick', 'metal'],
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('ITEM_NOT_OWNED')
      expect(result.errors[0].message).toContain('metal')
    })

    it('should fail when trying to combine unowned item at location', () => {
      const state = createInitialState()
      const act = new CombineItemsAct('act1', 'alice', 100, {
        itemIds: ['stick', 'glue'],
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('ITEM_NOT_OWNED')
      expect(result.errors[0].suggestion).toContain('location')
    })

    it('should report multiple errors', () => {
      const state = createInitialState()
      const act = new CombineItemsAct('act1', 'alice', 100, {
        itemIds: ['stick', 'stick', 'metal'],
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2) // duplicate and not owned
    })
  })

  describe('applyPostconditions', () => {
    it('should remove combined items from ownership', () => {
      const state = createInitialState()
      const act = new CombineItemsAct('act1', 'alice', 100, {
        itemIds: ['stick', 'string'],
      })

      const newState = act.applyPostconditions(state)
      expect(newState.itemOwnership['stick']).toBeUndefined()
      expect(newState.itemOwnership['string']).toBeUndefined()
      expect(newState.timestamp).toBe(100)
    })

    it('should remove items from locations too', () => {
      const state = createInitialState()
      state.itemLocations['stick'] = 'room1' // Add to locations as well

      const act = new CombineItemsAct('act1', 'alice', 100, {
        itemIds: ['stick', 'string'],
      })

      const newState = act.applyPostconditions(state)
      expect(newState.itemLocations['stick']).toBeUndefined()
    })

    it('should not affect other items', () => {
      const state = createInitialState()
      const act = new CombineItemsAct('act1', 'alice', 100, {
        itemIds: ['stick', 'string'],
      })

      const newState = act.applyPostconditions(state)
      expect(newState.itemOwnership['rock']).toBe('alice')
      expect(newState.itemOwnership['metal']).toBe('bob')
    })
  })

  describe('getAffectedEntities', () => {
    it('should return combiner and all items', () => {
      const act = new CombineItemsAct('act1', 'alice', 100, {
        itemIds: ['stick', 'string', 'rock'],
      })

      const entities = act.getAffectedEntities()
      expect(entities).toContain('alice')
      expect(entities).toContain('stick')
      expect(entities).toContain('string')
      expect(entities).toContain('rock')
    })

    it('should include result item when specified', () => {
      const act = new CombineItemsAct('act1', 'alice', 100, {
        itemIds: ['stick', 'string'],
        resultItemId: 'fishing-rod',
      })

      const entities = act.getAffectedEntities()
      expect(entities).toContain('fishing-rod')
    })
  })
})
