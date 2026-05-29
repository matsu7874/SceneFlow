import type { Act } from '../../types/StoryData'
import type { Breakage } from '../../modules/consistency'

export function breakageLocationIds(breakages: Breakage[], acts: Act[]): Set<number> {
  const byId = new Map<number, Act>()
  for (const a of acts) byId.set(a.id, a)
  const ids = new Set<number>()
  for (const b of breakages) {
    const act = byId.get(b.actId)
    if (act) ids.add(act.locationId)
  }
  return ids
}

export interface MovementPolyline {
  personId: number
  locationIds: number[]
}

export function buildMovementPolylines(acts: Act[]): MovementPolyline[] {
  const byPerson = new Map<number, Act[]>()
  for (const a of acts) {
    const list = byPerson.get(a.personId) ?? []
    list.push(a)
    byPerson.set(a.personId, list)
  }
  const result: MovementPolyline[] = []
  for (const [personId, list] of byPerson) {
    const sorted = [...list].sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0) || a.id - b.id)
    const locationIds: number[] = []
    for (const a of sorted) {
      if (locationIds.length === 0 || locationIds[locationIds.length - 1] !== a.locationId) {
        locationIds.push(a.locationId)
      }
    }
    result.push({ personId, locationIds })
  }
  return result
}
