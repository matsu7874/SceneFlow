import { describe, it, expect } from 'vitest'
import { parseJsonData } from '../../src/modules/data/parser'

describe('parseJsonData', () => {
  const createMockTextArea = (value: string): HTMLTextAreaElement => {
    const textarea = document.createElement('textarea')
    textarea.value = value
    return textarea
  }

  const validJsonData = {
    persons: [
      { id: 1, name: 'Alice', color: '#ff0000' },
    ],
    locations: [
      { id: 101, name: 'Room 1', connections: [102] },
    ],
    acts: [
      { id: 1001, personId: 1, locationId: 101, time: '09:00', description: 'Test act' },
    ],
    events: [
      { id: 1, triggerType: '時刻', triggerValue: '09:00', eventTime: '09:00', personId: 1, actId: 1001 },
    ],
    initialStates: [
      { personId: 1, locationId: 101, time: '09:00' },
    ],
  }

  it('should parse valid JSON data', () => {
    const textarea = createMockTextArea(JSON.stringify(validJsonData))
    const result = parseJsonData(textarea)
    expect(result).toEqual({
      ...validJsonData,
      props: [],
      informations: [],
      moves: [],
      stays: [],
    })
  })

  it('should throw error for invalid JSON', () => {
    const textarea = createMockTextArea('invalid json')
    expect(() => parseJsonData(textarea)).toThrow('JSON解析エラー')
  })

  it('should throw error for missing required keys', () => {
    const requiredKeys = ['persons', 'locations', 'acts', 'events', 'initialStates']

    requiredKeys.forEach(keyToRemove => {
      const incompleteData = { ...validJsonData }
      delete (incompleteData as any)[keyToRemove]
      const textarea = createMockTextArea(JSON.stringify(incompleteData))
      expect(() => parseJsonData(textarea)).toThrow(`必須キーなし: ${keyToRemove}`)
    })
  })

  it('should add empty arrays for optional keys if missing', () => {
    const minimalData = {
      persons: validJsonData.persons,
      locations: validJsonData.locations,
      acts: validJsonData.acts,
      events: validJsonData.events,
      initialStates: validJsonData.initialStates,
    }

    const textarea = createMockTextArea(JSON.stringify(minimalData))
    const result = parseJsonData(textarea)

    expect(result.props).toEqual([])
    expect(result.informations).toEqual([])
    expect(result.moves).toEqual([])
    expect(result.stays).toEqual([])
  })

  it('should throw error if optional keys are not arrays', () => {
    const invalidData = {
      ...validJsonData,
      props: 'not an array',
    }

    const textarea = createMockTextArea(JSON.stringify(invalidData))
    expect(() => parseJsonData(textarea)).toThrow('キー "props" は配列必須')
  })

  it('should handle data with all optional fields present', () => {
    const completeData = {
      ...validJsonData,
      props: [{ id: 201, name: 'Key' }],
      informations: [{ id: 301, content: 'Secret info' }],
      moves: [],
      stays: [],
    }

    const textarea = createMockTextArea(JSON.stringify(completeData))
    const result = parseJsonData(textarea)
    expect(result).toEqual(completeData)
  })
})