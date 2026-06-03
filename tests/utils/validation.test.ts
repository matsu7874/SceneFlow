import { describe, it, expect } from 'vitest'
import { validateStoryData } from '../../src/utils/validation'

describe('validateStoryData', () => {
  it('accepts numeric id 0 for persons, locations, and acts', () => {
    const data = {
      persons: [{ id: 0, name: 'Alice' }],
      locations: [{ id: 0, name: 'Stage' }],
      acts: [
        {
          id: 0,
          personId: 0,
          locationId: 0,
          time: '10:00',
          description: 'enter',
        },
      ],
    }

    const result = validateStoryData(data)

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('still reports missing ids and names', () => {
    const data = {
      persons: [{ id: undefined, name: '' }],
      locations: [{ id: 1, name: 'Stage' }],
      acts: [],
    }

    const result = validateStoryData(data)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('persons[0]'))).toBe(true)
  })
})
