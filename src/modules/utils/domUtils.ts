import type { DOMElements } from '../../types';

export function getDOMElements(): DOMElements {
  return {
    jsonDataInput: document.getElementById('jsonDataInput') as HTMLTextAreaElement,
    loadButton: document.getElementById('loadDataButton') as HTMLButtonElement,
    playPauseButton: document.getElementById('playPauseButton') as HTMLButtonElement,
    speedControl: document.getElementById('speedControl') as HTMLSelectElement,
    timeline: document.getElementById('timeline') as HTMLInputElement,
    currentTimeDisplay: document.getElementById('currentTimeDisplay') as HTMLElement,
    locationOutput: document.getElementById('locationOutput') as HTMLElement,
    logOutput: document.getElementById('logOutput') as HTMLElement,
    errorOutput: document.getElementById('errorOutput') as HTMLElement,
    locationTimeDisplay: document.getElementById('locationTimeDisplay') as HTMLElement,
    logTimeDisplay: document.getElementById('logTimeDisplay') as HTMLElement,
    locationLayoutContainer: document.getElementById('locationLayout') as HTMLElement,
    layoutTimeDisplay: document.getElementById('layoutTimeDisplay') as HTMLElement,
    jsonDataDetails: document.getElementById('jsonDataDetails') as HTMLDetailsElement
  };
}