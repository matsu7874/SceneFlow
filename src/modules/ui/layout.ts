import type { IndexedData, LocationElements, WorldState } from '../../types'
import { simState } from '../state'

export function initializeLocationLayout(
  container: HTMLElement,
  indexedData: IndexedData,
): LocationElements {
  container.innerHTML = ''
  const locationElements: LocationElements = {}

  indexedData.locations.forEach(location => {
    const box = document.createElement('div')
    box.classList.add('location-box')
    box.dataset.locationId = location.id.toString()

    const nameHeader = document.createElement('h4')
    nameHeader.textContent = location.name

    const personList = document.createElement('ul')
    personList.classList.add('person-list')

    box.appendChild(nameHeader)
    box.appendChild(personList)
    container.appendChild(box)

    locationElements[location.id] = {
      box: box,
      personList: personList,
    }
  })

  return locationElements
}

export function updateLocationVisualization(
  worldState: WorldState,
  indexedData: IndexedData,
): void {
  if (!simState.locationElements) return

  const { personMap } = indexedData
  interface OccupantInfo {
    id: number;
    name: string;
    color: string | null;
    action: { description: string } | null;
  }

  const locationOccupancy: Record<number, OccupantInfo[]> = {}

  // Aggregate people and their last action by location
  Object.entries(worldState).forEach(([personIdStr, personState]) => {
    const personId = parseInt(personIdStr)
    const locationId = personState.locationId
    if (locationId !== null) {
      if (!locationOccupancy[locationId]) {
        locationOccupancy[locationId] = []
      }
      const person = personMap.get(personId)
      if (person) {
        locationOccupancy[locationId].push({
          id: person.id,
          name: person.name,
          color: person.color || null,
          action: personState.lastAction,
        })
      }
    }
  })

  // Update each location box in the DOM
  Object.entries(simState.locationElements).forEach(([locationId, elements]) => {
    const { box, personList } = elements
    const occupants = locationOccupancy[parseInt(locationId)] || []

    personList.innerHTML = ''

    if (occupants.length > 0) {
      occupants.forEach(occupant => {
        const li = document.createElement('li')
        const actionDescription = occupant.action?.description || '(滞在中/待機中)'
        const personColor = occupant.color || '#000000'

        // Create elements separately for security
        const nameSpan = document.createElement('strong')
        nameSpan.textContent = occupant.name
        nameSpan.style.color = personColor

        const actionSpan = document.createElement('span')
        actionSpan.textContent = actionDescription
        actionSpan.className = occupant.action ? 'person-action' : 'person-idle'

        li.appendChild(nameSpan)
        li.appendChild(document.createTextNode(': '))
        li.appendChild(actionSpan)
        personList.appendChild(li)
      })
      box.classList.add('occupied')
    } else {
      box.classList.remove('occupied')
    }
  })
}