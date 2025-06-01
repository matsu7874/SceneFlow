import { describe, it, expect } from 'vitest'
import { indexStoryData, sortEvents } from '../../src/modules/data/indexer'
import type { StoryData, Event } from '../../src/types'

describe('indexStoryData', () => {
  const mockStoryData: StoryData = {
    persons: [
      { id: 1, name: 'Alice', color: '#ff0000' },
      { id: 2, name: 'Bob', color: '#00ff00' },
    ],
    locations: [
      { id: 101, name: 'Room 1', connections: [102] },
      { id: 102, name: 'Room 2', connections: [101] },
    ],
    acts: [
      { id: 1001, personId: 1, locationId: 101, time: '09:00', description: 'Act 1' },
    ],
    props: [
      { id: 201, name: 'Key' },
    ],
    informations: [
      { id: 301, content: 'Secret info' },
    ],
    events: [
      { id: 1, triggerType: '時刻', triggerValue: '09:00', eventTime: '09:00', personId: 1, actId: 1001 },
    ],
    initialStates: [
      { personId: 1, locationId: 101, time: '09:00' },
    ],
    moves: [],
    stays: [],
  }

  it('should create maps for all entity types', () => {
    const result = indexStoryData(mockStoryData)

    expect(result.personMap.size).toBe(2)
    expect(result.personMap.get(1)).toEqual(mockStoryData.persons[0])
    expect(result.personMap.get(2)).toEqual(mockStoryData.persons[1])

    expect(result.locationMap.size).toBe(2)
    expect(result.locationMap.get(101)).toEqual(mockStoryData.locations[0])

    expect(result.actMap.size).toBe(1)
    expect(result.actMap.get(1001)).toEqual(mockStoryData.acts[0])

    expect(result.propMap.size).toBe(1)
    expect(result.propMap.get(201)).toEqual(mockStoryData.props[0])

    expect(result.infoMap.size).toBe(1)
    expect(result.infoMap.get(301)).toEqual(mockStoryData.informations[0])
  })

  it('should preserve original arrays', () => {
    const result = indexStoryData(mockStoryData)

    expect(result.persons).toEqual(mockStoryData.persons)
    expect(result.locations).toEqual(mockStoryData.locations)
    expect(result.acts).toEqual(mockStoryData.acts)
    expect(result.events).toEqual(mockStoryData.events)
    expect(result.initialStates).toEqual(mockStoryData.initialStates)
  })

  it('should handle empty data', () => {
    const emptyData: StoryData = {
      persons: [],
      locations: [],
      acts: [],
      props: [],
      informations: [],
      events: [],
      initialStates: [],
      moves: [],
      stays: [],
    }

    const result = indexStoryData(emptyData)

    expect(result.personMap.size).toBe(0)
    expect(result.locationMap.size).toBe(0)
    expect(result.actMap.size).toBe(0)
    expect(result.propMap.size).toBe(0)
    expect(result.infoMap.size).toBe(0)
  })

  it('should handle undefined optional arrays', () => {
    const minimalData: StoryData = {
      persons: mockStoryData.persons,
      locations: mockStoryData.locations,
      acts: mockStoryData.acts,
      events: mockStoryData.events,
      initialStates: mockStoryData.initialStates,
      props: undefined as any,
      informations: undefined as any,
      moves: [],
      stays: [],
    }

    const result = indexStoryData(minimalData)

    expect(result.propMap.size).toBe(0)
    expect(result.infoMap.size).toBe(0)
  })
})

describe('sortEvents', () => {
  it('should sort events by time', () => {
    const events: Event[] = [
      { id: 3, triggerType: '時刻', triggerValue: '10:00', eventTime: '10:00', personId: 1, actId: 1003 },
      { id: 1, triggerType: '時刻', triggerValue: '09:00', eventTime: '09:00', personId: 1, actId: 1001 },
      { id: 2, triggerType: '時刻', triggerValue: '09:30', eventTime: '09:30', personId: 1, actId: 1002 },
    ]

    const sorted = sortEvents(events)

    expect(sorted[0].id).toBe(1)
    expect(sorted[1].id).toBe(2)
    expect(sorted[2].id).toBe(3)
  })

  it('should sort by id when times are equal', () => {
    const events: Event[] = [
      { id: 3, triggerType: '時刻', triggerValue: '09:00', eventTime: '09:00', personId: 3, actId: 1003 },
      { id: 1, triggerType: '時刻', triggerValue: '09:00', eventTime: '09:00', personId: 1, actId: 1001 },
      { id: 2, triggerType: '時刻', triggerValue: '09:00', eventTime: '09:00', personId: 2, actId: 1002 },
    ]

    const sorted = sortEvents(events)

    expect(sorted[0].id).toBe(1)
    expect(sorted[1].id).toBe(2)
    expect(sorted[2].id).toBe(3)
  })

  it('should not modify the original array', () => {
    const events: Event[] = [
      { id: 2, triggerType: '時刻', triggerValue: '10:00', eventTime: '10:00', personId: 1, actId: 1002 },
      { id: 1, triggerType: '時刻', triggerValue: '09:00', eventTime: '09:00', personId: 1, actId: 1001 },
    ]

    const originalOrder = [...events]
    const sorted = sortEvents(events)

    expect(events).toEqual(originalOrder)
    expect(sorted).not.toBe(events)
  })

  it('should handle empty array', () => {
    const sorted = sortEvents([])
    expect(sorted).toEqual([])
  })
})