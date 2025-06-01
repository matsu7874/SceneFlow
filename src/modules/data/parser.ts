import type { StoryData } from '../../types'

export function parseJsonData(inputElement: HTMLTextAreaElement): StoryData {
  // Input validation
  if (!inputElement || !inputElement.value) {
    throw new Error('JSONデータが入力されていません')
  }

  const inputValue = inputElement.value.trim()
  if (inputValue.length === 0) {
    throw new Error('JSONデータが空です')
  }

  // Check for potential security issues
  if (inputValue.length > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('JSONデータが大きすぎます（最大10MB）')
  }

  let data: unknown
  try {
    data = JSON.parse(inputValue)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown parsing error'
    throw new Error(`JSON解析エラー: ${message}`)
  }

  // Validate data structure
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('JSONデータはオブジェクトである必要があります')
  }

  const typedData = data as Record<string, unknown>

  const requiredKeys = ['persons', 'locations', 'acts', 'events', 'initialStates']
  for (const key of requiredKeys) {
    if (!typedData[key]) throw new Error(`必須キーなし: ${key}`)
    if (!Array.isArray(typedData[key])) {
      throw new Error(`キー "${key}" は配列である必要があります`)
    }
  }

  // Validate array sizes
  const maxArraySize = 10000
  requiredKeys.forEach(key => {
    const array = typedData[key] as unknown[]
    if (array.length > maxArraySize) {
      throw new Error(`配列 "${key}" が大きすぎます（最大${maxArraySize}項目）`)
    }
  })

  const optionalKeys = ['props', 'informations', 'moves', 'stays']
  optionalKeys.forEach(key => {
    if (typedData[key] && !Array.isArray(typedData[key])) {
      throw new Error(`キー "${key}" は配列必須`)
    }
    if (!typedData[key]) typedData[key] = []
    const array = typedData[key] as unknown[]
    if (array.length > maxArraySize) {
      throw new Error(`配列 "${key}" が大きすぎます（最大${maxArraySize}項目）`)
    }
  })

  // Validate persons structure
  const persons = typedData.persons as unknown[]
  persons.forEach((person: unknown, index: number) => {
    if (!person || typeof person !== 'object') {
      throw new Error(`persons[${index}]: オブジェクトである必要があります`)
    }
    const personObj = person as Record<string, unknown>
    if (typeof personObj.id !== 'number' || personObj.id < 0) {
      throw new Error(`persons[${index}]: idは非負の数値である必要があります`)
    }
    if (typeof personObj.name !== 'string' || personObj.name.length === 0) {
      throw new Error(`persons[${index}]: nameは空でない文字列である必要があります`)
    }
    if (personObj.name.length > 100) {
      throw new Error(`persons[${index}]: nameが長すぎます（最大100文字）`)
    }
  })

  // Validate locations structure
  const locations = typedData.locations as unknown[]
  locations.forEach((location: unknown, index: number) => {
    if (!location || typeof location !== 'object') {
      throw new Error(`locations[${index}]: オブジェクトである必要があります`)
    }
    const locationObj = location as Record<string, unknown>
    if (typeof locationObj.id !== 'number' || locationObj.id < 0) {
      throw new Error(`locations[${index}]: idは非負の数値である必要があります`)
    }
    if (typeof locationObj.name !== 'string' || locationObj.name.length === 0) {
      throw new Error(`locations[${index}]: nameは空でない文字列である必要があります`)
    }
    if (locationObj.name.length > 100) {
      throw new Error(`locations[${index}]: nameが長すぎます（最大100文字）`)
    }
  })

  return typedData as StoryData
}