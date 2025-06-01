/**
 * Causality Engine - Core engine for managing acts and their causal relationships
 */

import type {
  Act,
  WorldState,
  ValidationResult,
  TimelineValidation,
  ConflictInfo,
  SuggestionInfo,
  CausalLink,
  StateTransition,
  StateChange,
  CausalityTrace,
  EntityId,
} from '../../types/causality'
import { CausalLinkType } from '../../types/causality'

export class CausalityEngine {
  private acts: Map<EntityId, Act>
  private causalLinks: Map<EntityId, CausalLink>
  private stateHistory: StateTransition[]
  private initialState: WorldState

  constructor(initialState?: WorldState) {
    this.acts = new Map()
    this.causalLinks = new Map()
    this.stateHistory = []
    this.initialState = initialState || {
      timestamp: 0,
      personPositions: {},
      itemOwnership: {},
      knowledge: {},
      itemLocations: {},
    }
  }

  /**
   * Add an act to the timeline
   */
  addAct(act: Act): ValidationResult {
    // Check if act can be added without breaking causality
    const validation = this.validateActInsertion(act)

    if (validation.valid) {
      this.acts.set(act.id, act)
      this.updateCausalLinks(act)
    }

    return validation
  }

  /**
   * Remove an act from the timeline
   */
  removeAct(actId: EntityId): ValidationResult {
    const act = this.acts.get(actId)
    if (!act) {
      return {
        valid: false,
        errors: [
          {
            code: 'ACT_NOT_FOUND',
            message: `Act ${actId} not found`,
            affectedEntities: [actId],
          },
        ],
      }
    }

    // Check if removing this act would break any dependencies
    const validation = this.validateActRemoval(actId)

    if (validation.valid) {
      this.acts.delete(actId)
      this.removeCausalLinksForAct(actId)
      this.stateHistory = this.stateHistory.filter(t => t.actId !== actId)
    }

    return validation
  }

  /**
   * Get the world state at a specific timestamp
   */
  getStateAt(timestamp: number, initialState: WorldState): WorldState {
    // Get all acts up to this timestamp
    const actsToApply = this.getActsUpTo(timestamp)

    // Apply acts in chronological order
    let currentState = this.cloneWorldState(initialState)

    for (const act of actsToApply) {
      // Validate preconditions
      const validation = act.checkPreconditions(currentState)
      if (!validation.valid) {
        console.warn(
          `Act ${act.id} failed preconditions at timestamp ${timestamp}`,
          validation.errors,
        )
        continue
      }

      // Apply postconditions
      const previousState = this.cloneWorldState(currentState)
      currentState = act.applyPostconditions(currentState)

      // Track state transition
      this.recordStateTransition(previousState, currentState, act)
    }

    currentState.timestamp = timestamp
    return currentState
  }

  /**
   * Validate the entire timeline for consistency
   */
  validateTimeline(initialState?: WorldState): TimelineValidation {
    const startState = initialState || this.initialState
    const conflicts: ConflictInfo[] = []
    const suggestions: SuggestionInfo[] = []

    // Get all acts sorted by timestamp
    const sortedActs = this.getSortedActs()

    // Simulate timeline execution
    let currentState = this.cloneWorldState(startState)

    for (const act of sortedActs) {
      const validation = act.checkPreconditions(currentState)

      if (!validation.valid) {
        // Found a conflict
        conflicts.push({
          actId1: act.id,
          actId2: act.id, // Self-conflict for now
          type: 'precondition_violated',
          description: validation.errors.map(e => e.message).join('; '),
          timestamp: act.timestamp,
        })

        // Generate suggestions
        validation.errors.forEach(error => {
          if (error.suggestion) {
            suggestions.push({
              type: 'add_act',
              description: error.suggestion,
              affectedActIds: [act.id],
            })
          }
        })
      } else {
        // Apply the act
        currentState = act.applyPostconditions(currentState)
      }
    }

    // Check for temporal paradoxes and state conflicts
    this.detectTemporalParadoxes(sortedActs, conflicts)

    return {
      valid: conflicts.length === 0,
      conflicts,
      suggestions,
    }
  }

  /**
   * Trace the causal chain that led to a specific state
   */
  traceCausality(
    targetState: StateChange,
    timestamp: number,
    _initialState: WorldState,
  ): CausalityTrace {
    const causedByActs: Act[] = []
    const causalChain: CausalLink[] = []

    // Find all state transitions that affected the target entity
    const relevantTransitions = this.stateHistory.filter(
      transition =>
        transition.timestamp <= timestamp &&
        transition.changes.some(
          change => change.entityId === targetState.entityId && change.type === targetState.type,
        ),
    )

    // Build the causal chain
    relevantTransitions.forEach(transition => {
      const act = this.acts.get(transition.actId)
      if (act) {
        causedByActs.push(act)

        // Find causal links involving this act
        const links = this.getCausalLinksForAct(act.id)
        causalChain.push(...links)
      }
    })

    // Find the root cause
    const rootCause = causedByActs.length > 0 ? causedByActs[0] : undefined

    return {
      targetState,
      causedByActs,
      causalChain,
      rootCause,
    }
  }

