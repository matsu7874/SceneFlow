/**
 * SpeakAct - Represents sharing information between people
 */

import { BaseAct } from './BaseAct'
import type { WorldState, ValidationResult, SpeakPayload, EntityId } from '../../../types/causality'

export class SpeakAct extends BaseAct {
  private payload: SpeakPayload

  constructor(id: EntityId, personId: EntityId, timestamp: number, payload: SpeakPayload) {
    const recipientsList = payload.toPersonIds.join(', ')
    const description = `Share information ${payload.informationId} with ${recipientsList}`
    super(id, 'SPEAK', personId, timestamp, description)
    this.payload = payload
  }

  checkPreconditions(state: WorldState): ValidationResult {
    const errors = []

    // Check if speaker exists
    if (!(this.personId in state.personPositions)) {
      errors.push(
        this.createError(
          'SPEAKER_NOT_FOUND',
          `Speaker ${this.personId} not found in world state`,
          [this.personId],
          'Ensure the speaker exists before attempting to share information',
        ),
      )
      return this.createInvalidResult(errors)
    }

    // Check if speaker knows the information
    if (!this.doesPersonKnow(state, this.personId, this.payload.informationId)) {
      errors.push(
        this.createError(
          'SPEAKER_LACKS_KNOWLEDGE',
          `Speaker ${this.personId} does not know information ${this.payload.informationId}`,
          [this.personId, this.payload.informationId],
          'The speaker must know the information before sharing it',
        ),
      )
    }

    // Get speaker's location
    const speakerLocation = state.personPositions[this.personId]

    // Check each recipient
    for (const recipientId of this.payload.toPersonIds) {
      // Check if recipient exists
      if (!(recipientId in state.personPositions)) {
        errors.push(
          this.createError(
            'RECIPIENT_NOT_FOUND',
            `Recipient ${recipientId} not found in world state`,
            [recipientId],
            'Ensure all recipients exist',
          ),
        )
        continue
      }

      // Check if recipient is at the same location as speaker
      const recipientLocation = state.personPositions[recipientId]
      if (recipientLocation !== speakerLocation) {
        errors.push(
          this.createError(
            'RECIPIENT_NOT_PRESENT',
            `Recipient ${recipientId} is at location ${recipientLocation}, not with speaker at ${speakerLocation}`,
            [recipientId, speakerLocation, recipientLocation],
            'All recipients must be at the same location as the speaker',
          ),
        )
      }

      // Check if trying to speak to oneself
      if (recipientId === this.personId) {
        errors.push(
          this.createError(
            'SELF_SPEAK',
            'Cannot speak information to oneself',
            [this.personId],
            'Choose different recipients for the information',
          ),
        )
      }
    }

    return errors.length > 0 ? this.createInvalidResult(errors) : this.createValidResult()
  }

  applyPostconditions(state: WorldState): WorldState {
    const newState = this.cloneWorldState(state)

    // Add knowledge to all recipients
    for (const recipientId of this.payload.toPersonIds) {
      // Skip if recipient doesn't exist (shouldn't happen if preconditions passed)
      if (!(recipientId in state.personPositions)) continue

      this.addKnowledge(newState, recipientId, this.payload.informationId)
    }

    // Update timestamp
    newState.timestamp = this.timestamp

    return newState
  }

  getAffectedEntities(): EntityId[] {
    return [this.personId, ...this.payload.toPersonIds, this.payload.informationId]
  }

  // Getter methods for payload data
  getToPersonIds(): EntityId[] {
    return this.payload.toPersonIds
  }

  getInformationId(): EntityId {
    return this.payload.informationId
  }
}
