import type { IndexedData, Event, InitialState, WorldState } from '../../types'
import { timeToMinutes } from '../utils/timeUtils'

export function getStateAtTime(
  targetMinutes: number,
  indexedData: IndexedData,
  sortedEvents: Event[],
  initialStates: InitialState[],
): WorldState {
  const worldState: WorldState = {}
  const { personMap, actMap } = indexedData

  personMap.forEach(person => {
    let lastKnownLocationId: number | null = null
    let lastAction = null
    let lastEventTime = -1

    const initialState = initialStates.find(s => s.personId === person.id)
    if (initialState) {
      const initialTimeMinutes = timeToMinutes(initialState.time)
      if (initialTimeMinutes <= targetMinutes) {
        lastKnownLocationId = initialState.locationId
        lastEventTime = initialTimeMinutes
      }
    }

    for (const event of sortedEvents) {
      if (event.personId === person.id) {
        const eventTimeMinutes = timeToMinutes(event.eventTime)
        if (eventTimeMinutes <= targetMinutes) {
          if (eventTimeMinutes >= lastEventTime) {
            const act = actMap.get(event.actId)
            if (act) {
              lastKnownLocationId = act.locationId
              lastAction = act
              lastEventTime = eventTimeMinutes
            }
          }
        } else {
          break
        }
      }
    }

    worldState[person.id] = {
      locationId: lastKnownLocationId,
      lastAction: lastAction,
    }
  })

  return worldState
}