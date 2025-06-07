import { StoryData } from '../../types'
import { generateEventsFromActs } from '../../utils/eventGeneration'
import { timeToMinutes } from '../utils/timeUtils'

export interface CausalRelationship {
  from: string
  to: string
  type: 'triggers' | 'enables' | 'prevents'
  strength: number
}

export interface CausalityConflict {
  message: string
  description?: string
  suggestion?: string
  severity: 'error' | 'warning'
}

export class CausalityEngine {
  private storyData: StoryData
  private relationships: CausalRelationship[] = []

  constructor(storyData: StoryData) {
    this.storyData = storyData
    this.buildRelationships()
  }

  private buildRelationships(): void {
    // Build relationships from acts based on time and location
    this.storyData.acts.forEach(act => {
      // Create time-based relationships
      this.storyData.acts.forEach(otherAct => {
        if (act.id !== otherAct.id) {
          // If acts are by the same person and one follows the other
          if (act.personId === otherAct.personId) {
            const actTime = timeToMinutes(act.time)
            const otherActTime = timeToMinutes(otherAct.time)

            if (actTime < otherActTime) {
              this.relationships.push({
                from: `act-${act.id}`,
                to: `act-${otherAct.id}`,
                type: 'enables',
                strength: 0.8,
              })
            }
          }
        }
      })
    })

    // Build relationships from events (generated from acts)
    const events = generateEventsFromActs(this.storyData.acts || [])
    events.forEach(event => {
      // Each event is triggered by its corresponding act
      if (event.actId) {
        this.relationships.push({
          from: `act-${event.actId}`,
          to: `event-${event.id}`,
          type: 'triggers',
          strength: 1.0,
        })
      }
    })
  }

  private checkConditionOverlap(_postconditions: unknown, _preconditions: unknown): boolean {
    // Simplified condition checking
    // In a real implementation, this would do deep object comparison
    // and check if postconditions satisfy preconditions
    return Math.random() > 0.7 // Placeholder logic
  }

  getCausalRelationships(): CausalRelationship[] {
    return this.relationships
  }

  validateCausality(): CausalityConflict[] {
    const conflicts: CausalityConflict[] = []

    // Check for circular dependencies
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const hasCycle = (node: string): boolean => {
      visited.add(node)
      recursionStack.add(node)

      const outgoing = this.relationships.filter(r => r.from === node)
      for (const rel of outgoing) {
        if (!visited.has(rel.to)) {
          if (hasCycle(rel.to)) return true
        } else if (recursionStack.has(rel.to)) {
          return true
        }
      }

      recursionStack.delete(node)
      return false
    }

    // Check all nodes for cycles
    const allNodes = new Set<string>()
    this.relationships.forEach(rel => {
      allNodes.add(rel.from)
      allNodes.add(rel.to)
    })

    for (const node of allNodes) {
      if (!visited.has(node)) {
        if (hasCycle(node)) {
          conflicts.push({
            message: `Circular dependency detected involving ${node}`,
            description: 'There is a circular chain of dependencies that could prevent proper execution',
            suggestion: 'Review the causal relationships and break the circular dependency',
            severity: 'error',
          })
        }
      }
    }

    // Check for timing conflicts
    const actTimes = new Map<string, { start?: number, end?: number }>()
    this.storyData.acts.forEach(act => {
      const startTime = timeToMinutes(act.time) || 0
      actTimes.set(`act-${act.id}`, {
        start: startTime,
        end: startTime + 5, // Default to 5 minutes duration
      })
    })

    this.relationships.forEach(rel => {
      if (rel.type === 'triggers' || rel.type === 'enables') {
        const fromTime = actTimes.get(rel.from)
        const toTime = actTimes.get(rel.to)

        if (fromTime?.end !== undefined && toTime?.start !== undefined) {
          if (fromTime.end > toTime.start) {
            conflicts.push({
              message: `Timing conflict: ${rel.from} should complete before ${rel.to} starts`,
              description: `${rel.from} ends at ${fromTime.end} but ${rel.to} starts at ${toTime.start}`,
              suggestion: 'Adjust the timing of acts to respect causal relationships',
              severity: 'warning',
            })
          }
        }
      }
    })

    return conflicts
  }

  // Find all acts/events that can lead to a given target
  findCausalChain(targetId: string): string[] {
    const chain: string[] = []
    const visited = new Set<string>()

    const traverse = (nodeId: string): void => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)

      const incoming = this.relationships.filter(r => r.to === nodeId)
      incoming.forEach(rel => {
        chain.push(rel.from)
        traverse(rel.from)
      })
    }

    traverse(targetId)
    return chain
  }

  // Find all acts/events that can be caused by a given source
  findEffects(sourceId: string): string[] {
    const effects: string[] = []
    const visited = new Set<string>()

    const traverse = (nodeId: string): void => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)

      const outgoing = this.relationships.filter(r => r.from === nodeId)
      outgoing.forEach(rel => {
        effects.push(rel.to)
        traverse(rel.to)
      })
    }

    traverse(sourceId)
    return effects
  }
}