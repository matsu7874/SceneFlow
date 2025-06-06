import { Act } from '../types/StoryData'
import { Event } from '../types'

/**
 * Generate events from acts
 * Each act generates a time-based event trigger
 */
export function generateEventsFromActs(acts: Act[]): Event[] {
  return acts.map((_act, index) => ({
    id: index + 1,
    triggerType: '時刻' as const,
    triggerValue: _act.time,
    eventTime: _act.time,
    personId: _act.personId,
    actId: _act.id,
    name: `Event for ${_act.description}`,
    description: `Triggered by act: ${_act.description}`,
  }))
}

/**
 * Check if an act should generate an event
 * For now, all acts generate events, but this could be extended
 * to filter based on act type or other criteria
 */
export function shouldGenerateEvent(act: Act): boolean {
  // All acts generate time-based events
  return true
}

/**
 * Group acts by time to generate consolidated events
 */
export function groupActsByTime(acts: Act[]): Map<string, Act[]> {
  const groups = new Map<string, Act[]>()

  acts.forEach(act => {
    const time = act.time
    if (!groups.has(time)) {
      groups.set(time, [])
    }
    groups.get(time)?.push(act)
  })

  return groups
}