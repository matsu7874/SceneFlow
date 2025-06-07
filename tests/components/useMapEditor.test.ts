import { renderHook, act } from '@testing-library/react'
import { useMapEditor } from '../../src/components/MapEditor/useMapEditor'

describe('useMapEditor', () => {
  describe('Node Selection', () => {
    it('should select a single node', () => {
      const { result } = renderHook(() => useMapEditor())

      act(() => {
        // Add some test nodes
        result.current.addNode(100, 100)
        result.current.addNode(200, 200)
      })

      const firstNodeId = result.current.state.mapData.locations[0].id

      act(() => {
        result.current.selectNode(firstNodeId)
      })

      expect(result.current.state.selection.selectedNodes.has(firstNodeId)).toBe(true)
      expect(result.current.state.selection.selectedNodes.size).toBe(1)
    })

    it('should add node to selection with addToSelection parameter', () => {
      const { result } = renderHook(() => useMapEditor())

      let firstNodeId: string
      let secondNodeId: string

      act(() => {
        firstNodeId = result.current.addNode(100, 100)
        secondNodeId = result.current.addNode(200, 200)
      })

      // Verify nodes were created
      expect(firstNodeId).toBe('101')
      expect(secondNodeId).toBe('102')
      expect(result.current.state.mapData.locations.length).toBe(2)

      act(() => {
        result.current.selectNode(firstNodeId!)
        result.current.selectNode(secondNodeId!, true) // Add to selection
      })

      expect(result.current.state.selection.selectedNodes.has(firstNodeId!)).toBe(true)
      expect(result.current.state.selection.selectedNodes.has(secondNodeId!)).toBe(true)
      expect(result.current.state.selection.selectedNodes.size).toBe(2)
    })

    it('should toggle node selection when already selected', () => {
      const { result } = renderHook(() => useMapEditor())

      let firstNodeId: string
      let secondNodeId: string

      act(() => {
        firstNodeId = result.current.addNode(100, 100)
        secondNodeId = result.current.addNode(200, 200)
      })

      act(() => {
        // Select both nodes
        result.current.selectNode(firstNodeId!)
        result.current.selectNode(secondNodeId!, true)
      })

      expect(result.current.state.selection.selectedNodes.size).toBe(2)

      act(() => {
        // Toggle first node (should deselect)
        result.current.selectNode(firstNodeId!, true)
      })

      expect(result.current.state.selection.selectedNodes.has(firstNodeId!)).toBe(false)
      expect(result.current.state.selection.selectedNodes.has(secondNodeId!)).toBe(true)
      expect(result.current.state.selection.selectedNodes.size).toBe(1)
    })
  })

  describe('Select All', () => {
    it('should select all nodes', () => {
      const { result } = renderHook(() => useMapEditor())

      // Add nodes first
      const nodeIds: string[] = []
      act(() => {
        nodeIds.push(result.current.addNode(100, 100))
        nodeIds.push(result.current.addNode(200, 200))
        nodeIds.push(result.current.addNode(300, 300))
      })

      // Now select all
      act(() => {
        result.current.selectAll()
      })

      expect(result.current.state.selection.selectedNodes.size).toBe(3)

      // Check all nodes are selected
      result.current.state.mapData.locations.forEach(node => {
        expect(result.current.state.selection.selectedNodes.has(node.id)).toBe(true)
      })
    })

    it('should handle select all with no nodes', () => {
      const { result } = renderHook(() => useMapEditor())

      act(() => {
        result.current.selectAll()
      })

      expect(result.current.state.selection.selectedNodes.size).toBe(0)
    })
  })

  describe('Rubber Band Selection', () => {
    it('should select nodes within rectangle', () => {
      const { result } = renderHook(() => useMapEditor())

      act(() => {
        result.current.addNode(100, 100)
        result.current.addNode(200, 200)
        result.current.addNode(400, 400) // Outside selection area
      })

      const rect = {
        x: 50,
        y: 50,
        width: 300,
        height: 300,
      }

      act(() => {
        const selectedNodes = result.current.getNodesInRectangle(rect)
        result.current.setState(prev => ({
          ...prev,
          selection: {
            ...prev.selection,
            selectedNodes: selectedNodes,
          },
        }))
      })

      // First two nodes should be selected
      expect(result.current.state.selection.selectedNodes.size).toBe(2)
    })

    it('should handle empty selection area', () => {
      const { result } = renderHook(() => useMapEditor())

      act(() => {
        result.current.addNode(100, 100)
        result.current.addNode(200, 200)
      })

      const rect = {
        x: 500,
        y: 500,
        width: 100,
        height: 100,
      }

      act(() => {
        const selectedNodes = result.current.getNodesInRectangle(rect)
        result.current.setState(prev => ({
          ...prev,
          selection: {
            ...prev.selection,
            selectedNodes: selectedNodes,
          },
        }))
      })

      expect(result.current.state.selection.selectedNodes.size).toBe(0)
    })
  })

  describe('Node Operations', () => {
    it('should add node at specified position', () => {
      const { result } = renderHook(() => useMapEditor())

      act(() => {
        result.current.addNode(150, 250)
      })

      const node = result.current.state.mapData.locations[0]
      // Node position is snapped to grid (gridSize = 20)
      expect(node.x).toBe(160) // 150 -> 160 (nearest grid line)
      expect(node.y).toBe(260) // 250 -> 260 (nearest grid line)
      expect(node.name).toMatch(/Location \d+/)
      expect(node.id).toBe('101') // First location ID should be 101
    })

    it('should auto-increment location ID', () => {
      const { result } = renderHook(() => useMapEditor())

      act(() => {
        // Add multiple nodes
        result.current.addNode(100, 100)
        result.current.addNode(200, 200)
        result.current.addNode(300, 300)
      })

      const locations = result.current.state.mapData.locations
      expect(locations[0].id).toBe('101')
      expect(locations[1].id).toBe('102')
      expect(locations[2].id).toBe('103')
    })

    it('should find max ID correctly with existing locations', () => {
      const { result } = renderHook(() => useMapEditor())

      act(() => {
        // Import data with existing IDs
        result.current.importMapData(JSON.stringify({
          locations: [
            { id: '105', name: 'Location 1', x: 100, y: 100, description: '', tags: [] },
            { id: '110', name: 'Location 2', x: 200, y: 200, description: '', tags: [] },
            { id: '108', name: 'Location 3', x: 300, y: 300, description: '', tags: [] },
          ],
          connections: [],
        }))
      })

      act(() => {
        // Add new node - should use max(105, 110, 108) + 1 = 111
        result.current.addNode(400, 400)
      })

      const locations = result.current.state.mapData.locations
      expect(locations[3].id).toBe('111')
    })

    it('should delete selected nodes', () => {
      const { result } = renderHook(() => useMapEditor())

      let firstNodeId: string

      act(() => {
        firstNodeId = result.current.addNode(100, 100)
        result.current.addNode(200, 200)
      })

      act(() => {
        result.current.selectNode(firstNodeId!)
        result.current.deleteNode(firstNodeId!)
      })

      expect(result.current.state.mapData.locations.length).toBe(1)
      expect(result.current.state.selection.selectedNodes.has(firstNodeId!)).toBe(false)
    })

    it('should update node properties', () => {
      const { result } = renderHook(() => useMapEditor())

      act(() => {
        result.current.addNode(100, 100)
      })

      const nodeId = result.current.state.mapData.locations[0].id

      act(() => {
        result.current.updateNode(nodeId, {
          name: 'Updated Node',
          x: 150,
          y: 250,
          description: 'Test description',
          tags: ['tag1', 'tag2'],
        })
      })

      const updatedNode = result.current.state.mapData.locations[0]
      expect(updatedNode.name).toBe('Updated Node')
      expect(updatedNode.x).toBe(150)
      expect(updatedNode.y).toBe(250)
      expect(updatedNode.description).toBe('Test description')
      expect(updatedNode.tags).toEqual(['tag1', 'tag2'])
    })
  })

  describe('Connection Operations', () => {
    it('should add connection between nodes', () => {
      const { result } = renderHook(() => useMapEditor())

      let fromId: string
      let toId: string

      act(() => {
        fromId = result.current.addNode(100, 100)
        toId = result.current.addNode(200, 200)
      })

      act(() => {
        result.current.addConnection(fromId!, toId!)
      })

      const connection = result.current.state.mapData.connections[0]
      expect(connection.from).toBe(fromId!)
      expect(connection.to).toBe(toId!)
      expect(connection.weight).toBe(1)
      expect(connection.bidirectional).toBe(true)
    })

    it('should not add duplicate connections', () => {
      const { result } = renderHook(() => useMapEditor())

      let fromId: string
      let toId: string

      act(() => {
        fromId = result.current.addNode(100, 100)
        toId = result.current.addNode(200, 200)
      })

      act(() => {
        result.current.addConnection(fromId!, toId!)
        result.current.addConnection(fromId!, toId!) // Try to add duplicate
      })

      expect(result.current.state.mapData.connections.length).toBe(1)
    })
  })

  describe('Undo/Redo', () => {
    it('should undo node addition', () => {
      const { result } = renderHook(() => useMapEditor())

      act(() => {
        result.current.addNode(100, 100)
      })

      expect(result.current.state.mapData.locations.length).toBe(1)

      act(() => {
        result.current.undo()
      })

      expect(result.current.state.mapData.locations.length).toBe(0)
    })

    it('should redo after undo', () => {
      const { result } = renderHook(() => useMapEditor())

      act(() => {
        result.current.addNode(100, 100)
      })

      act(() => {
        result.current.undo()
      })

      expect(result.current.state.mapData.locations.length).toBe(0)

      act(() => {
        result.current.redo()
      })

      expect(result.current.state.mapData.locations.length).toBe(1)
    })

    it('should track canUndo and canRedo states', () => {
      const { result } = renderHook(() => useMapEditor())

      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)

      act(() => {
        result.current.addNode(100, 100)
      })

      expect(result.current.canUndo).toBe(true)
      expect(result.current.canRedo).toBe(false)

      act(() => {
        result.current.undo()
      })

      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(true)
    })
  })
})