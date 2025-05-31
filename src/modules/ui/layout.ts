import type { IndexedData, LocationElements, WorldState } from '../../types';
import { simState } from '../state';

export function initializeLocationLayout(
  container: HTMLElement, 
  indexedData: IndexedData
): LocationElements {
  container.innerHTML = '';
  const locationElements: LocationElements = {};
  
  indexedData.locations.forEach(location => {
    const box = document.createElement('div');
    box.classList.add('location-box');
    box.dataset.locationId = location.id.toString();
    
    const nameHeader = document.createElement('h4');
    nameHeader.textContent = location.name;
    
    const personList = document.createElement('ul');
    personList.classList.add('person-list');
    
    box.appendChild(nameHeader);
    box.appendChild(personList);
    container.appendChild(box);
    
    locationElements[location.id] = { 
      box: box, 
      personList: personList 
    };
  });
  
  return locationElements;
}

export function updateLocationVisualization(
  worldState: WorldState, 
  indexedData: IndexedData
): void {
  if (!simState.locationElements) return;
  
  const { personMap } = indexedData;
  const locationOccupancy: Record<number, Array<{
    id: number;
    name: string;
    color: string | null;
    action: any;
  }>> = {};
  
  // Aggregate people and their last action by location
  Object.entries(worldState).forEach(([personIdStr, personState]) => {
    const personId = parseInt(personIdStr);
    if (personState.locationId !== null) {
      if (!locationOccupancy[personState.locationId]) {
        locationOccupancy[personState.locationId] = [];
      }
      const person = personMap.get(personId);
      if (person) {
        locationOccupancy[personState.locationId].push({
          id: person.id,
          name: person.name,
          color: person.color || null,
          action: personState.lastAction
        });
      }
    }
  });
  
  // Update each location box in the DOM
  Object.entries(simState.locationElements).forEach(([locationId, elements]) => {
    const { box, personList } = elements;
    const occupants = locationOccupancy[parseInt(locationId)] || [];
    
    personList.innerHTML = '';
    
    if (occupants.length > 0) {
      occupants.forEach(occupant => {
        const li = document.createElement('li');
        const actionDescription = occupant.action ? occupant.action.description : '(滞在中/待機中)';
        const actionClass = occupant.action ? 'person-action' : 'person-idle';
        const personColor = occupant.color || '#000000';
        
        li.innerHTML = `<strong style="color: ${personColor};">${occupant.name}</strong>: <span class="${actionClass}">${actionDescription}</span>`;
        personList.appendChild(li);
      });
      box.classList.add('occupied');
    } else {
      box.classList.remove('occupied');
    }
  });
}