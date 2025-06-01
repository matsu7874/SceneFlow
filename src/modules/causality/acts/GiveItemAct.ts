/**
 * GiveItemAct - Represents giving an item from one person to another
 */

import { BaseAct } from './BaseAct'
import type {
  WorldState,
  ValidationResult,
  GiveItemPayload,
  EntityId,
} from '../../../types/causality'

export class GiveItemAct extends BaseAct {
  private payload: GiveItemPayload

  constructor(id: EntityId, personId: EntityId, timestamp: number, payload: GiveItemPayload) {
    const description = `Give item ${payload.itemId} to person ${payload.toPersonId}`
    super(id, 'GIVE_ITEM', personId, timestamp, description)
    this.payload = payload
  }

  checkPreconditions(state: WorldState): ValidationResult {
    const errors = []

    // Check if giver owns the item
    if (!this.doesPersonOwnItem(state, this.personId, this.payload.itemId)) {
      const currentOwner = state.itemOwnership[this.payload.itemId]
      errors.push(
        this.createError(
          'ITEM_NOT_OWNED',
          `Person ${this.personId} does not own item ${this.payload.itemId}`,
          [this.personId, this.payload.itemId],
          currentOwner
            ? `Item is currently owned by ${currentOwner}`
            : 'Item is not owned by anyone or is placed at a location',
        ),
      )
    }

    // Check if giver and receiver are at the same location
    const giverLocation = state.personPositions[this.personId]
    const receiverLocation = state.personPositions[this.payload.toPersonId]

    if (!giverLocation) {
      errors.push(
        this.createError(
          'GIVER_LOCATION_UNKNOWN',
          `Person ${this.personId} location is unknown`,
          [this.personId],
          'Ensure the giver has a valid location',
        ),
      )
    }

    if (!receiverLocation) {
      errors.push(
        this.createError(
          'RECEIVER_LOCATION_UNKNOWN',
          `Person ${this.payload.toPersonId} location is unknown`,
          [this.payload.toPersonId],
          'Ensure the receiver has a valid location',
        ),
      )
    }

    if (giverLocation && receiverLocation && giverLocation !== receiverLocation) {
      errors.push(
        this.createError(
          'NOT_SAME_LOCATION',
          `Giver ${this.personId} is at location ${giverLocation}, but receiver ${this.payload.toPersonId} is at location ${receiverLocation}`,
          [this.personId, this.payload.toPersonId, giverLocation, receiverLocation],
          'Move one person to the same location as the other before giving the item',
        ),
      )
    }

    // Check if giver and receiver are different people
    if (this.personId === this.payload.toPersonId) {
      errors.push(
        this.createError(
          'SELF_GIVE',
          'Cannot give an item to oneself',
          [this.personId],
          'Choose a different recipient for the item',
        ),
      )
    }

    return errors.length > 0 ? this.createInvalidResult(errors) : this.createValidResult()
  }

  applyPostconditions(state: WorldState): WorldState {
    const newState = this.cloneWorldState(state)

    // Transfer item ownership to receiver
    this.transferItemOwnership(newState, this.payload.itemId, this.payload.toPersonId)

    // Update timestamp
    newState.timestamp = this.timestamp

    return newState
  }

  getAffectedEntities(): EntityId[] {
    return [this.personId, this.payload.toPersonId, this.payload.itemId]
  }

  // Getter methods for payload data
  getItemId(): EntityId {
    return this.payload.itemId
  }

  getToPersonId(): EntityId {
    return this.payload.toPersonId
  }
}
