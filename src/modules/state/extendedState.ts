/**
 * Extended State Management Module
 *
 * Integrates the existing state with causality and extended entity states
 */

import type { StoryData } from '../../types'
import type { WorldState, EntityId } from '../../types/causality'
import {
  PropCategory,
  InformationCategory,
  type ExtendedWorldState,
  type ExtendedProp,
  type Information,
  type KnowledgeState,
  type LocationProperties,
} from '../../types/extendedEntities'
import { timeToMinutes } from '../utils/timeUtils'

/**
 * Convert classic StoryData to basic WorldState
 */
export function storyDataToWorldState(storyData: StoryData, timestamp: number): WorldState {
  const worldState: WorldState = {
    timestamp,
    personPositions: {},
    itemOwnership: {},
    knowledge: {},
    itemLocations: {},
  }

  // Map person positions from acts
  const personEvents = new Map<EntityId, EntityId>()
  if (storyData.acts) {
    storyData.acts
      .filter(act => {
        const actTime = timeToMinutes(act.time)
        return actTime <= timestamp
      })
      .sort((a, b) => {
        const timeA = timeToMinutes(a.time)
        const timeB = timeToMinutes(b.time)
        return timeB - timeA
      })
      .forEach(act => {
        const personId = act.personId as EntityId
        const locationId = act.locationId as EntityId
        if (!personEvents.has(personId)) {
          personEvents.set(personId, locationId)
        }
      })
  }

  personEvents.forEach((location, person) => {
    worldState.personPositions[person] = location
  })

  // Initialize knowledge states (empty for now)
  storyData.persons.forEach(person => {
    worldState.knowledge[person.id] = []
  })

  // Map props to ownership/locations
  storyData.props.forEach(prop => {
    // For now, place all props at their initial location
    // This would be enhanced with proper tracking
    if (storyData.locations.length > 0) {
      worldState.itemLocations[prop.id] = storyData.locations[0].id
    }
  })

  return worldState
}

/**
 * Convert classic StoryData to ExtendedWorldState
 */
export function storyDataToExtendedWorldState(
  storyData: StoryData,
  timestamp: number,
): ExtendedWorldState {
  const extendedState: ExtendedWorldState = {
    timestamp,
    personPositions: {},
    props: {},
    information: {},
    knowledgeStates: {},
    itemOwnership: {},
    itemLocations: {},
    locationProperties: {},
  }

  // Map person positions from acts
  const personEvents = new Map<EntityId, EntityId>()
  if (storyData.acts) {
    storyData.acts
      .filter(act => {
        const actTime = timeToMinutes(act.time)
        return actTime <= timestamp
      })
      .sort((a, b) => {
        const timeA = timeToMinutes(a.time)
        const timeB = timeToMinutes(b.time)
        return timeB - timeA
      })
      .forEach(act => {
        const personId = act.personId as EntityId
        const locationId = act.locationId as EntityId
        if (!personEvents.has(personId)) {
          personEvents.set(personId, locationId)
        }
      })
  }

  personEvents.forEach((location, person) => {
    extendedState.personPositions[person] = location
  })

  // Convert props to extended props
  storyData.props.forEach(prop => {
    const extendedProp: ExtendedProp = {
      id: prop.id,
      name: prop.name,
      description: (prop.description || '') as string,
      // Heuristic: items with "大" in name or description are large props
      category:
        prop.name.includes('大') ||
        ((prop.description as string | undefined)?.includes('大') ?? false)
          ? PropCategory.LARGE_PROP
          : PropCategory.SMALL_PROP,
      isPortable: !prop.name.includes('大'),
      isConsumable: false, // Default
      isCombineable: false, // Default
    }

    extendedState.props[prop.id] = extendedProp

    // Place props at first location by default
    if (storyData.locations.length > 0) {
      extendedState.itemLocations[prop.id] = storyData.locations[0].id
    }
  })

  // Initialize knowledge states for each person
  storyData.persons.forEach(person => {
    const knowledgeState: KnowledgeState = {
      personId: person.id,
      knownInformation: [],
      beliefs: new Map(),
      informationSources: new Map(),
    }
    extendedState.knowledgeStates[person.id] = knowledgeState
  })

  // Initialize location properties
  storyData.locations.forEach(location => {
    const locationProps: LocationProperties = {
      isAccessible: true,
      connectedLocations: [], // Would need to be populated from location connections
      requiredItems: [],
      requiredKnowledge: [],
    }
    extendedState.locationProperties[location.id] = locationProps
  })

  return extendedState
}

