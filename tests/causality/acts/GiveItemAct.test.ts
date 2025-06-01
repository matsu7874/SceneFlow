import { describe, it, expect } from 'vitest'
import { GiveItemAct } from '../../../src/modules/causality/acts/GiveItemAct'
import type { WorldState } from '../../../src/types/causality'

describe('GiveItemAct', () => {
  const createInitialState = (): WorldState => ({
    timestamp: 0,
    personPositions: {
      person1: 'location1',
      person2: 'location1',
      person3: 'location2',
    },
    itemOwnership: {
      item1: 'person1',
      item2: 'person2',
    },
    knowledge: {},
    itemLocations: {},
  })

  describe('checkPreconditions', () => {
    it('should validate successfully when all conditions are met', () => {
      const state = createInitialState()
      const act = new GiveItemAct('act1', 'person1', 100, {
        itemId: 'item1',
        toPersonId: 'person2',
      })

      const result = act.checkPreconditions(state)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail when giver does not own the item', () => {
      const state = createInitialState()
      const act = new GiveItemAct('act1', 'person1', 100, {
        itemId: 'item2', // Owned by person2, not person1
        toPersonId: 'person2',
      })

      const result = act.checkPreconditions(state)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('ITEM_NOT_OWNED')
    })

    it('should fail when giver and receiver are not at the same location', () => {
      const state = createInitialState()
      const act = new GiveItemAct('act1', 'person1', 100, {
        itemId: 'item1',
        toPersonId: 'person3', // At different location
      })

      const result = act.checkPreconditions(state)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('NOT_SAME_LOCATION')
    })

    it('should fail when trying to give to oneself', () => {
      const state = createInitialState()
      const act = new GiveItemAct('act1', 'person1', 100, {
        itemId: 'item1',
        toPersonId: 'person1', // Same as giver
      })

      const result = act.checkPreconditions(state)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('SELF_GIVE')
    })
  })

  describe('applyPostconditions', () => {
    it('should transfer item ownership correctly', () => {
      const state = createInitialState()
      const act = new GiveItemAct('act1', 'person1', 100, {
        itemId: 'item1',
        toPersonId: 'person2',
      })

      const newState = act.applyPostconditions(state)

      expect(newState.itemOwnership['item1']).toBe('person2')
      expect(newState.timestamp).toBe(100)

      // Ensure original state is not modified
      expect(state.itemOwnership['item1']).toBe('person1')
    })
  })

  describe('getAffectedEntities', () => {
    it('should return giver, receiver, and item', () => {
      const act = new GiveItemAct('act1', 'person1', 100, {
        itemId: 'item1',
        toPersonId: 'person2',
      })

      const entities = act.getAffectedEntities()

      expect(entities).toContain('person1')
      expect(entities).toContain('person2')
      expect(entities).toContain('item1')
    })
  })
})
