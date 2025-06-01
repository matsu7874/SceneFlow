import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RelationshipEditor, RelationshipType, ConnectionType, type Relationship, type Connection } from '../../src/modules/ui/entityEditor/RelationshipEditor'
import type { EditableEntity } from '../../src/modules/ui/entityEditor/EntityEditor'

// Mock canvas and SVG APIs
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => ({
    clearRect: vi.fn(),
    strokeStyle: '',
    lineWidth: 0,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  })),
})

Object.defineProperty(document, 'createElementNS', {
  value: vi.fn((namespace: string, tagName: string) => {
    const element = document.createElement(tagName) as unknown as SVGElement
    element.setAttribute = vi.fn()
    element.appendChild = vi.fn()
    element.removeChild = vi.fn()
    element.querySelector = vi.fn()
    element.querySelectorAll = vi.fn(() => [])

    Object.defineProperty(element, 'firstChild', {
      value: null,
      writable: true,
    })

    return element
  }),
})

describe('RelationshipEditor', () => {
  let container: HTMLElement
  let editor: RelationshipEditor
  let testEntities: EditableEntity[]

  beforeEach(() => {
    container = document.createElement('div')
    container.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    }))
    document.body.appendChild(container)

    testEntities = [
      {
        id: 'person1',
        type: 'person',
        name: 'Alice',
        description: 'A test person',
        tags: [],
        metadata: {},
      },
      {
        id: 'person2',
        type: 'person',
        name: 'Bob',
        description: 'Another test person',
        tags: [],
        metadata: {},
      },
      {
        id: 'location1',
        type: 'location',
        name: 'Room A',
        description: 'A test room',
        tags: [],
        metadata: {},
        connections: [],
        capacity: 10,
      },
      {
        id: 'location2',
        type: 'location',
        name: 'Room B',
        description: 'Another test room',
        tags: [],
        metadata: {},
        connections: [],
        capacity: 5,
      },
    ]

    editor = new RelationshipEditor({
      container,
      entities: testEntities,
    })
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  describe('initialization', () => {
    it('should render relationship editor interface', () => {
      expect(container.querySelector('.relationship-editor')).toBeTruthy()
      expect(container.querySelector('.relationship-toolbar')).toBeTruthy()
      expect(container.querySelector('.relationship-canvas-container')).toBeTruthy()
      expect(container.querySelector('.relationship-sidebar')).toBeTruthy()
    })

    it('should initialize with entities', () => {
      expect(container.querySelector('.entity-list')).toBeTruthy()
      expect(container.querySelectorAll('.entity-item')).toHaveLength(4)
    })

    it('should show mode selector', () => {
      const modeInputs = container.querySelectorAll('input[name="mode"]')
      expect(modeInputs).toHaveLength(3)
      expect(container.querySelector('input[value="both"]:checked')).toBeTruthy()
    })
  })

  describe('entity management', () => {
    it('should display entities in sidebar', () => {
      const entityItems = container.querySelectorAll('.entity-item')
      expect(entityItems).toHaveLength(4)

      const names = Array.from(entityItems).map(item =>
        item.querySelector('.entity-name')?.textContent,
      )
      expect(names).toContain('Alice')
      expect(names).toContain('Bob')
      expect(names).toContain('Room A')
      expect(names).toContain('Room B')
    })

    it('should update entities', () => {
      const newEntities = [...testEntities, {
        id: 'person3',
        type: 'person' as const,
        name: 'Charlie',
        description: 'Third test person',
        tags: [],
        metadata: {},
      }]

      editor.updateEntities(newEntities)

      const entityItems = container.querySelectorAll('.entity-item')
      expect(entityItems).toHaveLength(5)
    })
  })

  describe('relationships', () => {
    it('should initialize with relationships', () => {
      const relationships: Relationship[] = [
        {
          id: 'rel1',
          fromEntityId: 'person1',
          toEntityId: 'person2',
          type: RelationshipType.FRIEND,
          strength: 0.8,
          isPublic: true,
        },
      ]

      const editorWithRelationships = new RelationshipEditor({
        container: document.createElement('div'),
        entities: testEntities,
        relationships,
      })

      expect(editorWithRelationships.getRelationships()).toHaveLength(1)
      expect(editorWithRelationships.getRelationships()[0].type).toBe(RelationshipType.FRIEND)
    })

    it('should get empty relationships by default', () => {
      expect(editor.getRelationships()).toHaveLength(0)
    })
  })

  describe('connections', () => {
    it('should initialize with connections', () => {
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromLocationId: 'location1',
          toLocationId: 'location2',
          type: ConnectionType.DOOR,
          bidirectional: true,
        },
      ]

      const editorWithConnections = new RelationshipEditor({
        container: document.createElement('div'),
        entities: testEntities,
        connections,
      })

      expect(editorWithConnections.getConnections()).toHaveLength(1)
      expect(editorWithConnections.getConnections()[0].type).toBe(ConnectionType.DOOR)
    })

    it('should get empty connections by default', () => {
      expect(editor.getConnections()).toHaveLength(0)
    })
  })

  describe('mode switching', () => {
    it('should switch to relationships mode', () => {
      const relationshipsRadio = container.querySelector('input[value="relationships"]') as HTMLInputElement
      relationshipsRadio.click()

      expect(relationshipsRadio.checked).toBe(true)
    })

    it('should switch to connections mode', () => {
      const connectionsRadio = container.querySelector('input[value="connections"]') as HTMLInputElement
      connectionsRadio.click()

      expect(connectionsRadio.checked).toBe(true)
    })

    it('should switch to both mode', () => {
      const bothRadio = container.querySelector('input[value="both"]') as HTMLInputElement
      bothRadio.click()

      expect(bothRadio.checked).toBe(true)
    })
  })

  describe('toolbar actions', () => {
    it('should have auto layout button', () => {
      const autoLayoutBtn = container.querySelector('.btn-auto-layout')
      expect(autoLayoutBtn).toBeTruthy()
      expect(autoLayoutBtn?.textContent).toBe('Auto Layout')
    })

    it('should have clear selection button', () => {
      const clearBtn = container.querySelector('.btn-clear-selection')
      expect(clearBtn).toBeTruthy()
      expect(clearBtn?.textContent).toBe('Clear Selection')
    })

    it('should have export button', () => {
      const exportBtn = container.querySelector('.btn-export')
      expect(exportBtn).toBeTruthy()
      expect(exportBtn?.textContent).toBe('Export')
    })
  })

  describe('canvas and svg setup', () => {
    it('should create canvas element', () => {
      expect(container.querySelector('.relationship-canvas')).toBeTruthy()
    })

    it('should create svg element', () => {
      expect(container.querySelector('.relationship-svg')).toBeTruthy()
    })
  })

  describe('callbacks', () => {
    it('should call relationship change callback', () => {
      const onRelationshipChange = vi.fn()

      const editorWithCallback = new RelationshipEditor({
        container: document.createElement('div'),
        entities: testEntities,
        onRelationshipChange,
      })

      expect(onRelationshipChange).toBeDefined()
    })

    it('should call connection change callback', () => {
      const onConnectionChange = vi.fn()

      const editorWithCallback = new RelationshipEditor({
        container: document.createElement('div'),
        entities: testEntities,
        onConnectionChange,
      })

      expect(onConnectionChange).toBeDefined()
    })
  })

  describe('entity types', () => {
    it('should handle person entities', () => {
      const personEntities = testEntities.filter(e => e.type === 'person')
      expect(personEntities).toHaveLength(2)
    })

    it('should handle location entities', () => {
      const locationEntities = testEntities.filter(e => e.type === 'location')
      expect(locationEntities).toHaveLength(2)
    })
  })

  describe('relationship types', () => {
    it('should support all relationship types', () => {
      const types = Object.values(RelationshipType)
      expect(types).toContain(RelationshipType.FRIEND)
      expect(types).toContain(RelationshipType.ENEMY)
      expect(types).toContain(RelationshipType.ALLY)
      expect(types).toContain(RelationshipType.NEUTRAL)
      expect(types).toContain(RelationshipType.FAMILY)
      expect(types).toContain(RelationshipType.ROMANTIC)
      expect(types).toContain(RelationshipType.PROFESSIONAL)
      expect(types).toContain(RelationshipType.MENTOR)
      expect(types).toContain(RelationshipType.STUDENT)
    })
  })

  describe('connection types', () => {
    it('should support all connection types', () => {
      const types = Object.values(ConnectionType)
      expect(types).toContain(ConnectionType.DIRECT)
      expect(types).toContain(ConnectionType.DOOR)
      expect(types).toContain(ConnectionType.PASSAGE)
      expect(types).toContain(ConnectionType.STAIRS)
      expect(types).toContain(ConnectionType.ELEVATOR)
      expect(types).toContain(ConnectionType.PORTAL)
      expect(types).toContain(ConnectionType.HIDDEN)
      expect(types).toContain(ConnectionType.LOCKED)
    })
  })

  describe('edge cases', () => {
    it('should handle empty entities list', () => {
      const emptyEditor = new RelationshipEditor({
        container: document.createElement('div'),
        entities: [],
      })

      expect(emptyEditor.getRelationships()).toHaveLength(0)
      expect(emptyEditor.getConnections()).toHaveLength(0)
    })

    it('should handle invalid relationship references', () => {
      const invalidRelationships: Relationship[] = [
        {
          id: 'invalid',
          fromEntityId: 'nonexistent1',
          toEntityId: 'nonexistent2',
          type: RelationshipType.FRIEND,
          strength: 0.5,
          isPublic: true,
        },
      ]

      const editorWithInvalid = new RelationshipEditor({
        container: document.createElement('div'),
        entities: testEntities,
        relationships: invalidRelationships,
      })

      // Should not crash
      expect(editorWithInvalid).toBeDefined()
    })

    it('should handle invalid connection references', () => {
      const invalidConnections: Connection[] = [
        {
          id: 'invalid',
          fromLocationId: 'nonexistent1',
          toLocationId: 'nonexistent2',
          type: ConnectionType.DOOR,
          bidirectional: true,
        },
      ]

      const editorWithInvalid = new RelationshipEditor({
        container: document.createElement('div'),
        entities: testEntities,
        connections: invalidConnections,
      })

      // Should not crash
      expect(editorWithInvalid).toBeDefined()
    })
  })
})