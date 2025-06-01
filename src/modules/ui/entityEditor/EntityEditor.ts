/**
 * Advanced Entity Editor
 *
 * Form-based UI for editing entities with validation and relationship management
 */

import type { EntityId } from '../../../types/causality'
import type {} from '../../../types/extendedEntities'
import { PropCategory, InformationCategory } from '../../../types/extendedEntities'
import { VisualFeedbackManager, FeedbackType } from '../visualFeedback'

/**
 * Base entity interface for editing
 */
export interface BaseEntity {
  id: EntityId
  name: string
  description?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

/**
 * Person entity for editing
 */
export interface PersonEntity extends BaseEntity {
  type: 'person'
  currentLocation?: EntityId
  attributes?: {
    personality?: string[]
    skills?: string[]
    relationships?: Record<EntityId, string>
  }
}

/**
 * Location entity for editing
 */
export interface LocationEntity extends BaseEntity {
  type: 'location'
  connections?: EntityId[]
  capacity?: number
  attributes?: {
    environment?: string
    accessibility?: string[]
    specialFeatures?: string[]
  }
}

/**
 * Item entity for editing
 */
export interface ItemEntity extends BaseEntity {
  type: 'item'
  category?: PropCategory
  owner?: EntityId
  location?: EntityId
  attributes?: {
    weight?: number
    size?: string
    durability?: number
    specialProperties?: string[]
  }
}

/**
 * Information entity for editing
 */
export interface InformationEntity extends BaseEntity {
  type: 'information'
  category?: InformationCategory
  content: string
  source?: EntityId
  reliability?: number
  attributes?: {
    visibility?: 'public' | 'private' | 'secret'
    expiresAt?: number
    relatedEntities?: EntityId[]
  }
}

/**
 * Union type for all editable entities
 */
export type EditableEntity = PersonEntity | LocationEntity | ItemEntity | InformationEntity

/**
 * Validation result for entity editing
 */
export interface EntityValidationResult {
  valid: boolean
  errors: Array<{
    field: string
    message: string
    severity: 'error' | 'warning'
  }>
}

/**
 * Entity editor configuration
 */
export interface EntityEditorConfig {
  allowedEntityTypes: Array<EditableEntity['type']>
  requiredFields: Record<string, string[]>
  customValidators: Record<string, (value: unknown) => string | null>
  fieldGroups: Array<{
    name: string
    fields: string[]
    collapsible?: boolean
    defaultOpen?: boolean
  }>
}

/**
 * Entity change event
 */
export interface EntityChangeEvent {
  entity: EditableEntity
  field: string
  oldValue: unknown
  newValue: unknown
  isValid: boolean
}

/**
 * Advanced entity editor with form-based UI and validation
 */
export class EntityEditor {
  private container: HTMLElement
  private feedbackManager: VisualFeedbackManager
  private config: EntityEditorConfig
  private currentEntity: EditableEntity | null = null
  private formElements: Map<string, HTMLElement> = new Map()
  private validators: Map<string, (value: unknown) => string | null> = new Map()

  // Callbacks
  private onEntityChange?: (event: EntityChangeEvent) => void
  private onEntitySave?: (entity: EditableEntity) => void
  private onEntityDelete?: (entityId: EntityId) => void

  // Available entities for relationship editing
  private availableEntities: Map<EntityId, EditableEntity> = new Map()

  constructor(
    container: HTMLElement,
    config?: Partial<EntityEditorConfig>,
    feedbackManager?: VisualFeedbackManager,
  ) {
    this.container = container
    this.feedbackManager = feedbackManager || new VisualFeedbackManager(container)
    this.config = this.mergeConfig(config)

    this.setupValidators()
    this.render()
  }

  /**
   * Merge user config with defaults
   */
  private mergeConfig(userConfig?: Partial<EntityEditorConfig>): EntityEditorConfig {
    const defaultConfig: EntityEditorConfig = {
      allowedEntityTypes: ['person', 'location', 'item', 'information'],
      requiredFields: {
        person: ['id', 'name'],
        location: ['id', 'name'],
        item: ['id', 'name'],
        information: ['id', 'name', 'content'],
      },
      customValidators: {},
      fieldGroups: [
        {
          name: 'Basic Information',
          fields: ['id', 'name', 'description', 'capacity', 'category'],
          defaultOpen: true,
        },
        {
          name: 'Content',
          fields: ['content', 'source', 'reliability'],
          collapsible: true,
          defaultOpen: false,
        },
        {
          name: 'Attributes',
          fields: ['attributes', 'currentLocation'],
          collapsible: true,
          defaultOpen: false,
        },
        {
          name: 'Relationships',
          fields: ['relationships', 'connections', 'owner', 'location'],
          collapsible: true,
          defaultOpen: false,
        },
        {
          name: 'Metadata',
          fields: ['tags', 'metadata'],
          collapsible: true,
          defaultOpen: false,
        },
      ],
    }

    return {
      ...defaultConfig,
      ...userConfig,
      requiredFields: { ...defaultConfig.requiredFields, ...userConfig?.requiredFields },
      customValidators: { ...defaultConfig.customValidators, ...userConfig?.customValidators },
      fieldGroups: userConfig?.fieldGroups || defaultConfig.fieldGroups,
    }
  }

  /**
   * Setup built-in validators
   */
  private setupValidators(): void {
    // ID validator
    this.validators.set('id', value => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return 'ID is required and must be a non-empty string'
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        return 'ID can only contain letters, numbers, underscores, and hyphens'
      }
      return null
    })

