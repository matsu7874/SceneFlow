/**
 * Extended Entity Type Definitions
 *
 * This module defines extended types for props (大道具・小道具) and information entities.
 */

import type { EntityId } from './causality'

/**
 * Entity types that can be managed in the Entity Editor
 */
export type EntityType = 'person' | 'location' | 'prop' | 'information' | 'act' | 'event'

/**
 * Extended entity for generic entity management
 */
export interface ExtendedEntity {
  id: string
  type: EntityType
  name: string
  description: string
  created_at: string
  updated_at: string
  attributes: Record<string, any>
  relationships: Array<{
    type: string
    targetId: string
    metadata?: Record<string, any>
  }>
}

/**
 * Prop categories
 * 大道具 (Large Props): Furniture, fixtures, environmental objects
 * 小道具 (Small Props): Items that can be carried and used
 */
export enum PropCategory {
  LARGE_PROP = 'LARGE_PROP', // 大道具
  SMALL_PROP = 'SMALL_PROP', // 小道具
}

/**
 * Extended Prop type with category distinction
 */
export interface ExtendedProp {
  id: EntityId
  name: string
  description: string
  category: PropCategory
  // Properties specific to large props
  isFixed?: boolean // Cannot be moved
  occupiesSpace?: boolean // Blocks movement
  // Properties specific to small props
  isPortable?: boolean // Can be carried
  isConsumable?: boolean // Disappears after use
  isCombineable?: boolean // Can be combined with other items
  combinesWith?: EntityId[] // List of items this can combine with
  // Common properties
  currentLocation?: EntityId // Where the prop is located
  owner?: EntityId // Who owns it (if portable)
}

/**
 * Information entity representing knowledge that can be shared
 */
export interface Information {
  id: EntityId
  content: string
  description: string
  category: InformationCategory
  // Who can know this information
  isSecret?: boolean // Only specific people should know
  requiresContext?: EntityId[] // Other information needed to understand this
  // Effects of knowing this information
  enablesActions?: string[] // Act types that become available
  revealsInformation?: EntityId[] // Other information that becomes known
}

/**
 * Categories of information
 */
export enum InformationCategory {
  FACT = 'FACT', // Objective truth
  RUMOR = 'RUMOR', // May or may not be true
  SECRET = 'SECRET', // Hidden information
  INSTRUCTION = 'INSTRUCTION', // How to do something
  LOCATION = 'LOCATION', // Where something is
}

/**
 * Person's knowledge state
 */
export interface KnowledgeState {
  personId: EntityId
  knownInformation: EntityId[] // Information IDs this person knows
  beliefs: Map<EntityId, boolean> // Information ID -> whether they believe it's true
  informationSources: Map<EntityId, EntityId> // Information ID -> who told them
}

/**
 * Item usage result
 */
export interface ItemUsageResult {
  success: boolean
  consumed: boolean // Was the item consumed?
  producedItems?: EntityId[] // New items created
  stateChanges?: StateChange[] // Changes to world state
  message: string // Description of what happened
}

/**
 * State change from item usage
 */
export interface StateChange {
  type: 'create' | 'destroy' | 'modify' | 'reveal'
  targetId: EntityId
  targetType: 'prop' | 'information' | 'location'
  details: Record<string, unknown>
}

/**
 * Item combination result
 */
export interface CombinationResult {
  success: boolean
  consumedItems: EntityId[] // Items that were consumed
  producedItems: EntityId[] // New items created
  message: string // Description of the combination
}

/**
 * Extended world state including information and detailed props
 */
export interface ExtendedWorldState {
  timestamp: number
  // People and their positions
  personPositions: Record<EntityId, EntityId>
  // Props and their details
  props: Record<EntityId, ExtendedProp>
  // Information in the world
  information: Record<EntityId, Information>
  // Who knows what
  knowledgeStates: Record<EntityId, KnowledgeState>
  // Item ownership (for portable props)
  itemOwnership: Record<EntityId, EntityId>
  // Item locations (for all props)
  itemLocations: Record<EntityId, EntityId>
  // Location properties
  locationProperties: Record<EntityId, LocationProperties>
}

/**
 * Properties of a location
 */
export interface LocationProperties {
  isAccessible: boolean // Can people enter?
  connectedLocations: EntityId[] // Adjacent locations
  requiredItems?: EntityId[] // Items needed to enter
  requiredKnowledge?: EntityId[] // Information needed to find/enter
}

/**
 * Helper type guards
 */
export const isLargeProp = (prop: ExtendedProp): boolean =>
  prop.category === PropCategory.LARGE_PROP

export const isSmallProp = (prop: ExtendedProp): boolean =>
  prop.category === PropCategory.SMALL_PROP

export const isPortable = (prop: ExtendedProp): boolean =>
  prop.isPortable === true && isSmallProp(prop)

export const isConsumable = (prop: ExtendedProp): boolean => prop.isConsumable === true

export const canCombineWith = (prop1: ExtendedProp, prop2: ExtendedProp): boolean => {
  if (!prop1.isCombineable || !prop2.isCombineable) return false
  return prop1.combinesWith?.includes(prop2.id) || prop2.combinesWith?.includes(prop1.id) || false
}
