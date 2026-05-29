import type { StoryData } from '../../types/StoryData'
import type { NodeId } from './types'

interface PositionEntry {
  locationId: number
  producer: NodeId
}
interface OwnerEntry {
  ownerId: number
  producer: NodeId
}
interface PropLocationEntry {
  locationId: number
  producer: NodeId
}

export class WorldState {
  private positions = new Map<number, PositionEntry>()
  private propOwners = new Map<number, OwnerEntry>()
  private propLocations = new Map<number, PropLocationEntry>()
  private knowledge = new Map<number, Map<number, NodeId>>()
  private consumed = new Set<number>()

  positionOf(personId: number): PositionEntry | undefined {
    return this.positions.get(personId)
  }

  setPosition(personId: number, locationId: number, producer: NodeId): void {
    this.positions.set(personId, { locationId, producer })
  }

  ownerOf(propId: number): OwnerEntry | undefined {
    return this.consumed.has(propId) ? undefined : this.propOwners.get(propId)
  }

  setOwner(propId: number, ownerId: number, producer: NodeId): void {
    this.propOwners.set(propId, { ownerId, producer })
    this.propLocations.delete(propId)
  }

  propLocationOf(propId: number): PropLocationEntry | undefined {
    return this.consumed.has(propId) ? undefined : this.propLocations.get(propId)
  }

  setPropLocation(propId: number, locationId: number, producer: NodeId): void {
    this.propLocations.set(propId, { locationId, producer })
    this.propOwners.delete(propId)
  }

  consume(propId: number): void {
    this.consumed.add(propId)
    this.propOwners.delete(propId)
    this.propLocations.delete(propId)
  }

  knowerProducer(personId: number, informationId: number): NodeId | undefined {
    return this.knowledge.get(personId)?.get(informationId)
  }

  setKnows(personId: number, informationId: number, producer: NodeId): void {
    let m = this.knowledge.get(personId)
    if (!m) {
      m = new Map<number, NodeId>()
      this.knowledge.set(personId, m)
    }
    if (!m.has(informationId)) m.set(informationId, producer)
  }
}

export function initWorldState(story: StoryData): WorldState {
  const ws = new WorldState()
  for (const s of story.initialStates) {
    ws.setPosition(s.personId, s.locationId, `initial:${s.personId}`)
  }
  for (const p of story.props) {
    const ownerId = p.owner != null && p.owner !== '' ? Number(p.owner) : NaN
    const locId =
      p.currentLocation != null && p.currentLocation !== '' ? Number(p.currentLocation) : NaN
    if (Number.isFinite(ownerId)) {
      ws.setOwner(p.id, ownerId, `initial:prop:${p.id}`)
    } else if (Number.isFinite(locId)) {
      ws.setPropLocation(p.id, locId, `initial:prop:${p.id}`)
    }
  }
  return ws
}
