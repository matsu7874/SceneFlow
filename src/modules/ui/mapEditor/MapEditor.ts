/**
 * Map Editor Component
 *
 * Node-based visual editor for location connections and spatial relationships
 */

import type { EntityId } from '../../types/causality'
import type { EditableEntity } from '../entityEditor/EntityEditor'
import type { Connection, ConnectionType } from '../entityEditor/RelationshipEditor'
import { VisualFeedbackManager, FeedbackType } from '../visualFeedback'

/**
 * Map node representing a location
 */
export interface MapNode {
  id: EntityId
  entity: EditableEntity
  x: number
  y: number
  z?: number // For 3D positioning
  size: number
  connections: Connection[]
  isSelected: boolean
  isDragging: boolean
}

/**
 * Map editor configuration
 */
export interface MapEditorConfig {
  width?: number
  height?: number
  enableGrid?: boolean
  gridSize?: number
  enable3D?: boolean
  autoLayout?: boolean
  showMinimap?: boolean
  pathfindingEnabled?: boolean
  maxZoom?: number
  minZoom?: number
}

/**
 * Path finding result
 */
export interface PathResult {
  path: EntityId[]
  distance: number
  steps: number
  blocked: boolean
  reason?: string
}

/**
 * Layout algorithm options
 */
export enum LayoutAlgorithm {
  FORCE_DIRECTED = 'force-directed',
  HIERARCHICAL = 'hierarchical',
  CIRCULAR = 'circular',
  GRID = 'grid',
  MANUAL = 'manual',
}

/**
 * Node-based map editor for location connections
 */
export class MapEditor {
  private container: HTMLElement
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private svg: SVGElement
  private feedbackManager: VisualFeedbackManager
  private config: Required<MapEditorConfig>

  // Map data
  private nodes: Map<EntityId, MapNode> = new Map()
  private connections: Map<string, Connection> = new Map()
  private selectedNodes: Set<EntityId> = new Set()
  private hoveredNode: EntityId | null = null

  // Interaction state
  private isDragging = false
  private dragTarget: EntityId | null = null
  private dragOffset = { x: 0, y: 0 }
  private isConnecting = false
  private connectionStart: EntityId | null = null

  // View state
  private zoom = 1
  private panX = 0
  private panY = 0
  private viewportWidth = 800
  private viewportHeight = 600

  // Pathfinding
  private pathfinding: PathfindingManager
  private currentPath: EntityId[] = []

  // Callbacks
  private onNodeChange?: (nodes: MapNode[]) => void
  private onConnectionChange?: (connections: Connection[]) => void
  private onSelectionChange?: (selectedNodes: EntityId[]) => void

  constructor(
    container: HTMLElement,
    config: MapEditorConfig = {},
    feedbackManager?: VisualFeedbackManager,
  ) {
    this.container = container
    this.feedbackManager = feedbackManager || new VisualFeedbackManager(container)
    this.config = Object.assign({
      width: 800,
      height: 600,
      enableGrid: true,
      gridSize: 50,
      enable3D: false,
      autoLayout: true,
      showMinimap: false,
      pathfindingEnabled: true,
      maxZoom: 3,
      minZoom: 0.1,
    }, config)

    this.pathfinding = new PathfindingManager()
    this.setupCanvas()
    this.setupEventHandlers()
    this.render()
  }

  /**
   * Setup canvas and SVG layers
   */
  private setupCanvas(): void {
    this.container.innerHTML = `
      <div class="map-editor">
        <div class="map-toolbar">
          <div class="layout-controls">
            <select class="layout-algorithm">
              <option value="${LayoutAlgorithm.FORCE_DIRECTED}">Force Directed</option>
              <option value="${LayoutAlgorithm.HIERARCHICAL}">Hierarchical</option>
              <option value="${LayoutAlgorithm.CIRCULAR}">Circular</option>
              <option value="${LayoutAlgorithm.GRID}">Grid</option>
              <option value="${LayoutAlgorithm.MANUAL}">Manual</option>
            </select>
            <button class="btn-auto-layout">Auto Layout</button>
            <button class="btn-reset-view">Reset View</button>
          </div>
          <div class="view-controls">
            <label>
              <input type="checkbox" class="toggle-grid" ${this.config.enableGrid ? 'checked' : ''}>
              Grid
            </label>
            <label>
              <input type="checkbox" class="toggle-3d" ${this.config.enable3D ? 'checked' : ''}>
              3D View
            </label>
            <label>
              <input type="checkbox" class="toggle-minimap" ${this.config.showMinimap ? 'checked' : ''}>
              Minimap
            </label>
          </div>
          <div class="pathfinding-controls">
            <label>
              <input type="checkbox" class="toggle-pathfinding" ${this.config.pathfindingEnabled ? 'checked' : ''}>
              Pathfinding
            </label>
            <button class="btn-clear-path">Clear Path</button>
          </div>
        </div>
        <div class="map-container">
          <canvas class="map-canvas" width="${this.config.width}" height="${this.config.height}"></canvas>
          <svg class="map-svg" width="${this.config.width}" height="${this.config.height}"></svg>
          ${this.config.showMinimap ? '<div class="minimap"></div>' : ''}
        </div>
        <div class="map-sidebar">
          <div class="node-properties">
            <h4>Node Properties</h4>
            <div class="properties-content"></div>
          </div>
          <div class="path-analysis">
            <h4>Path Analysis</h4>
            <div class="analysis-content"></div>
          </div>
        </div>
      </div>
    `

    this.canvas = this.container.querySelector('.map-canvas') as HTMLCanvasElement
    this.svg = this.container.querySelector('.map-svg') as SVGElement
    
    const ctx = this.canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Unable to get 2D context from canvas')
    }
    this.ctx = ctx

