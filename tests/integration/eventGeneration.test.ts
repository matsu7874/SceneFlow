import { describe, it, expect } from 'vitest'
import { parseJsonData } from '../../src/modules/data/parser'
import { indexStoryData } from '../../src/modules/data/indexer'
// StoryData type not used directly

describe('Event Generation Integration Tests', () => {
  const createMockTextArea = (value: string): HTMLTextAreaElement => {
    const textarea = document.createElement('textarea')
    textarea.value = value
    return textarea
  }

  it('should parse JSON without events and generate them automatically', () => {
    const jsonData = {
      persons: [
        { id: 1, name: '太郎', color: '#FF0000' },
        { id: 2, name: '花子', color: '#00FF00' },
      ],
      locations: [
        { id: 101, name: '広場', connections: [102] },
        { id: 102, name: '図書館', connections: [101] },
      ],
      acts: [
        { id: 1, personId: 1, locationId: 101, time: '09:00:00', description: '太郎が広場に到着' },
        { id: 2, personId: 2, locationId: 102, time: '09:15:00', description: '花子が図書館で本を読む' },
        { id: 3, personId: 1, locationId: 102, time: '09:30:00', description: '太郎が図書館に移動' },
      ],
      props: [],
      informations: [],
      initialStates: [
        { personId: 1, locationId: 101, time: '09:00:00' },
        { personId: 2, locationId: 102, time: '09:00:00' },
      ],
    }

    const textarea = createMockTextArea(JSON.stringify(jsonData))
    const parsedData = parseJsonData(textarea)

    // パースされたデータにeventsフィールドはない
    expect(parsedData).not.toHaveProperty('events')

    // indexStoryDataでeventsが自動生成される
    const indexedData = indexStoryData(parsedData)

    expect(indexedData.events).toHaveLength(3)
    expect(indexedData.sortedEvents).toHaveLength(3)

    // 生成されたイベントの内容を確認
    expect(indexedData.events[0]).toMatchObject({
      id: 1,
      triggerType: '時刻',
      triggerValue: '09:00:00',
      eventTime: '09:00:00',
      personId: 1,
      actId: 1,
      name: 'Event for 太郎が広場に到着',
      description: 'Triggered by act: 太郎が広場に到着',
    })

    expect(indexedData.events[1]).toMatchObject({
      id: 2,
      triggerType: '時刻',
      triggerValue: '09:15:00',
      eventTime: '09:15:00',
      personId: 2,
      actId: 2,
      name: 'Event for 花子が図書館で本を読む',
      description: 'Triggered by act: 花子が図書館で本を読む',
    })

    expect(indexedData.events[2]).toMatchObject({
      id: 3,
      triggerType: '時刻',
      triggerValue: '09:30:00',
      eventTime: '09:30:00',
      personId: 1,
      actId: 3,
      name: 'Event for 太郎が図書館に移動',
      description: 'Triggered by act: 太郎が図書館に移動',
    })
  })

  it('should handle empty acts array', () => {
    const jsonData = {
      persons: [{ id: 1, name: 'Test', color: '#000000' }],
      locations: [{ id: 1, name: 'Test Location', connections: [] }],
      acts: [],
      props: [],
      informations: [],
      initialStates: [],
    }

    const textarea = createMockTextArea(JSON.stringify(jsonData))
    const parsedData = parseJsonData(textarea)
    const indexedData = indexStoryData(parsedData)

    expect(indexedData.events).toEqual([])
    expect(indexedData.sortedEvents).toEqual([])
  })

  it('should maintain event order based on act time', () => {
    const jsonData = {
      persons: [{ id: 1, name: 'Alice', color: '#FF0000' }],
      locations: [{ id: 1, name: 'Room', connections: [] }],
      acts: [
        { id: 3, personId: 1, locationId: 1, time: '12:00:00', description: 'Late act' },
        { id: 1, personId: 1, locationId: 1, time: '08:00:00', description: 'Early act' },
        { id: 2, personId: 1, locationId: 1, time: '10:00:00', description: 'Middle act' },
      ],
      props: [],
      informations: [],
      initialStates: [],
    }

    const textarea = createMockTextArea(JSON.stringify(jsonData))
    const parsedData = parseJsonData(textarea)
    const indexedData = indexStoryData(parsedData)

    // eventsは元の順序を保持
    expect(indexedData.events[0].actId).toBe(3)
    expect(indexedData.events[1].actId).toBe(1)
    expect(indexedData.events[2].actId).toBe(2)

    // sortedEventsは時刻順にソート
    expect(indexedData.sortedEvents[0].eventTime).toBe('08:00:00')
    expect(indexedData.sortedEvents[1].eventTime).toBe('10:00:00')
    expect(indexedData.sortedEvents[2].eventTime).toBe('12:00:00')
  })

  it('should handle acts with optional fields', () => {
    const jsonData = {
      persons: [
        { id: 1, name: 'Alice', color: '#FF0000' },
        { id: 2, name: 'Bob', color: '#00FF00' },
      ],
      locations: [{ id: 1, name: 'Room', connections: [] }],
      acts: [
        {
          id: 1,
          personId: 1,
          locationId: 1,
          time: '09:00:00',
          description: 'Give item',
          propId: 100,
          interactedPersonId: 2,
        },
        {
          id: 2,
          personId: 2,
          locationId: 1,
          time: '09:30:00',
          description: 'Share information',
          informationId: 200,
        },
      ],
      props: [],
      informations: [],
      initialStates: [],
    }

    const textarea = createMockTextArea(JSON.stringify(jsonData))
    const parsedData = parseJsonData(textarea)
    const indexedData = indexStoryData(parsedData)

    expect(indexedData.events).toHaveLength(2)

    // 追加フィールドは無視され、基本的な情報のみが使用される
    expect(indexedData.events[0]).toMatchObject({
      triggerType: '時刻',
      personId: 1,
      actId: 1,
    })
    expect(indexedData.events[1]).toMatchObject({
      triggerType: '時刻',
      personId: 2,
      actId: 2,
    })
  })

  it('should work with complex time formats', () => {
    const jsonData = {
      persons: [{ id: 1, name: 'Test', color: '#000000' }],
      locations: [{ id: 1, name: 'Test', connections: [] }],
      acts: [
        { id: 1, personId: 1, locationId: 1, time: '00:00:00', description: 'Midnight' },
        { id: 2, personId: 1, locationId: 1, time: '00:00:30', description: '30 seconds' },
        { id: 3, personId: 1, locationId: 1, time: '23:59:59', description: 'End of day' },
      ],
      props: [],
      informations: [],
      initialStates: [],
    }

    const textarea = createMockTextArea(JSON.stringify(jsonData))
    const parsedData = parseJsonData(textarea)
    const indexedData = indexStoryData(parsedData)

    expect(indexedData.events).toHaveLength(3)
    expect(indexedData.events[0].eventTime).toBe('00:00:00')
    expect(indexedData.events[1].eventTime).toBe('00:00:30')
    expect(indexedData.events[2].eventTime).toBe('23:59:59')

    // ソートが正しく動作することを確認
    expect(indexedData.sortedEvents[0].eventTime).toBe('00:00:00')
    expect(indexedData.sortedEvents[1].eventTime).toBe('00:00:30')
    expect(indexedData.sortedEvents[2].eventTime).toBe('23:59:59')
  })
})