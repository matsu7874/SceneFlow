import { useState, useCallback, useRef, useEffect } from 'react';
import {
  MapEditorState,
  Location,
  Connection,
  MapData,
  Point,
  Rectangle,
  LayoutAlgorithm
} from './types';
import { AStar, gridLayout, circleLayout, forceDirectedLayout } from './pathfinding';

const INITIAL_STATE: MapEditorState = {
  mapData: {
    locations: [],
    connections: []
  },
  viewState: {
    zoom: 1,
    panX: 0,
    panY: 0
  },
  selection: {
    selectedNodes: new Set(),
    selectedConnection: null,
    rubberBand: null
  },
  dragState: {
    active: false,
    nodeId: null,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0
  },
  showGrid: true,
  gridSize: 20,
  showMinimap: true,
  layoutAlgorithm: 'manual',
  pathfinding: {
    active: false,
    start: null,
    end: null,
    path: null
  },
  history: {
    past: [],
    future: []
  }
};

export function useMapEditor() {
  const [state, setState] = useState<MapEditorState>(INITIAL_STATE);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Helper functions
  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    const { zoom, panX, panY } = state.viewState;
    return {
      x: (screenX - panX) / zoom,
      y: (screenY - panY) / zoom
    };
  }, [state.viewState]);

  const worldToScreen = useCallback((worldX: number, worldY: number): Point => {
    const { zoom, panX, panY } = state.viewState;
    return {
      x: worldX * zoom + panX,
      y: worldY * zoom + panY
    };
  }, [state.viewState]);

  const snapToGrid = useCallback((value: number): number => {
    if (!state.showGrid) return value;
    return Math.round(value / state.gridSize) * state.gridSize;
  }, [state.showGrid, state.gridSize]);

  const getNodeAt = useCallback((worldX: number, worldY: number): Location | null => {
    const nodeRadius = 20;
    for (const location of state.mapData.locations) {
      const dx = location.x - worldX;
      const dy = location.y - worldY;
      if (dx * dx + dy * dy <= nodeRadius * nodeRadius) {
        return location;
      }
    }
    return null;
  }, [state.mapData.locations]);

  const getConnectionAt = useCallback((worldX: number, worldY: number): Connection | null => {
    const threshold = 10;
    
    for (const conn of state.mapData.connections) {
      const from = state.mapData.locations.find(loc => loc.id === conn.from);
      const to = state.mapData.locations.find(loc => loc.id === conn.to);
      
      if (!from || !to) continue;
      
      // Check distance from point to line segment
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const lengthSquared = dx * dx + dy * dy;
      
      if (lengthSquared === 0) continue;
      
      const t = Math.max(0, Math.min(1, ((worldX - from.x) * dx + (worldY - from.y) * dy) / lengthSquared));
      const projX = from.x + t * dx;
      const projY = from.y + t * dy;
      
      const distance = Math.sqrt((worldX - projX) ** 2 + (worldY - projY) ** 2);
      
      if (distance <= threshold) {
        return conn;
      }
    }
    
    return null;
  }, [state.mapData]);

  const getNodesInRectangle = useCallback((rect: Rectangle): Set<string> => {
    const nodes = new Set<string>();
    
    for (const location of state.mapData.locations) {
      if (
        location.x >= rect.x &&
        location.x <= rect.x + rect.width &&
        location.y >= rect.y &&
        location.y <= rect.y + rect.height
      ) {
        nodes.add(location.id);
      }
    }
    
    return nodes;
  }, [state.mapData.locations]);

  // State update with history
  const updateMapData = useCallback((newMapData: MapData) => {
    setState(prev => ({
      ...prev,
      mapData: newMapData,
      history: {
        past: [...prev.history.past, prev.mapData],
        future: []
      }
    }));
  }, []);

  // Undo/Redo
  const undo = useCallback(() => {
    setState(prev => {
      if (prev.history.past.length === 0) return prev;
      
      const newPast = [...prev.history.past];
      const previousState = newPast.pop()!;
      
      return {
        ...prev,
        mapData: previousState,
        history: {
          past: newPast,
          future: [prev.mapData, ...prev.history.future]
        }
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.history.future.length === 0) return prev;
      
      const newFuture = [...prev.history.future];
      const nextState = newFuture.shift()!;
      
      return {
        ...prev,
        mapData: nextState,
        history: {
          past: [...prev.history.past, prev.mapData],
          future: newFuture
        }
      };
    });
  }, []);

  // Node operations
  const addNode = useCallback((x: number, y: number, name?: string) => {
    const id = `node_${Date.now()}`;
    const snappedX = snapToGrid(x);
    const snappedY = snapToGrid(y);
    
    const newLocation: Location = {
      id,
      name: name || `Location ${state.mapData.locations.length + 1}`,
      x: snappedX,
      y: snappedY,
      description: '',
      tags: []
    };
    
    updateMapData({
      ...state.mapData,
      locations: [...state.mapData.locations, newLocation]
    });
    
    return id;
  }, [state.mapData, snapToGrid, updateMapData]);

  const deleteNode = useCallback((nodeId: string) => {
    updateMapData({
      locations: state.mapData.locations.filter(loc => loc.id !== nodeId),
      connections: state.mapData.connections.filter(
        conn => conn.from !== nodeId && conn.to !== nodeId
      )
    });
    
    setState(prev => ({
      ...prev,
      selection: {
        ...prev.selection,
        selectedNodes: new Set([...prev.selection.selectedNodes].filter(id => id !== nodeId))
      }
    }));
  }, [state.mapData, updateMapData]);

  const updateNode = useCallback((nodeId: string, updates: Partial<Location>) => {
    updateMapData({
      ...state.mapData,
      locations: state.mapData.locations.map(loc =>
        loc.id === nodeId ? { ...loc, ...updates } : loc
      )
    });
  }, [state.mapData, updateMapData]);

  // Connection operations
  const addConnection = useCallback((fromId: string, toId: string, weight: number = 1, bidirectional: boolean = true) => {
    // Check if connection already exists
    const exists = state.mapData.connections.some(
      conn => (conn.from === fromId && conn.to === toId) ||
              (bidirectional && conn.from === toId && conn.to === fromId)
    );
    
    if (exists) return;
    
    const newConnection: Connection = {
      from: fromId,
      to: toId,
      weight,
      bidirectional
    };
    
    updateMapData({
      ...state.mapData,
      connections: [...state.mapData.connections, newConnection]
    });
  }, [state.mapData, updateMapData]);

  const deleteConnection = useCallback((connection: Connection) => {
    updateMapData({
      ...state.mapData,
      connections: state.mapData.connections.filter(
        conn => !(conn.from === connection.from && conn.to === connection.to)
      )
    });
  }, [state.mapData, updateMapData]);

  const updateConnection = useCallback((connection: Connection, updates: Partial<Connection>) => {
    updateMapData({
      ...state.mapData,
      connections: state.mapData.connections.map(conn =>
        conn.from === connection.from && conn.to === connection.to
          ? { ...conn, ...updates }
          : conn
      )
    });
  }, [state.mapData, updateMapData]);

  // Selection operations
  const selectNode = useCallback((nodeId: string, addToSelection: boolean = false) => {
    setState(prev => ({
      ...prev,
      selection: {
        ...prev.selection,
        selectedNodes: addToSelection
          ? new Set([...prev.selection.selectedNodes, nodeId])
          : new Set([nodeId]),
        selectedConnection: null
      }
    }));
  }, []);

  const deselectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selection: {
        selectedNodes: new Set(),
        selectedConnection: null,
        rubberBand: null
      }
    }));
  }, []);

  // Layout operations
  const applyLayout = useCallback((algorithm: LayoutAlgorithm) => {
    let newLocations: Location[];
    
    switch (algorithm) {
      case 'grid':
        newLocations = gridLayout(state.mapData.locations);
        break;
      case 'circle':
        newLocations = circleLayout(state.mapData.locations);
        break;
      case 'force':
        newLocations = forceDirectedLayout(state.mapData.locations, state.mapData.connections);
        break;
      default:
        return;
    }
    
    updateMapData({
      ...state.mapData,
      locations: newLocations
    });
    
    setState(prev => ({
      ...prev,
      layoutAlgorithm: algorithm
    }));
  }, [state.mapData, updateMapData]);

  // Pathfinding operations
  const findPath = useCallback((startId: string, endId: string) => {
    const pathfinder = new AStar(state.mapData.locations, state.mapData.connections);
    const path = pathfinder.findPath(startId, endId);
    
    setState(prev => ({
      ...prev,
      pathfinding: {
        active: true,
        start: startId,
        end: endId,
        path
      }
    }));
    
    return path;
  }, [state.mapData]);

  const clearPathfinding = useCallback(() => {
    setState(prev => ({
      ...prev,
      pathfinding: {
        active: false,
        start: null,
        end: null,
        path: null
      }
    }));
  }, []);

  // View operations
  const setZoom = useCallback((zoom: number) => {
    setState(prev => ({
      ...prev,
      viewState: {
        ...prev.viewState,
        zoom: Math.max(0.1, Math.min(5, zoom))
      }
    }));
  }, []);

  const pan = useCallback((dx: number, dy: number) => {
    setState(prev => ({
      ...prev,
      viewState: {
        ...prev.viewState,
        panX: prev.viewState.panX + dx,
        panY: prev.viewState.panY + dy
      }
    }));
  }, []);

  const resetView = useCallback(() => {
    setState(prev => ({
      ...prev,
      viewState: {
        zoom: 1,
        panX: 0,
        panY: 0
      }
    }));
  }, []);

  // Toggle operations
  const toggleGrid = useCallback(() => {
    setState(prev => ({
      ...prev,
      showGrid: !prev.showGrid
    }));
  }, []);

  const toggleMinimap = useCallback(() => {
    setState(prev => ({
      ...prev,
      showMinimap: !prev.showMinimap
    }));
  }, []);

  // Import/Export
  const exportMapData = useCallback((): string => {
    return JSON.stringify(state.mapData, null, 2);
  }, [state.mapData]);

  const importMapData = useCallback((jsonString: string) => {
    try {
      const data = JSON.parse(jsonString) as MapData;
      updateMapData(data);
      return true;
    } catch (error) {
      console.error('Failed to import map data:', error);
      return false;
    }
  }, [updateMapData]);

  return {
    // State
    state,
    canvasRef,
    minimapCanvasRef,
    
    // Coordinate conversion
    screenToWorld,
    worldToScreen,
    snapToGrid,
    
    // Query operations
    getNodeAt,
    getConnectionAt,
    getNodesInRectangle,
    
    // Node operations
    addNode,
    deleteNode,
    updateNode,
    
    // Connection operations
    addConnection,
    deleteConnection,
    updateConnection,
    
    // Selection operations
    selectNode,
    deselectAll,
    
    // Layout operations
    applyLayout,
    
    // Pathfinding operations
    findPath,
    clearPathfinding,
    
    // View operations
    setZoom,
    pan,
    resetView,
    
    // Toggle operations
    toggleGrid,
    toggleMinimap,
    
    // History operations
    undo,
    redo,
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,
    
    // Import/Export
    exportMapData,
    importMapData,
    
    // Direct state setters for complex operations
    setState
  };
}