    this.viewportWidth = this.config.width
    this.viewportHeight = this.config.height
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Toolbar controls
    const layoutSelect = this.container.querySelector('.layout-algorithm') as HTMLSelectElement
    layoutSelect.addEventListener('change', () => {
      this.applyLayout(layoutSelect.value as LayoutAlgorithm)
    })

    const autoLayoutBtn = this.container.querySelector('.btn-auto-layout')
    autoLayoutBtn?.addEventListener('click', () => this.autoLayout())

    const resetViewBtn = this.container.querySelector('.btn-reset-view')
    resetViewBtn?.addEventListener('click', () => this.resetView())

    const clearPathBtn = this.container.querySelector('.btn-clear-path')
    clearPathBtn?.addEventListener('click', () => this.clearPath())

    // Toggle controls
    const gridToggle = this.container.querySelector('.toggle-grid') as HTMLInputElement
    gridToggle.addEventListener('change', () => {
      this.config.enableGrid = gridToggle.checked
      this.render()
    })

    const threeDToggle = this.container.querySelector('.toggle-3d') as HTMLInputElement
    threeDToggle.addEventListener('change', () => {
      this.config.enable3D = threeDToggle.checked
      this.render()
    })

    const minimapToggle = this.container.querySelector('.toggle-minimap') as HTMLInputElement
    minimapToggle.addEventListener('change', () => {
      this.config.showMinimap = minimapToggle.checked
      this.toggleMinimap()
    })

    const pathfindingToggle = this.container.querySelector('.toggle-pathfinding') as HTMLInputElement
    pathfindingToggle.addEventListener('change', () => {
      this.config.pathfindingEnabled = pathfindingToggle.checked
      if (!this.config.pathfindingEnabled) {
        this.clearPath()
      }
    })

