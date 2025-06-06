import { describe, it, expect } from 'vitest'
import {
  generateEventsFromActs,
  shouldGenerateEvent,
  groupActsByTime,
} from '../../src/utils/eventGeneration'
import type { Act } from '../../src/types/StoryData'

describe('Event Generation', () => {
  describe('generateEventsFromActs', () => {
    it('should generate events from acts', () => {
      const acts: Act[] = [
        {
          id: 1,
          personId: 1,
          locationId: 101,
          time: '09:00:00',
          description: 'Alice enters the room',
        },
        {
          id: 2,
          personId: 2,
          locationId: 102,
          time: '09:30:00',
          description: 'Bob moves to kitchen',
        },
      ]

      const events = generateEventsFromActs(acts)

      expect(events).toHaveLength(2)
      expect(events[0]).toEqual({
        id: 1,
        triggerType: '時刻',
        triggerValue: '09:00:00',
        eventTime: '09:00:00',
        personId: 1,
        actId: 1,
        name: 'Event for Alice enters the room',
        description: 'Triggered by act: Alice enters the room',
      })
      expect(events[1]).toEqual({
        id: 2,
        triggerType: '時刻',
        triggerValue: '09:30:00',
        eventTime: '09:30:00',
        personId: 2,
        actId: 2,
        name: 'Event for Bob moves to kitchen',
        description: 'Triggered by act: Bob moves to kitchen',
      })
    })

    it('should handle empty acts array', () => {
      const events = generateEventsFromActs([])
      expect(events).toEqual([])
    })

    it('should handle acts with additional properties', () => {
      const acts: Act[] = [
        {
          id: 1,
          personId: 1,
          locationId: 101,
          time: '10:00:00',
          description: 'Give item',
          propId: 201,
          interactedPersonId: 2,
        },
      ]

      const events = generateEventsFromActs(acts)

      expect(events).toHaveLength(1)
      expect(events[0].personId).toBe(1)
      expect(events[0].actId).toBe(1)
      expect(events[0].eventTime).toBe('10:00:00')
    })

    it('should generate sequential event IDs', () => {
      const acts: Act[] = [
        { id: 10, personId: 1, locationId: 101, time: '09:00:00', description: 'Act 1' },
        { id: 20, personId: 2, locationId: 102, time: '09:15:00', description: 'Act 2' },
        { id: 30, personId: 3, locationId: 103, time: '09:30:00', description: 'Act 3' },
      ]

      const events = generateEventsFromActs(acts)

      expect(events[0].id).toBe(1)
      expect(events[1].id).toBe(2)
      expect(events[2].id).toBe(3)
    })
  })

  describe('shouldGenerateEvent', () => {
    it('should return true for all acts', () => {
      const act: Act = {
        id: 1,
        personId: 1,
        locationId: 101,
        time: '09:00:00',
        description: 'Test act',
      }

      expect(shouldGenerateEvent(act)).toBe(true)
    })

    it('should return true for acts with different types', () => {
      const acts: Act[] = [
        { id: 1, personId: 1, locationId: 101, time: '09:00:00', description: 'Move' },
        { id: 2, personId: 1, locationId: 101, time: '09:00:00', description: 'Speak', informationId: 1 },
        { id: 3, personId: 1, locationId: 101, time: '09:00:00', description: 'Give', propId: 1, interactedPersonId: 2 },
      ]

      acts.forEach(act => {
        expect(shouldGenerateEvent(act)).toBe(true)
      })
    })
  })

  describe('groupActsByTime', () => {
    it('should group acts by time', () => {
      const acts: Act[] = [
        { id: 1, personId: 1, locationId: 101, time: '09:00:00', description: 'Act 1' },
        { id: 2, personId: 2, locationId: 102, time: '09:00:00', description: 'Act 2' },
        { id: 3, personId: 3, locationId: 103, time: '09:30:00', description: 'Act 3' },
        { id: 4, personId: 1, locationId: 101, time: '09:30:00', description: 'Act 4' },
        { id: 5, personId: 2, locationId: 102, time: '10:00:00', description: 'Act 5' },
      ]

      const groups = groupActsByTime(acts)

      expect(groups.size).toBe(3)
      expect(groups.get('09:00:00')).toHaveLength(2)
      expect(groups.get('09:30:00')).toHaveLength(2)
      expect(groups.get('10:00:00')).toHaveLength(1)

      expect(groups.get('09:00:00')?.[0].id).toBe(1)
      expect(groups.get('09:00:00')?.[1].id).toBe(2)
      expect(groups.get('09:30:00')?.[0].id).toBe(3)
      expect(groups.get('09:30:00')?.[1].id).toBe(4)
      expect(groups.get('10:00:00')?.[0].id).toBe(5)
    })

    it('should handle empty acts array', () => {
      const groups = groupActsByTime([])
      expect(groups.size).toBe(0)
    })

    it('should handle acts with same time', () => {
      const acts: Act[] = [
        { id: 1, personId: 1, locationId: 101, time: '12:00:00', description: 'Act 1' },
        { id: 2, personId: 2, locationId: 102, time: '12:00:00', description: 'Act 2' },
        { id: 3, personId: 3, locationId: 103, time: '12:00:00', description: 'Act 3' },
      ]

      const groups = groupActsByTime(acts)

      expect(groups.size).toBe(1)
      expect(groups.get('12:00:00')).toHaveLength(3)
    })

    it('should preserve act order within same time', () => {
      const acts: Act[] = [
        { id: 3, personId: 3, locationId: 103, time: '15:00:00', description: 'Act 3' },
        { id: 1, personId: 1, locationId: 101, time: '15:00:00', description: 'Act 1' },
        { id: 2, personId: 2, locationId: 102, time: '15:00:00', description: 'Act 2' },
      ]

      const groups = groupActsByTime(acts)
      const sameTimeActs = groups.get('15:00:00') || []

      expect(sameTimeActs[0].id).toBe(3)
      expect(sameTimeActs[1].id).toBe(1)
      expect(sameTimeActs[2].id).toBe(2)
    })
  })
})