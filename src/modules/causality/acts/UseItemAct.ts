/**
 * UseItemAct - Represents using an item
 */

import { BaseAct } from './BaseAct'
import type {
  WorldState,
  ValidationResult,
  EntityId,
  UseItemPayload,
} from '../../../types/causality'

export class UseItemAct extends BaseAct {
  private payload: UseItemPayload

  constructor(id: EntityId, personId: EntityId, timestamp: number, payload: UseItemPayload) {
    const targetDesc = payload.targetId ? ` on ${payload.targetType} ${payload.targetId}` : ''
    const description = `Use item ${payload.itemId}${targetDesc}`
    super(id, 'USE_ITEM', personId, timestamp, description)
    this.payload = payload
  }

  checkPreconditions(state: WorldState): ValidationResult {
    const errors = []

    // Check if user exists
    if (!(this.personId in state.personPositions)) {
      errors.push(
        this.createError(
          'USER_NOT_FOUND',
          `User ${this.personId} not found in world state`,
          [this.personId],
          'Ensure the user exists before attempting to use an item',
        ),
      )
      return this.createInvalidResult(errors)
    }

    // Check if user owns the item
    if (!this.doesPersonOwnItem(state, this.personId, this.payload.itemId)) {
      const currentOwner = state.itemOwnership[this.payload.itemId]
      const itemLocation = state.itemLocations[this.payload.itemId]

      errors.push(
        this.createError(
          'ITEM_NOT_OWNED',
          `Person ${this.personId} does not own item ${this.payload.itemId}`,
          [this.personId, this.payload.itemId],
          currentOwner
            ? `Item is currently owned by ${currentOwner}`
            : itemLocation
              ? `Item is at location ${itemLocation}`
              : 'Item ownership is unknown',
        ),
      )
    }

    // If there's a target, validate it
    if (this.payload.targetId && this.payload.targetType) {
      const userLocation = state.personPositions[this.personId]

      switch (this.payload.targetType) {
      case 'person': {
        // Check if target person exists
        if (!(this.payload.targetId in state.personPositions)) {
          errors.push(
            this.createError(
              'TARGET_PERSON_NOT_FOUND',
              `Target person ${this.payload.targetId} not found`,
              [this.payload.targetId],
              'Ensure the target person exists',
            ),
          )
        } else {
          // Check if target person is at the same location
          const targetLocation = state.personPositions[this.payload.targetId]
          if (targetLocation !== userLocation) {
            errors.push(
              this.createError(
                'TARGET_NOT_PRESENT',
                `Target person ${this.payload.targetId} is at location ${targetLocation}, not with user at ${userLocation}`,
                [this.payload.targetId, userLocation, targetLocation],
                'The target person must be at the same location',
              ),
            )
          }
        }
        break
      }

      case 'item': {
        // Check if target item exists and is accessible
        const targetOwner = state.itemOwnership[this.payload.targetId]
        const targetLocation = state.itemLocations[this.payload.targetId]

        if (!targetOwner && !targetLocation) {
          errors.push(
            this.createError(
              'TARGET_ITEM_NOT_FOUND',
              `Target item ${this.payload.targetId} not found`,
              [this.payload.targetId],
              'Ensure the target item exists',
            ),
          )
        } else if (targetOwner && targetOwner !== this.personId) {
          // Can't use item on something someone else owns
          errors.push(
            this.createError(
              'TARGET_ITEM_NOT_ACCESSIBLE',
              `Target item ${this.payload.targetId} is owned by ${targetOwner}`,
              [this.payload.targetId, targetOwner],
              'The target item must be accessible (owned by you or at your location)',
            ),
          )
        } else if (targetLocation && targetLocation !== userLocation) {
          // Can't use item on something at a different location
          errors.push(
            this.createError(
              'TARGET_ITEM_NOT_HERE',
              `Target item ${this.payload.targetId} is at location ${targetLocation}, not at ${userLocation}`,
              [this.payload.targetId, targetLocation, userLocation],
              'The target item must be at your location',
            ),
          )
        }
        break
      }

      case 'location': {
        // Check if using item at current location
        if (this.payload.targetId !== userLocation) {
          errors.push(
            this.createError(
              'WRONG_LOCATION',
              `Cannot use item at location ${this.payload.targetId} while at ${userLocation}`,
              [this.payload.targetId, userLocation],
              'You must be at the target location to use the item there',
            ),
          )
        }
        break
      }
      }
    }

    // TODO: Check item-specific usage constraints when we have extended props

    return errors.length > 0 ? this.createInvalidResult(errors) : this.createValidResult()
  }

  applyPostconditions(state: WorldState): WorldState {
    const newState = this.cloneWorldState(state)

    // TODO: Implement actual item usage effects when we have extended props
    // For now, this is a placeholder that doesn't change the state
    // In a full implementation, this would:
    // - Check if item is consumable and remove it
    // - Apply item-specific effects
    // - Create new items if applicable
    // - Modify target state if applicable

    // Update timestamp
    newState.timestamp = this.timestamp

    return newState
  }

  getAffectedEntities(): EntityId[] {
    const entities = [this.personId, this.payload.itemId]

    if (this.payload.targetId) {
      entities.push(this.payload.targetId)
    }

    return entities
  }

  // Getter methods for payload data
  getItemId(): EntityId {
    return this.payload.itemId
  }

  getTargetId(): EntityId | undefined {
    return this.payload.targetId
  }

  getTargetType(): string | undefined {
    return this.payload.targetType
  }
}