    // Canvas interactions
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e))
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e))
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e))
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e))
    this.canvas.addEventListener('click', (e) => this.handleClick(e))
    this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e))

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyDown(e))

    // Resize handling
    window.addEventListener('resize', () => this.handleResize())
  }

  /**
   * Load locations as map nodes
   */
  loadLocations(locations: EditableEntity[], connections: Connection[] = []): void {
    this.nodes.clear()
    this.connections.clear()

    // Create nodes for each location
    locations.forEach((location, index) => {
      if (location.type !== 'location') return

      const node: MapNode = {
        id: location.id,
        entity: location,
        x: 100 + (index % 5) * 150,
        y: 100 + Math.floor(index / 5) * 150,
        z: 0,
        size: this.calculateNodeSize(location),
        connections: [],
        isSelected: false,
        isDragging: false,
      }

      this.nodes.set(location.id, node)
    })

    // Add connections
    connections.forEach(connection => {
      this.connections.set(connection.id, connection)
      
      // Add to node connection lists
      const fromNode = this.nodes.get(connection.fromLocationId)
      const toNode = this.nodes.get(connection.toLocationId)
      
      if (fromNode) {
        fromNode.connections.push(connection)
      }
      if (toNode && connection.bidirectional) {
        toNode.connections.push(connection)
      }
    })

    // Update pathfinding graph
    this.pathfinding.updateGraph(this.nodes, this.connections)

    // Apply auto layout if enabled
    if (this.config.autoLayout) {
      this.autoLayout()
    } else {
      this.render()
    }
  }

  /**
   * Calculate node size based on location properties
   */
  private calculateNodeSize(location: EditableEntity): number {
    let baseSize = 30

    // Size based on capacity
    if (location.type === 'location' && (location as any).capacity) {
      const capacity = (location as any).capacity as number
      baseSize += Math.min(capacity / 5, 20)
    }

    // Size based on number of connections
    const connectionCount = Array.from(this.connections.values()).filter(
      conn => conn.fromLocationId === location.id || conn.toLocationId === location.id
    ).length
    baseSize += connectionCount * 2

    return Math.max(20, Math.min(80, baseSize))
  }

  /**
   * Render the entire map
   */
  private render(): void {
    this.clearCanvas()
    
    if (this.config.enableGrid) {
      this.renderGrid()
    }

    this.renderConnections()
    this.renderNodes()
    this.renderPath()

    if (this.config.showMinimap) {
      this.renderMinimap()
    }

    this.updateSidebar()
  }

  /**
   * Clear the canvas
   */
  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Clear SVG
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild)
    }
  }

  /**
   * Render background grid
   */
  private renderGrid(): void {
    const gridSize = this.config.gridSize * this.zoom
    
    this.ctx.strokeStyle = '#f0f0f0'
    this.ctx.lineWidth = 1

    // Vertical lines
    for (let x = (this.panX % gridSize); x < this.viewportWidth; x += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.viewportHeight)
      this.ctx.stroke()
    }

    // Horizontal lines
    for (let y = (this.panY % gridSize); y < this.viewportHeight; y += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.viewportWidth, y)
      this.ctx.stroke()
    }
  }

  /**
   * Render connections between nodes
   */
  private renderConnections(): void {
    for (const connection of this.connections.values()) {
      const fromNode = this.nodes.get(connection.fromLocationId)
      const toNode = this.nodes.get(connection.toLocationId)

      if (fromNode && toNode) {
        this.renderConnection(connection, fromNode, toNode)
      }
    }
  }

  /**
   * Render a single connection
   */
  private renderConnection(connection: Connection, fromNode: MapNode, toNode: MapNode): void {
    const fromPos = this.worldToScreen(fromNode.x, fromNode.y)
    const toPos = this.worldToScreen(toNode.x, toNode.y)

    this.ctx.strokeStyle = this.getConnectionColor(connection)
    this.ctx.lineWidth = this.getConnectionWidth(connection)
    this.ctx.setLineDash(connection.type === 'HIDDEN' ? [5, 5] : [])

    this.ctx.beginPath()
    this.ctx.moveTo(fromPos.x, fromPos.y)
    this.ctx.lineTo(toPos.x, toPos.y)
    this.ctx.stroke()

    // Draw arrowhead if not bidirectional
    if (!connection.bidirectional) {
      this.drawArrowhead(fromPos, toPos, this.ctx.strokeStyle)
    }

    // Draw connection label
    const midX = (fromPos.x + toPos.x) / 2
    const midY = (fromPos.y + toPos.y) / 2
    
    this.ctx.fillStyle = '#666'
    this.ctx.font = `${10 * this.zoom}px Arial`
    this.ctx.textAlign = 'center'
    this.ctx.fillText(connection.type || 'connection', midX, midY - 5)

    this.ctx.setLineDash([])
  }

  /**
   * Render map nodes
   */
  private renderNodes(): void {
    // Render nodes in order: normal -> hovered -> selected
    const normalNodes = Array.from(this.nodes.values()).filter(
      node => !node.isSelected && node.id !== this.hoveredNode
    )
    const hoveredNodes = this.hoveredNode ? [this.nodes.get(this.hoveredNode)!].filter(Boolean) : []
    const selectedNodes = Array.from(this.nodes.values()).filter(node => node.isSelected)

    const allNodes = normalNodes.concat(hoveredNodes).concat(selectedNodes)
    allNodes.forEach(node => {
      this.renderNode(node)
    })
  }

  /**
   * Render a single node
   */
  private renderNode(node: MapNode): void {
    const pos = this.worldToScreen(node.x, node.y)
    const size = node.size * this.zoom

    // Node shadow
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
    this.ctx.shadowBlur = 5
    this.ctx.shadowOffsetX = 2
    this.ctx.shadowOffsetY = 2

    // Node circle
    this.ctx.fillStyle = this.getNodeColor(node)
    this.ctx.beginPath()
    this.ctx.arc(pos.x, pos.y, size / 2, 0, 2 * Math.PI)
    this.ctx.fill()

    // Reset shadow
    this.ctx.shadowColor = 'transparent'
    this.ctx.shadowBlur = 0
    this.ctx.shadowOffsetX = 0
    this.ctx.shadowOffsetY = 0

    // Node border
    this.ctx.strokeStyle = this.getNodeBorderColor(node)
    this.ctx.lineWidth = this.getNodeBorderWidth(node)
    this.ctx.beginPath()
    this.ctx.arc(pos.x, pos.y, size / 2, 0, 2 * Math.PI)
    this.ctx.stroke()

    // Node label
    this.ctx.fillStyle = '#fff'
    this.ctx.font = `bold ${Math.max(10, 12 * this.zoom)}px Arial`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(
      node.entity.name.slice(0, 8),
      pos.x,
      pos.y
    )

    // Node capacity indicator
    if (node.entity.type === 'location' && (node.entity as any).capacity) {
      const capacity = (node.entity as any).capacity as number
      this.ctx.fillStyle = '#333'
      this.ctx.font = `${8 * this.zoom}px Arial`
      this.ctx.fillText(
        `(${capacity})`,
        pos.x,
        pos.y + size / 2 + 15
      )
    }

    // Connection count indicator
    const connectionCount = node.connections.length
    if (connectionCount > 0) {
      this.ctx.fillStyle = '#ff9800'
      this.ctx.fillRect(pos.x + size / 2 - 8, pos.y - size / 2, 16, 12)
      this.ctx.fillStyle = '#fff'
      this.ctx.font = `${8 * this.zoom}px Arial`
      this.ctx.textAlign = 'center'
      this.ctx.fillText(
        connectionCount.toString(),
        pos.x + size / 2,
        pos.y - size / 2 + 6
      )
    }
  }

  /**
   * Render current path
   */
  private renderPath(): void {
    if (this.currentPath.length < 2) return

    this.ctx.strokeStyle = '#2196f3'
    this.ctx.lineWidth = 4 * this.zoom
    this.ctx.setLineDash([])
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'

    this.ctx.beginPath()
    
    for (let i = 0; i < this.currentPath.length; i++) {
      const node = this.nodes.get(this.currentPath[i])
      if (!node) continue

      const pos = this.worldToScreen(node.x, node.y)
      
      if (i === 0) {
        this.ctx.moveTo(pos.x, pos.y)
      } else {
        this.ctx.lineTo(pos.x, pos.y)
      }
    }

    this.ctx.stroke()

    // Add path direction indicators
    for (let i = 0; i < this.currentPath.length - 1; i++) {
      const fromNode = this.nodes.get(this.currentPath[i])
      const toNode = this.nodes.get(this.currentPath[i + 1])
      
      if (fromNode && toNode) {
        const fromPos = this.worldToScreen(fromNode.x, fromNode.y)
        const toPos = this.worldToScreen(toNode.x, toNode.y)
        this.drawArrowhead(fromPos, toPos, '#2196f3')
      }
    }
  }

  /**
   * Draw arrowhead for connections
   */
  private drawArrowhead(from: { x: number; y: number }, to: { x: number; y: number }, color: string): void {
    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    const size = 10 * this.zoom

    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.moveTo(to.x, to.y)
    this.ctx.lineTo(
      to.x - size * Math.cos(angle - Math.PI / 6),
      to.y - size * Math.sin(angle - Math.PI / 6)
    )
    this.ctx.lineTo(
      to.x - size * Math.cos(angle + Math.PI / 6),
      to.y - size * Math.sin(angle + Math.PI / 6)
    )
    this.ctx.closePath()
    this.ctx.fill()
  }

  /**
   * Get node color based on state and type
   */
  private getNodeColor(node: MapNode): string {
    if (node.isSelected) return '#2196f3'
    if (node.id === this.hoveredNode) return '#03a9f4'
    
    // Color based on location attributes
    const entity = node.entity
    if (entity.type === 'location') {
      const capacity = (entity as any).capacity || 10
      if (capacity > 50) return '#4caf50' // Green for large locations
      if (capacity > 20) return '#ff9800' // Orange for medium locations
      return '#9e9e9e' // Gray for small locations
    }
    
    return '#9e9e9e'
  }

  /**
   * Get node border color
   */
  private getNodeBorderColor(node: MapNode): string {
    if (node.isSelected) return '#1976d2'
    if (node.id === this.hoveredNode) return '#0288d1'
    return '#666'
  }

  /**
   * Get node border width
   */
  private getNodeBorderWidth(node: MapNode): number {
    if (node.isSelected) return 3 * this.zoom
    if (node.id === this.hoveredNode) return 2 * this.zoom
    return 1 * this.zoom
  }

  /**
   * Get connection color based on type
   */
  private getConnectionColor(connection: Connection): string {
    switch (connection.type) {
      case 'DOOR': return '#4caf50'
      case 'PASSAGE': return '#2196f3'
      case 'STAIRS': return '#ff9800'
      case 'ELEVATOR': return '#9c27b0'
      case 'PORTAL': return '#e91e63'
      case 'HIDDEN': return '#9e9e9e'
      case 'LOCKED': return '#f44336'
      default: return '#333'
    }
  }

  /**
   * Get connection width based on type
   */
  private getConnectionWidth(connection: Connection): number {
    const baseWidth = 2 * this.zoom
    
    switch (connection.type) {
      case 'PASSAGE': return baseWidth * 1.5
      case 'DOOR': return baseWidth
      case 'HIDDEN': return baseWidth * 0.7
      default: return baseWidth
    }
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  private worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: (worldX + this.panX) * this.zoom,
      y: (worldY + this.panY) * this.zoom,
    }
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX / this.zoom - this.panX,
      y: screenY / this.zoom - this.panY,
    }
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const worldPos = this.screenToWorld(screenX, screenY)

    // Check if clicking on a node
    const clickedNode = this.getNodeAt(worldPos.x, worldPos.y)
    
    if (clickedNode) {
      // Handle pathfinding mode
      if (this.config.pathfindingEnabled && e.shiftKey) {
        this.handlePathfindingClick(clickedNode.id)
        return
      }

      // Handle connection mode
      if (e.ctrlKey) {
        this.handleConnectionMode(clickedNode.id)
        return
      }

      // Handle selection
      if (!e.shiftKey) {
        this.clearSelection()
      }
      this.selectNode(clickedNode.id)

      // Start dragging
      this.isDragging = true
      this.dragTarget = clickedNode.id
      this.dragOffset = {
        x: worldPos.x - clickedNode.x,
        y: worldPos.y - clickedNode.y,
      }
      
      clickedNode.isDragging = true
    } else {
      // Clear selection if clicking on empty space
      if (!e.shiftKey) {
        this.clearSelection()
      }
    }

    this.render()
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const worldPos = this.screenToWorld(screenX, screenY)

    // Handle dragging
    if (this.isDragging && this.dragTarget) {
      const node = this.nodes.get(this.dragTarget)
      if (node) {
        node.x = worldPos.x - this.dragOffset.x
        node.y = worldPos.y - this.dragOffset.y
        
        // Snap to grid if enabled
        if (this.config.enableGrid && !e.altKey) {
          const gridSize = this.config.gridSize
          node.x = Math.round(node.x / gridSize) * gridSize
          node.y = Math.round(node.y / gridSize) * gridSize
        }
        
        this.render()
      }
    } else {
      // Handle hover
      const hoveredNode = this.getNodeAt(worldPos.x, worldPos.y)
      const newHovered = hoveredNode?.id || null
      
      if (newHovered !== this.hoveredNode) {
        this.hoveredNode = newHovered
        this.canvas.style.cursor = newHovered ? 'pointer' : 'default'
        this.render()
      }
    }
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(_e: MouseEvent): void {
    if (this.isDragging && this.dragTarget) {
      const node = this.nodes.get(this.dragTarget)
      if (node) {
        node.isDragging = false
        this.onNodeChange?.(Array.from(this.nodes.values()))
      }
    }

    this.isDragging = false
    this.dragTarget = null
    this.dragOffset = { x: 0, y: 0 }
  }

  /**
   * Handle wheel events for zooming
   */
  private handleWheel(e: WheelEvent): void {
    e.preventDefault()

    const rect = this.canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, this.zoom * zoomFactor))

    // Zoom towards mouse position
    this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom)
    this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom)
    this.zoom = newZoom

    this.render()
  }

  /**
   * Handle click events
   */
  private handleClick(e: MouseEvent): void {
    // Click handling is done in mousedown for better responsiveness
  }

  /**
   * Handle double click events
   */
  private handleDoubleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const worldPos = this.screenToWorld(screenX, screenY)

    const clickedNode = this.getNodeAt(worldPos.x, worldPos.y)
    
    if (clickedNode) {
      // Center view on double-clicked node
      this.centerOnNode(clickedNode.id)
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.container.contains(document.activeElement)) return

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        this.deleteSelectedNodes()
        break
      case 'a':
        if (e.ctrlKey) {
          e.preventDefault()
          this.selectAllNodes()
        }
        break
      case 'Escape':
        this.clearSelection()
        this.clearPath()
        break
      case '1':
        this.applyLayout(LayoutAlgorithm.FORCE_DIRECTED)
        break
      case '2':
        this.applyLayout(LayoutAlgorithm.CIRCULAR)
        break
      case '3':
        this.applyLayout(LayoutAlgorithm.GRID)
        break
      case '0':
        this.resetView()
        break
    }
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    const rect = this.container.getBoundingClientRect()
    this.viewportWidth = rect.width
    this.viewportHeight = rect.height
    this.canvas.width = this.viewportWidth
    this.canvas.height = this.viewportHeight
    this.svg.setAttribute('width', this.viewportWidth.toString())
    this.svg.setAttribute('height', this.viewportHeight.toString())
    this.render()
  }

  /**
   * Get node at world coordinates
   */
  private getNodeAt(worldX: number, worldY: number): MapNode | null {
    for (const node of this.nodes.values()) {
      const distance = Math.sqrt((worldX - node.x) ** 2 + (worldY - node.y) ** 2)
      if (distance <= node.size / 2) {
        return node
      }
    }
    return null
  }

  /**
   * Select a node
   */
  private selectNode(nodeId: EntityId): void {
    const node = this.nodes.get(nodeId)
    if (node) {
      node.isSelected = true
      this.selectedNodes.add(nodeId)
      this.onSelectionChange?.(Array.from(this.selectedNodes))
    }
  }

  /**
   * Clear all selections
   */
  private clearSelection(): void {
    this.selectedNodes.clear()
    for (const node of this.nodes.values()) {
      node.isSelected = false
    }
    this.onSelectionChange?.(Array.from(this.selectedNodes))
  }

  /**
   * Select all nodes
   */
  private selectAllNodes(): void {
    this.selectedNodes.clear()
    for (const node of this.nodes.values()) {
      node.isSelected = true
      this.selectedNodes.add(node.id)
    }
    this.onSelectionChange?.(Array.from(this.selectedNodes))
    this.render()
  }

  /**
   * Delete selected nodes
   */
  private deleteSelectedNodes(): void {
    if (this.selectedNodes.size === 0) return

    const nodeIds = Array.from(this.selectedNodes)
    
    // Remove nodes
    nodeIds.forEach(nodeId => {
      this.nodes.delete(nodeId)
    })

    // Remove connections involving deleted nodes
    const connectionsToDelete = Array.from(this.connections.values()).filter(
      conn => nodeIds.includes(conn.fromLocationId) || nodeIds.includes(conn.toLocationId)
    )
    
    connectionsToDelete.forEach(conn => {
      this.connections.delete(conn.id)
    })

    this.clearSelection()
    this.pathfinding.updateGraph(this.nodes, this.connections)
    this.onNodeChange?.(Array.from(this.nodes.values()))
    this.onConnectionChange?.(Array.from(this.connections.values()))
    this.render()

    this.feedbackManager.showNotification(
      `Deleted ${nodeIds.length} node${nodeIds.length > 1 ? 's' : ''}`,
      FeedbackType.INFO
    )
  }

  /**
   * Handle pathfinding click
   */
  private handlePathfindingClick(nodeId: EntityId): void {
    if (!this.config.pathfindingEnabled) return

    if (!this.connectionStart) {
      // Start pathfinding
      this.connectionStart = nodeId
      this.feedbackManager.showNotification('Select destination node', FeedbackType.INFO)
    } else if (this.connectionStart === nodeId) {
      // Same node clicked, cancel
      this.connectionStart = null
      this.clearPath()
    } else {
      // Find path
      const result = this.pathfinding.findPath(this.connectionStart, nodeId)
      if (result.path.length > 0) {
        this.currentPath = result.path
        this.feedbackManager.showNotification(
          `Path found: ${result.steps} steps, ${result.distance.toFixed(1)} distance`,
          FeedbackType.SUCCESS
        )
      } else {
        this.feedbackManager.showNotification(
          result.reason || 'No path found',
          FeedbackType.ERROR
        )
      }
      this.connectionStart = null
      this.render()
    }
  }

  /**
   * Handle connection mode
   */
  private handleConnectionMode(nodeId: EntityId): void {
    if (!this.connectionStart) {
      // Start connection
      this.connectionStart = nodeId
      this.isConnecting = true
      this.feedbackManager.showNotification('Select target node to connect', FeedbackType.INFO)
    } else if (this.connectionStart === nodeId) {
      // Same node clicked, cancel
      this.connectionStart = null
      this.isConnecting = false
    } else {
      // Create connection
      this.createConnection(this.connectionStart, nodeId)
      this.connectionStart = null
      this.isConnecting = false
    }
  }

  /**
   * Create a new connection between nodes
   */
  private createConnection(fromId: EntityId, toId: EntityId, type: ConnectionType = 'DIRECT'): void {
    const connection: Connection = {
      id: `conn-${Date.now()}`,
      fromLocationId: fromId,
      toLocationId: toId,
      type,
      bidirectional: true,
    }

    this.connections.set(connection.id, connection)

    // Update node connections
    const fromNode = this.nodes.get(fromId)
    const toNode = this.nodes.get(toId)
    
    if (fromNode) {
      fromNode.connections.push(connection)
    }
    if (toNode) {
      toNode.connections.push(connection)
    }

    this.pathfinding.updateGraph(this.nodes, this.connections)
    this.onConnectionChange?.(Array.from(this.connections.values()))
    this.render()

    this.feedbackManager.showNotification('Connection created', FeedbackType.SUCCESS)
  }

  /**
   * Clear current path
   */
  private clearPath(): void {
    this.currentPath = []
    this.connectionStart = null
    this.render()
  }

  /**
   * Center view on a node
   */
  private centerOnNode(nodeId: EntityId): void {
    const node = this.nodes.get(nodeId)
    if (!node) return

    this.panX = this.viewportWidth / 2 - node.x * this.zoom
    this.panY = this.viewportHeight / 2 - node.y * this.zoom
    this.render()
  }

  /**
   * Reset view to show all nodes
   */
  private resetView(): void {
    if (this.nodes.size === 0) return

    // Calculate bounds
    const nodes = Array.from(this.nodes.values())
    const xCoords = nodes.map(n => n.x)
    const yCoords = nodes.map(n => n.y)
    const minX = Math.min.apply(Math, xCoords)
    const maxX = Math.max.apply(Math, xCoords)
    const minY = Math.min.apply(Math, yCoords)
    const maxY = Math.max.apply(Math, yCoords)

    const padding = 50
    const contentWidth = maxX - minX + padding * 2
    const contentHeight = maxY - minY + padding * 2

    // Calculate zoom to fit all nodes
    const zoomX = this.viewportWidth / contentWidth
    const zoomY = this.viewportHeight / contentHeight
    this.zoom = Math.min(zoomX, zoomY, this.config.maxZoom)

    // Center the content
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    this.panX = this.viewportWidth / 2 - centerX * this.zoom
    this.panY = this.viewportHeight / 2 - centerY * this.zoom

    this.render()
  }

  /**
   * Apply layout algorithm
   */
  private applyLayout(algorithm: LayoutAlgorithm): void {
    const layoutManager = new LayoutManager(this.nodes, this.connections)
    
    switch (algorithm) {
      case LayoutAlgorithm.FORCE_DIRECTED:
        layoutManager.applyForceDirectedLayout()
        break
      case LayoutAlgorithm.HIERARCHICAL:
        layoutManager.applyHierarchicalLayout()
        break
      case LayoutAlgorithm.CIRCULAR:
        layoutManager.applyCircularLayout()
        break
      case LayoutAlgorithm.GRID:
        layoutManager.applyGridLayout()
        break
    }

    this.render()
    this.onNodeChange?.(Array.from(this.nodes.values()))
  }

  /**
   * Auto layout using the best algorithm for current data
   */
  private autoLayout(): void {
    const connectionCount = this.connections.size
    const nodeCount = this.nodes.size

    if (nodeCount <= 10) {
      this.applyLayout(LayoutAlgorithm.CIRCULAR)
    } else if (connectionCount / nodeCount > 1.5) {
      this.applyLayout(LayoutAlgorithm.FORCE_DIRECTED)
    } else {
      this.applyLayout(LayoutAlgorithm.GRID)
    }
  }

  /**
   * Toggle minimap visibility
   */
  private toggleMinimap(): void {
    const minimap = this.container.querySelector('.minimap')
    if (this.config.showMinimap && !minimap) {
      // Create minimap
      const minimapElement = document.createElement('div')
      minimapElement.className = 'minimap'
      this.container.querySelector('.map-container')?.appendChild(minimapElement)
    } else if (!this.config.showMinimap && minimap) {
      // Remove minimap
      minimap.remove()
    }
    this.render()
  }

  /**
   * Render minimap
   */
  private renderMinimap(): void {
    // Minimap implementation would go here
    // For now, just a placeholder
  }

  /**
   * Update sidebar content
   */
  private updateSidebar(): void {
    this.updateNodeProperties()
    this.updatePathAnalysis()
  }

  /**
   * Update node properties panel
   */
  private updateNodeProperties(): void {
    const container = this.container.querySelector('.properties-content')
    if (!container) return

    if (this.selectedNodes.size === 1) {
      const nodeId = Array.from(this.selectedNodes)[0]
      const node = this.nodes.get(nodeId)
      if (node) {
        container.innerHTML = `
          <div class="node-properties">
            <h5>${node.entity.name}</h5>
            <p><strong>Type:</strong> ${node.entity.type}</p>
            <p><strong>Position:</strong> (${Math.round(node.x)}, ${Math.round(node.y)})</p>
            <p><strong>Connections:</strong> ${node.connections.length}</p>
            <p><strong>Size:</strong> ${node.size}</p>
            ${node.entity.description ? `<p><strong>Description:</strong> ${node.entity.description}</p>` : ''}
          </div>
        `
      }
    } else if (this.selectedNodes.size > 1) {
      container.innerHTML = `
        <div class="multi-selection">
          <p><strong>${this.selectedNodes.size} nodes selected</strong></p>
          <button class="btn-align-nodes">Align Nodes</button>
          <button class="btn-distribute-nodes">Distribute Evenly</button>
        </div>
      `
    } else {
      container.innerHTML = '<p>Select a node to view properties</p>'
    }
  }

  /**
   * Update path analysis panel
   */
  private updatePathAnalysis(): void {
    const container = this.container.querySelector('.analysis-content')
    if (!container) return

    if (this.currentPath.length > 1) {
      const pathResult = this.pathfinding.analyzePath(this.currentPath)
      container.innerHTML = `
        <div class="path-info">
          <p><strong>Path Length:</strong> ${pathResult.steps} steps</p>
          <p><strong>Distance:</strong> ${pathResult.distance.toFixed(1)}</p>
          <p><strong>Nodes:</strong> ${this.currentPath.map(id => this.nodes.get(id)?.entity.name || id).join(' → ')}</p>
        </div>
      `
    } else {
      container.innerHTML = '<p>Shift+click nodes to analyze paths</p>'
    }
  }

  /**
   * Set callback functions
   */
  onNodeChanged(callback: (nodes: MapNode[]) => void): void {
    this.onNodeChange = callback
  }

  onConnectionChanged(callback: (connections: Connection[]) => void): void {
    this.onConnectionChange = callback
  }

  onSelectionChanged(callback: (selectedNodes: EntityId[]) => void): void {
    this.onSelectionChange = callback
  }

  /**
   * Get current nodes
   */
  getNodes(): MapNode[] {
    return Array.from(this.nodes.values())
  }

  /**
   * Get current connections
   */
  getConnections(): Connection[] {
    return Array.from(this.connections.values())
  }

  /**
   * Get selected nodes
   */
  getSelectedNodes(): EntityId[] {
    return Array.from(this.selectedNodes)
  }
}

