/**
 * CombineItemsAct - Represents combining two or more items
 */

import { BaseAct } from './BaseAct'
import type {
  WorldState,
  ValidationResult,
  EntityId,
  CombineItemsPayload,
} from '../../../types/causality'

export class CombineItemsAct extends BaseAct {
  private payload: CombineItemsPayload

  constructor(id: EntityId, personId: EntityId, timestamp: number, payload: CombineItemsPayload) {
    const itemsList = payload.itemIds.join(' + ')
    const description = `Combine items: ${itemsList}`
    super(id, 'COMBINE_ITEMS', personId, timestamp, description)
    this.payload = payload
  }

  checkPreconditions(state: WorldState): ValidationResult {
    const errors = []

    // Check if combiner exists
    if (!(this.personId in state.personPositions)) {
      errors.push(
        this.createError(
          'COMBINER_NOT_FOUND',
          `Person ${this.personId} not found in world state`,
          [this.personId],
          'Ensure the person exists before attempting to combine items',
        ),
      )
      return this.createInvalidResult(errors)
    }

    // Validate minimum items
    if (this.payload.itemIds.length < 2) {
      errors.push(
        this.createError(
          'INSUFFICIENT_ITEMS',
          'At least 2 items are required for combination',
          this.payload.itemIds,
          'Provide at least 2 items to combine',
        ),
      )
      return this.createInvalidResult(errors)
    }

    // Check for duplicate items
    const uniqueItems = new Set(this.payload.itemIds)
    if (uniqueItems.size !== this.payload.itemIds.length) {
      errors.push(
        this.createError(
          'DUPLICATE_ITEMS',
          'Cannot combine the same item with itself',
          this.payload.itemIds,
          'Each item in the combination must be unique',
        ),
      )
    }

    // Check each item
    for (const itemId of this.payload.itemIds) {
      // Check if person owns the item
      if (!this.doesPersonOwnItem(state, this.personId, itemId)) {
        const currentOwner = state.itemOwnership[itemId]
        const itemLocation = state.itemLocations[itemId]

        errors.push(
          this.createError(
            'ITEM_NOT_OWNED',
            `Person ${this.personId} does not own item ${itemId}`,
            [this.personId, itemId],
            currentOwner
              ? `Item is currently owned by ${currentOwner}`
              : itemLocation
                ? `Item is at location ${itemLocation}`
                : 'Item ownership is unknown',
          ),
        )
      }
    }

    // TODO: Check if items can be combined when we have extended props
    // This would validate:
    // - Items have isCombineable = true
    // - Items are compatible (using combinesWith arrays)
    // - Any other combination constraints

    return errors.length > 0 ? this.createInvalidResult(errors) : this.createValidResult()
  }

  applyPostconditions(state: WorldState): WorldState {
    const newState = this.cloneWorldState(state)

    // TODO: Implement actual combination logic when we have extended props
    // For now, this is a placeholder that:
    // - Removes the combined items from ownership
    // - Would create a new combined item

    // Remove combined items from ownership (they are consumed)
    for (const itemId of this.payload.itemIds) {
      delete newState.itemOwnership[itemId]
      delete newState.itemLocations[itemId]
    }

    // TODO: Create the result item and give it to the person
    // if (this.payload.resultItemId) {
    //   newState.itemOwnership[this.payload.resultItemId] = this.personId
    // }

    // Update timestamp
    newState.timestamp = this.timestamp

    return newState
  }

  getAffectedEntities(): EntityId[] {
    const entities = [this.personId, ...this.payload.itemIds]

    if (this.payload.resultItemId) {
      entities.push(this.payload.resultItemId)
    }

    return entities
  }

  // Getter methods for payload data
  getItemIds(): EntityId[] {
    return this.payload.itemIds
  }

  getResultItemId(): EntityId | undefined {
    return this.payload.resultItemId
  }
}
