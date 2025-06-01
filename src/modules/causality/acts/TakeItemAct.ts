/**
 * TakeItemAct - Represents taking an item from a location or person
 */

import { BaseAct } from './BaseAct'
import type {
  WorldState,
  ValidationResult,
  TakeItemPayload,
  EntityId,
} from '../../../types/causality'

export class TakeItemAct extends BaseAct {
  private payload: TakeItemPayload

  constructor(id: EntityId, personId: EntityId, timestamp: number, payload: TakeItemPayload) {
    const source = payload.fromLocationId
      ? `location ${payload.fromLocationId}`
      : payload.fromPersonId
        ? `person ${payload.fromPersonId}`
        : 'unknown source'
    const description = `Take item ${payload.itemId} from ${source}`
    super(id, 'TAKE_ITEM', personId, timestamp, description)
    this.payload = payload
  }

  checkPreconditions(state: WorldState): ValidationResult {
    const errors = []

    // Determine where the item should be taken from
    if (this.payload.fromLocationId) {
      // Taking from a location
      const itemLocation = state.itemLocations[this.payload.itemId]
      if (itemLocation !== this.payload.fromLocationId) {
        errors.push(
          this.createError(
            'ITEM_NOT_AT_LOCATION',
            `Item ${this.payload.itemId} is not at location ${this.payload.fromLocationId}`,
            [this.payload.itemId, this.payload.fromLocationId],
            itemLocation
              ? `Item is at location ${itemLocation}`
              : 'Item is not placed at any location',
          ),
        )
      }

      // Check if person is at the same location as the item
      const personLocation = state.personPositions[this.personId]
      if (personLocation !== this.payload.fromLocationId) {
        errors.push(
          this.createError(
            'PERSON_NOT_AT_ITEM_LOCATION',
            `Person ${this.personId} is at location ${personLocation}, but item is at location ${this.payload.fromLocationId}`,
            [this.personId, this.payload.itemId, personLocation, this.payload.fromLocationId],
            'Move to the item location before taking it',
          ),
        )
      }
    } else if (this.payload.fromPersonId) {
      // Taking from a person (requires consent in real implementation)
      const itemOwner = state.itemOwnership[this.payload.itemId]
      if (itemOwner !== this.payload.fromPersonId) {
        errors.push(
          this.createError(
            'ITEM_NOT_OWNED_BY_PERSON',
            `Person ${this.payload.fromPersonId} does not own item ${this.payload.itemId}`,
            [this.payload.fromPersonId, this.payload.itemId],
            itemOwner ? `Item is owned by ${itemOwner}` : 'Item is not owned by anyone',
          ),
        )
      }

      // Check if both people are at the same location
      const takerLocation = state.personPositions[this.personId]
      const ownerLocation = state.personPositions[this.payload.fromPersonId]
      if (takerLocation !== ownerLocation) {
        errors.push(
          this.createError(
            'PEOPLE_NOT_SAME_LOCATION',
            `Taker ${this.personId} is at location ${takerLocation}, but owner ${this.payload.fromPersonId} is at location ${ownerLocation}`,
            [this.personId, this.payload.fromPersonId, takerLocation, ownerLocation],
            'Move to the same location as the item owner',
          ),
        )
      }

      // Check not taking from oneself
      if (this.personId === this.payload.fromPersonId) {
        errors.push(
          this.createError(
            'SELF_TAKE',
            'Cannot take an item from oneself',
            [this.personId],
            'You already own this item',
          ),
        )
      }
    } else {
      errors.push(
        this.createError(
          'NO_SOURCE_SPECIFIED',
          'Must specify either fromLocationId or fromPersonId',
          [this.payload.itemId],
          'Specify where to take the item from',
        ),
      )
    }

    return errors.length > 0 ? this.createInvalidResult(errors) : this.createValidResult()
  }

  applyPostconditions(state: WorldState): WorldState {
    const newState = this.cloneWorldState(state)

    // Transfer item ownership to the taker
    this.transferItemOwnership(newState, this.payload.itemId, this.personId)

    // Update timestamp
    newState.timestamp = this.timestamp

    return newState
  }

  getAffectedEntities(): EntityId[] {
    const entities = [this.personId, this.payload.itemId]

    if (this.payload.fromLocationId) {
      entities.push(this.payload.fromLocationId)
    }
    if (this.payload.fromPersonId) {
      entities.push(this.payload.fromPersonId)
    }

    return entities
  }

  // Getter methods for payload data
  getItemId(): EntityId {
    return this.payload.itemId
  }

  getFromLocationId(): EntityId | undefined {
    return this.payload.fromLocationId
  }

  getFromPersonId(): EntityId | undefined {
    return this.payload.fromPersonId
  }
}