/**
 * Pathfinding manager for map navigation
 */
class PathfindingManager {
  private graph: Map<EntityId, Set<EntityId>> = new Map()
  private nodePositions: Map<EntityId, { x: number; y: number }> = new Map()

  /**
   * Update the pathfinding graph
   */
  updateGraph(nodes: Map<EntityId, MapNode>, connections: Map<string, Connection>): void {
    this.graph.clear()
    this.nodePositions.clear()

    // Initialize nodes
    for (const node of nodes.values()) {
      this.graph.set(node.id, new Set())
      this.nodePositions.set(node.id, { x: node.x, y: node.y })
    }

    // Add connections
    for (const connection of connections.values()) {
      const fromSet = this.graph.get(connection.fromLocationId)
      const toSet = this.graph.get(connection.toLocationId)

      if (fromSet) {
        fromSet.add(connection.toLocationId)
      }

      if (toSet && connection.bidirectional) {
        toSet.add(connection.fromLocationId)
      }
    }
  }

  /**
   * Find path between two nodes using A* algorithm
   */
  findPath(startId: EntityId, endId: EntityId): PathResult {
    if (!this.graph.has(startId) || !this.graph.has(endId)) {
      return { path: [], distance: 0, steps: 0, blocked: true, reason: 'Node not found' }
    }

    if (startId === endId) {
      return { path: [startId], distance: 0, steps: 0, blocked: false }
    }

    const openSet = new Set([startId])
    const cameFrom = new Map<EntityId, EntityId>()
    const gScore = new Map<EntityId, number>()
    const fScore = new Map<EntityId, number>()

    gScore.set(startId, 0)
    fScore.set(startId, this.heuristic(startId, endId))

    while (openSet.size > 0) {
      // Find node with lowest fScore
      let current: EntityId | null = null
      let lowestScore = Infinity

      for (const nodeId of openSet) {
        const score = fScore.get(nodeId) || Infinity
        if (score < lowestScore) {
          lowestScore = score
          current = nodeId
        }
      }

      if (!current) break

      if (current === endId) {
        // Reconstruct path
        const path = this.reconstructPath(cameFrom, current)
        const distance = this.calculatePathDistance(path)
        return { path, distance, steps: path.length - 1, blocked: false }
      }

      openSet.delete(current)
      const neighbors = this.graph.get(current) || new Set()

      for (const neighbor of neighbors) {
        const tentativeGScore = (gScore.get(current) || 0) + this.distance(current, neighbor)

        if (tentativeGScore < (gScore.get(neighbor) || Infinity)) {
          cameFrom.set(neighbor, current)
          gScore.set(neighbor, tentativeGScore)
          fScore.set(neighbor, tentativeGScore + this.heuristic(neighbor, endId))

          if (!openSet.has(neighbor)) {
            openSet.add(neighbor)
          }
        }
      }
    }

    return { path: [], distance: 0, steps: 0, blocked: true, reason: 'No path available' }
  }

