import type { Event, IndexedData, LogEntry } from '../../types';
import { timeToMinutes } from '../utils/timeUtils';

export function generateLogEntries(sortedEvents: Event[], indexedData: IndexedData): LogEntry[] {
  const entries: LogEntry[] = [];
  const { personMap, locationMap, actMap, propMap, infoMap } = indexedData;

  // Format initial states log entry with color
  indexedData.initialStates.forEach(initState => {
    const person = personMap.get(initState.personId);
    const location = locationMap.get(initState.locationId);
    if (person && location) {
      const personColor = person.color || '#000000';
      const initialText = `[${initState.time}] <strong style="color: ${personColor};">${person.name}</strong> は ${location.name} にいます (初期状態)`;
      entries.push({
        timeMinutes: timeToMinutes(initState.time),
        text: initialText
      });
    }
  });

  // Format event log entry with color
  sortedEvents.forEach(event => {
    const timeMinutes = timeToMinutes(event.eventTime);
    const person = personMap.get(event.personId);
    const act = actMap.get(event.actId);
    if (!person || !act) return;

    const location = locationMap.get(act.locationId);
    if (!location) return;

    const personColor = person.color || '#000000';
    let logText = `[${event.eventTime}] <strong style="color: ${personColor};">${person.name}</strong> @ ${location.name}: ${act.description}`;

    // Add optional details
    if (act.interactedPersonId) {
      const interactedPerson = personMap.get(act.interactedPersonId);
      logText += ` (対象: ${interactedPerson ? interactedPerson.name : '不明 ' + act.interactedPersonId})`;
    }
    if (act.propId) {
      const prop = propMap.get(act.propId);
      logText += ` (小道具: ${prop ? prop.name : '不明 ' + act.propId})`;
    }
    if (act.informationId) {
      const info = infoMap.get(act.informationId);
      logText += ` (情報: ${info ? info.content : '不明 ' + act.informationId})`;
    }
    if (event.triggerType === '行動') {
      logText += ` (トリガー: 行動 ${event.triggerValue})`;
    }

    entries.push({ timeMinutes, text: logText });
  });

  entries.sort((a, b) => a.timeMinutes - b.timeMinutes);
  return entries;
}