  /**
   * Private helper methods
   */

  private validateActInsertion(act: Act): ValidationResult {
    // Get world state at the time just before this act
    const stateAtTime = this.getStateAt(act.timestamp - 1, this.initialState)

    // Check preconditions
    return act.checkPreconditions(stateAtTime)
  }

  private validateActRemoval(actId: EntityId): ValidationResult {
    // Check if any other acts depend on this one
    const dependentActs = this.getActsDependingOn(actId)

    if (dependentActs.length > 0) {
      return {
        valid: false,
        errors: [
          {
            code: 'HAS_DEPENDENCIES',
            message: `Cannot remove act ${actId} because other acts depend on it`,
            affectedEntities: [actId, ...dependentActs.map(a => a.id)],
          },
        ],
      }
    }

    return { valid: true, errors: [] }
  }

  private getActsUpTo(timestamp: number): Act[] {
    return this.getSortedActs().filter(act => act.timestamp <= timestamp)
  }

  private getSortedActs(): Act[] {
    return Array.from(this.acts.values()).sort((a, b) => a.timestamp - b.timestamp)
  }

  private getActsDependingOn(actId: EntityId): Act[] {
    const dependentActs: Act[] = []

    // Find acts that have causal links from the given act
    this.causalLinks.forEach(link => {
      if (link.fromActId === actId && link.linkType === CausalLinkType.ENABLES) {
        const dependentAct = this.acts.get(link.toActId)
        if (dependentAct) {
          dependentActs.push(dependentAct)
        }
      }
    })

    return dependentActs
  }

  private updateCausalLinks(_act: Act): void {
    // TODO: Implement automatic causal link detection
    // For now, this is a placeholder
  }

  private removeCausalLinksForAct(actId: EntityId): void {
    const linksToRemove: EntityId[] = []

    this.causalLinks.forEach((link, linkId) => {
      if (link.fromActId === actId || link.toActId === actId) {
        linksToRemove.push(linkId)
      }
    })

    linksToRemove.forEach(linkId => this.causalLinks.delete(linkId))
  }

  private getCausalLinksForAct(actId: EntityId): CausalLink[] {
    const links: CausalLink[] = []

    this.causalLinks.forEach(link => {
      if (link.fromActId === actId || link.toActId === actId) {
        links.push(link)
      }
    })

    return links
  }

  private recordStateTransition(fromState: WorldState, toState: WorldState, act: Act): void {
    const changes: StateChange[] = []

    // Detect position changes
    Object.keys(toState.personPositions).forEach(personId => {
      if (fromState.personPositions[personId] !== toState.personPositions[personId]) {
        changes.push({
          type: 'position',
          entityId: personId,
          oldValue: fromState.personPositions[personId],
          newValue: toState.personPositions[personId],
        })
      }
    })

    // Detect ownership changes
    Object.keys(toState.itemOwnership).forEach(itemId => {
      if (fromState.itemOwnership[itemId] !== toState.itemOwnership[itemId]) {
        changes.push({
          type: 'ownership',
          entityId: itemId,
          oldValue: fromState.itemOwnership[itemId],
          newValue: toState.itemOwnership[itemId],
        })
      }
    })

    // Detect knowledge changes
    Object.keys(toState.knowledge).forEach(personId => {
      const oldKnowledge = fromState.knowledge[personId] || []
      const newKnowledge = toState.knowledge[personId] || []

      if (JSON.stringify(oldKnowledge) !== JSON.stringify(newKnowledge)) {
        changes.push({
          type: 'knowledge',
          entityId: personId,
          oldValue: oldKnowledge,
          newValue: newKnowledge,
        })
      }
    })

    if (changes.length > 0) {
      this.stateHistory.push({
        fromState,
        toState,
        actId: act.id,
        timestamp: act.timestamp,
        changes,
      })
    }
  }

  private detectTemporalParadoxes(_sortedActs: Act[], _conflicts: ConflictInfo[]): void {
    // TODO: Implement temporal paradox detection
    // For example, detecting circular dependencies or impossible sequences
  }

  private cloneWorldState(state: WorldState): WorldState {
    return {
      timestamp: state.timestamp,
      personPositions: { ...state.personPositions },
      itemOwnership: { ...state.itemOwnership },
      knowledge: Object.entries(state.knowledge).reduce(
        (acc, [key, value]) => {
          acc[key] = [...value]
          return acc
        },
        {} as Record<EntityId, EntityId[]>,
      ),
      itemLocations: { ...state.itemLocations },
    }
  }

  /**
   * Public getters for testing and debugging
   */

  getActs(): Map<EntityId, Act> {
    return new Map(this.acts)
  }

  getCausalLinks(): Map<EntityId, CausalLink> {
    return new Map(this.causalLinks)
  }

  getStateHistory(): StateTransition[] {
    return [...this.stateHistory]
  }
}
