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
    initialStates: [
      { personId: 1, locationId: 101, time: '09:00' },
    ],
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
    // eventsは自動生成されるので、acts数と同じになることを確認
    expect(result.events.length).toEqual(mockStoryData.acts.length)
    expect(result.initialStates).toEqual(mockStoryData.initialStates)
  })

  it('should handle empty data', () => {
    const emptyData: StoryData = {
      persons: [],
      locations: [],
      acts: [],
      props: [],
      informations: [],
      initialStates: [],
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
      initialStates: mockStoryData.initialStates,
      props: undefined,
      informations: undefined,
    }

    const result = indexStoryData(minimalData)

    expect(result.propMap.size).toBe(0)
    expect(result.infoMap.size).toBe(0)
  })

  it('should generate events from acts automatically', () => {
    const result = indexStoryData(mockStoryData)

    // eventsは自動生成される
    expect(result.events).toHaveLength(mockStoryData.acts.length)
    expect(result.events[0]).toMatchObject({
      id: 1,
      triggerType: '時刻',
      triggerValue: '09:00',
      eventTime: '09:00',
      personId: 1,
      actId: 1001,
    })
    expect(result.sortedEvents).toHaveLength(mockStoryData.acts.length)
  })

  it('should generate events with correct properties', () => {
    const dataWithMultipleActs: StoryData = {
      persons: [{ id: 1, name: 'Alice', color: '#ff0000' }],
      locations: [{ id: 101, name: 'Room', connections: [] }],
      acts: [
        { id: 1, personId: 1, locationId: 101, time: '09:00:00', description: 'Act 1' },
        { id: 2, personId: 1, locationId: 101, time: '10:30:00', description: 'Act 2' },
        { id: 3, personId: 1, locationId: 101, time: '12:00:00', description: 'Act 3' },
      ],
      props: [],
      informations: [],
      initialStates: [],
    }

    const result = indexStoryData(dataWithMultipleActs)

    expect(result.events).toHaveLength(3)
    result.events.forEach((event, index) => {
      const act = dataWithMultipleActs.acts[index]
      expect(event.triggerType).toBe('時刻')
      expect(event.triggerValue).toBe(act.time)
      expect(event.eventTime).toBe(act.time)
      expect(event.personId).toBe(act.personId)
      expect(event.actId).toBe(act.id)
      expect(event.name).toBe(`Event for ${act.description}`)
      expect(event.description).toBe(`Triggered by act: ${act.description}`)
    })
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