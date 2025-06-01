/**
 * Causality View Component
 *
 * Provides visual representation of causal relationships in the timeline
 */

import type { Act, WorldState, EntityId, CausalLink, ValidationResult } from '../../types/causality'
import { CausalityEngine } from '../causality/engine'
import type { VisualFeedbackManager } from './visualFeedback'
import { FeedbackType } from './visualFeedback'

/**
 * Causality graph node
 */
export interface CausalNode {
  id: EntityId
  act: Act
  x: number
  y: number
  level: number
  dependencies: EntityId[]
  dependents: EntityId[]
}

/**
 * Causality graph edge
 */
export interface CausalEdge {
  id: string
  fromNodeId: EntityId
  toNodeId: EntityId
  type: 'enables' | 'prevents' | 'requires'
  weight: number
}

/**
 * Causality view options
 */
export interface CausalityViewOptions {
  container: HTMLElement
  engine: CausalityEngine
  feedbackManager?: VisualFeedbackManager
  onNodeSelect?: (node: CausalNode) => void
  onEdgeSelect?: (edge: CausalEdge) => void
  showValidationErrors?: boolean
  autoLayout?: boolean
}

/**
 * Layout options for the causality graph
 */
export interface LayoutOptions {
  nodeSpacing: number
  levelSpacing: number
  layoutDirection: 'horizontal' | 'vertical'
  animationDuration: number
}

/**
 * Causality view component for visualizing causal relationships
 */
export class CausalityView {
  private container: HTMLElement
  private engine: CausalityEngine
  private feedbackManager?: VisualFeedbackManager
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private svg: SVGElement

  private nodes: Map<EntityId, CausalNode> = new Map()
  private edges: Map<string, CausalEdge> = new Map()
  private selectedNode: EntityId | null = null
  private selectedEdge: string | null = null

  private layoutOptions: LayoutOptions = {
    nodeSpacing: 150,
    levelSpacing: 100,
    layoutDirection: 'horizontal',
    animationDuration: 500,
  }

  // Callbacks
  private onNodeSelect?: (node: CausalNode) => void
  private onEdgeSelect?: (edge: CausalEdge) => void

  // State
  private showValidationErrors: boolean
  private autoLayout: boolean
  private zoom: number = 1
  private panX: number = 0
  private panY: number = 0

  constructor(options: CausalityViewOptions) {
    this.container = options.container
    this.engine = options.engine
    this.feedbackManager = options.feedbackManager
    this.onNodeSelect = options.onNodeSelect
    this.onEdgeSelect = options.onEdgeSelect
    this.showValidationErrors = options.showValidationErrors ?? true
    this.autoLayout = options.autoLayout ?? true

    // Initialize canvas and SVG
    this.setupCanvas()
    this.setupSVG()
    this.setupEventHandlers()

    // Initial render
    this.refresh()
  }

  /**
   * Setup canvas for background and performance-critical rendering
   */
  private setupCanvas(): void {
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'causality-canvas'
    this.canvas.style.position = 'absolute'
    this.canvas.style.top = '0'
    this.canvas.style.left = '0'
    this.canvas.style.pointerEvents = 'none'

    const ctx = this.canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Unable to get 2D context from canvas')
    }
    this.ctx = ctx

