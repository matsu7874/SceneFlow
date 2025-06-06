export interface Person {
  id: number
  name: string
  color: string
  description?: string
  age?: number
  occupation?: string
  personality?: string
  goals?: string[]
  relationships?: Array<{
    targetId: string
    type: string
  }>
}

export interface Location {
  id: number
  name: string
  connections: number[]
  description?: string
  type?: 'indoor' | 'outdoor' | 'transit'
  capacity?: number
  connectedTo?: string[]
  properties?: {
    isLocked?: boolean
    requiredItem?: string
    atmosphere?: string
  }
  x?: number
  y?: number
}

export interface Prop {
  id: number
  name: string
  description?: string
  category?: 'LARGE_PROP' | 'SMALL_PROP'
  isPortable?: boolean
  isConsumable?: boolean
  isCombineable?: boolean
  combinesWith?: string[]
  currentLocation?: string
  owner?: string
}

export interface Information {
  id: number
  name?: string
  content: string
  description?: string
  category?: 'FACT' | 'RUMOR' | 'SECRET' | 'INSTRUCTION' | 'LOCATION'
  isSecret?: boolean
  requiresContext?: string[]
  enablesActions?: string[]
  revealsInformation?: string[]
}

export interface InitialState {
  personId: number
  locationId: number
  time: string
}

export interface Act {
  id: number
  type?: string
  personId: number
  locationId: number
  startTime?: number
  endTime?: number
  time: string
  description: string
  propId?: number
  informationId?: number
  interactedPersonId?: number
  itemId?: number
}

export interface Event {
  id: number
  name?: string
  description?: string
  trigger?: {
    type: 'time' | 'actCompleted' | 'condition'
    time?: number
    actId?: string
  }
  actions?: Array<{
    type: string
    description: string
  }>
  triggerType?: '時刻' | '行動' | '条件'
  triggerValue?: string
  eventTime?: string
  personId?: number
  actId?: number
}

export interface StoryData {
  persons: Person[]
  locations: Location[]
  props: Prop[]
  informations: Information[]
  initialStates: InitialState[]
  acts: Act[]
}