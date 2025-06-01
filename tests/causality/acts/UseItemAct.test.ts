import { describe, it, expect } from 'vitest'
import { UseItemAct } from '../../../src/modules/causality/acts/UseItemAct'
import type { WorldState } from '../../../src/types/causality'

describe('UseItemAct', () => {
  const createInitialState = (): WorldState => ({
    timestamp: 0,
    personPositions: {
      alice: 'room1',
      bob: 'room1',
      charlie: 'room2',
    },
    itemOwnership: {
      key: 'alice',
      book: 'bob',
    },
    knowledge: {},
    itemLocations: {
      chest: 'room1',
      table: 'room2',
    },
  })

  describe('checkPreconditions', () => {
    it('should pass when using owned item without target', () => {
      const state = createInitialState()
      const act = new UseItemAct('act1', 'alice', 100, {
        itemId: 'key',
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail when user does not exist', () => {
      const state = createInitialState()
      const act = new UseItemAct('act1', 'unknown', 100, {
        itemId: 'key',
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('USER_NOT_FOUND')
    })

    it('should fail when user does not own the item', () => {
      const state = createInitialState()
      const act = new UseItemAct('act1', 'alice', 100, {
        itemId: 'book',
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('ITEM_NOT_OWNED')
    })

    describe('with person target', () => {
      it('should pass when target person is at same location', () => {
        const state = createInitialState()
        const act = new UseItemAct('act1', 'alice', 100, {
          itemId: 'key',
          targetId: 'bob',
          targetType: 'person',
        })

        const result = act.checkPreconditions(state)
        expect(result.valid).toBe(true)
      })

      it('should fail when target person does not exist', () => {
        const state = createInitialState()
        const act = new UseItemAct('act1', 'alice', 100, {
          itemId: 'key',
          targetId: 'unknown',
          targetType: 'person',
        })

        const result = act.checkPreconditions(state)
        expect(result.valid).toBe(false)
        expect(result.errors[0].code).toBe('TARGET_PERSON_NOT_FOUND')
      })

      it('should fail when target person is at different location', () => {
        const state = createInitialState()
        const act = new UseItemAct('act1', 'alice', 100, {
          itemId: 'key',
          targetId: 'charlie',
          targetType: 'person',
        })

        const result = act.checkPreconditions(state)
        expect(result.valid).toBe(false)
        expect(result.errors[0].code).toBe('TARGET_NOT_PRESENT')
      })
    })

    describe('with item target', () => {
      it('should pass when target item is at same location', () => {
        const state = createInitialState()
        const act = new UseItemAct('act1', 'alice', 100, {
          itemId: 'key',
          targetId: 'chest',
          targetType: 'item',
        })

        const result = act.checkPreconditions(state)
        expect(result.valid).toBe(true)
      })

      it('should pass when user owns target item', () => {
        const state = createInitialState()
        state.itemOwnership['tool'] = 'alice'
        const act = new UseItemAct('act1', 'alice', 100, {
          itemId: 'key',
          targetId: 'tool',
          targetType: 'item',
        })

        const result = act.checkPreconditions(state)
        expect(result.valid).toBe(true)
      })

      it('should fail when target item is owned by someone else', () => {
        const state = createInitialState()
        const act = new UseItemAct('act1', 'alice', 100, {
          itemId: 'key',
          targetId: 'book',
          targetType: 'item',
        })

        const result = act.checkPreconditions(state)
        expect(result.valid).toBe(false)
        expect(result.errors[0].code).toBe('TARGET_ITEM_NOT_ACCESSIBLE')
      })

      it('should fail when target item is at different location', () => {
        const state = createInitialState()
        const act = new UseItemAct('act1', 'alice', 100, {
          itemId: 'key',
          targetId: 'table',
          targetType: 'item',
        })

        const result = act.checkPreconditions(state)
        expect(result.valid).toBe(false)
        expect(result.errors[0].code).toBe('TARGET_ITEM_NOT_HERE')
      })
    })

    describe('with location target', () => {
      it('should pass when at target location', () => {
        const state = createInitialState()
        const act = new UseItemAct('act1', 'alice', 100, {
          itemId: 'key',
          targetId: 'room1',
          targetType: 'location',
        })

        const result = act.checkPreconditions(state)
        expect(result.valid).toBe(true)
      })

      it('should fail when not at target location', () => {
        const state = createInitialState()
        const act = new UseItemAct('act1', 'alice', 100, {
          itemId: 'key',
          targetId: 'room2',
          targetType: 'location',
        })

        const result = act.checkPreconditions(state)
        expect(result.valid).toBe(false)
        expect(result.errors[0].code).toBe('WRONG_LOCATION')
      })
    })
  })

  describe('applyPostconditions', () => {
    it('should update timestamp without changing state (placeholder)', () => {
      const state = createInitialState()
      const act = new UseItemAct('act1', 'alice', 100, {
        itemId: 'key',
      })

      const newState = act.applyPostconditions(state)
      expect(newState.timestamp).toBe(100)
      // Placeholder implementation doesn't change other state
      expect(newState.itemOwnership).toEqual(state.itemOwnership)
    })
  })

  describe('getAffectedEntities', () => {
    it('should return user and item', () => {
      const act = new UseItemAct('act1', 'alice', 100, {
        itemId: 'key',
      })

      const entities = act.getAffectedEntities()
      expect(entities).toContain('alice')
      expect(entities).toContain('key')
    })

    it('should include target when specified', () => {
      const act = new UseItemAct('act1', 'alice', 100, {
        itemId: 'key',
        targetId: 'chest',
        targetType: 'item',
      })

      const entities = act.getAffectedEntities()
      expect(entities).toContain('alice')
      expect(entities).toContain('key')
      expect(entities).toContain('chest')
    })
  })
})
