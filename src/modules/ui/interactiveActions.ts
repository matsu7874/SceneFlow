/**
 * Interactive Actions Module
 *
 * Integrates drag & drop with the causality engine for real-time validation
 */

import type { WorldState, EntityId, Act } from '../../types/causality'
import { MoveAct, GiveItemAct, PlaceItemAct } from '../causality/acts'
import { CausalityEngine } from '../causality/engine'
import {
  DragDropManager,
  DragType,
  DropTargetType,
  type DragData,
  type DropTarget,
} from './dragDrop'

/**
 * Action validation result
 */
export interface ActionValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  act?: Act
}

/**
 * Interactive actions controller
 */
export class InteractiveActionsController {
  private engine: CausalityEngine
  private dragDropManager: DragDropManager
  private currentWorldState: WorldState
  private validationCallbacks: ((validation: ActionValidation) => void)[] = []

  constructor(engine: CausalityEngine, initialState: WorldState) {
    this.engine = engine
    this.currentWorldState = initialState
    this.dragDropManager = new DragDropManager()

    this.setupDragDropHandlers()
  }

  /**
   * Update the current world state
   */
  updateWorldState(state: WorldState): void {
    this.currentWorldState = state
  }

  /**
   * Get the drag drop manager
   */
  getDragDropManager(): DragDropManager {
    return this.dragDropManager
  }

  /**
   * Register a validation callback
   */
  onValidation(callback: (validation: ActionValidation) => void): void {
    this.validationCallbacks.push(callback)
  }

  /**
   * Setup drag and drop handlers
   */
  private setupDragDropHandlers(): void {
    // Person to Location (Move)
    this.dragDropManager.registerValidationHandler(
      `${DragType.PERSON}_TO_${DropTargetType.LOCATION}`,
      (data, target) => this.validatePersonMove(data, target).valid,
    )

    this.dragDropManager.registerDropHandler(
      `${DragType.PERSON}_TO_${DropTargetType.LOCATION}`,
      (data, target) => this.handlePersonMove(data, target),
    )

    // Item to Person (Give)
    this.dragDropManager.registerValidationHandler(
      `${DragType.ITEM}_TO_${DropTargetType.PERSON}`,
      (data, target) => this.validateItemGive(data, target).valid,
    )

    this.dragDropManager.registerDropHandler(
      `${DragType.ITEM}_TO_${DropTargetType.PERSON}`,
      (data, target) => this.handleItemGive(data, target),
    )

    // Item to Location (Place)
    this.dragDropManager.registerValidationHandler(
      `${DragType.ITEM}_TO_${DropTargetType.LOCATION}`,
      (data, target) => this.validateItemPlace(data, target).valid,
    )

    this.dragDropManager.registerDropHandler(
      `${DragType.ITEM}_TO_${DropTargetType.LOCATION}`,
      (data, target) => this.handleItemPlace(data, target),
    )
  }

  /**
   * Validate person move
   */
  private validatePersonMove(data: DragData, target: DropTarget): ActionValidation {
    if (!data.sourceLocation) {
      return {
        valid: false,
        errors: ['Person location unknown'],
        warnings: [],
      }
    }

    const act = new MoveAct(
      `temp-move-${Date.now()}`,
      data.entityId,
      this.currentWorldState.timestamp + 1,
      {
        fromLocationId: data.sourceLocation,
        toLocationId: target.entityId,
      },
    )

    const validation = act.checkPreconditions(this.currentWorldState)

    const result: ActionValidation = {
      valid: validation.valid,
      errors: validation.errors.map(e => e.message),
      warnings: [],
      act: validation.valid ? act : undefined,
    }

    this.notifyValidation(result)
    return result
  }

  /**
   * Handle person move
   */
  private handlePersonMove(data: DragData, target: DropTarget): void {
    const validation = this.validatePersonMove(data, target)

    if (validation.valid && validation.act) {
      const result = this.engine.addAct(validation.act)

      if (result.valid) {
        // Update world state
        this.currentWorldState = validation.act.applyPostconditions(this.currentWorldState)

        // Notify success
        this.notifyValidation({
          valid: true,
          errors: [],
          warnings: [],
          act: validation.act,
        })
      }
    }
  }

  /**
   * Validate item give
   */
  private validateItemGive(data: DragData, target: DropTarget): ActionValidation {
    if (!data.sourceOwner) {
      return {
        valid: false,
        errors: ['Item owner unknown'],
        warnings: [],
      }
    }

    const act = new GiveItemAct(
      `temp-give-${Date.now()}`,
      data.sourceOwner,
      this.currentWorldState.timestamp + 1,
      {
        itemId: data.entityId,
        toPersonId: target.entityId,
      },
    )

    const validation = act.checkPreconditions(this.currentWorldState)

    const result: ActionValidation = {
      valid: validation.valid,
      errors: validation.errors.map(e => e.message),
      warnings: [],
      act: validation.valid ? act : undefined,
    }

    this.notifyValidation(result)
    return result
  }