    // Name validator
    this.validators.set('name', value => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return 'Name is required'
      }
      if (value.length > 100) {
        return 'Name must be 100 characters or less'
      }
      return null
    })

    // Content validator (for information entities)
    this.validators.set('content', value => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return 'Content is required for information entities'
      }
      return null
    })

    // Add custom validators from config
    Object.entries(this.config.customValidators).forEach(([field, validator]) => {
      this.validators.set(field, validator)
    })
  }

  /**
   * Set the entity to edit
   */
  setEntity(entity: EditableEntity | null): void {
    this.currentEntity = entity
    this.render()
  }

  /**
   * Get the current entity
   */
  getEntity(): EditableEntity | null {
    return this.currentEntity
  }

  /**
   * Set available entities for relationship editing
   */
  setAvailableEntities(entities: EditableEntity[]): void {
    this.availableEntities.clear()
    entities.forEach(entity => {
      this.availableEntities.set(entity.id, entity)
    })

    // Re-render relationship fields if current entity exists
    if (this.currentEntity) {
      this.renderRelationshipFields()
    }
  }

  /**
   * Create a new entity of the specified type
   */
  createEntity(type: EditableEntity['type']): EditableEntity {
    const baseEntity = {
      id: `new-${type}-${Date.now()}`,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      description: '',
      tags: [],
      metadata: {},
    }

    switch (type) {
      case 'person':
        return {
          ...baseEntity,
          type: 'person',
          attributes: {
            personality: [],
            skills: [],
            relationships: {},
          },
        } as PersonEntity

      case 'location':
        return {
          ...baseEntity,
          type: 'location',
          connections: [],
          capacity: 10,
          attributes: {
            environment: '',
            accessibility: [],
            specialFeatures: [],
          },
        } as LocationEntity

      case 'item':
        return {
          ...baseEntity,
          type: 'item',
          category: PropCategory.SMALL_PROP,
          attributes: {
            weight: 1,
            size: 'small',
            durability: 100,
            specialProperties: [],
          },
        } as ItemEntity

      case 'information':
        return {
          ...baseEntity,
          type: 'information',
          category: InformationCategory.FACT,
          content: '',
          reliability: 1.0,
          attributes: {
            visibility: 'public',
            relatedEntities: [],
          },
        } as InformationEntity

      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unknown entity type: ${type}`)
    }
  }

  /**
   * Validate the current entity
   */
  validateEntity(entity?: EditableEntity): EntityValidationResult {
    const targetEntity = entity ?? this.currentEntity
    if (!targetEntity) {
      return {
        valid: false,
        errors: [{ field: 'entity', message: 'No entity to validate', severity: 'error' }],
      }
    }

    const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = []
    const requiredFields = this.config.requiredFields[targetEntity.type] || []

    // Check required fields
    requiredFields.forEach(field => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const value = (targetEntity as unknown as Record<string, unknown>)[field]
      if (value === undefined || value === null || value === '') {
        errors.push({
          field,
          message: `${field} is required`,
          severity: 'error',
        })
      }
    })

    // Run validators
    Object.entries(targetEntity).forEach(([field, value]) => {
      const validator = this.validators.get(field)
      if (validator) {
        const error = validator(value)
        if (error) {
          errors.push({
            field,
            message: error,
            severity: 'error',
          })
        }
      }
    })

    // Type-specific validation
    this.validateEntitySpecific(targetEntity, errors)

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
    }
  }

  /**
   * Type-specific validation
   */
  private validateEntitySpecific(
    entity: EditableEntity,
    errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>,
  ): void {
    switch (entity.type) {
      case 'person':
        if (entity.currentLocation && !this.availableEntities.has(entity.currentLocation)) {
          errors.push({
            field: 'currentLocation',
            message: 'Referenced location does not exist',
            severity: 'warning',
          })
        }
        break

      case 'location':
        if (entity.connections) {
          entity.connections.forEach(connectionId => {
            if (!this.availableEntities.has(connectionId)) {
              errors.push({
                field: 'connections',
                message: `Connected location ${connectionId} does not exist`,
                severity: 'warning',
              })
            }
          })
        }
        break

      case 'item':
        if (entity.owner && !this.availableEntities.has(entity.owner)) {
          errors.push({
            field: 'owner',
            message: 'Referenced owner does not exist',
            severity: 'warning',
          })
        }
        if (entity.location && !this.availableEntities.has(entity.location)) {
          errors.push({
            field: 'location',
            message: 'Referenced location does not exist',
            severity: 'warning',
          })
        }
        break

      case 'information':
        if (entity.source && !this.availableEntities.has(entity.source)) {
          errors.push({
            field: 'source',
            message: 'Referenced source does not exist',
            severity: 'warning',
          })
        }
        if (
          entity.reliability !== undefined &&
          (entity.reliability < 0 || entity.reliability > 1)
        ) {
          errors.push({
            field: 'reliability',
            message: 'Reliability must be between 0 and 1',
            severity: 'error',
          })
        }
        break
    }
  }

  /**
   * Register event callbacks
   */
  setOnEntityChange(callback: (event: EntityChangeEvent) => void): void {
    this.onEntityChange = callback
  }

  setOnEntitySave(callback: (entity: EditableEntity) => void): void {
    this.onEntitySave = callback
  }

  setOnEntityDelete(callback: (entityId: EntityId) => void): void {
    this.onEntityDelete = callback
  }

  /**
   * Render the entity editor
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="entity-editor">
        <div class="entity-editor-header">
          <div class="entity-type-selector">
            <label for="entity-type-select">Entity Type:</label>
            <select id="entity-type-select" class="entity-type-select">
              <option value="">Select type...</option>
              ${this.config.allowedEntityTypes
                .map(
                  type =>
                    `<option value="${type}" ${this.currentEntity?.type === type ? 'selected' : ''}>
                  ${type.charAt(0).toUpperCase() + type.slice(1)}
                </option>`,
                )
                .join('')}
            </select>
            <button class="btn-new-entity" ${!this.getSelectedType() ? 'disabled' : ''}>
              New ${this.getSelectedType() || 'Entity'}
            </button>
          </div>
          <div class="entity-actions">
            <button class="btn-save-entity" ${!this.currentEntity ? 'disabled' : ''}>Save</button>
            <button class="btn-delete-entity" ${!this.currentEntity ? 'disabled' : ''}>Delete</button>
          </div>
        </div>
        <div class="entity-editor-content">
          ${this.currentEntity ? this.renderEntityForm() : this.renderEmptyState()}
        </div>
      </div>
    `

    this.setupEventHandlers()
  }

  /**
   * Get selected entity type from dropdown
   */
  private getSelectedType(): string {
    const select = this.container.querySelector('.entity-type-select') as HTMLSelectElement
    return select?.value || ''
  }

  /**
   * Render empty state when no entity is selected
   */
  private renderEmptyState(): string {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h3>No Entity Selected</h3>
        <p>Select an entity type and click "New" to create an entity, or load an existing entity to edit.</p>
      </div>
    `
  }

  /**
   * Render the entity form
   */
  private renderEntityForm(): string {
    if (!this.currentEntity) return ''

    return `
      <div class="entity-form">
        ${this.config.fieldGroups.map(group => this.renderFieldGroup(group)).join('')}
      </div>
    `
  }

  /**
   * Render a field group
   */
  private renderFieldGroup(group: {
    name: string
    fields: string[]
    collapsible?: boolean
    defaultOpen?: boolean
  }): string {
    const isOpen = group.defaultOpen !== false
    const relevantFields = group.fields.filter(field => this.isFieldRelevant(field))

    if (relevantFields.length === 0) return ''

    return `
      <div class="field-group ${group.collapsible ? 'collapsible' : ''} ${isOpen ? 'open' : ''}">
        <div class="field-group-header" ${group.collapsible ? 'data-collapsible="true"' : ''}>
          <h4>${group.name}</h4>
          ${group.collapsible ? '<span class="collapse-icon">▼</span>' : ''}
        </div>
        <div class="field-group-content">
          ${relevantFields.map(field => this.renderField(field)).join('')}
        </div>
      </div>
    `
  }

  /**
   * Check if a field is relevant for the current entity type
   */
  private isFieldRelevant(field: string): boolean {
    if (!this.currentEntity) return false

    const entity = this.currentEntity

    // Basic fields are always relevant
    if (['id', 'name', 'description', 'tags', 'metadata'].includes(field)) {
      return true
    }

    // Type-specific fields
    switch (entity.type) {
      case 'person':
        return ['currentLocation', 'attributes'].includes(field) || field === 'relationships'
      case 'location':
        return ['connections', 'capacity', 'attributes'].includes(field)
      case 'item':
        return ['category', 'owner', 'location', 'attributes'].includes(field)
      case 'information':
        return ['category', 'content', 'source', 'reliability', 'attributes'].includes(field)
      default:
        return false
    }
  }

  /**
   * Render a single field
   */
  private renderField(field: string): string {
    if (!this.currentEntity) return ''

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const value = (this.currentEntity as unknown as Record<string, unknown>)[field]
    const isRequired = this.config.requiredFields[this.currentEntity.type]?.includes(field) || false

    switch (field) {
      case 'id':
        return this.renderTextInput('id', 'ID', value as string, isRequired, true)
      case 'name':
        return this.renderTextInput('name', 'Name', value as string, isRequired)
      case 'description':
        return this.renderTextarea('description', 'Description', value as string)
      case 'tags':
        return this.renderTagsInput('tags', 'Tags', value as string[])
      case 'content':
        return this.renderTextarea('content', 'Content', value as string, isRequired)
      case 'category':
        return this.renderCategorySelect(field, 'Category', value as string)
      case 'currentLocation':
      case 'owner':
      case 'location':
      case 'source':
        return this.renderEntitySelect(field, this.formatFieldLabel(field), value as EntityId)
      case 'connections':
        return this.renderMultiEntitySelect(field, 'Connections', value as EntityId[])
      case 'capacity':
        return this.renderNumberInput('capacity', 'Capacity', value as number)
      case 'reliability':
        return this.renderRangeInput('reliability', 'Reliability', value as number, 0, 1, 0.1)
      case 'attributes':
        return this.renderAttributesEditor(field, value as Record<string, unknown>)
      case 'metadata':
        return this.renderMetadataEditor(field, value as Record<string, unknown>)
      default:
        return this.renderTextInput(field, this.formatFieldLabel(field), value as string)
    }
  }

  /**
   * Format field label
   */
  private formatFieldLabel(field: string): string {
    return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
  }

  /**
   * Render text input
   */
  private renderTextInput(
    field: string,
    label: string,
    value?: string,
    required = false,
    readonly = false,
  ): string {
    return `
      <div class="form-field">
        <label class="form-label" for="${field}">
          ${label}
          ${required ? '<span class="required">*</span>' : ''}
        </label>
        <input
          type="text"
          id="${field}"
          name="${field}"
          class="form-input"
          value="${value || ''}"
          ${required ? 'required' : ''}
          ${readonly ? 'readonly' : ''}
          data-field="${field}"
        />
        <div class="field-error" id="${field}-error"></div>
      </div>
    `
  }

  /**
   * Render textarea
   */
  private renderTextarea(field: string, label: string, value?: string, required = false): string {
    return `
      <div class="form-field">
        <label class="form-label" for="${field}">
          ${label}
          ${required ? '<span class="required">*</span>' : ''}
        </label>
        <textarea
          id="${field}"
          name="${field}"
          class="form-textarea"
          rows="3"
          ${required ? 'required' : ''}
          data-field="${field}"
        >${value || ''}</textarea>
        <div class="field-error" id="${field}-error"></div>
      </div>
    `
  }

  /**
   * Render number input
   */
  private renderNumberInput(
    field: string,
    label: string,
    value?: number,
    min?: number,
    max?: number,
  ): string {
    return `
      <div class="form-field">
        <label class="form-label" for="${field}">${label}</label>
        <input
          type="number"
          id="${field}"
          name="${field}"
          class="form-input"
          value="${value || ''}"
          ${min !== undefined ? `min="${min}"` : ''}
          ${max !== undefined ? `max="${max}"` : ''}
          data-field="${field}"
        />
        <div class="field-error" id="${field}-error"></div>
      </div>
    `
  }

  /**
   * Render range input
   */
  private renderRangeInput(
    field: string,
    label: string,
    value?: number,
    min = 0,
    max = 1,
    step = 0.1,
  ): string {
    return `
      <div class="form-field">
        <label class="form-label" for="${field}">${label}: <span id="${field}-value">${value || min}</span></label>
        <input
          type="range"
          id="${field}"
          name="${field}"
          class="form-range"
          value="${value || min}"
          min="${min}"
          max="${max}"
          step="${step}"
          data-field="${field}"
        />
        <div class="field-error" id="${field}-error"></div>
      </div>
    `
  }

  /**
   * Render category select
   */
  private renderCategorySelect(field: string, label: string, value?: string): string {
    let options = ''

    if (this.currentEntity?.type === 'item') {
      options = Object.values(PropCategory)
        .map(cat => `<option value="${cat}" ${value === cat ? 'selected' : ''}>${cat}</option>`)
        .join('')
    } else if (this.currentEntity?.type === 'information') {
      options = Object.values(InformationCategory)
        .map(cat => `<option value="${cat}" ${value === cat ? 'selected' : ''}>${cat}</option>`)
        .join('')
    }

    return `
      <div class="form-field">
        <label class="form-label" for="${field}">${label}</label>
        <select id="${field}" name="${field}" class="form-select" data-field="${field}">
          <option value="">Select category...</option>
          ${options}
        </select>
        <div class="field-error" id="${field}-error"></div>
      </div>
    `
  }

  /**
   * Render entity select (for single entity references)
   */
  private renderEntitySelect(field: string, label: string, value?: EntityId): string {
    const relevantEntities = this.getRelevantEntitiesForField(field)
    const options = relevantEntities
      .map(
        entity =>
          `<option value="${entity.id}" ${value === entity.id ? 'selected' : ''}>${entity.name} (${entity.type})</option>`,
      )
      .join('')

    return `
      <div class="form-field">
        <label class="form-label" for="${field}">${label}</label>
        <select id="${field}" name="${field}" class="form-select" data-field="${field}">
          <option value="">None</option>
          ${options}
        </select>
        <div class="field-error" id="${field}-error"></div>
      </div>
    `
  }

  /**
   * Render multi-entity select (for multiple entity references)
   */
  private renderMultiEntitySelect(field: string, label: string, values?: EntityId[]): string {
    const relevantEntities = this.getRelevantEntitiesForField(field)
    const currentValues = values || []

    return `
      <div class="form-field">
        <label class="form-label">${label}</label>
        <div class="multi-select-container">
          <div class="selected-entities" id="${field}-selected">
            ${currentValues
              .map(entityId => {
                const entity = this.availableEntities.get(entityId)
                return entity
                  ? `
                <span class="selected-entity" data-entity-id="${entityId}">
                  ${entity.name}
                  <button type="button" class="remove-entity" data-field="${field}" data-entity-id="${entityId}">×</button>
                </span>
              `
                  : ''
              })
              .join('')}
          </div>
          <select class="form-select add-entity-select" data-field="${field}">
            <option value="">Add entity...</option>
            ${relevantEntities
              .filter(entity => !currentValues.includes(entity.id))
              .map(
                entity => `<option value="${entity.id}">${entity.name} (${entity.type})</option>`,
              )
              .join('')}
          </select>
        </div>
        <div class="field-error" id="${field}-error"></div>
      </div>
    `
  }

  /**
   * Get relevant entities for a specific field
   */
  private getRelevantEntitiesForField(field: string): EditableEntity[] {
    const allEntities = Array.from(this.availableEntities.values())

    switch (field) {
      case 'currentLocation':
      case 'location':
        return allEntities.filter(e => e.type === 'location')
      case 'owner':
        return allEntities.filter(e => e.type === 'person')
      case 'source':
        return allEntities.filter(e => e.type === 'person')
      case 'connections':
        return allEntities.filter(e => e.type === 'location' && e.id !== this.currentEntity?.id)
      default:
        return allEntities
    }
  }

  /**
   * Render tags input
   */
  private renderTagsInput(field: string, label: string, values?: string[]): string {
    const currentTags = values || []

    return `
      <div class="form-field">
        <label class="form-label">${label}</label>
        <div class="tags-input-container">
          <div class="tags-display" id="${field}-tags">
            ${currentTags
              .map(
                tag => `
              <span class="tag">
                ${tag}
                <button type="button" class="remove-tag" data-field="${field}" data-tag="${tag}">×</button>
              </span>
            `,
              )
              .join('')}
          </div>
          <input
            type="text"
            class="tag-input"
            placeholder="Add tag..."
            data-field="${field}"
          />
        </div>
        <div class="field-error" id="${field}-error"></div>
      </div>
    `
  }

  /**
   * Render attributes editor
   */
  private renderAttributesEditor(field: string, value?: Record<string, unknown>): string {
    if (!this.currentEntity) return ''

    const attributes = value || {}

    // Type-specific attribute rendering
    switch (this.currentEntity.type) {
      case 'person':
        return this.renderPersonAttributes(attributes)
      case 'location':
        return this.renderLocationAttributes(attributes)
      case 'item':
        return this.renderItemAttributes(attributes)
      case 'information':
        return this.renderInformationAttributes(attributes)
      default:
        return this.renderGenericAttributes(field, attributes)
    }
  }

  /**
   * Render person-specific attributes
   */
  private renderPersonAttributes(attributes: Record<string, unknown>): string {
    const personality = (attributes.personality as string[]) || []
    const skills = (attributes.skills as string[]) || []
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const relationships = (attributes.relationships as Record<string, string>) || {} // eslint-disable-line @typescript-eslint/no-unused-vars

    return `
      <div class="form-field">
        <label class="form-label">Attributes</label>
        <div class="attributes-container">
          <div class="attribute-group">
            <h5>Personality</h5>
            <div class="array-input" data-field="attributes.personality">
              ${personality
                .map(
                  trait => `
                <div class="array-item">
                  <input type="text" value="${trait}" readonly />
                  <button type="button" class="remove-array-item">×</button>
                </div>
              `,
                )
                .join('')}
              <div class="add-array-item">
                <input type="text" placeholder="Add personality trait..." />
                <button type="button" class="add-item-btn">+</button>
              </div>
            </div>
          </div>
          <div class="attribute-group">
            <h5>Skills</h5>
            <div class="array-input" data-field="attributes.skills">
              ${skills
                .map(
                  skill => `
                <div class="array-item">
                  <input type="text" value="${skill}" readonly />
                  <button type="button" class="remove-array-item">×</button>
                </div>
              `,
                )
                .join('')}
              <div class="add-array-item">
                <input type="text" placeholder="Add skill..." />
                <button type="button" class="add-item-btn">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render location-specific attributes
   */
  private renderLocationAttributes(attributes: Record<string, unknown>): string {
    const environment = (attributes.environment as string) || ''
    const accessibility = (attributes.accessibility as string[]) || []
    const specialFeatures = (attributes.specialFeatures as string[]) || []

    return `
      <div class="form-field">
        <label class="form-label">Attributes</label>
        <div class="attributes-container">
          ${this.renderTextInput('attributes.environment', 'Environment', environment)}
          <div class="attribute-group">
            <h5>Accessibility</h5>
            <div class="array-input" data-field="attributes.accessibility">
              ${accessibility
                .map(
                  feature => `
                <div class="array-item">
                  <input type="text" value="${feature}" readonly />
                  <button type="button" class="remove-array-item">×</button>
                </div>
              `,
                )
                .join('')}
              <div class="add-array-item">
                <input type="text" placeholder="Add accessibility feature..." />
                <button type="button" class="add-item-btn">+</button>
              </div>
            </div>
          </div>
          <div class="attribute-group">
            <h5>Special Features</h5>
            <div class="array-input" data-field="attributes.specialFeatures">
              ${specialFeatures
                .map(
                  feature => `
                <div class="array-item">
                  <input type="text" value="${feature}" readonly />
                  <button type="button" class="remove-array-item">×</button>
                </div>
              `,
                )
                .join('')}
              <div class="add-array-item">
                <input type="text" placeholder="Add special feature..." />
                <button type="button" class="add-item-btn">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render item-specific attributes
   */
  private renderItemAttributes(attributes: Record<string, unknown>): string {
    const weight = (attributes.weight as number) || 1
    const size = (attributes.size as string) || 'small'
    const durability = (attributes.durability as number) || 100
    const specialProperties = (attributes.specialProperties as string[]) || []

    return `
      <div class="form-field">
        <label class="form-label">Attributes</label>
        <div class="attributes-container">
          ${this.renderNumberInput('attributes.weight', 'Weight', weight, 0)}
          <div class="form-field">
            <label class="form-label" for="attributes.size">Size</label>
            <select id="attributes.size" name="attributes.size" class="form-select" data-field="attributes.size">
              <option value="tiny" ${size === 'tiny' ? 'selected' : ''}>Tiny</option>
              <option value="small" ${size === 'small' ? 'selected' : ''}>Small</option>
              <option value="medium" ${size === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="large" ${size === 'large' ? 'selected' : ''}>Large</option>
              <option value="huge" ${size === 'huge' ? 'selected' : ''}>Huge</option>
            </select>
          </div>
          ${this.renderNumberInput('attributes.durability', 'Durability', durability, 0, 100)}
          <div class="attribute-group">
            <h5>Special Properties</h5>
            <div class="array-input" data-field="attributes.specialProperties">
              ${specialProperties
                .map(
                  property => `
                <div class="array-item">
                  <input type="text" value="${property}" readonly />
                  <button type="button" class="remove-array-item">×</button>
                </div>
              `,
                )
                .join('')}
              <div class="add-array-item">
                <input type="text" placeholder="Add special property..." />
                <button type="button" class="add-item-btn">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render information-specific attributes
   */
  private renderInformationAttributes(attributes: Record<string, unknown>): string {
    const visibility = (attributes.visibility as string) || 'public'
    const expiresAt = (attributes.expiresAt as number) || undefined
    const relatedEntities = (attributes.relatedEntities as EntityId[]) || []

    return `
      <div class="form-field">
        <label class="form-label">Attributes</label>
        <div class="attributes-container">
          <div class="form-field">
            <label class="form-label" for="attributes.visibility">Visibility</label>
            <select id="attributes.visibility" name="attributes.visibility" class="form-select" data-field="attributes.visibility">
              <option value="public" ${visibility === 'public' ? 'selected' : ''}>Public</option>
              <option value="private" ${visibility === 'private' ? 'selected' : ''}>Private</option>
              <option value="secret" ${visibility === 'secret' ? 'selected' : ''}>Secret</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label" for="attributes.expiresAt">Expires At (timestamp)</label>
            <input
              type="number"
              id="attributes.expiresAt"
              name="attributes.expiresAt"
              class="form-input"
              value="${expiresAt || ''}"
              data-field="attributes.expiresAt"
            />
          </div>
          ${this.renderMultiEntitySelect('attributes.relatedEntities', 'Related Entities', relatedEntities)}
        </div>
      </div>
    `
  }

  /**
   * Render generic attributes editor
   */
  private renderGenericAttributes(field: string, attributes: Record<string, unknown>): string {
    return `
      <div class="form-field">
        <label class="form-label">Attributes</label>
        <div class="json-editor" data-field="${field}">
          <textarea class="json-textarea" rows="10">${JSON.stringify(attributes, null, 2)}</textarea>
          <div class="json-error" style="display: none;"></div>
        </div>
      </div>
    `
  }

  /**
   * Render metadata editor
   */
  private renderMetadataEditor(field: string, metadata: Record<string, unknown>): string {
    return `
      <div class="form-field">
        <label class="form-label">Metadata</label>
        <div class="json-editor" data-field="${field}">
          <textarea class="json-textarea" rows="6">${JSON.stringify(metadata, null, 2)}</textarea>
          <div class="json-error" style="display: none;"></div>
        </div>
      </div>
    `
  }

  /**
   * Render relationship fields specifically
   */
  private renderRelationshipFields(): void {
    const relationshipGroups = this.container.querySelectorAll(
      '[data-field*="relationships"], [data-field*="connections"]',
    )
    relationshipGroups.forEach(group => {
      // Re-render these specific fields
      const field = (group as HTMLElement).dataset.field
      if (field) {
        const fieldContainer = group.closest('.form-field')
        if (fieldContainer) {
          fieldContainer.outerHTML = this.renderField(field)
        }
      }
    })

    // Re-attach event handlers for the updated fields
    this.setupEventHandlers()
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Entity type selector
    const typeSelect = this.container.querySelector('.entity-type-select') as HTMLSelectElement
    typeSelect?.addEventListener('change', () => {
      const newEntityBtn = this.container.querySelector('.btn-new-entity') as HTMLButtonElement
      if (newEntityBtn) {
        newEntityBtn.disabled = !typeSelect.value
        newEntityBtn.textContent = typeSelect.value
          ? `New ${typeSelect.value.charAt(0).toUpperCase() + typeSelect.value.slice(1)}`
          : 'New Entity'
      }
    })

    // New entity button
    const newEntityBtn = this.container.querySelector('.btn-new-entity') as HTMLButtonElement
    newEntityBtn?.addEventListener('click', () => {
      const selectedType = typeSelect?.value as EditableEntity['type']
      if (selectedType) {
        const newEntity = this.createEntity(selectedType)
        this.setEntity(newEntity)
      }
    })

    // Save button
    const saveBtn = this.container.querySelector('.btn-save-entity') as HTMLButtonElement
    saveBtn?.addEventListener('click', () => {
      if (this.currentEntity) {
        const validation = this.validateEntity()
        if (validation.valid) {
          this.onEntitySave?.(this.currentEntity)
          this.feedbackManager.showNotification('Entity saved successfully', FeedbackType.SUCCESS)
        } else {
          this.showValidationErrors(validation)
        }
      }
    })

    // Delete button
    const deleteBtn = this.container.querySelector('.btn-delete-entity') as HTMLButtonElement
    deleteBtn?.addEventListener('click', () => {
      if (
        this.currentEntity &&
        confirm(`Are you sure you want to delete "${this.currentEntity.name}"?`)
      ) {
        this.onEntityDelete?.(this.currentEntity.id)
        this.setEntity(null)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        this.feedbackManager.showNotification('Entity deleted', (FeedbackType as any).INFO) // eslint-disable-line @typescript-eslint/no-unsafe-argument
      }
    })

    // Field groups collapsible behavior
    this.container.querySelectorAll('[data-collapsible="true"]').forEach(header => {
      header.addEventListener('click', () => {
        const fieldGroup = header.closest('.field-group')
        fieldGroup?.classList.toggle('open')
      })
    })

    // Form field changes
    this.container.querySelectorAll('[data-field]').forEach(element => {
      const field = (element as HTMLElement).dataset.field!

      if (
        element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        element.tagName === 'SELECT'
      ) {
        element.addEventListener('input', e => {
          this.handleFieldChange(field, (e.target as HTMLInputElement).value)
        })

        element.addEventListener('change', e => {
          this.handleFieldChange(field, (e.target as HTMLInputElement).value)
        })
      }
    })

    // Range input value display
    this.container.querySelectorAll('input[type="range"]').forEach(range => {
      range.addEventListener('input', e => {
        const field = (range as HTMLElement).dataset.field!
        const valueSpan = this.container.querySelector(`#${field}-value`)
        if (valueSpan) {
          valueSpan.textContent = (e.target as HTMLInputElement).value
        }
      })
    })

    // Tag input handling
    this.container.querySelectorAll('.tag-input').forEach(input => {
      input.addEventListener('keypress', e => {
        if ((e as any).key === 'Enter') {
          // eslint-disable-line @typescript-eslint/no-unsafe-member-access
          e.preventDefault()
          const field = (input as HTMLElement).dataset.field!
          const value = (input as HTMLInputElement).value.trim()
          if (value) {
            this.addTag(field, value)
            ;(input as HTMLInputElement).value = ''
          }
        }
      })
    })

    // Remove tag buttons
    this.container.querySelectorAll('.remove-tag').forEach(btn => {
      btn.addEventListener('click', _e => {
        const field = (btn as HTMLElement).dataset.field
        const tag = (btn as HTMLElement).dataset.tag
        if (field && tag) {
          this.removeTag(field, tag)
        }
      })
    })

    // Multi-entity select handling
    this.container.querySelectorAll('.add-entity-select').forEach(select => {
      select.addEventListener('change', e => {
        const field = (select as HTMLElement).dataset.field!
        const entityId = (e.target as HTMLSelectElement).value
        if (entityId) {
          this.addEntityToField(field, entityId)
          ;(e.target as HTMLSelectElement).value = ''
        }
      })
    })

    // Remove entity buttons
    this.container.querySelectorAll('.remove-entity').forEach(btn => {
      btn.addEventListener('click', _e => {
        const field = (btn as HTMLElement).dataset.field
        const entityId = (btn as HTMLElement).dataset.entityId
        if (field && entityId) {
          this.removeEntityFromField(field, entityId)
        }
      })
    })

    // Array input handling
    this.container.querySelectorAll('.add-item-btn').forEach(btn => {
      btn.addEventListener('click', _e => {
        const arrayInput = (btn as HTMLElement).closest('.array-input')
        const field = (arrayInput as HTMLElement)?.dataset.field
        const input = arrayInput?.querySelector('.add-array-item input') as HTMLInputElement
        const value = input?.value.trim()

        if (field && value) {
          this.addArrayItem(field, value)
          input.value = ''
        }
      })
    })

    // Remove array item buttons
    this.container.querySelectorAll('.remove-array-item').forEach(btn => {
      btn.addEventListener('click', _e => {
        const arrayItem = (btn as HTMLElement).closest('.array-item')
        const arrayInput = arrayItem?.closest('.array-input')
        const field = (arrayInput as HTMLElement)?.dataset.field
        const input = arrayItem?.querySelector('input') as HTMLInputElement
        const value = input?.value

        if (field && value) {
          this.removeArrayItem(field, value)
        }
      })
    })

    // JSON editor handling
    this.container.querySelectorAll('.json-textarea').forEach(textarea => {
      textarea.addEventListener('input', e => {
        const field = (textarea.closest('.json-editor') as HTMLElement)?.dataset.field! // eslint-disable-line @typescript-eslint/no-non-null-asserted-optional-chain
        const value = (e.target as HTMLTextAreaElement).value
        this.handleJsonFieldChange(field, value)
      })
    })
  }

  /**
   * Handle field value changes
   */
  private handleFieldChange(field: string, value: string): void {
    if (!this.currentEntity) return

    const oldValue = this.getFieldValue(field)
    let newValue: unknown = value

    // Type conversion based on field
    if (
      field.includes('capacity') ||
      field.includes('weight') ||
      field.includes('durability') ||
      field.includes('expiresAt')
    ) {
      newValue = value === '' ? undefined : Number(value)
    } else if (field.includes('reliability')) {
      newValue = Number(value)
    }

    this.setFieldValue(field, newValue)

    // Validate the field
    const validation = this.validateEntity()
    const fieldErrors = validation.errors.filter(e => e.field === field)
    this.showFieldErrors(field, fieldErrors)

    // Trigger change event
    this.onEntityChange?.({
      entity: this.currentEntity,
      field,
      oldValue,
      newValue,
      isValid: fieldErrors.length === 0,
    })
  }

  /**
   * Handle JSON field changes
   */
  private handleJsonFieldChange(field: string, value: string): void {
    if (!this.currentEntity) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed = JSON.parse(value)
      const oldValue = this.getFieldValue(field)
      this.setFieldValue(field, parsed)

      // Clear JSON error
      const errorDiv = this.container.querySelector(`[data-field="${field}"] .json-error`)
      if (errorDiv) {
        errorDiv.textContent = ''
        ;(errorDiv as HTMLElement).style.display = 'none'
      }

      this.onEntityChange?.({
        entity: this.currentEntity,
        field,
        oldValue,
        newValue: parsed,
        isValid: true,
      })
    } catch (error) {
      // Show JSON error
      const errorDiv = this.container.querySelector(`[data-field="${field}"] .json-error`)
      if (errorDiv) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        const msg = `エラー: ${(error as any).message}` // eslint-disable-line @typescript-eslint/no-unsafe-member-access
        errorDiv.textContent = msg
        ;(errorDiv as HTMLElement).style.display = 'block'
      }
    }
  }

  /**
   * Get field value from current entity
   */
  private getFieldValue(field: string): unknown {
    if (!this.currentEntity) return undefined

    const parts = field.split('.')
    let value: unknown = this.currentEntity

    for (const part of parts) {
      value = (value as Record<string, unknown>)?.[part]
    }

    return value
  }

  /**
   * Set field value in current entity
   */
  private setFieldValue(field: string, value: unknown): void {
    if (!this.currentEntity) return

    const parts = field.split('.')
    let target = this.currentEntity as unknown as Record<string, unknown> // eslint-disable-line @typescript-eslint/no-unsafe-assignment

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!(part in target) || typeof target[part] !== 'object') {
        target[part] = {}
      }
      target = target[part] as Record<string, unknown>
    }

    target[parts[parts.length - 1]] = value
  }

  /**
   * Add tag to field
   */
  private addTag(field: string, tag: string): void {
    if (!this.currentEntity) return

    const currentTags = (this.getFieldValue(field) as string[]) || []
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag]
      this.setFieldValue(field, newTags)
      this.renderTagsForField(field, newTags)
    }
  }

  /**
   * Remove tag from field
   */
  private removeTag(field: string, tag: string): void {
    if (!this.currentEntity) return

    const currentTags = (this.getFieldValue(field) as string[]) || []
    const newTags = currentTags.filter(t => t !== tag)
    this.setFieldValue(field, newTags)
    this.renderTagsForField(field, newTags)
  }

  /**
   * Re-render tags for a field
   */
  private renderTagsForField(field: string, tags: string[]): void {
    const tagsDisplay = this.container.querySelector(`#${field}-tags`)
    if (tagsDisplay) {
      tagsDisplay.innerHTML = tags
        .map(
          tag => `
        <span class="tag">
          ${tag}
          <button type="button" class="remove-tag" data-field="${field}" data-tag="${tag}">×</button>
        </span>
      `,
        )
        .join('')

      // Re-attach event handlers for remove buttons
      tagsDisplay.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', _e => {
          const field = (btn as HTMLElement).dataset.field
          const tag = (btn as HTMLElement).dataset.tag
          if (field && tag) {
            this.removeTag(field, tag)
          }
        })
      })
    }
  }

  /**
   * Add entity to multi-entity field
   */
  private addEntityToField(field: string, entityId: EntityId): void {
    if (!this.currentEntity) return

    const currentEntities = (this.getFieldValue(field) as EntityId[]) || []
    if (!currentEntities.includes(entityId)) {
      const newEntities = [...currentEntities, entityId]
      this.setFieldValue(field, newEntities)

      // Re-render the field
      const fieldContainer = this.container
        .querySelector(`[data-field="${field}"]`)
        ?.closest('.form-field')
      if (fieldContainer) {
        fieldContainer.outerHTML = this.renderField(field)
        this.setupEventHandlers()
      }
    }
  }

  /**
   * Remove entity from multi-entity field
   */
  private removeEntityFromField(field: string, entityId: EntityId): void {
    if (!this.currentEntity) return

    const currentEntities = (this.getFieldValue(field) as EntityId[]) || []
    const newEntities = currentEntities.filter(id => id !== entityId)
    this.setFieldValue(field, newEntities)

    // Re-render the field
    const fieldContainer = this.container
      .querySelector(`[data-field="${field}"]`)
      ?.closest('.form-field')
    if (fieldContainer) {
      fieldContainer.outerHTML = this.renderField(field)
      this.setupEventHandlers()
    }
  }

  /**
   * Add item to array field
   */
  private addArrayItem(field: string, value: string): void {
    if (!this.currentEntity) return

    const currentArray = (this.getFieldValue(field) as string[]) || []
    if (!currentArray.includes(value)) {
      const newArray = [...currentArray, value]
      this.setFieldValue(field, newArray)

      // Re-render the field
      this.renderArrayField(field, newArray)
    }
  }

  /**
   * Remove item from array field
   */
  private removeArrayItem(field: string, value: string): void {
    if (!this.currentEntity) return

    const currentArray = (this.getFieldValue(field) as string[]) || []
    const newArray = currentArray.filter(item => item !== value)
    this.setFieldValue(field, newArray)

    // Re-render the field
    this.renderArrayField(field, newArray)
  }

  /**
   * Re-render array field
   */
  private renderArrayField(field: string, items: string[]): void {
    const arrayInput = this.container.querySelector(`[data-field="${field}"]`)
    if (arrayInput) {
      const itemsContainer = arrayInput.querySelector('.array-item')?.parentElement
      if (itemsContainer) {
        // Remove existing items (except the add item input)
        const existingItems = itemsContainer.querySelectorAll('.array-item')
        existingItems.forEach(item => item.remove())

        // Add new items
        const addItemDiv = itemsContainer.querySelector('.add-array-item')
        items.forEach(item => {
          const itemDiv = document.createElement('div')
          itemDiv.className = 'array-item'
          itemDiv.innerHTML = `
            <input type="text" value="${item}" readonly />
            <button type="button" class="remove-array-item">×</button>
          `

          if (addItemDiv) {
            itemsContainer.insertBefore(itemDiv, addItemDiv)
          } else {
            itemsContainer.appendChild(itemDiv)
          }
        })

        // Re-attach event handlers
        this.setupEventHandlers()
      }
    }
  }

  /**
   * Show validation errors
   */
  private showValidationErrors(validation: EntityValidationResult): void {
    // Clear all existing errors
    this.container.querySelectorAll('.field-error').forEach(error => {
      error.textContent = ''
    })

    // Show field-specific errors
    validation.errors.forEach(error => {
      this.showFieldErrors(error.field, [error])
    })

    // Show general feedback
    const errorCount = validation.errors.filter(e => e.severity === 'error').length
    const warningCount = validation.errors.filter(e => e.severity === 'warning').length

    let message = 'Validation failed: '
    if (errorCount > 0) {
      message += `${errorCount} error${errorCount > 1 ? 's' : ''}`
    }
    if (warningCount > 0) {
      if (errorCount > 0) message += ', '
      message += `${warningCount} warning${warningCount > 1 ? 's' : ''}`
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.feedbackManager?.showNotification(message, FeedbackType.ERROR)
  }

  /**
   * Show errors for a specific field
   */
  private showFieldErrors(
    field: string,
    errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>,
  ): void {
    const errorDiv = this.container.querySelector(`#${field}-error`)
    if (errorDiv) {
      if (errors.length > 0) {
        errorDiv.textContent = errors.map(e => e.message).join(', ')
        errorDiv.className = `field-error ${errors[0].severity}`
      } else {
        errorDiv.textContent = ''
        errorDiv.className = 'field-error'
      }
    }
  }
}

