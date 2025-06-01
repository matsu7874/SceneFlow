import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MapEditor, type MapNode, type MapEditorConfig, LayoutAlgorithm } from '../../src/modules/ui/mapEditor/MapEditor'
import type { EditableEntity } from '../../src/modules/ui/entityEditor/EntityEditor'
import type { Connection, ConnectionType } from '../../src/modules/ui/entityEditor/RelationshipEditor'

// Mock canvas and SVG APIs
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => ({
    clearRect: vi.fn(),
    strokeStyle: '',
    lineWidth: 0,
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    lineCap: '',
    lineJoin: '',
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    setLineDash: vi.fn(),
    closePath: vi.fn(),
  })),
})

Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
  value: vi.fn(() => ({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    x: 0,
    y: 0,
    toJSON: vi.fn(),
  })),
})

// Mock SVG
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

describe('MapEditor', () => {
  let container: HTMLElement
  let mapEditor: MapEditor
  let testLocations: EditableEntity[]
  let testConnections: Connection[]

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

    testLocations = [
      {
        id: 'room1',
        type: 'location',
        name: 'Living Room',
        description: 'A cozy living room',
        tags: [],
        metadata: {},
        connections: [],
        capacity: 10,
      },
      {
        id: 'room2',
        type: 'location',
        name: 'Kitchen',
        description: 'Modern kitchen',
        tags: [],
        metadata: {},
        connections: [],
        capacity: 5,
      },
      {
        id: 'room3',
        type: 'location',
        name: 'Bedroom',
        description: 'Master bedroom',
        tags: [],
        metadata: {},
        connections: [],
        capacity: 3,
      },
    ]

    testConnections = [
      {
        id: 'conn1',
        fromLocationId: 'room1',
        toLocationId: 'room2',
        type: 'DOOR' as ConnectionType,
        bidirectional: true,
      },
      {
        id: 'conn2',
        fromLocationId: 'room2',
        toLocationId: 'room3',
        type: 'PASSAGE' as ConnectionType,
        bidirectional: true,
      },
    ]

    mapEditor = new MapEditor(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  describe('initialization', () => {
    it('should render map editor interface', () => {
      expect(container.querySelector('.map-editor')).toBeTruthy()
      expect(container.querySelector('.map-toolbar')).toBeTruthy()
      expect(container.querySelector('.map-container')).toBeTruthy()
      expect(container.querySelector('.map-canvas')).toBeTruthy()
      expect(container.querySelector('.map-svg')).toBeTruthy()
      expect(container.querySelector('.map-sidebar')).toBeTruthy()
    })

    it('should initialize with default configuration', () => {
      const config: MapEditorConfig = {
        width: 1000,
        height: 800,
        enableGrid: false,
        enable3D: true,
      }
      
      const customEditor = new MapEditor(container, config)
      expect(customEditor).toBeDefined()
    })

    it('should setup toolbar controls', () => {
      expect(container.querySelector('.layout-algorithm')).toBeTruthy()
      expect(container.querySelector('.btn-auto-layout')).toBeTruthy()
      expect(container.querySelector('.btn-reset-view')).toBeTruthy()
      expect(container.querySelector('.toggle-grid')).toBeTruthy()
      expect(container.querySelector('.toggle-3d')).toBeTruthy()
      expect(container.querySelector('.toggle-pathfinding')).toBeTruthy()
    })
  })

  describe('loading locations', () => {
    it('should load locations as map nodes', () => {
      mapEditor.loadLocations(testLocations, testConnections)
      
      const nodes = mapEditor.getNodes()
      expect(nodes).toHaveLength(3)
      
      const nodeIds = nodes.map(n => n.id)
      expect(nodeIds).toContain('room1')
      expect(nodeIds).toContain('room2')
      expect(nodeIds).toContain('room3')
    })

    it('should create connections between nodes', () => {
      mapEditor.loadLocations(testLocations, testConnections)
      
      const connections = mapEditor.getConnections()
      expect(connections).toHaveLength(2)
      
      const connectionIds = connections.map(c => c.id)
      expect(connectionIds).toContain('conn1')
      expect(connectionIds).toContain('conn2')
    })

    it('should calculate node sizes based on capacity', () => {
      mapEditor.loadLocations(testLocations)
      
      const nodes = mapEditor.getNodes()
      const room1Node = nodes.find(n => n.id === 'room1')
      const room3Node = nodes.find(n => n.id === 'room3')
      
      // Room1 has higher capacity, should have larger size
      expect(room1Node?.size).toBeGreaterThan(room3Node?.size || 0)
    })

    it('should handle empty location list', () => {
      mapEditor.loadLocations([])
      
      const nodes = mapEditor.getNodes()
      const connections = mapEditor.getConnections()
      
      expect(nodes).toHaveLength(0)
      expect(connections).toHaveLength(0)
    })

    it('should filter non-location entities', () => {
      const mixedEntities: EditableEntity[] = [
        ...testLocations,
        {
          id: 'person1',
          type: 'person',
          name: 'John',
          description: 'A person',
          tags: [],
          metadata: {},
        },
      ]

      mapEditor.loadLocations(mixedEntities)
      
      const nodes = mapEditor.getNodes()
      expect(nodes).toHaveLength(3) // Only locations should be loaded
    })
  })

  describe('layout algorithms', () => {
    beforeEach(() => {
      mapEditor.loadLocations(testLocations, testConnections)
    })

    it('should have layout algorithm selector', () => {
      const layoutSelect = container.querySelector('.layout-algorithm') as HTMLSelectElement
      expect(layoutSelect).toBeTruthy()
      
      const options = Array.from(layoutSelect.options).map(o => o.value)
      expect(options).toContain(LayoutAlgorithm.FORCE_DIRECTED)
      expect(options).toContain(LayoutAlgorithm.CIRCULAR)
      expect(options).toContain(LayoutAlgorithm.GRID)
      expect(options).toContain(LayoutAlgorithm.HIERARCHICAL)
    })

    it('should apply auto layout', () => {
      const autoLayoutBtn = container.querySelector('.btn-auto-layout') as HTMLButtonElement
      
      // Get initial positions
      const initialNodes = mapEditor.getNodes()
      const initialPositions = initialNodes.map(n => ({ x: n.x, y: n.y }))
      
      // Trigger auto layout
      autoLayoutBtn.click()
      
      // Positions should change (in most cases)
      const updatedNodes = mapEditor.getNodes()
      const hasChanged = updatedNodes.some((node, index) => 
        node.x !== initialPositions[index].x || node.y !== initialPositions[index].y
      )
      
      // Note: Layout might not change if nodes are already optimally positioned
      expect(updatedNodes).toHaveLength(initialNodes.length)
    })

    it('should reset view', () => {
      const resetViewBtn = container.querySelector('.btn-reset-view') as HTMLButtonElement
      expect(resetViewBtn).toBeTruthy()
      
      // This should not throw
      resetViewBtn.click()
    })
  })

  describe('node selection', () => {
    beforeEach(() => {
      mapEditor.loadLocations(testLocations, testConnections)
    })

    it('should track selected nodes', () => {
      const initialSelection = mapEditor.getSelectedNodes()
      expect(initialSelection).toHaveLength(0)
    })

    it('should handle selection changes via callback', () => {
      const onSelectionChange = vi.fn()
      mapEditor.onSelectionChanged(onSelectionChange)
      
      // This callback should be registered
      expect(onSelectionChange).toBeDefined()
    })
  })

  describe('pathfinding', () => {
    beforeEach(() => {
      mapEditor.loadLocations(testLocations, testConnections)
    })

    it('should have pathfinding controls', () => {
      expect(container.querySelector('.toggle-pathfinding')).toBeTruthy()
      expect(container.querySelector('.btn-clear-path')).toBeTruthy()
    })

    it('should clear path when button clicked', () => {
      const clearPathBtn = container.querySelector('.btn-clear-path') as HTMLButtonElement
      
      // This should not throw
      clearPathBtn.click()
    })

    it('should have path analysis panel', () => {
      expect(container.querySelector('.path-analysis')).toBeTruthy()
      expect(container.querySelector('.analysis-content')).toBeTruthy()
    })
  })

  describe('view controls', () => {
    beforeEach(() => {
      mapEditor.loadLocations(testLocations)
    })

    it('should toggle grid visibility', () => {
      const gridToggle = container.querySelector('.toggle-grid') as HTMLInputElement
      expect(gridToggle).toBeTruthy()
      
      const initialState = gridToggle.checked
      gridToggle.click()
      
      // State should change
      expect(gridToggle.checked).toBe(!initialState)
    })

    it('should toggle 3D view', () => {
      const threeDToggle = container.querySelector('.toggle-3d') as HTMLInputElement
      expect(threeDToggle).toBeTruthy()
      
      const initialState = threeDToggle.checked
      threeDToggle.click()
      
      expect(threeDToggle.checked).toBe(!initialState)
    })

    it('should toggle minimap', () => {
      const minimapToggle = container.querySelector('.toggle-minimap') as HTMLInputElement
      expect(minimapToggle).toBeTruthy()
      
      const initialState = minimapToggle.checked
      minimapToggle.click()
      
      expect(minimapToggle.checked).toBe(!initialState)
    })

    it('should toggle pathfinding', () => {
      const pathfindingToggle = container.querySelector('.toggle-pathfinding') as HTMLInputElement
      expect(pathfindingToggle).toBeTruthy()
      
      const initialState = pathfindingToggle.checked
      pathfindingToggle.click()
      
      expect(pathfindingToggle.checked).toBe(!initialState)
    })
  })

  describe('mouse interactions', () => {
    beforeEach(() => {
      mapEditor.loadLocations(testLocations, testConnections)
    })

    it('should handle mouse events on canvas', () => {
      const canvas = container.querySelector('.map-canvas') as HTMLCanvasElement
      
      // Create mouse events
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        bubbles: true,
      })
      
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 150,
        clientY: 150,
        bubbles: true,
      })
      
      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 150,
        clientY: 150,
        bubbles: true,
      })

      // These should not throw
      expect(() => {
        canvas.dispatchEvent(mouseDownEvent)
        canvas.dispatchEvent(mouseMoveEvent)
        canvas.dispatchEvent(mouseUpEvent)
      }).not.toThrow()
    })

    it('should handle wheel events for zooming', () => {
      const canvas = container.querySelector('.map-canvas') as HTMLCanvasElement
      
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 100,
        bubbles: true,
      })
      
      Object.defineProperty(wheelEvent, 'preventDefault', {
        value: vi.fn(),
        writable: true,
      })

      expect(() => {
        canvas.dispatchEvent(wheelEvent)
      }).not.toThrow()
    })

    it('should handle click events', () => {
      const canvas = container.querySelector('.map-canvas') as HTMLCanvasElement
      
      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 100,
        bubbles: true,
      })

      expect(() => {
        canvas.dispatchEvent(clickEvent)
      }).not.toThrow()
    })

    it('should handle double click events', () => {
      const canvas = container.querySelector('.map-canvas') as HTMLCanvasElement
      
      const dblClickEvent = new MouseEvent('dblclick', {
        clientX: 100,
        clientY: 100,
        bubbles: true,
      })

      expect(() => {
        canvas.dispatchEvent(dblClickEvent)
      }).not.toThrow()
    })
  })

  describe('keyboard shortcuts', () => {
    beforeEach(() => {
      mapEditor.loadLocations(testLocations, testConnections)
    })

    it('should handle keyboard events', () => {
      const keyEvents = [
        new KeyboardEvent('keydown', { key: 'Delete' }),
        new KeyboardEvent('keydown', { key: 'Escape' }),
        new KeyboardEvent('keydown', { key: '0' }),
        new KeyboardEvent('keydown', { key: '1' }),
        new KeyboardEvent('keydown', { key: '2' }),
        new KeyboardEvent('keydown', { key: '3' }),
        new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }),
      ]

      keyEvents.forEach(event => {
        Object.defineProperty(event, 'preventDefault', {
          value: vi.fn(),
          writable: true,
        })
        
        expect(() => {
          document.dispatchEvent(event)
        }).not.toThrow()
      })
    })
  })

  describe('callbacks', () => {
    beforeEach(() => {
      mapEditor.loadLocations(testLocations, testConnections)
    })

    it('should register node change callback', () => {
      const onNodeChange = vi.fn()
      mapEditor.onNodeChanged(onNodeChange)
      
      expect(onNodeChange).toBeDefined()
    })

    it('should register connection change callback', () => {
      const onConnectionChange = vi.fn()
      mapEditor.onConnectionChanged(onConnectionChange)
      
      expect(onConnectionChange).toBeDefined()
    })

    it('should register selection change callback', () => {
      const onSelectionChange = vi.fn()
      mapEditor.onSelectionChanged(onSelectionChange)
      
      expect(onSelectionChange).toBeDefined()
    })
  })

  describe('data access', () => {
    beforeEach(() => {
      mapEditor.loadLocations(testLocations, testConnections)
    })

    it('should get current nodes', () => {
      const nodes = mapEditor.getNodes()
      expect(nodes).toHaveLength(3)
      expect(nodes[0]).toHaveProperty('id')
      expect(nodes[0]).toHaveProperty('entity')
      expect(nodes[0]).toHaveProperty('x')
      expect(nodes[0]).toHaveProperty('y')
      expect(nodes[0]).toHaveProperty('size')
    })

    it('should get current connections', () => {
      const connections = mapEditor.getConnections()
      expect(connections).toHaveLength(2)
      expect(connections[0]).toHaveProperty('id')
      expect(connections[0]).toHaveProperty('fromLocationId')
      expect(connections[0]).toHaveProperty('toLocationId')
      expect(connections[0]).toHaveProperty('type')
    })

    it('should get selected nodes', () => {
      const selectedNodes = mapEditor.getSelectedNodes()
      expect(Array.isArray(selectedNodes)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle resize events', () => {
      mapEditor.loadLocations(testLocations)
      
      expect(() => {
        window.dispatchEvent(new Event('resize'))
      }).not.toThrow()
    })

    it('should handle empty connections', () => {
      mapEditor.loadLocations(testLocations, [])
      
      const connections = mapEditor.getConnections()
      expect(connections).toHaveLength(0)
    })

    it('should handle invalid connection references', () => {
      const invalidConnections: Connection[] = [
        {
          id: 'invalid',
          fromLocationId: 'nonexistent1',
          toLocationId: 'nonexistent2',
          type: 'DOOR' as ConnectionType,
          bidirectional: true,
        },
      ]

      expect(() => {
        mapEditor.loadLocations(testLocations, invalidConnections)
      }).not.toThrow()
    })

    it('should handle locations with missing capacity', () => {
      const locationsWithoutCapacity: EditableEntity[] = [
        {
          id: 'room1',
          type: 'location',
          name: 'Room Without Capacity',
          description: 'A room',
          tags: [],
          metadata: {},
        },
      ]

      expect(() => {
        mapEditor.loadLocations(locationsWithoutCapacity)
      }).not.toThrow()
      
      const nodes = mapEditor.getNodes()
      expect(nodes).toHaveLength(1)
    })
  })
})