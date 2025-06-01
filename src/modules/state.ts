import type { SimState, DOMElements } from '../types'

export const simState: SimState = {
  currentTimeMinutes: 0,
  minTimeMinutes: 0,
  maxTimeMinutes: 0,
  isPlaying: false,
  speed: 1,
  timerId: null,
  lastTimestamp: null,
  indexedData: null,
  sortedEvents: null,
  eventLogEntries: [],
  locationElements: {},
}

export let domElements: DOMElements

export function setDOMElements(elements: DOMElements): void {
  domElements = elements
}