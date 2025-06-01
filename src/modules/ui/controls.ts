import { simState, domElements } from '../state'
import { MINUTES_PER_SECOND, FPS } from '../constants'
import { updateUI } from '../ui/display'

export function setControlsDisabled(disabled: boolean): void {
  domElements.playPauseButton.disabled = disabled
  domElements.timeline.disabled = disabled
}

export function resetUI(): void {
  domElements.locationOutput.textContent = 'ロード後に表示されます。'
  domElements.logOutput.textContent = 'ロード後に表示されます。'
  domElements.currentTimeDisplay.textContent = '--:--'
  domElements.locationTimeDisplay.textContent = '--:--'
  domElements.logTimeDisplay.textContent = '--:--'
  domElements.layoutTimeDisplay.textContent = '--:--'

  if (simState.timerId) {
    clearInterval(simState.timerId)
    simState.timerId = null
  }

  simState.isPlaying = false
  domElements.playPauseButton.textContent = '▶ Play'
  domElements.locationLayoutContainer.innerHTML = ''
  simState.locationElements = {}

  if (domElements.jsonDataDetails) {
    domElements.jsonDataDetails.open = true
  }
}

export function playSimulation(): void {
  if (simState.isPlaying || !simState.indexedData) return

  if (simState.currentTimeMinutes >= simState.maxTimeMinutes) {
    simState.currentTimeMinutes = simState.minTimeMinutes
  }

  simState.isPlaying = true
  domElements.playPauseButton.textContent = '❚❚ Pause'
  simState.lastTimestamp = performance.now()

  simState.timerId = setInterval(() => {
    const now = performance.now()
    if (simState.lastTimestamp === undefined) return
    const deltaSeconds = (now - simState.lastTimestamp) / 1000
    simState.lastTimestamp = now

    const deltaMinutes = deltaSeconds * MINUTES_PER_SECOND * simState.speed
    let nextMinutes = simState.currentTimeMinutes + deltaMinutes

    if (nextMinutes >= simState.maxTimeMinutes) {
      nextMinutes = simState.maxTimeMinutes
      pauseSimulation()
    }

    updateUI(nextMinutes)
  }, 1000 / FPS)
}

export function pauseSimulation(): void {
  if (!simState.isPlaying) return

  if (simState.timerId !== null && simState.timerId !== undefined) {
    clearInterval(simState.timerId)
    simState.timerId = null
  }
  simState.isPlaying = false
  domElements.playPauseButton.textContent = '▶ Play'
}

export function seekSimulation(event: Event): void {
  if (simState.isPlaying) {
    pauseSimulation()
  }
  const target = event.target as HTMLInputElement
  const targetMinutes = parseInt(target.value, 10)
  updateUI(targetMinutes)
}

export function changeSpeed(event: Event): void {
  const target = event.target as HTMLSelectElement
  simState.speed = parseFloat(target.value)
}