  /**
   * Analyze an existing path
   */
  analyzePath(path: EntityId[]): PathResult {
    if (path.length < 2) {
      return { path, distance: 0, steps: 0, blocked: false }
    }

    const distance = this.calculatePathDistance(path)
    return { path, distance, steps: path.length - 1, blocked: false }
  }

  /**
   * Heuristic function for A* (Euclidean distance)
   */
  private heuristic(nodeId1: EntityId, nodeId2: EntityId): number {
    return this.distance(nodeId1, nodeId2)
  }

  /**
   * Calculate distance between two nodes
   */
  private distance(nodeId1: EntityId, nodeId2: EntityId): number {
    const pos1 = this.nodePositions.get(nodeId1)
    const pos2 = this.nodePositions.get(nodeId2)

    if (!pos1 || !pos2) return Infinity

    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2)
  }

  /**
   * Reconstruct path from A* result
   */
  private reconstructPath(cameFrom: Map<EntityId, EntityId>, current: EntityId): EntityId[] {
    const path = [current]
    
    while (cameFrom.has(current)) {
      current = cameFrom.get(current)!
      path.unshift(current)
    }

    return path
  }

  /**
   * Calculate total distance of a path
   */
  private calculatePathDistance(path: EntityId[]): number {
    let totalDistance = 0

    for (let i = 0; i < path.length - 1; i++) {
      totalDistance += this.distance(path[i], path[i + 1])
    }

    return totalDistance
  }
}

