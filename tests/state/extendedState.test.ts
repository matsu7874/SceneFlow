import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  storyDataToWorldState,
  storyDataToExtendedWorldState,
  mergeWithExtendedState,
  extractBasicWorldState,
  saveExtendedState,
  loadExtendedState,
  createSampleInformation,
} from '../../src/modules/state/extendedState'
import {
  PropCategory,
  InformationCategory,
  type ExtendedProp,
} from '../../src/types/extendedEntities'
import type { StoryData } from '../../src/types'

describe('Extended State Management', () => {
  const createSampleStoryData = (): StoryData => ({
    persons: [
      { id: 'alice', name: 'Alice', description: 'Main character' },
      { id: 'bob', name: 'Bob', description: 'Supporting character' },
    ],
    locations: [
      { id: 'room1', name: 'Living Room', description: 'A cozy room' },
      { id: 'room2', name: 'Kitchen', description: 'Where food is prepared' },
    ],
    props: [
      { id: 'chair', name: '椅子(大)', description: '大きな椅子' },
      { id: 'key', name: 'Key', description: 'A small key' },
    ],
    events: [
      { person: 'alice', location: 'room1', timestamp: 100, description: 'Alice enters' },
      { person: 'bob', location: 'room2', timestamp: 200, description: 'Bob enters' },
    ],
  })

  describe('storyDataToWorldState', () => {
    it('should convert story data to world state', () => {
      const storyData = createSampleStoryData()
      const worldState = storyDataToWorldState(storyData, 300)

      expect(worldState.timestamp).toBe(300)
      expect(worldState.personPositions['alice']).toBe('room1')
      expect(worldState.personPositions['bob']).toBe('room2')
      expect(worldState.knowledge['alice']).toEqual([])
      expect(worldState.knowledge['bob']).toEqual([])
    })

    it('should track person positions at specific timestamp', () => {
      const storyData = createSampleStoryData()
      storyData.events.push({
        person: 'alice',
        location: 'room2',
        timestamp: 400,
        description: 'Alice moves',
      })

      const worldState1 = storyDataToWorldState(storyData, 150)
      expect(worldState1.personPositions['alice']).toBe('room1')

      const worldState2 = storyDataToWorldState(storyData, 450)
      expect(worldState2.personPositions['alice']).toBe('room2')
    })
  })

  describe('storyDataToExtendedWorldState', () => {
    it('should convert story data to extended world state', () => {
      const storyData = createSampleStoryData()
      const extendedState = storyDataToExtendedWorldState(storyData, 300)

      expect(extendedState.timestamp).toBe(300)
      expect(extendedState.personPositions['alice']).toBe('room1')
      expect(extendedState.props['chair']).toBeDefined()
      expect(extendedState.props['key']).toBeDefined()
    })

    it('should categorize props based on name', () => {
      const storyData = createSampleStoryData()
      const extendedState = storyDataToExtendedWorldState(storyData, 300)

      // Chair has "大" in name, should be large prop
      expect(extendedState.props['chair'].category).toBe(PropCategory.LARGE_PROP)
      expect(extendedState.props['chair'].isPortable).toBe(false)

      // Key doesn't have "大", should be small prop
      expect(extendedState.props['key'].category).toBe(PropCategory.SMALL_PROP)
      expect(extendedState.props['key'].isPortable).toBe(true)
    })

    it('should initialize knowledge states', () => {
      const storyData = createSampleStoryData()
      const extendedState = storyDataToExtendedWorldState(storyData, 300)

      expect(extendedState.knowledgeStates['alice']).toBeDefined()
      expect(extendedState.knowledgeStates['alice'].personId).toBe('alice')
      expect(extendedState.knowledgeStates['alice'].knownInformation).toEqual([])
    })

    it('should initialize location properties', () => {
      const storyData = createSampleStoryData()
      const extendedState = storyDataToExtendedWorldState(storyData, 300)

      expect(extendedState.locationProperties['room1']).toBeDefined()
      expect(extendedState.locationProperties['room1'].isAccessible).toBe(true)
      expect(extendedState.locationProperties['room1'].connectedLocations).toEqual([])
    })
  })

  describe('mergeWithExtendedState', () => {
    it('should merge basic state with extended properties', () => {
      const basicState = storyDataToWorldState(createSampleStoryData(), 300)
      const extendedProp: ExtendedProp = {
        id: 'sword',
        name: 'Magic Sword',
        description: 'A glowing sword',
        category: PropCategory.SMALL_PROP,
        isPortable: true,
      }

      const merged = mergeWithExtendedState(basicState, {
        props: { sword: extendedProp },
      })

      expect(merged.props['sword']).toEqual(extendedProp)
      expect(merged.personPositions).toEqual(basicState.personPositions)
    })

    it('should convert knowledge arrays to knowledge states', () => {
      const basicState = storyDataToWorldState(createSampleStoryData(), 300)
      basicState.knowledge['alice'] = ['info1', 'info2']

      const merged = mergeWithExtendedState(basicState, {})

      expect(merged.knowledgeStates['alice'].knownInformation).toEqual(['info1', 'info2'])
    })
  })

  describe('extractBasicWorldState', () => {
    it('should extract basic state from extended state', () => {
      const storyData = createSampleStoryData()
      const extendedState = storyDataToExtendedWorldState(storyData, 300)

      // Add some knowledge
      extendedState.knowledgeStates['alice'].knownInformation = ['info1', 'info2']

      const basicState = extractBasicWorldState(extendedState)

      expect(basicState.timestamp).toBe(300)
      expect(basicState.personPositions).toEqual(extendedState.personPositions)
      expect(basicState.knowledge['alice']).toEqual(['info1', 'info2'])
    })
  })

  describe('persistence', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    afterEach(() => {
      localStorage.clear()
    })

    it('should save and load extended state', () => {
      const extendedState = storyDataToExtendedWorldState(createSampleStoryData(), 300)

      // Add some data to knowledge states
      extendedState.knowledgeStates['alice'].beliefs.set('info1', true)
      extendedState.knowledgeStates['alice'].informationSources.set('info1', 'bob')

      saveExtendedState(extendedState)
      const loaded = loadExtendedState()

      expect(loaded).toBeDefined()
      expect(loaded?.timestamp).toBe(300)
      expect(loaded?.knowledgeStates['alice'].beliefs.get('info1')).toBe(true)
      expect(loaded?.knowledgeStates['alice'].informationSources.get('info1')).toBe('bob')
    })

    it('should return null when no saved state exists', () => {
      const loaded = loadExtendedState()
      expect(loaded).toBeNull()
    })
  })

  describe('createSampleInformation', () => {
    it('should create sample information entities', () => {
      const info = createSampleInformation()

      expect(Object.keys(info)).toHaveLength(3)
      expect(info['info-1'].category).toBe(InformationCategory.SECRET)
      expect(info['info-1'].isSecret).toBe(true)
      expect(info['info-2'].category).toBe(InformationCategory.SECRET)
      expect(info['info-3'].category).toBe(InformationCategory.INSTRUCTION)
      expect(info['info-3'].requiresContext).toContain('info-2')
    })
  })
})
