import { describe, it, expect } from 'vitest'
import { SpeakAct } from '../../../src/modules/causality/acts/SpeakAct'
import type { WorldState } from '../../../src/types/causality'

describe('SpeakAct', () => {
  const createInitialState = (): WorldState => ({
    timestamp: 0,
    personPositions: {
      alice: 'room1',
      bob: 'room1',
      charlie: 'room2',
    },
    itemOwnership: {},
    knowledge: {
      alice: ['info1', 'info2'],
      bob: [],
      charlie: [],
    },
    itemLocations: {},
  })

  describe('checkPreconditions', () => {
    it('should pass when all conditions are met', () => {
      const state = createInitialState()
      const act = new SpeakAct('act1', 'alice', 100, {
        toPersonIds: ['bob'],
        informationId: 'info1',
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail when speaker does not exist', () => {
      const state = createInitialState()
      const act = new SpeakAct('act1', 'unknown', 100, {
        toPersonIds: ['bob'],
        informationId: 'info1',
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('SPEAKER_NOT_FOUND')
    })

    it('should fail when speaker does not know the information', () => {
      const state = createInitialState()
      const act = new SpeakAct('act1', 'bob', 100, {
        toPersonIds: ['alice'],
        informationId: 'info1',
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('SPEAKER_LACKS_KNOWLEDGE')
    })

    it('should fail when recipient does not exist', () => {
      const state = createInitialState()
      const act = new SpeakAct('act1', 'alice', 100, {
        toPersonIds: ['unknown'],
        informationId: 'info1',
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('RECIPIENT_NOT_FOUND')
    })

    it('should fail when recipient is not at the same location', () => {
      const state = createInitialState()
      const act = new SpeakAct('act1', 'alice', 100, {
        toPersonIds: ['charlie'],
        informationId: 'info1',
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('RECIPIENT_NOT_PRESENT')
    })

    it('should fail when trying to speak to oneself', () => {
      const state = createInitialState()
      const act = new SpeakAct('act1', 'alice', 100, {
        toPersonIds: ['alice'],
        informationId: 'info1',
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('SELF_SPEAK')
    })

    it('should handle multiple recipients with mixed validity', () => {
      const state = createInitialState()
      const act = new SpeakAct('act1', 'alice', 100, {
        toPersonIds: ['bob', 'charlie', 'unknown'],
        informationId: 'info1',
      })

      const result = act.checkPreconditions(state)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2) // charlie not present, unknown not found
    })
  })

  describe('applyPostconditions', () => {
    it('should add knowledge to single recipient', () => {
      const state = createInitialState()
      const act = new SpeakAct('act1', 'alice', 100, {
        toPersonIds: ['bob'],
        informationId: 'info1',
      })

      const newState = act.applyPostconditions(state)
      expect(newState.knowledge['bob']).toContain('info1')
      expect(newState.timestamp).toBe(100)
    })

    it('should add knowledge to multiple recipients', () => {
      const state = createInitialState()
      // Move charlie to room1 first
      state.personPositions['charlie'] = 'room1'

      const act = new SpeakAct('act1', 'alice', 100, {
        toPersonIds: ['bob', 'charlie'],
        informationId: 'info2',
      })

      const newState = act.applyPostconditions(state)
      expect(newState.knowledge['bob']).toContain('info2')
      expect(newState.knowledge['charlie']).toContain('info2')
    })

    it('should not duplicate knowledge if already known', () => {
      const state = createInitialState()
      state.knowledge['bob'] = ['info1']

      const act = new SpeakAct('act1', 'alice', 100, {
        toPersonIds: ['bob'],
        informationId: 'info1',
      })

      const newState = act.applyPostconditions(state)
      expect(newState.knowledge['bob']).toEqual(['info1'])
      expect(newState.knowledge['bob'].filter(i => i === 'info1')).toHaveLength(1)
    })
  })

  describe('getAffectedEntities', () => {
    it('should return speaker, recipients, and information', () => {
      const act = new SpeakAct('act1', 'alice', 100, {
        toPersonIds: ['bob', 'charlie'],
        informationId: 'info1',
      })

      const entities = act.getAffectedEntities()
      expect(entities).toContain('alice')
      expect(entities).toContain('bob')
      expect(entities).toContain('charlie')
      expect(entities).toContain('info1')
    })
  })
})