/**
 * Layout manager for automatic node positioning
 */
class LayoutManager {
  constructor(
    private nodes: Map<EntityId, MapNode>,
    private connections: Map<string, Connection>,
  ) {}

  /**
   * Apply force-directed layout
   */
  applyForceDirectedLayout(): void {
    const iterations = 50
    const nodeList = Array.from(this.nodes.values())

    for (let i = 0; i < iterations; i++) {
      // Calculate repulsive forces between nodes
      for (let j = 0; j < nodeList.length; j++) {
        const nodeA = nodeList[j]
        let fx = 0, fy = 0

        for (let k = 0; k < nodeList.length; k++) {
          if (j === k) continue
          
          const nodeB = nodeList[k]
          const dx = nodeA.x - nodeB.x
          const dy = nodeA.y - nodeB.y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1

          const force = 5000 / (distance * distance)
          fx += (dx / distance) * force
          fy += (dy / distance) * force
        }

        // Calculate attractive forces from connections
        for (const connection of this.connections.values()) {
          let otherNode: MapNode | undefined

          if (connection.fromLocationId === nodeA.id) {
            otherNode = this.nodes.get(connection.toLocationId)
          } else if (connection.toLocationId === nodeA.id && connection.bidirectional) {
            otherNode = this.nodes.get(connection.fromLocationId)
          }

          if (otherNode) {
            const dx = otherNode.x - nodeA.x
            const dy = otherNode.y - nodeA.y
            const distance = Math.sqrt(dx * dx + dy * dy) || 1

            const force = distance * 0.01
            fx += (dx / distance) * force
            fy += (dy / distance) * force
          }
        }

        // Apply forces with damping
        const damping = 0.9
        nodeA.x += fx * damping
        nodeA.y += fy * damping
      }
    }
  }