  /**
   * Handle item give
   */
  private handleItemGive(data: DragData, target: DropTarget): void {
    const validation = this.validateItemGive(data, target)

    if (validation.valid && validation.act) {
      const result = this.engine.addAct(validation.act)

      if (result.valid) {
        this.currentWorldState = validation.act.applyPostconditions(this.currentWorldState)

        this.notifyValidation({
          valid: true,
          errors: [],
          warnings: [],
          act: validation.act,
        })
      }
    }
  }

  /**
   * Validate item place
   */
  private validateItemPlace(data: DragData, target: DropTarget): ActionValidation {
    // First check if we need to take the item
    if (data.sourceLocation && !data.sourceOwner) {
      // Item is already at a location, can't place it elsewhere
      return {
        valid: false,
        errors: ['Item is already placed at a location'],
        warnings: [],
      }
    }

    if (!data.sourceOwner) {
      return {
        valid: false,
        errors: ['Item owner unknown'],
        warnings: [],
      }
    }

    const act = new PlaceItemAct(
      `temp-place-${Date.now()}`,
      data.sourceOwner,
      this.currentWorldState.timestamp + 1,
      {
        itemId: data.entityId,
        locationId: target.entityId,
      },
    )

    const validation = act.checkPreconditions(this.currentWorldState)

    const result: ActionValidation = {
      valid: validation.valid,
      errors: validation.errors.map(e => e.message),
      warnings: [],
      act: validation.valid ? act : undefined,
    }

    this.notifyValidation(result)
    return result
  }

  /**
   * Handle item place
   */
  private handleItemPlace(data: DragData, target: DropTarget): void {
    const validation = this.validateItemPlace(data, target)

    if (validation.valid && validation.act) {
      const result = this.engine.addAct(validation.act)

      if (result.valid) {
        this.currentWorldState = validation.act.applyPostconditions(this.currentWorldState)

        this.notifyValidation({
          valid: true,
          errors: [],
          warnings: [],
          act: validation.act,
        })
      }
    }
  }

  /**
   * Check if an act can be executed
   */
  canExecuteAct(act: Act): ActionValidation {
    const validation = act.checkPreconditions(this.currentWorldState)

    const result: ActionValidation = {
      valid: validation.valid,
      errors: validation.errors.map(e => e.message),
      warnings: validation.errors
        .filter(e => e.suggestion)
        .map(e => e.suggestion || ''),
      act: validation.valid ? act : undefined,
    }

    this.notifyValidation(result)
    return result
  }

  /**
   * Execute an act
   */
  executeAct(act: Act): boolean {
    // First check preconditions against current state
    const preCheck = act.checkPreconditions(this.currentWorldState)

    if (!preCheck.valid) {
      this.notifyValidation({
        valid: false,
        errors: preCheck.errors.map(e => e.message),
        warnings: [],
        act,
      })
      return false
    }

    const result = this.engine.addAct(act)

    if (result.valid) {
      this.currentWorldState = act.applyPostconditions(this.currentWorldState)

      this.notifyValidation({
        valid: true,
        errors: [],
        warnings: [],
        act,
      })

      return true
    }

    this.notifyValidation({
      valid: false,
      errors: result.errors.map(e => e.message),
      warnings: [],
      act,
    })

    return false
  }

  /**
   * Get available actions for an entity
   */
  getAvailableActions(entityType: 'person' | 'item', entityId: EntityId): Act[] {
    const actions: Act[] = []
    const timestamp = this.currentWorldState.timestamp + 1

    if (entityType === 'person') {
      // Get current location
      const currentLocation = this.currentWorldState.personPositions[entityId]

      if (currentLocation) {
        // Check moves to other locations
        Object.keys(this.currentWorldState.personPositions).forEach(personId => {
          if (personId !== entityId) {
            const targetLocation = this.currentWorldState.personPositions[personId]
            if (targetLocation && targetLocation !== currentLocation) {
              const moveAct = new MoveAct(
                `move-${entityId}-to-${targetLocation}`,
                entityId,
                timestamp,
                {
                  fromLocationId: currentLocation,
                  toLocationId: targetLocation,
                },
              )

              if (this.canExecuteAct(moveAct).valid) {
                actions.push(moveAct)
              }
            }
          }
        })

        // Check item actions
        Object.entries(this.currentWorldState.itemOwnership).forEach(([itemId, ownerId]) => {
          if (ownerId === entityId) {
            // Can give items to others at same location
            Object.entries(this.currentWorldState.personPositions).forEach(([personId, location]) => {
              if (personId !== entityId && location === currentLocation) {
                const giveAct = new GiveItemAct(
                  `give-${itemId}-to-${personId}`,
                  entityId,
                  timestamp,
                  {
                    itemId,
                    toPersonId: personId,
                  },
                )

                if (this.canExecuteAct(giveAct).valid) {
                  actions.push(giveAct)
                }
              }
            })
          }
        })
      }
    }

    return actions
  }

  /**
   * Notify validation callbacks
   */
  private notifyValidation(validation: ActionValidation): void {
    this.validationCallbacks.forEach(callback => callback(validation))
  }
}