/**
 * MoveAct - Represents a person moving from one location to another
 */

import { BaseAct } from './BaseAct'
import type { WorldState, ValidationResult, MovePayload, EntityId } from '../../../types/causality'

export class MoveAct extends BaseAct {
  private payload: MovePayload

  constructor(id: EntityId, personId: EntityId, timestamp: number, payload: MovePayload) {
    const description = `Move from location ${payload.fromLocationId} to ${payload.toLocationId}`
    super(id, 'MOVE', personId, timestamp, description)
    this.payload = payload
  }

  checkPreconditions(state: WorldState): ValidationResult {
    const errors = []

    // Check if person exists in the world state
    if (!(this.personId in state.personPositions)) {
      errors.push(
        this.createError(
          'PERSON_NOT_FOUND',
          `Person ${this.personId} not found in world state`,
          [this.personId],
          'Ensure the person exists before attempting to move them',
        ),
      )
    } else {
      // Check if person is at the expected starting location
      const currentLocation = state.personPositions[this.personId]
      if (currentLocation !== this.payload.fromLocationId) {
        errors.push(
          this.createError(
            'WRONG_STARTING_LOCATION',
            `Person ${this.personId} is at location ${currentLocation}, not ${this.payload.fromLocationId}`,
            [this.personId, currentLocation, this.payload.fromLocationId],
            `Update the act to move from location ${currentLocation} instead`,
          ),
        )
      }
    }

    // TODO: Check if locations are connected (requires location connection data)
    // This will be implemented when we have access to location connection information

    return errors.length > 0 ? this.createInvalidResult(errors) : this.createValidResult()
  }

  applyPostconditions(state: WorldState): WorldState {
    const newState = this.cloneWorldState(state)

    // Update person's position
    this.updatePersonPosition(newState, this.personId, this.payload.toLocationId)

    // Update timestamp
    newState.timestamp = this.timestamp

    return newState
  }

  getAffectedEntities(): EntityId[] {
    return [this.personId, this.payload.fromLocationId, this.payload.toLocationId]
  }

  // Getter methods for payload data
  getFromLocationId(): EntityId {
    return this.payload.fromLocationId
  }

  getToLocationId(): EntityId {
    return this.payload.toLocationId
  }
}
