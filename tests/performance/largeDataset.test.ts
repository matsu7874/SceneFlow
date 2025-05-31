import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseJsonData } from '../../src/modules/data/parser'
import { indexStoryData } from '../../src/modules/data/indexer'
import { getStateAtTime } from '../../src/modules/simulation/core'
import type { StoryData } from '../../src/types'

// Mock DOM elements for performance tests
const createMockTextArea = (value: string): HTMLTextAreaElement => {
  return { value } as HTMLTextAreaElement
}

const generateLargeDataset = (scale: number): StoryData => {
  const persons = Array.from({ length: scale }, (_, i) => ({
    id: i + 1,
    name: `Person${i + 1}`,
    color: '#000000'
  }))

  const locations = Array.from({ length: Math.ceil(scale / 2) }, (_, i) => ({
    id: i + 1,
    name: `Location${i + 1}`,
    connections: []
  }))

  const acts = Array.from({ length: scale * 5 }, (_, i) => ({
    id: i + 1,
    personId: (i % scale) + 1,
    locationId: (i % Math.ceil(scale / 2)) + 1,
    time: `${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`,
    description: `Action ${i + 1}`
  }))

  const events = Array.from({ length: scale * 2 }, (_, i) => ({
    id: i + 1,
    triggerType: 'time',
    triggerValue: `${String(Math.floor(i / 30)).padStart(2, '0')}:${String((i % 30) * 2).padStart(2, '0')}`,
    eventTime: `${String(Math.floor(i / 30)).padStart(2, '0')}:${String((i % 30) * 2).padStart(2, '0')}`,
    personId: (i % scale) + 1,
    actId: (i % (scale * 5)) + 1
  }))

  const initialStates = persons.map(person => ({
    personId: person.id,
    locationId: 1
  }))

  return {
    persons,
    locations,
    acts,
    events,
    initialStates,
    props: [],
    informations: [],
    moves: [],
    stays: []
  }
}

describe('Performance Tests', () => {
  beforeEach(() => {
    // Mock performance.now for consistent timing
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now())
  })

  it('should handle medium dataset (100 persons) within reasonable time', () => {
    const startTime = performance.now()
    
    const dataset = generateLargeDataset(100)
    const mockTextArea = createMockTextArea(JSON.stringify(dataset))
    
    const parsedData = parseJsonData(mockTextArea)
    const indexedData = indexStoryData(parsedData)
    
    // Test simulation performance
    const simulationStart = performance.now()
    const worldState = getStateAtTime(300, indexedData, indexedData.sortedEvents, indexedData.initialStates)
    const simulationEnd = performance.now()
    
    const totalTime = performance.now() - startTime
    const simulationTime = simulationEnd - simulationStart
    
    expect(parsedData).toBeDefined()
    expect(indexedData).toBeDefined()
    expect(worldState).toBeDefined()
    expect(Object.keys(worldState)).toHaveLength(100)
    
    // Performance assertions - should complete within reasonable time
    console.log(`Medium dataset (100 persons): Total time: ${totalTime}ms, Simulation time: ${simulationTime}ms`)
    expect(totalTime).toBeLessThan(5000) // 5 seconds
    expect(simulationTime).toBeLessThan(1000) // 1 second for simulation
  })

  it('should handle large dataset (500 persons) within reasonable time', () => {
    const startTime = performance.now()
    
    const dataset = generateLargeDataset(500)
    const mockTextArea = createMockTextArea(JSON.stringify(dataset))
    
    const parsedData = parseJsonData(mockTextArea)
    const indexedData = indexStoryData(parsedData)
    
    // Test simulation performance
    const simulationStart = performance.now()
    const worldState = getStateAtTime(600, indexedData, indexedData.sortedEvents, indexedData.initialStates)
    const simulationEnd = performance.now()
    
    const totalTime = performance.now() - startTime
    const simulationTime = simulationEnd - simulationStart
    
    expect(parsedData).toBeDefined()
    expect(indexedData).toBeDefined()
    expect(worldState).toBeDefined()
    expect(Object.keys(worldState)).toHaveLength(500)
    
    // Performance assertions - larger dataset may take more time but should still be reasonable
    console.log(`Large dataset (500 persons): Total time: ${totalTime}ms, Simulation time: ${simulationTime}ms`)
    expect(totalTime).toBeLessThan(15000) // 15 seconds
    expect(simulationTime).toBeLessThan(3000) // 3 seconds for simulation
  })

  it('should reject extremely large datasets gracefully', () => {
    const dataset = generateLargeDataset(20000) // Exceeds our 10000 limit
    const mockTextArea = createMockTextArea(JSON.stringify(dataset))
    
    expect(() => {
      parseJsonData(mockTextArea)
    }).toThrow(/配列.*が大きすぎます|JSONデータが大きすぎます/)
  })

  it('should handle memory efficiently with repeated simulations', () => {
    const dataset = generateLargeDataset(50)
    const mockTextArea = createMockTextArea(JSON.stringify(dataset))
    
    const parsedData = parseJsonData(mockTextArea)
    const indexedData = indexStoryData(parsedData)
    
    // Run multiple simulations to test memory usage
    const iterations = 100
    const startTime = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      const timeMinutes = i * 5 // Simulate different time points
      getStateAtTime(timeMinutes, indexedData, indexedData.sortedEvents, indexedData.initialStates)
    }
    
    const totalTime = performance.now() - startTime
    const avgTimePerIteration = totalTime / iterations
    
    console.log(`Memory test (${iterations} iterations): Total time: ${totalTime}ms, Avg per iteration: ${avgTimePerIteration}ms`)
    expect(avgTimePerIteration).toBeLessThan(50) // Should average less than 50ms per simulation
  })
})