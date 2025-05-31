import { describe, it, expect } from 'vitest'
import { getStateAtTime } from '../../src/modules/simulation/core'
import { indexStoryData, sortEvents } from '../../src/modules/data/indexer'
import type { StoryData } from '../../src/types'

describe('getStateAtTime', () => {
  const mockStoryData: StoryData = {
    persons: [
      { id: 1, name: 'Alice', color: '#ff0000' },
      { id: 2, name: 'Bob', color: '#00ff00' },
      { id: 3, name: 'Carol', color: '#0000ff' }
    ],
    locations: [
      { id: 101, name: 'Room 1', connections: [102] },
      { id: 102, name: 'Room 2', connections: [101] },
      { id: 103, name: 'Room 3', connections: [] }
    ],
    acts: [
      { id: 1001, personId: 1, locationId: 101, time: '09:00', description: 'Initial act' },
      { id: 1002, personId: 1, locationId: 102, time: '09:30', description: 'Move to room 2' },
      { id: 1003, personId: 2, locationId: 102, time: '10:00', description: 'Bob enters room 2' },
      { id: 1004, personId: 1, locationId: 103, time: '10:30', description: 'Move to room 3' }
    ],
    props: [],
    informations: [],
    events: [
      { id: 1, triggerType: '時刻', triggerValue: '09:00', eventTime: '09:00', personId: 1, actId: 1001 },
      { id: 2, triggerType: '時刻', triggerValue: '09:30', eventTime: '09:30', personId: 1, actId: 1002 },
      { id: 3, triggerType: '時刻', triggerValue: '10:00', eventTime: '10:00', personId: 2, actId: 1003 },
      { id: 4, triggerType: '時刻', triggerValue: '10:30', eventTime: '10:30', personId: 1, actId: 1004 }
    ],
    initialStates: [
      { personId: 1, locationId: 101, time: '09:00' },
      { personId: 2, locationId: 101, time: '09:00' }
    ],
    moves: [],
    stays: []
  }

  const indexedData = indexStoryData(mockStoryData)
  const sortedEvents = sortEvents(mockStoryData.events)

  it('should return initial states before any events', () => {
    const state = getStateAtTime(530, indexedData, sortedEvents, mockStoryData.initialStates) // 08:50
    
    expect(state[1].locationId).toBe(null)
    expect(state[1].lastAction).toBe(null)
    expect(state[2].locationId).toBe(null)
    expect(state[2].lastAction).toBe(null)
  })

  it('should return state at initial time', () => {
    const state = getStateAtTime(540, indexedData, sortedEvents, mockStoryData.initialStates) // 09:00
    
    expect(state[1].locationId).toBe(101)
    expect(state[1].lastAction?.id).toBe(1001)
    expect(state[2].locationId).toBe(101)
    expect(state[2].lastAction).toBe(null)
  })

  it('should track location changes over time', () => {
    // At 09:15 - Alice should still be in room 1
    let state = getStateAtTime(555, indexedData, sortedEvents, mockStoryData.initialStates)
    expect(state[1].locationId).toBe(101)
    expect(state[1].lastAction?.id).toBe(1001)
    
    // At 09:45 - Alice should be in room 2
    state = getStateAtTime(585, indexedData, sortedEvents, mockStoryData.initialStates)
    expect(state[1].locationId).toBe(102)
    expect(state[1].lastAction?.id).toBe(1002)
    
    // At 10:15 - Alice in room 2, Bob in room 2
    state = getStateAtTime(615, indexedData, sortedEvents, mockStoryData.initialStates)
    expect(state[1].locationId).toBe(102)
    expect(state[2].locationId).toBe(102)
    expect(state[2].lastAction?.id).toBe(1003)
    
    // At 10:45 - Alice in room 3, Bob still in room 2
    state = getStateAtTime(645, indexedData, sortedEvents, mockStoryData.initialStates)
    expect(state[1].locationId).toBe(103)
    expect(state[1].lastAction?.id).toBe(1004)
    expect(state[2].locationId).toBe(102)
  })

  it('should handle person with no events', () => {
    const state = getStateAtTime(600, indexedData, sortedEvents, mockStoryData.initialStates)
    
    // Carol (id: 3) has no events
    expect(state[3].locationId).toBe(null)
    expect(state[3].lastAction).toBe(null)
  })

  it('should handle person with no initial state', () => {
    const modifiedInitialStates = mockStoryData.initialStates.filter(s => s.personId !== 2)
    const state = getStateAtTime(595, indexedData, sortedEvents, modifiedInitialStates) // 09:55
    
    // Bob (id: 2) has no initial state, but has an event at 10:00
    expect(state[2].locationId).toBe(null)
    expect(state[2].lastAction).toBe(null)
  })

  it('should only consider events up to target time', () => {
    const state = getStateAtTime(595, indexedData, sortedEvents, mockStoryData.initialStates) // 09:55
    
    // Bob's event at 10:00 should not be included yet
    expect(state[2].locationId).toBe(101) // Still in initial location
    expect(state[2].lastAction).toBe(null)
  })

  it('should handle empty data', () => {
    const emptyIndexedData = indexStoryData({
      persons: [],
      locations: [],
      acts: [],
      props: [],
      informations: [],
      events: [],
      initialStates: [],
      moves: [],
      stays: []
    })
    
    const state = getStateAtTime(540, emptyIndexedData, [], [])
    expect(state).toEqual({})
  })
})