  /**
   * Apply circular layout
   */
  applyCircularLayout(): void {
    const nodeList = Array.from(this.nodes.values())
    const center = { x: 400, y: 300 }
    const radius = Math.min(200, nodeList.length * 20)

    nodeList.forEach((node, index) => {
      const angle = (index / nodeList.length) * 2 * Math.PI
      node.x = center.x + Math.cos(angle) * radius
      node.y = center.y + Math.sin(angle) * radius
    })
  }

  /**
   * Apply grid layout
   */
  applyGridLayout(): void {
    const nodeList = Array.from(this.nodes.values())
    const cols = Math.ceil(Math.sqrt(nodeList.length))
    const spacing = 100

    nodeList.forEach((node, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      node.x = col * spacing + 100
      node.y = row * spacing + 100
    })
  }

  /**
   * Apply hierarchical layout
   */
  applyHierarchicalLayout(): void {
    // Simple hierarchical layout - could be enhanced with proper layer assignment
    const nodeList = Array.from(this.nodes.values())
    const layers = this.assignLayers()
    const spacing = { x: 120, y: 100 }

    layers.forEach((layer, layerIndex) => {
      layer.forEach((nodeId, nodeIndex) => {
        const node = this.nodes.get(nodeId)
        if (node) {
          node.x = nodeIndex * spacing.x + 100
          node.y = layerIndex * spacing.y + 100
        }
      })
    })
  }

