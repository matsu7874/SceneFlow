/**
 * BaseAct - Abstract base class for all story acts
 *
 * Provides common functionality for precondition checking and postcondition application
 */

import type {
  Act,
  WorldState,
  ValidationResult,
  ValidationError,
  EntityId,
} from '../../../types/causality'

export abstract class BaseAct implements Act {
  id: EntityId
  type: string
  personId: EntityId
  timestamp: number
  description: string

  constructor(
    id: EntityId,
    type: string,
    personId: EntityId,
    timestamp: number,
    description: string,
  ) {
    this.id = id
    this.type = type
    this.personId = personId
    this.timestamp = timestamp
    this.description = description
  }

  // Abstract methods that must be implemented by subclasses
  abstract checkPreconditions(state: WorldState): ValidationResult
  abstract applyPostconditions(state: WorldState): WorldState
  abstract getAffectedEntities(): EntityId[]

  // Helper methods for common validations
  protected createValidResult(): ValidationResult {
    return { valid: true, errors: [] }
  }

  protected createInvalidResult(errors: ValidationError[]): ValidationResult {
    return { valid: false, errors }
  }

  protected createError(
    code: string,
    message: string,
    affectedEntities: EntityId[],
    suggestion?: string,
  ): ValidationError {
    return { code, message, affectedEntities, suggestion }
  }

  // Check if person is at a specific location
  protected isPersonAtLocation(
    state: WorldState,
    personId: EntityId,
    locationId: EntityId,
  ): boolean {
    return state.personPositions[personId] === locationId
  }

  // Check if person owns an item
  protected doesPersonOwnItem(state: WorldState, personId: EntityId, itemId: EntityId): boolean {
    return state.itemOwnership[itemId] === personId
  }

  // Check if item is at a location
  protected isItemAtLocation(state: WorldState, itemId: EntityId, locationId: EntityId): boolean {
    return state.itemLocations[itemId] === locationId
  }

  // Check if person has specific knowledge
  protected doesPersonKnow(
    state: WorldState,
    personId: EntityId,
    informationId: EntityId,
  ): boolean {
    const knowledge = state.knowledge[personId] || []
    return knowledge.includes(informationId)
  }

  // Clone world state for safe modifications
  protected cloneWorldState(state: WorldState): WorldState {
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

  // Update person position
  protected updatePersonPosition(
    state: WorldState,
    personId: EntityId,
    locationId: EntityId,
  ): void {
    state.personPositions[personId] = locationId
  }

  // Transfer item ownership
  protected transferItemOwnership(state: WorldState, itemId: EntityId, newOwnerId: EntityId): void {
    state.itemOwnership[itemId] = newOwnerId
    // Remove from item locations if it was placed somewhere
    delete state.itemLocations[itemId]
  }

  // Place item at location
  protected placeItemAtLocation(state: WorldState, itemId: EntityId, locationId: EntityId): void {
    state.itemLocations[itemId] = locationId
    // Remove from ownership if someone owned it
    delete state.itemOwnership[itemId]
  }

  // Add knowledge to person
  protected addKnowledge(state: WorldState, personId: EntityId, informationId: EntityId): void {
    if (!state.knowledge[personId]) {
      state.knowledge[personId] = []
    }
    if (!state.knowledge[personId].includes(informationId)) {
      state.knowledge[personId].push(informationId)
    }
  }
}
