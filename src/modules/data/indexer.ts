import type { StoryData, IndexedData, Event } from '../../types';
import { timeToMinutes } from '../utils/timeUtils';

export function indexStoryData(storyData: StoryData): IndexedData {
  const mapArray = <T extends { id: number }>(array: T[] | undefined): Map<number, T> => {
    return new Map((array || []).map(item => [item.id, item]));
  };
  
  return {
    personMap: mapArray(storyData.persons),
    locationMap: mapArray(storyData.locations),
    actMap: mapArray(storyData.acts),
    propMap: mapArray(storyData.props),
    infoMap: mapArray(storyData.informations),
    persons: storyData.persons || [],
    locations: storyData.locations || [],
    acts: storyData.acts || [],
    events: storyData.events || [],
    initialStates: storyData.initialStates || []
  };
}

export function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const timeA = timeToMinutes(a.eventTime);
    const timeB = timeToMinutes(b.eventTime);
    if (timeA !== timeB) return timeA - timeB;
    return a.id - b.id;
  });
}