    this.container.appendChild(this.canvas)
    this.resizeCanvas()
  }

  /**
   * Setup SVG for interactive elements
   */
  private setupSVG(): void {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.svg.className = 'causality-svg'

    if (this.svg.style) {
      this.svg.style.position = 'absolute'
      this.svg.style.top = '0'
      this.svg.style.left = '0'
      this.svg.style.width = '100%'
      this.svg.style.height = '100%'
    }

    // Initialize firstChild property for test environments
    if (!('firstChild' in this.svg)) {
      Object.defineProperty(this.svg, 'firstChild', {
        value: null,
        writable: true,
      })
    }

    this.container.appendChild(this.svg)
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Resize handler
    window.addEventListener('resize', () => this.resizeCanvas())

    // Mouse events for interaction
    this.svg.addEventListener('click', (e) => this.handleClick(e))
    this.svg.addEventListener('mousemove', (e) => this.handleMouseMove(e))
    this.svg.addEventListener('wheel', (e) => this.handleWheel(e))

    // Pan and zoom
    let isPanning = false
    let lastPanX = 0
    let lastPanY = 0

    this.svg.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Middle mouse or Ctrl+click
        isPanning = true
        lastPanX = e.clientX
        lastPanY = e.clientY
        e.preventDefault()
      }
    })

    this.svg.addEventListener('mousemove', (e) => {
      if (isPanning) {
        const deltaX = e.clientX - lastPanX
        const deltaY = e.clientY - lastPanY
        this.panX += deltaX
        this.panY += deltaY
        lastPanX = e.clientX
        lastPanY = e.clientY
        this.render()
      }
    })

    this.svg.addEventListener('mouseup', () => {
      isPanning = false
    })
  }

  /**
   * Refresh the view with current engine state
   */
  refresh(): void {
    this.buildGraph()
    if (this.autoLayout) {
      this.calculateLayout()
    }
    this.render()
  }

  /**
   * Build the causality graph from engine data
   */
  private buildGraph(): void {
    this.nodes.clear()
    this.edges.clear()

    const acts = Array.from(this.engine.getActs().values())
    const causalLinks = Array.from(this.engine.getCausalLinks().values())

    // Create nodes for each act
    acts.forEach(act => {
      const node: CausalNode = {
        id: act.id,
        act,
        x: 0,
        y: 0,
        level: 0,
        dependencies: [],
        dependents: [],
      }
      this.nodes.set(act.id, node)
    })

    // Create edges from causal links
    causalLinks.forEach(link => {
      const edge: CausalEdge = {
        id: `${link.fromActId}-${link.toActId}`,
        fromNodeId: link.fromActId,
        toNodeId: link.toActId,
        type: link.linkType === 'ENABLES' ? 'enables' : 'requires',
        weight: link.strength || 1,
      }

      this.edges.set(edge.id, edge)

      // Update node dependencies
      const fromNode = this.nodes.get(link.fromActId)
      const toNode = this.nodes.get(link.toActId)

      if (fromNode) {
        fromNode.dependents.push(link.toActId)
      }
      if (toNode) {
        toNode.dependencies.push(link.fromActId)
      }
    })

    // Auto-detect causality relationships if no explicit links exist
    if (causalLinks.length === 0) {
      this.detectImplicitCausality()
    }
  }

  /**
   * Detect implicit causality relationships between acts
   */
  private detectImplicitCausality(): void {
    const sortedActs = Array.from(this.nodes.values())
      .sort((a, b) => a.act.timestamp - b.act.timestamp)

    for (let i = 0; i < sortedActs.length; i++) {
      const currentAct = sortedActs[i]

      // Check if this act's preconditions are enabled by previous acts
      for (let j = 0; j < i; j++) {
        const previousAct = sortedActs[j]

        if (this.actsHaveCausalRelationship(previousAct.act, currentAct.act)) {
          const edgeId = `${previousAct.id}-${currentAct.id}`
          const edge: CausalEdge = {
            id: edgeId,
            fromNodeId: previousAct.id,
            toNodeId: currentAct.id,
            type: 'enables',
            weight: 0.5, // Lower weight for implicit relationships
          }

          this.edges.set(edgeId, edge)
          previousAct.dependents.push(currentAct.id)
          currentAct.dependencies.push(previousAct.id)
        }
      }
    }
  }

  /**
   * Check if two acts have a causal relationship
   */
  private actsHaveCausalRelationship(actA: Act, actB: Act): boolean {
    const entitiesA = new Set(actA.getAffectedEntities())
    const entitiesB = new Set(actB.getAffectedEntities())

    // Check if they share any entities
    for (const entityA of entitiesA) {
      if (entitiesB.has(entityA)) {
        return true
      }
    }

    return false
  }

  /**
   * Calculate layout positions for nodes
   */
  private calculateLayout(): void {
    // Assign levels based on dependencies (topological ordering)
    this.assignLevels()

    // Position nodes in their levels
    this.positionNodesInLevels()
  }

  /**
   * Assign depth levels to nodes based on dependencies
   */
  private assignLevels(): void {
    const visited = new Set<EntityId>()
    const temp = new Set<EntityId>()

    // Topological sort to assign levels
    const visit = (nodeId: EntityId, level: number = 0): void => {
      if (temp.has(nodeId)) {
        // Cycle detected - assign current level
        return
      }
      if (visited.has(nodeId)) {
        return
      }

      temp.add(nodeId)
      const node = this.nodes.get(nodeId)
      if (!node) return

      // Visit all dependencies first
      for (const depId of node.dependencies) {
        visit(depId, level + 1)
      }

      // Set this node's level
      node.level = Math.max(node.level, level)

      temp.delete(nodeId)
      visited.add(nodeId)
    }

    // Start with nodes that have no dependencies
    for (const [nodeId, node] of this.nodes) {
      if (node.dependencies.length === 0) {
        visit(nodeId, 0)
      }
    }

    // Ensure all nodes are visited
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        visit(nodeId, 0)
      }
    }
  }

  /**
   * Position nodes within their assigned levels
   */
  private positionNodesInLevels(): void {
    // Group nodes by level
    const nodesByLevel = new Map<number, CausalNode[]>()

    for (const node of this.nodes.values()) {
      if (!nodesByLevel.has(node.level)) {
        nodesByLevel.set(node.level, [])
      }
      nodesByLevel.get(node.level)!.push(node)
    }

    // Position nodes in each level
    const containerRect = this.container.getBoundingClientRect()
    const centerX = containerRect.width / 2
    const centerY = containerRect.height / 2

    for (const [level, levelNodes] of nodesByLevel) {
      const nodeCount = levelNodes.length
      const totalWidth = (nodeCount - 1) * this.layoutOptions.nodeSpacing
      const startX = centerX - totalWidth / 2

      levelNodes.forEach((node, index) => {
        if (this.layoutOptions.layoutDirection === 'horizontal') {
          node.x = startX + index * this.layoutOptions.nodeSpacing
          node.y = centerY + level * this.layoutOptions.levelSpacing
        } else {
          node.x = centerX + level * this.layoutOptions.levelSpacing
          node.y = startX + index * this.layoutOptions.nodeSpacing
        }
      })
    }
  }

  /**
   * Render the causality view
   */
  private render(): void {
    this.clearCanvas()
    this.renderBackground()
    this.renderEdges()
    this.renderNodes()

    if (this.showValidationErrors) {
      this.renderValidationErrors()
    }
  }

  /**
   * Clear the canvas
   */
  private clearCanvas(): void {
    const rect = this.container.getBoundingClientRect()
    this.canvas.width = rect.width
    this.canvas.height = rect.height
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Clear SVG - handle test environment where SVG might not be fully initialized
    if (this.svg && this.svg.firstChild !== undefined) {
      while (this.svg.firstChild) {
        this.svg.removeChild(this.svg.firstChild)
      }
    }
  }

  /**
   * Render background grid
   */
  private renderBackground(): void {
    const rect = this.container.getBoundingClientRect()
    const gridSize = 50 * this.zoom

    this.ctx.strokeStyle = '#f0f0f0'
    this.ctx.lineWidth = 1

    // Vertical lines
    for (let x = this.panX % gridSize; x < rect.width; x += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, rect.height)
      this.ctx.stroke()
    }

    // Horizontal lines
    for (let y = this.panY % gridSize; y < rect.height; y += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(rect.width, y)
      this.ctx.stroke()
    }
  }

  /**
   * Render edges between nodes
   */
  private renderEdges(): void {
    for (const edge of this.edges.values()) {
      const fromNode = this.nodes.get(edge.fromNodeId)
      const toNode = this.nodes.get(edge.toNodeId)

      if (!fromNode || !toNode) continue

      this.renderEdge(edge, fromNode, toNode)
    }
  }

  /**
   * Render a single edge
   */
  private renderEdge(edge: CausalEdge, fromNode: CausalNode, toNode: CausalNode): void {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')

    const fromX = (fromNode.x + this.panX) * this.zoom
    const fromY = (fromNode.y + this.panY) * this.zoom
    const toX = (toNode.x + this.panX) * this.zoom
    const toY = (toNode.y + this.panY) * this.zoom

    line.setAttribute('x1', fromX.toString())
    line.setAttribute('y1', fromY.toString())
    line.setAttribute('x2', toX.toString())
    line.setAttribute('y2', toY.toString())
    line.setAttribute('stroke', this.getEdgeColor(edge))
    line.setAttribute('stroke-width', (edge.weight * 2).toString())
    line.setAttribute('marker-end', 'url(#arrowhead)')
    line.setAttribute('data-edge-id', edge.id)

    if (this.selectedEdge === edge.id) {
      line.setAttribute('stroke', '#2196f3')
      line.setAttribute('stroke-width', '3')
    }

    line.addEventListener('click', (e) => {
      e.stopPropagation()
      this.selectEdge(edge.id)
    })

    this.svg.appendChild(line)

    // Add arrowhead marker if not exists
    this.ensureArrowheadMarker()
  }

  /**
   * Render nodes
   */
  private renderNodes(): void {
    for (const node of this.nodes.values()) {
      this.renderNode(node)
    }
  }

  /**
   * Render a single node
   */
  private renderNode(node: CausalNode): void {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.setAttribute('data-node-id', node.id)

    const x = (node.x + this.panX) * this.zoom
    const y = (node.y + this.panY) * this.zoom
    const radius = 30 * this.zoom

    // Node circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', x.toString())
    circle.setAttribute('cy', y.toString())
    circle.setAttribute('r', radius.toString())
    circle.setAttribute('fill', this.getNodeColor(node))
    circle.setAttribute('stroke', this.selectedNode === node.id ? '#2196f3' : '#333')
    circle.setAttribute('stroke-width', this.selectedNode === node.id ? '3' : '2')

    // Node label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('x', x.toString())
    text.setAttribute('y', (y + 5).toString())
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('font-size', (12 * this.zoom).toString())
    text.setAttribute('fill', '#333')
    text.textContent = this.getNodeLabel(node)

    group.appendChild(circle)
    group.appendChild(text)

    // Event handlers
    group.addEventListener('click', (e) => {
      e.stopPropagation()
      this.selectNode(node.id)
    })

    group.addEventListener('mouseenter', () => {
      this.showNodeTooltip(node, x, y)
    })

    group.addEventListener('mouseleave', () => {
      this.hideNodeTooltip()
    })

    this.svg.appendChild(group)
  }

  /**
   * Get color for node based on its state
   */
  private getNodeColor(node: CausalNode): string {
    // Check if node has validation errors
    if (this.showValidationErrors) {
      const validation = this.validateNode(node)
      if (!validation.valid) {
        return '#f44336' // Red for invalid
      }
    }

    // Color by act type
    switch (node.act.type) {
    case 'MOVE':
      return '#4caf50'
    case 'GIVE_ITEM':
      return '#ff9800'
    case 'TAKE_ITEM':
      return '#2196f3'
    case 'PLACE_ITEM':
      return '#9c27b0'
    case 'SPEAK':
      return '#ffeb3b'
    case 'USE_ITEM':
      return '#00bcd4'
    case 'COMBINE_ITEMS':
      return '#795548'
    default:
      return '#9e9e9e'
    }
  }

  /**
   * Get color for edge based on its type
   */
  private getEdgeColor(edge: CausalEdge): string {
    switch (edge.type) {
    case 'enables':
      return '#4caf50'
    case 'requires':
      return '#ff9800'
    case 'prevents':
      return '#f44336'
    default:
      return '#9e9e9e'
    }
  }

  /**
   * Get label for node
   */
  private getNodeLabel(node: CausalNode): string {
    return `${node.act.type.slice(0, 4)}`
  }

  /**
   * Validate a node's act
   */
  private validateNode(node: CausalNode): ValidationResult {
    // Get world state at the time just before this act
    const stateAtTime = this.engine.getStateAt(node.act.timestamp - 1, {
      timestamp: 0,
      personPositions: {},
      itemOwnership: {},
      knowledge: {},
      itemLocations: {},
    })

    return node.act.checkPreconditions(stateAtTime)
  }

  /**
   * Render validation errors
   */
  private renderValidationErrors(): void {
    for (const node of this.nodes.values()) {
      const validation = this.validateNode(node)
      if (!validation.valid) {
        this.renderErrorIndicator(node)
      }
    }
  }

  /**
   * Render error indicator for a node
   */
  private renderErrorIndicator(node: CausalNode): void {
    const x = (node.x + this.panX) * this.zoom + 25
    const y = (node.y + this.panY) * this.zoom - 25

    const errorIcon = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    errorIcon.setAttribute('cx', x.toString())
    errorIcon.setAttribute('cy', y.toString())
    errorIcon.setAttribute('r', (8 * this.zoom).toString())
    errorIcon.setAttribute('fill', '#f44336')
    errorIcon.setAttribute('stroke', '#fff')
    errorIcon.setAttribute('stroke-width', '2')

    const errorText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    errorText.setAttribute('x', x.toString())
    errorText.setAttribute('y', (y + 3).toString())
    errorText.setAttribute('text-anchor', 'middle')
    errorText.setAttribute('font-size', (10 * this.zoom).toString())
    errorText.setAttribute('fill', '#fff')
    errorText.setAttribute('font-weight', 'bold')
    errorText.textContent = '!'

    this.svg.appendChild(errorIcon)
    this.svg.appendChild(errorText)
  }

  /**
   * Handle click events
   */
  private handleClick(e: MouseEvent): void {
    // Clear selection if clicking on empty space
    this.selectedNode = null
    this.selectedEdge = null
    this.render()
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(_e: MouseEvent): void {
    // Implement hover effects if needed
  }

  /**
   * Handle wheel events for zooming
   */
  private handleWheel(e: WheelEvent): void {
    e.preventDefault()

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(3, this.zoom * zoomFactor))

    // Adjust pan to zoom towards mouse position
    const rect = this.svg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom)
    this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom)
    this.zoom = newZoom

    this.render()
  }

  /**
   * Select a node
   */
  private selectNode(nodeId: EntityId): void {
    this.selectedNode = nodeId
    this.selectedEdge = null

    const node = this.nodes.get(nodeId)
    if (node && this.onNodeSelect) {
      this.onNodeSelect(node)
    }

    this.render()
  }

  /**
   * Select an edge
   */
  private selectEdge(edgeId: string): void {
    this.selectedEdge = edgeId
    this.selectedNode = null

    const edge = this.edges.get(edgeId)
    if (edge && this.onEdgeSelect) {
      this.onEdgeSelect(edge)
    }

    this.render()
  }

  /**
   * Show tooltip for node
   */
  private showNodeTooltip(node: CausalNode, x: number, y: number): void {
    if (this.feedbackManager) {
      const validation = this.validateNode(node)
      const message = validation.valid
        ? `${node.act.description}\nTimestamp: ${node.act.timestamp}`
        : `${node.act.description}\nErrors: ${validation.errors.map(e => e.message).join(', ')}`

      const dummyElement = document.createElement('div')
      dummyElement.style.position = 'absolute'
      dummyElement.style.left = `${x}px`
      dummyElement.style.top = `${y}px`
      this.container.appendChild(dummyElement)

      this.feedbackManager.showEntityFeedback(
        node.id,
        dummyElement,
        validation.valid ? FeedbackType.VALID : FeedbackType.INVALID,
        message,
        { duration: 0 },
      )
    }
  }

  /**
   * Hide node tooltip
   */
  private hideNodeTooltip(): void {
    if (this.feedbackManager) {
      this.feedbackManager.clearAllFeedback()
    }
  }

  /**
   * Ensure arrowhead marker exists
   */
  private ensureArrowheadMarker(): void {
    const existingMarker = this.svg.querySelector('#arrowhead')
    if (existingMarker) return

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
    marker.setAttribute('id', 'arrowhead')
    marker.setAttribute('markerWidth', '10')
    marker.setAttribute('markerHeight', '7')
    marker.setAttribute('refX', '10')
    marker.setAttribute('refY', '3.5')
    marker.setAttribute('orient', 'auto')

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7')
    polygon.setAttribute('fill', '#333')

    marker.appendChild(polygon)
    defs.appendChild(marker)
    this.svg.appendChild(defs)
  }

  /**
   * Resize canvas to match container
   */
  private resizeCanvas(): void {
    const rect = this.container.getBoundingClientRect()
    this.canvas.width = rect.width
    this.canvas.height = rect.height
    this.render()
  }

  /**
   * Update layout options
   */
  setLayoutOptions(options: Partial<LayoutOptions>): void {
    this.layoutOptions = { ...this.layoutOptions, ...options }
    if (this.autoLayout) {
      this.calculateLayout()
      this.render()
    }
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(3, zoom))
    this.render()
  }

  /**
   * Center view on all nodes
   */
  centerView(): void {
    if (this.nodes.size === 0) return

    const rect = this.container.getBoundingClientRect()
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    for (const node of this.nodes.values()) {
      minX = Math.min(minX, node.x)
      maxX = Math.max(maxX, node.x)
      minY = Math.min(minY, node.y)
      maxY = Math.max(maxY, node.y)
    }

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    this.panX = rect.width / 2 - centerX
    this.panY = rect.height / 2 - centerY

    this.render()
  }

  /**
   * Get selected node
   */
  getSelectedNode(): CausalNode | null {
    return this.selectedNode ? this.nodes.get(this.selectedNode) || null : null
  }

  /**
   * Get selected edge
   */
  getSelectedEdge(): CausalEdge | null {
    return this.selectedEdge ? this.edges.get(this.selectedEdge) || null : null
  }
}

/**
 * CSS styles for causality view
 */
export const causalityViewStyles = `
  .causality-view {
    position: relative;
    width: 100%;
    height: 100%;
    background: #fafafa;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .causality-canvas {
    background: white;
  }
  
  .causality-svg {
    cursor: grab;
  }
  
  .causality-svg:active {
    cursor: grabbing;
  }
  
  .causality-node {
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .causality-node:hover {
    transform: scale(1.1);
  }
  
  .causality-edge {
    cursor: pointer;
    transition: stroke-width 0.2s;
  }
  
  .causality-edge:hover {
    stroke-width: 3 !important;
  }
  
  .causality-tooltip {
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    z-index: 1000;
    white-space: pre-line;
  }
`