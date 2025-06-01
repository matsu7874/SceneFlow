/**
 * Causality Engine Type Definitions
 *
 * This module defines the core types for the causality engine that tracks
 * preconditions and postconditions of actions in the story.
 */

// Import from index when extending existing types
// import type { Person, Location, Prop, Information } from './index'

// Entity ID type for better type safety
export type EntityId = string | number

// Extended WorldState that tracks all entity states at a given time
export interface WorldState {
  timestamp: number
  // Person positions: { personId: locationId }
  personPositions: Record<EntityId, EntityId>
  // Item ownership: { itemId: ownerId (person or location) }
  itemOwnership: Record<EntityId, EntityId>
  // Knowledge state: { personId: [informationIds] }
  knowledge: Record<EntityId, EntityId[]>
  // Item locations for items placed in locations
  itemLocations: Record<EntityId, EntityId>
}

// Base interface for all Acts with preconditions and postconditions
export interface Act {
  id: EntityId
  type: string
  personId: EntityId
  timestamp: number
  description: string

  // Validation and execution methods
  checkPreconditions(state: WorldState): ValidationResult
  applyPostconditions(state: WorldState): WorldState
  getAffectedEntities(): EntityId[]
}

// Result of precondition validation
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// Detailed validation error information
export interface ValidationError {
  code: string
  message: string
  affectedEntities: EntityId[]
  suggestion?: string
}

// Causal link between acts
export interface CausalLink {
  id: EntityId
  fromActId: EntityId
  toActId: EntityId
  linkType: CausalLinkType
  description: string
  // The specific state change that creates the dependency
  dependency: StateDependency
}

// Types of causal relationships
export enum CausalLinkType {
  ENABLES = 'ENABLES', // Act A makes Act B possible
  PREVENTS = 'PREVENTS', // Act A makes Act B impossible
  REQUIRES = 'REQUIRES', // Act B requires Act A to have happened
  CONFLICTS = 'CONFLICTS', // Acts cannot both be true
  TRIGGERS = 'TRIGGERS', // Act A automatically causes Act B
}

// Specific state dependency
export interface StateDependency {
  type: 'position' | 'ownership' | 'knowledge' | 'existence'
  entityId: EntityId
  requiredValue?: EntityId | boolean
  description: string
}

// Act payload types for different act types
export interface MovePayload {
  fromLocationId: EntityId
  toLocationId: EntityId
}

export interface GiveItemPayload {
  itemId: EntityId
  toPersonId: EntityId
}

export interface TakeItemPayload {
  itemId: EntityId
  fromLocationId?: EntityId
  fromPersonId?: EntityId
}

export interface PlaceItemPayload {
  itemId: EntityId
  locationId: EntityId
}

export interface SpeakPayload {
  toPersonIds: EntityId[]
  informationId: EntityId
}

export interface UseItemPayload {
  itemId: EntityId
  targetId?: EntityId
  targetType?: 'person' | 'item' | 'location'
}

export interface CombineItemsPayload {
  itemIds: EntityId[]
  resultItemId?: EntityId
}

// Timeline validation result
export interface TimelineValidation {
  valid: boolean
  conflicts: ConflictInfo[]
  suggestions: SuggestionInfo[]
}

export interface ConflictInfo {
  actId1: EntityId
  actId2: EntityId
  type: 'precondition_violated' | 'state_conflict' | 'temporal_paradox'
  description: string
  timestamp: number
}

export interface SuggestionInfo {
  type: 'add_act' | 'remove_act' | 'reorder_acts'
  description: string
  suggestedActs?: Partial<Act>[]
  affectedActIds?: EntityId[]
}

// State transition tracking
export interface StateTransition {
  fromState: Partial<WorldState>
  toState: Partial<WorldState>
  actId: EntityId
  timestamp: number
  changes: StateChange[]
}

export interface StateChange {
  type: 'position' | 'ownership' | 'knowledge'
  entityId: EntityId
  oldValue: EntityId | EntityId[] | null
  newValue: EntityId | EntityId[] | null
}

// Causality trace for tracking why something happened
export interface CausalityTrace {
  targetState: StateChange
  causedByActs: Act[]
  causalChain: CausalLink[]
  rootCause?: Act
}