/**
 * CSS styles for entity editor
 */
export const entityEditorStyles = `
  .entity-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .entity-editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .entity-type-selector {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .entity-type-selector label {
    font-weight: 500;
  }
  
  .entity-type-select {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
  }
  
  .btn-new-entity {
    padding: 6px 12px;
    border: 1px solid #2196f3;
    border-radius: 4px;
    background: #2196f3;
    color: white;
    cursor: pointer;
  }
  
  .btn-new-entity:disabled {
    background: #ccc;
    border-color: #ccc;
    cursor: not-allowed;
  }
  
  .entity-actions {
    display: flex;
    gap: 8px;
  }
  
  .btn-save-entity,
  .btn-delete-entity {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .btn-save-entity {
    background: #4caf50;
    border-color: #4caf50;
    color: white;
  }
  
  .btn-delete-entity {
    background: #f44336;
    border-color: #f44336;
    color: white;
  }
  
  .btn-save-entity:disabled,
  .btn-delete-entity:disabled {
    background: #ccc;
    border-color: #ccc;
    cursor: not-allowed;
  }
  
  .entity-editor-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: #666;
  }
  
  .empty-state-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  .entity-form {
    max-width: 600px;
  }
  
  .field-group {
    margin-bottom: 24px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
  }
  
  .field-group-header {
    padding: 12px 16px;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .field-group-header h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
  
  .collapse-icon {
    transition: transform 0.2s;
  }
  
  .field-group.collapsible:not(.open) .collapse-icon {
    transform: rotate(-90deg);
  }
  
  .field-group-content {
    padding: 16px;
  }
  
  .field-group.collapsible:not(.open) .field-group-content {
    display: none;
  }
  
  .form-field {
    margin-bottom: 16px;
  }
  
  .form-label {
    display: block;
    margin-bottom: 4px;
    font-weight: 500;
    font-size: 14px;
  }
  
  .required {
    color: #f44336;
  }
  
  .form-input,
  .form-textarea,
  .form-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .form-textarea {
    resize: vertical;
    min-height: 80px;
  }
  
  .form-range {
    width: 100%;
  }
  
  .field-error {
    margin-top: 4px;
    font-size: 12px;
    min-height: 16px;
  }
  
  .field-error.error {
    color: #f44336;
  }
  
  .field-error.warning {
    color: #ff9800;
  }
  
  .tags-input-container {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px;
  }
  
  .tags-display {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }
  
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: #e3f2fd;
    color: #1976d2;
    border-radius: 12px;
    font-size: 12px;
  }
  
  .remove-tag {
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .tag-input {
    border: none;
    outline: none;
    flex: 1;
    min-width: 120px;
  }
  
  .multi-select-container {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px;
  }
  
  .selected-entities {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }
  
  .selected-entity {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: #e8f5e8;
    color: #2e7d32;
    border-radius: 4px;
    font-size: 12px;
  }
  
  .remove-entity {
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .add-entity-select {
    width: 100%;
    margin-top: 4px;
  }
  
  .attributes-container {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 12px;
  }
  
  .attribute-group {
    margin-bottom: 16px;
  }
  
  .attribute-group:last-child {
    margin-bottom: 0;
  }
  
  .attribute-group h5 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }
  
  .array-input {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 8px;
  }
  
  .array-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  
  .array-item input {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
  }
  
  .remove-array-item {
    border: none;
    background: #f44336;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }
  
  .add-array-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }
  
  .add-array-item input {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
  }
  
  .add-item-btn {
    border: none;
    background: #4caf50;
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }
  
  .json-editor {
    position: relative;
  }
  
  .json-textarea {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.4;
  }
  
  .json-error {
    margin-top: 4px;
    padding: 8px;
    background: #ffebee;
    border: 1px solid #f44336;
    border-radius: 4px;
    color: #d32f2f;
    font-size: 12px;
  }
`
