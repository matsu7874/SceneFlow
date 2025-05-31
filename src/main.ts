import { simState, setDOMElements, domElements } from './modules/state';
import { getDOMElements } from './modules/utils/domUtils';
import { timeToMinutes, minutesToTime } from './modules/utils/timeUtils';
import { parseJsonData } from './modules/data/parser';
import { indexStoryData, sortEvents } from './modules/data/indexer';
import { generateLogEntries } from './modules/simulation/events';
import { initializeLocationLayout } from './modules/ui/layout';
import { updateUI } from './modules/ui/display';
import { 
  setControlsDisabled, 
  resetUI, 
  playSimulation, 
  pauseSimulation, 
  seekSimulation, 
  changeSpeed 
} from './modules/ui/controls';

function displayError(message: string): void {
  domElements.errorOutput.textContent = message;
  domElements.errorOutput.style.display = 'block';
  setControlsDisabled(true);
  resetUI();
}

function clearError(): void {
  domElements.errorOutput.textContent = '';
  domElements.errorOutput.style.display = 'none';
}

function loadData(): void {
  clearError();
  pauseSimulation();
  resetUI();
  
  try {
    const storyData = parseJsonData(domElements.jsonDataInput);
    simState.indexedData = indexStoryData(storyData);
    simState.sortedEvents = sortEvents(simState.indexedData.events);
    simState.eventLogEntries = generateLogEntries(simState.sortedEvents, simState.indexedData);
    simState.locationElements = initializeLocationLayout(
      domElements.locationLayoutContainer, 
      simState.indexedData
    );
    
    let minTime = Infinity;
    let maxTime = -Infinity;
    
    // Determine time range
    simState.indexedData.initialStates.forEach(state => {
      minTime = Math.min(minTime, timeToMinutes(state.time));
      maxTime = Math.max(maxTime, timeToMinutes(state.time));
    });
    
    if (simState.sortedEvents.length > 0) {
      if (minTime === Infinity) {
        minTime = timeToMinutes(simState.sortedEvents[0].eventTime);
      }
      maxTime = Math.max(
        maxTime, 
        timeToMinutes(simState.sortedEvents[simState.sortedEvents.length - 1].eventTime)
      );
    } else if (minTime === Infinity) {
      minTime = 0;
      maxTime = 0;
    }
    
    simState.minTimeMinutes = minTime;
    simState.maxTimeMinutes = maxTime;
    simState.currentTimeMinutes = minTime;
    
    domElements.timeline.min = simState.minTimeMinutes.toString();
    domElements.timeline.max = simState.maxTimeMinutes.toString();
    domElements.timeline.value = simState.currentTimeMinutes.toString();
    
    updateUI(simState.currentTimeMinutes);
    setControlsDisabled(false);
    
    console.log(
      `�����Ɍ� & 줢��: B��� ${minutesToTime(simState.minTimeMinutes)} - ${minutesToTime(simState.maxTimeMinutes)}`
    );
    
    // Collapse the details section
    if (domElements.jsonDataDetails) {
      domElements.jsonDataDetails.open = false;
    }
  } catch (e: any) {
    console.error("���/���:", e);
    displayError(`��ɨ��: ${e.message}`);
  }
}

function initializeApp(): void {
  const elements = getDOMElements();
  setDOMElements(elements);
  
  elements.loadButton.addEventListener('click', loadData);
  elements.playPauseButton.addEventListener('click', () => {
    if (simState.isPlaying) {
      pauseSimulation();
    } else {
      playSimulation();
    }
  });
  elements.timeline.addEventListener('input', seekSimulation);
  elements.speedControl.addEventListener('change', changeSpeed);
  
  setControlsDisabled(true);
}

// Run when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);