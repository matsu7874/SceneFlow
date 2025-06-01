import { simState, domElements } from '../state'
import { minutesToTime } from '../utils/timeUtils'
import { getStateAtTime } from '../simulation/core'
import { updateLocationVisualization } from './layout'

export function updateUI(currentMinutes: number): void {
  if (!simState.indexedData || !simState.sortedEvents) return

  currentMinutes = Math.max(simState.minTimeMinutes, Math.min(currentMinutes, simState.maxTimeMinutes))
  simState.currentTimeMinutes = currentMinutes
  const currentTimeStr = minutesToTime(currentMinutes)

  // 1. Update Time Displays & Timeline Slider
  domElements.currentTimeDisplay.textContent = currentTimeStr
  domElements.locationTimeDisplay.textContent = currentTimeStr
  domElements.logTimeDisplay.textContent = currentTimeStr
  domElements.layoutTimeDisplay.textContent = currentTimeStr
  domElements.timeline.value = currentMinutes.toString()

  // 2. Calculate World State
  const worldState = getStateAtTime(
    currentMinutes,
    simState.indexedData,
    simState.sortedEvents,
    simState.indexedData.initialStates,
  )

  // 3. Display Character Locations (Text - with Colors)
  domElements.locationOutput.innerHTML = '' // Clear first
  if (simState.indexedData.persons.length === 0) {
    domElements.locationOutput.textContent = '登場人物がいません'
  } else {
    simState.indexedData.persons.forEach(person => {
      const personColor = person.color || '#000000'
      const state = worldState[person.id]
      const locationId = state ? state.locationId : null
      const location = locationId ? simState.indexedData.locationMap.get(locationId) : null
      const locationName = location ? location.name : '不明/未登場'

      const div = document.createElement('div')
      div.textContent = `- ${person.name}: ${locationName}`
      div.style.color = personColor
      div.style.fontWeight = 'bold'
      domElements.locationOutput.appendChild(div)
    })
  }

  // 4. Filter and Display Logs (Text only for security)
  const logToShow = simState.eventLogEntries
    .filter(entry => entry.timeMinutes <= currentMinutes)
    .map(entry => entry.text)
    .join('\n')
  domElements.logOutput.textContent = logToShow || 'ログはありません'
  domElements.logOutput.scrollTop = domElements.logOutput.scrollHeight

  // 5. Update Fixed Layout Visualization
  updateLocationVisualization(worldState, simState.indexedData)
}