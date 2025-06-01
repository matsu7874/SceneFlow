/**
 * PlaceItemAct - Represents placing an item at a location
 */

import { BaseAct } from './BaseAct'
import type {
  WorldState,
  ValidationResult,
  PlaceItemPayload,
  EntityId,
} from '../../../types/causality'

export class PlaceItemAct extends BaseAct {
  private payload: PlaceItemPayload

  constructor(id: EntityId, personId: EntityId, timestamp: number, payload: PlaceItemPayload) {
    const description = `Place item ${payload.itemId} at location ${payload.locationId}`
    super(id, 'PLACE_ITEM', personId, timestamp, description)
    this.payload = payload
  }

  checkPreconditions(state: WorldState): ValidationResult {
    const errors = []

    // Check if person owns the item
    if (!this.doesPersonOwnItem(state, this.personId, this.payload.itemId)) {
      const currentOwner = state.itemOwnership[this.payload.itemId]
      const currentLocation = state.itemLocations[this.payload.itemId]

      if (currentOwner) {
        errors.push(
          this.createError(
            'ITEM_NOT_OWNED',
            `Person ${this.personId} does not own item ${this.payload.itemId}`,
            [this.personId, this.payload.itemId],
            `Item is currently owned by ${currentOwner}`,
          ),
        )
      } else if (currentLocation) {
        errors.push(
          this.createError(
            'ITEM_ALREADY_PLACED',
            `Item ${this.payload.itemId} is already placed at location ${currentLocation}`,
            [this.payload.itemId, currentLocation],
            'Take the item from its current location first',
          ),
        )
      } else {
        errors.push(
          this.createError(
            'ITEM_STATUS_UNKNOWN',
            `Item ${this.payload.itemId} status is unknown`,
            [this.payload.itemId],
            'Ensure the item exists in the world state',
          ),
        )
      }
    }

    // Check if person is at the target location
    const personLocation = state.personPositions[this.personId]
    if (personLocation !== this.payload.locationId) {
      errors.push(
        this.createError(
          'PERSON_NOT_AT_TARGET_LOCATION',
          `Person ${this.personId} is at location ${personLocation}, not at target location ${this.payload.locationId}`,
          [this.personId, personLocation, this.payload.locationId],
          'Move to the target location before placing the item',
        ),
      )
    }

    return errors.length > 0 ? this.createInvalidResult(errors) : this.createValidResult()
  }

  applyPostconditions(state: WorldState): WorldState {
    const newState = this.cloneWorldState(state)

    // Place item at the location (removes ownership)
    this.placeItemAtLocation(newState, this.payload.itemId, this.payload.locationId)

    // Update timestamp
    newState.timestamp = this.timestamp

    return newState
  }

  getAffectedEntities(): EntityId[] {
    return [this.personId, this.payload.itemId, this.payload.locationId]
  }

  // Getter methods for payload data
  getItemId(): EntityId {
    return this.payload.itemId
  }

  getLocationId(): EntityId {
    return this.payload.locationId
  }
}