  /**
   * Assign nodes to layers for hierarchical layout
   */
  private assignLayers(): EntityId[][] {
    const layers: EntityId[][] = []
    const visited = new Set<EntityId>()
    const nodeList = Array.from(this.nodes.keys())

    // Simple BFS-based layering
    let currentLayer = nodeList.slice(0, 1)
    
    while (currentLayer.length > 0 && visited.size < nodeList.length) {
      layers.push(currentLayer.slice())
      currentLayer.forEach(nodeId => visited.add(nodeId))

      const nextLayer: EntityId[] = []
      
      for (const nodeId of currentLayer) {
        for (const connection of this.connections.values()) {
          let connectedId: EntityId | null = null
          
          if (connection.fromLocationId === nodeId && !visited.has(connection.toLocationId)) {
            connectedId = connection.toLocationId
          } else if (connection.toLocationId === nodeId && connection.bidirectional && !visited.has(connection.fromLocationId)) {
            connectedId = connection.fromLocationId
          }

          if (connectedId && !nextLayer.includes(connectedId)) {
            nextLayer.push(connectedId)
          }
        }
      }

      currentLayer = nextLayer
    }

    // Add any remaining unconnected nodes
    const remaining = nodeList.filter(id => !visited.has(id))
    if (remaining.length > 0) {
      layers.push(remaining)
    }

    return layers
  }
}