/**
 * Merge a basic WorldState with extended properties
 */
export function mergeWithExtendedState(
  basicState: WorldState,
  extendedProps: {
    props?: Record<EntityId, ExtendedProp>
    information?: Record<EntityId, Information>
    knowledgeStates?: Record<EntityId, KnowledgeState>
    locationProperties?: Record<EntityId, LocationProperties>
  },
): ExtendedWorldState {
  // Convert knowledge array to knowledge states
  const knowledgeStates: Record<EntityId, KnowledgeState> = {}

  Object.entries(basicState.knowledge).forEach(([personId, infoIds]) => {
    knowledgeStates[personId] = extendedProps.knowledgeStates?.[personId] || {
      personId,
      knownInformation: infoIds,
      beliefs: new Map(),
      informationSources: new Map(),
    }
  })

  return {
    timestamp: basicState.timestamp,
    personPositions: basicState.personPositions,
    props: extendedProps.props || {},
    information: extendedProps.information || {},
    knowledgeStates,
    itemOwnership: basicState.itemOwnership,
    itemLocations: basicState.itemLocations,
    locationProperties: extendedProps.locationProperties || {},
  }
}

/**
 * Extract basic WorldState from ExtendedWorldState
 */
export function extractBasicWorldState(extendedState: ExtendedWorldState): WorldState {
  // Convert knowledge states back to simple arrays
  const knowledge: Record<EntityId, EntityId[]> = {}

  Object.entries(extendedState.knowledgeStates).forEach(([personId, knowledgeState]) => {
    knowledge[personId] = knowledgeState.knownInformation
  })

  return {
    timestamp: extendedState.timestamp,
    personPositions: extendedState.personPositions,
    itemOwnership: extendedState.itemOwnership,
    knowledge,
    itemLocations: extendedState.itemLocations,
  }
}

/**
 * State persistence helpers
 */
const STORAGE_KEY = 'sceneflow-extended-state'

export function saveExtendedState(state: ExtendedWorldState): void {
  try {
    // Convert Maps to arrays for JSON serialization
    const serializable = {
      ...state,
      knowledgeStates: Object.entries(state.knowledgeStates).reduce(
        (acc, [personId, ks]) => {
          acc[personId] = {
            ...ks,
            beliefs: Array.from(ks.beliefs.entries()),
            informationSources: Array.from(ks.informationSources.entries()),
          }
          return acc
        },
        {} as Record<EntityId, unknown>,
      ),
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
  } catch (error) {
    console.error('Failed to save extended state:', error)
  }
}

export function loadExtendedState(): ExtendedWorldState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored) as ExtendedWorldState

    // Convert arrays back to Maps
    Object.entries(parsed.knowledgeStates).forEach(([personId, ks]) => {
      const typed = ks as unknown as {
        beliefs: Array<[EntityId, boolean]>
        informationSources: Array<[EntityId, EntityId]>
      }
      parsed.knowledgeStates[personId] = {
        ...ks,
        beliefs: new Map(typed.beliefs),
        informationSources: new Map(typed.informationSources),
      }
    })

    return parsed
  } catch (error) {
    console.error('Failed to load extended state:', error)
    return null
  }
}

/**
 * Create sample information entities
 */
export function createSampleInformation(): Record<EntityId, Information> {
  return {
    'info-1': {
      id: 'info-1',
      content: 'The key is hidden under the doormat',
      description: 'Location of the hidden key',
      category: InformationCategory.SECRET,
      isSecret: true,
      enablesActions: ['USE_ITEM'],
    },
    'info-2': {
      id: 'info-2',
      content: 'The password is "OpenSesame"',
      description: 'Secret password',
      category: InformationCategory.SECRET,
      isSecret: true,
    },
    'info-3': {
      id: 'info-3',
      content: 'How to operate the machine',
      description: 'Machine operation instructions',
      category: InformationCategory.INSTRUCTION,
      requiresContext: ['info-2'],
    },
  }
}
