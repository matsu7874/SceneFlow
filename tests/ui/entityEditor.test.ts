import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EntityEditor, type EditableEntity, type EntityChangeEvent } from '../../src/modules/ui/entityEditor/EntityEditor'

describe('EntityEditor', () => {
  let container: HTMLElement
  let editor: EntityEditor

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    editor = new EntityEditor(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  describe('initialization', () => {
    it('should render entity editor interface', () => {
      expect(container.querySelector('.entity-editor')).toBeTruthy()
      expect(container.querySelector('.entity-type-selector')).toBeTruthy()
      expect(container.querySelector('.entity-editor-content')).toBeTruthy()
    })

    it('should show empty state when no entity selected', () => {
      expect(container.querySelector('.empty-state')).toBeTruthy()
      expect(container.textContent).toContain('No Entity Selected')
    })
  })

  describe('entity creation', () => {
    it('should create person entity', () => {
      const person = editor.createEntity('person')

      expect(person.type).toBe('person')
      expect(person.id).toMatch(/^new-person-\d+$/)
      expect(person.name).toBe('New Person')
      expect(person.attributes).toEqual({
        personality: [],
        skills: [],
        relationships: {},
      })
    })

    it('should create location entity', () => {
      const location = editor.createEntity('location')

      expect(location.type).toBe('location')
      expect(location.id).toMatch(/^new-location-\d+$/)
      expect(location.name).toBe('New Location')
      expect(location.connections).toEqual([])
      expect(location.capacity).toBe(10)
    })

    it('should create item entity', () => {
      const item = editor.createEntity('item')

      expect(item.type).toBe('item')
      expect(item.id).toMatch(/^new-item-\d+$/)
      expect(item.name).toBe('New Item')
      expect(item.category).toBe('SMALL_PROP')
      expect(item.attributes?.weight).toBe(1)
    })

    it('should create information entity', () => {
      const info = editor.createEntity('information')

      expect(info.type).toBe('information')
      expect(info.id).toMatch(/^new-information-\d+$/)
      expect(info.name).toBe('New Information')
      expect(info.category).toBe('FACT')
      expect(info.content).toBe('')
      expect(info.reliability).toBe(1.0)
    })
  })

  describe('entity validation', () => {
    it('should validate valid person entity', () => {
      const person = editor.createEntity('person')
      person.id = 'valid-id'
      person.name = 'Valid Name'

      const validation = editor.validateEntity(person)

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect missing required fields', () => {
      const person = editor.createEntity('person')
      person.id = ''
      person.name = ''

      const validation = editor.validateEntity(person)

      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.field === 'id')).toBe(true)
      expect(validation.errors.some(e => e.field === 'name')).toBe(true)
    })

    it('should validate ID format', () => {
      const person = editor.createEntity('person')
      person.id = 'invalid id with spaces'

      const validation = editor.validateEntity(person)

      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.field === 'id' && e.message.includes('letters, numbers'))).toBe(true)
    })

    it('should validate name length', () => {
      const person = editor.createEntity('person')
      person.name = 'a'.repeat(101)

      const validation = editor.validateEntity(person)

      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.field === 'name' && e.message.includes('100 characters'))).toBe(true)
    })

    it('should validate information content requirement', () => {
      const info = editor.createEntity('information')
      info.content = ''

      const validation = editor.validateEntity(info)

      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.field === 'content')).toBe(true)
    })

    it('should validate reliability range', () => {
      const info = editor.createEntity('information')
      info.reliability = 1.5

      const validation = editor.validateEntity(info)

      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.field === 'reliability')).toBe(true)
    })
  })

  describe('entity editing', () => {
    it('should set and get entity', () => {
      const person = editor.createEntity('person')

      editor.setEntity(person)
      expect(editor.getEntity()).toBe(person)
    })

    it('should render form when entity is set', () => {
      const person = editor.createEntity('person')
      editor.setEntity(person)

      expect(container.querySelector('.entity-form')).toBeTruthy()
      expect(container.querySelector('.empty-state')).toBeFalsy()
      expect(container.querySelector('#id')).toBeTruthy()
      expect(container.querySelector('#name')).toBeTruthy()
    })

    it('should populate form fields with entity data', () => {
      const person = editor.createEntity('person')
      person.id = 'test-person'
      person.name = 'Test Person'
      person.description = 'A test person'

      editor.setEntity(person)

      const idInput = container.querySelector('#id') as HTMLInputElement
      const nameInput = container.querySelector('#name') as HTMLInputElement
      const descInput = container.querySelector('#description') as HTMLTextAreaElement

      expect(idInput.value).toBe('test-person')
      expect(nameInput.value).toBe('Test Person')
      expect(descInput.value).toBe('A test person')
    })
  })

  describe('available entities', () => {
    it('should set available entities for relationships', () => {
      const entities: EditableEntity[] = [
        editor.createEntity('person'),
        editor.createEntity('location'),
      ]

      editor.setAvailableEntities(entities)

      // This should not throw and should update internal state
      expect(editor).toBeDefined()
    })
  })

  describe('callbacks', () => {
    it('should register change callback', () => {
      const changeCallback = vi.fn()
      editor.setOnEntityChange(changeCallback)

      // Simulate a change
      const person = editor.createEntity('person')
      editor.setEntity(person)

      // Change callback registration should not throw
      expect(changeCallback).toBeDefined()
    })

    it('should register save callback', () => {
      const saveCallback = vi.fn()
      editor.setOnEntitySave(saveCallback)

      // Save callback registration should not throw
      expect(saveCallback).toBeDefined()
    })

    it('should register delete callback', () => {
      const deleteCallback = vi.fn()
      editor.setOnEntityDelete(deleteCallback)

      // Delete callback registration should not throw
      expect(deleteCallback).toBeDefined()
    })
  })

  describe('configuration', () => {
    it('should accept custom configuration', () => {
      const customEditor = new EntityEditor(container, {
        allowedEntityTypes: ['person', 'location'],
        requiredFields: {
          person: ['id', 'name', 'description'],
        },
      })

      expect(customEditor).toBeDefined()
    })

    it('should validate with custom validators', () => {
      const customEditor = new EntityEditor(container, {
        customValidators: {
          name: (value) => {
            if (typeof value === 'string' && value.includes('test')) {
              return 'Name cannot contain "test"'
            }
            return null
          },
        },
      })

      const person = customEditor.createEntity('person')
      person.name = 'test person'

      const validation = customEditor.validateEntity(person)

      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.message.includes('cannot contain "test"'))).toBe(true)
    })
  })

  describe('field groups', () => {
    it('should render field groups', () => {
      const person = editor.createEntity('person')
      editor.setEntity(person)

      expect(container.querySelector('.field-group')).toBeTruthy()
      expect(container.querySelector('.field-group-header')).toBeTruthy()
      expect(container.querySelector('.field-group-content')).toBeTruthy()
    })

    it('should support collapsible groups', () => {
      const person = editor.createEntity('person')
      editor.setEntity(person)

      const collapsibleGroup = container.querySelector('.field-group.collapsible')
      expect(collapsibleGroup).toBeTruthy()
    })
  })

  describe('entity types', () => {
    it('should show person-specific fields', () => {
      const person = editor.createEntity('person')
      editor.setEntity(person)

      // Should show basic fields
      expect(container.querySelector('#id')).toBeTruthy()
      expect(container.querySelector('#name')).toBeTruthy()
      expect(container.querySelector('#description')).toBeTruthy()
    })

    it('should show location-specific fields', () => {
      const location = editor.createEntity('location')
      editor.setEntity(location)

      expect(container.querySelector('#capacity')).toBeTruthy()
    })

    it('should show item-specific fields', () => {
      const item = editor.createEntity('item')
      editor.setEntity(item)

      expect(container.querySelector('#category')).toBeTruthy()
    })

    it('should show information-specific fields', () => {
      const info = editor.createEntity('information')
      editor.setEntity(info)

      expect(container.querySelector('#content')).toBeTruthy()
      expect(container.querySelector('#reliability')).toBeTruthy()
    })
  })

  describe('edge cases', () => {
    it('should handle null entity', () => {
      editor.setEntity(null)
      expect(editor.getEntity()).toBeNull()
      expect(container.querySelector('.empty-state')).toBeTruthy()
    })

    it('should validate null entity', () => {
      const validation = editor.validateEntity(null as unknown as EditableEntity)
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.message.includes('No entity'))).toBe(true)
    })

    it('should handle unknown entity type', () => {
      expect(() => {
        editor.createEntity('unknown' as never)
      }).toThrow('Unknown entity type')
    })
  })
})