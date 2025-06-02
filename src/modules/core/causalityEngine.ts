import { StoryData, Act, Event } from '../../types'

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
    // Build relationships from acts
    this.storyData.acts.forEach(act => {
      // Check preconditions and postconditions
      if (act.preconditions && act.postconditions) {
        // Create relationships based on conditions
        this.storyData.acts.forEach(otherAct => {
          if (act.id !== otherAct.id && otherAct.preconditions) {
            // Check if this act's postconditions satisfy other act's preconditions
            const enablesOther = this.checkConditionOverlap(
              act.postconditions,
              otherAct.preconditions
            )
            
            if (enablesOther) {
              this.relationships.push({
                from: `act-${act.id}`,
                to: `act-${otherAct.id}`,
                type: 'enables',
                strength: 0.8
              })
            }
          }
        })
      }
    })

    // Build relationships from events
    this.storyData.events.forEach(event => {
      if (event.trigger) {
        // Event triggered by act completion
        if (event.trigger.type === 'actCompleted' && event.trigger.actId) {
          this.relationships.push({
            from: `act-${event.trigger.actId}`,
            to: `event-${event.id}`,
            type: 'triggers',
            strength: 1.0
          })
        }
        
        // Event triggers other acts through its actions
        event.actions?.forEach(action => {
          if (action.type === 'startAct' && action.actId) {
            this.relationships.push({
              from: `event-${event.id}`,
              to: `act-${action.actId}`,
              type: 'triggers',
              strength: 1.0
            })
          }
        })
      }
    })
  }

  private checkConditionOverlap(postconditions: any, preconditions: any): boolean {
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
            severity: 'error'
          })
        }
      }
    }
    
    // Check for timing conflicts
    const actTimes = new Map<string, { start?: number, end?: number }>()
    this.storyData.acts.forEach(act => {
      actTimes.set(`act-${act.id}`, {
        start: act.startTime,
        end: act.endTime
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
              severity: 'warning'
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
    
    const traverse = (nodeId: string) => {
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
    
    const traverse = (nodeId: string) => {
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