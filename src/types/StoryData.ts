export interface Person {
  id: number
  name: string
  color: string
}

export interface Location {
  id: number
  name: string
  connections: number[]
}

export interface Prop {
  id: number
  name: string
}

export interface Information {
  id: number
  content: string
}

export interface InitialState {
  personId: number
  locationId: number
  time: string
}

export interface Act {
  id: number
  personId: number
  locationId: number
  time: string
  description: string
  propId?: number
  informationId?: number
  interactedPersonId?: number
}

export interface Move {
  id: number
  personId: number
  fromLocationId: number
  toLocationId: number
  time: string
}

export interface Stay {
  id: number
  personId: number
  locationId: number
  time: string
  endTime: string
}

export interface Event {
  id: number
  triggerType: '時刻' | '行動' | '条件'
  triggerValue: string
  eventTime: string
  personId: number
  actId: number
}

export interface StoryData {
  persons: Person[]
  locations: Location[]
  props: Prop[]
  informations: Information[]
  initialStates: InitialState[]
  acts: Act[]
  moves: Move[]
  stays: Stay[]
  events: Event[]
}