import { describe, it, expect, beforeEach } from 'vitest'
import { CausalityEngine } from '../../src/modules/causality/engine'
import { MoveAct } from '../../src/modules/causality/acts/MoveAct'
import { GiveItemAct } from '../../src/modules/causality/acts/GiveItemAct'
import { TakeItemAct } from '../../src/modules/causality/acts/TakeItemAct'
import { PlaceItemAct } from '../../src/modules/causality/acts/PlaceItemAct'
import type { WorldState } from '../../src/types/causality'

describe('CausalityEngine', () => {
  let engine: CausalityEngine
  let initialState: WorldState

  beforeEach(() => {
    engine = new CausalityEngine()
    initialState = {
      timestamp: 0,
      personPositions: {
        alice: 'entrance',
        bob: 'hallway',
      },
      itemOwnership: {
        key: 'alice',
        book: 'bob',
      },
      knowledge: {
        alice: [],
        bob: [],
      },
      itemLocations: {
        map: 'entrance',
      },
    }
  })

  describe('addAct', () => {
    it('should add a valid act to the engine', () => {
      const act = new MoveAct('act1', 'alice', 100, {
        fromLocationId: 'entrance',
        toLocationId: 'hallway',
      })

      const result = engine.addAct(act)

      expect(result.valid).toBe(true)
      expect(engine.getActs().has('act1')).toBe(true)
    })
  })

  describe('removeAct', () => {
    it('should remove an act when it has no dependencies', () => {
      const act = new MoveAct('act1', 'alice', 100, {
        fromLocationId: 'entrance',
        toLocationId: 'hallway',
      })

      engine.addAct(act)
      const result = engine.removeAct('act1')

      expect(result.valid).toBe(true)
      expect(engine.getActs().has('act1')).toBe(false)
    })

    it('should fail to remove non-existent act', () => {
      const result = engine.removeAct('non-existent')

      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('ACT_NOT_FOUND')
    })
  })

  describe('getStateAt', () => {
    it('should calculate correct state after applying acts', () => {
      // Alice moves to hallway
      const move1 = new MoveAct('act1', 'alice', 50, {
        fromLocationId: 'entrance',
        toLocationId: 'hallway',
      })

      // Alice gives key to Bob
      const give1 = new GiveItemAct('act2', 'alice', 100, {
        itemId: 'key',
        toPersonId: 'bob',
      })

      engine.addAct(move1)
      engine.addAct(give1)

      const stateAt150 = engine.getStateAt(150, initialState)

      expect(stateAt150.personPositions['alice']).toBe('hallway')
      expect(stateAt150.itemOwnership['key']).toBe('bob')
      expect(stateAt150.timestamp).toBe(150)
    })

    it('should not apply acts with failed preconditions', () => {
      // Try to give item without being in same location
      const give1 = new GiveItemAct('act1', 'alice', 100, {
        itemId: 'key',
        toPersonId: 'bob', // Bob is in different location
      })

      engine.addAct(give1)

      const stateAt150 = engine.getStateAt(150, initialState)

      // Key should still be owned by Alice
      expect(stateAt150.itemOwnership['key']).toBe('alice')
    })
  })

  describe('validateTimeline', () => {
    it('should detect precondition violations', () => {
      // Alice tries to give key to Bob while in different locations
      const give1 = new GiveItemAct('act1', 'alice', 100, {
        itemId: 'key',
        toPersonId: 'bob',
      })

      engine.addAct(give1)

      const validation = engine.validateTimeline(initialState)

      expect(validation.valid).toBe(false)
      expect(validation.conflicts).toHaveLength(1)
      expect(validation.conflicts[0].type).toBe('precondition_violated')
    })

    it('should validate a consistent timeline', () => {
      // Alice moves to hallway
      const move1 = new MoveAct('act1', 'alice', 50, {
        fromLocationId: 'entrance',
        toLocationId: 'hallway',
      })

      // Then Alice gives key to Bob
      const give1 = new GiveItemAct('act2', 'alice', 100, {
        itemId: 'key',
        toPersonId: 'bob',
      })

      engine.addAct(move1)
      engine.addAct(give1)

      const validation = engine.validateTimeline(initialState)

      expect(validation.valid).toBe(true)
      expect(validation.conflicts).toHaveLength(0)
    })
  })

  describe('traceCausality', () => {
    it('should trace the cause of an ownership change', () => {
      // Alice moves to hallway
      const move1 = new MoveAct('act1', 'alice', 50, {
        fromLocationId: 'entrance',
        toLocationId: 'hallway',
      })

      // Alice gives key to Bob
      const give1 = new GiveItemAct('act2', 'alice', 100, {
        itemId: 'key',
        toPersonId: 'bob',
      })

      engine.addAct(move1)
      engine.addAct(give1)

      // Apply acts to record state history
      engine.getStateAt(150, initialState)

      const trace = engine.traceCausality(
        {
          type: 'ownership',
          entityId: 'key',
          oldValue: 'alice',
          newValue: 'bob',
        },
        150,
        initialState,
      )

      expect(trace.causedByActs).toHaveLength(1)
      expect(trace.causedByActs[0].type).toBe('GIVE_ITEM')
    })
  })

  describe('complex scenarios', () => {
    it('should handle item pickup and placement correctly', () => {
      // Alice picks up the map
      const take1 = new TakeItemAct('act1', 'alice', 50, {
        itemId: 'map',
        fromLocationId: 'entrance',
      })

      // Alice moves to hallway
      const move1 = new MoveAct('act2', 'alice', 100, {
        fromLocationId: 'entrance',
        toLocationId: 'hallway',
      })

      // Alice places the map in hallway
      const place1 = new PlaceItemAct('act3', 'alice', 150, {
        itemId: 'map',
        locationId: 'hallway',
      })

      engine.addAct(take1)
      engine.addAct(move1)
      engine.addAct(place1)

      const finalState = engine.getStateAt(200, initialState)

      expect(finalState.itemOwnership['map']).toBeUndefined()
      expect(finalState.itemLocations['map']).toBe('hallway')
      expect(finalState.personPositions['alice']).toBe('hallway')
    })
  })
})
