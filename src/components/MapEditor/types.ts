export interface Location {
  id: string;
  name: string;
  x: number;
  y: number;
  description?: string;
  tags?: string[];
}

export interface Connection {
  from: string;
  to: string;
  weight: number;
  bidirectional: boolean;
}

export interface MapData {
  locations: Location[];
  connections: Connection[];
}

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface SelectionState {
  selectedNodes: Set<string>;
  selectedConnection: Connection | null;
  rubberBand: {
    active: boolean;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null;
}

export interface DragState {
  active: boolean;
  nodeId: string | null;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
}

export interface MapEditorState {
  mapData: MapData;
  viewState: ViewState;
  selection: SelectionState;
  dragState: DragState;
  showGrid: boolean;
  gridSize: number;
  showMinimap: boolean;
  layoutAlgorithm: 'manual' | 'grid' | 'circle' | 'force';
  pathfinding: {
    active: boolean;
    start: string | null;
    end: string | null;
    path: string[] | null;
  };
  history: {
    past: MapData[];
    future: MapData[];
  };
}

export type LayoutAlgorithm = 'manual' | 'grid' | 'circle' | 'force';

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}