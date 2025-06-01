import { describe, it, expect } from 'vitest'
import { MoveAct } from '../../../src/modules/causality/acts/MoveAct'
import type { WorldState } from '../../../src/types/causality'

describe('MoveAct', () => {
  const createInitialState = (): WorldState => ({
    timestamp: 0,
    personPositions: {
      person1: 'location1',
      person2: 'location2',
    },
    itemOwnership: {},
    knowledge: {},
    itemLocations: {},
  })

  describe('checkPreconditions', () => {
    it('should validate successfully when person is at the correct starting location', () => {
      const state = createInitialState()
      const act = new MoveAct('act1', 'person1', 100, {
        fromLocationId: 'location1',
        toLocationId: 'location2',
      })

      const result = act.checkPreconditions(state)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail when person is not at the expected starting location', () => {
      const state = createInitialState()
      const act = new MoveAct('act1', 'person1', 100, {
        fromLocationId: 'location3', // Wrong starting location
        toLocationId: 'location2',
      })

      const result = act.checkPreconditions(state)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('WRONG_STARTING_LOCATION')
    })

    it('should fail when person does not exist in world state', () => {
      const state = createInitialState()
      const act = new MoveAct('act1', 'person3', 100, {
        // Non-existent person
        fromLocationId: 'location1',
        toLocationId: 'location2',
      })

      const result = act.checkPreconditions(state)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('PERSON_NOT_FOUND')
    })
  })

  describe('applyPostconditions', () => {
    it('should update person position correctly', () => {
      const state = createInitialState()
      const act = new MoveAct('act1', 'person1', 100, {
        fromLocationId: 'location1',
        toLocationId: 'location2',
      })

      const newState = act.applyPostconditions(state)

      expect(newState.personPositions['person1']).toBe('location2')
      expect(newState.timestamp).toBe(100)

      // Ensure original state is not modified
      expect(state.personPositions['person1']).toBe('location1')
    })
  })

  describe('getAffectedEntities', () => {
    it('should return person and both locations', () => {
      const act = new MoveAct('act1', 'person1', 100, {
        fromLocationId: 'location1',
        toLocationId: 'location2',
      })

      const entities = act.getAffectedEntities()

      expect(entities).toContain('person1')
      expect(entities).toContain('location1')
      expect(entities).toContain('location2')
      expect(entities).toHaveLength(3)
    })
  })
})
