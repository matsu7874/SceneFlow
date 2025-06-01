/**
 * Relationship Editor
 *
 * Advanced editor for managing relationships and connections between entities
 */

import type { EntityId } from '../../../types/causality'
import type { EditableEntity } from './EntityEditor'
import { VisualFeedbackManager, FeedbackType } from '../visualFeedback'

/**
 * Relationship types
 */
export enum RelationshipType {
  FRIEND = 'friend',
  ENEMY = 'enemy',
  ALLY = 'ally',
  NEUTRAL = 'neutral',
  FAMILY = 'family',
  ROMANTIC = 'romantic',
  PROFESSIONAL = 'professional',
  MENTOR = 'mentor',
  STUDENT = 'student',
}

/**
 * Connection types for locations
 */
export enum ConnectionType {
  DIRECT = 'direct',
  DOOR = 'door',
  PASSAGE = 'passage',
  STAIRS = 'stairs',
  ELEVATOR = 'elevator',
  PORTAL = 'portal',
  HIDDEN = 'hidden',
  LOCKED = 'locked',
}

/**
 * Relationship definition
 */
export interface Relationship {
  id: string
  fromEntityId: EntityId
  toEntityId: EntityId
  type: RelationshipType
  strength: number // 0-1
  isPublic: boolean
  description?: string
  metadata?: Record<string, unknown>
}

/**
 * Connection definition
 */
export interface Connection {
  id: string
  fromLocationId: EntityId
  toLocationId: EntityId
  type: ConnectionType
  bidirectional: boolean
  requirements?: string[]
  description?: string
  metadata?: Record<string, unknown>
}

/**
 * Relationship graph node
 */
export interface RelationshipNode {
  entity: EditableEntity
  x: number
  y: number
  relationships: Relationship[]
  connections: Connection[]
}

/**
 * Relationship editor options
 */
export interface RelationshipEditorOptions {
  container: HTMLElement
  entities: EditableEntity[]
  relationships?: Relationship[]
  connections?: Connection[]
  feedbackManager?: VisualFeedbackManager
  onRelationshipChange?: (relationships: Relationship[]) => void
  onConnectionChange?: (connections: Connection[]) => void
  mode?: 'relationships' | 'connections' | 'both'
}

/**
 * Advanced relationship editor with visual interface
 */
export class RelationshipEditor {
  private container: HTMLElement
  private feedbackManager: VisualFeedbackManager
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private svg: SVGElement

  private entities: Map<EntityId, EditableEntity> = new Map()
  private relationships: Map<string, Relationship> = new Map()
  private connections: Map<string, Connection> = new Map()
  private nodes: Map<EntityId, RelationshipNode> = new Map()

  private selectedEntity: EntityId | null = null
  private selectedRelationship: string | null = null
  private selectedConnection: string | null = null
  private isDragging = false
  private dragOffset = { x: 0, y: 0 }

  private mode: 'relationships' | 'connections' | 'both' = 'both'
  private zoom = 1
  private panX = 0
  private panY = 0

  // Callbacks
  private onRelationshipChange?: (relationships: Relationship[]) => void
  private onConnectionChange?: (connections: Connection[]) => void

  constructor(options: RelationshipEditorOptions) {
    this.container = options.container
    this.feedbackManager = options.feedbackManager || new VisualFeedbackManager(options.container)
    this.mode = options.mode || 'both'
    this.onRelationshipChange = options.onRelationshipChange
    this.onConnectionChange = options.onConnectionChange

    // Initialize entities
    options.entities.forEach(entity => {
      this.entities.set(entity.id, entity)
    })

    // Initialize relationships
    if (options.relationships) {
      options.relationships.forEach(rel => {
        this.relationships.set(rel.id, rel)
      })
    }

    // Initialize connections
    if (options.connections) {
      options.connections.forEach(conn => {
        this.connections.set(conn.id, conn)
      })
    }

    this.setupCanvas()
    this.setupSVG()
    this.buildGraph()
    this.setupEventHandlers()
    this.render()
  }

  /**
   * Setup canvas for background rendering
   */
  private setupCanvas(): void {
    this.container.innerHTML = `
      <div class="relationship-editor">
        <div class="relationship-toolbar">
          <div class="mode-selector">
            <label>
              <input type="radio" name="mode" value="relationships" ${this.mode === 'relationships' ? 'checked' : ''}> 
              Relationships
            </label>
            <label>
              <input type="radio" name="mode" value="connections" ${this.mode === 'connections' ? 'checked' : ''}> 
              Connections
            </label>
            <label>
              <input type="radio" name="mode" value="both" ${this.mode === 'both' ? 'checked' : ''}> 
              Both
            </label>
          </div>
          <div class="toolbar-actions">
            <button class="btn-auto-layout">Auto Layout</button>
            <button class="btn-clear-selection">Clear Selection</button>
            <button class="btn-export">Export</button>
          </div>
        </div>
        <div class="relationship-canvas-container">
          <canvas class="relationship-canvas"></canvas>
          <svg class="relationship-svg"></svg>
        </div>
        <div class="relationship-sidebar">
          <div class="entity-list">
            <h4>Entities</h4>
            <div class="entity-items"></div>
          </div>
          <div class="relationship-details">
            <h4>Details</h4>
            <div class="details-content"></div>
          </div>
        </div>
      </div>
    `

    this.canvas = this.container.querySelector('.relationship-canvas') as HTMLCanvasElement
    const ctx = this.canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Unable to get 2D context from canvas')
    }
    this.ctx = ctx

    this.resizeCanvas()
  }

  /**
   * Setup SVG for interactive elements
   */
  private setupSVG(): void {
    this.svg = this.container.querySelector('.relationship-svg') as SVGElement
    this.svg.style.position = 'absolute'
    this.svg.style.top = '0'
    this.svg.style.left = '0'
    this.svg.style.width = '100%'
    this.svg.style.height = '100%'
    this.svg.style.pointerEvents = 'all'
  }

  /**
   * Build the relationship graph
   */
  private buildGraph(): void {
    this.nodes.clear()

    // Create nodes for each entity
    const entitiesArray = Array.from(this.entities.values())
    entitiesArray.forEach((entity, index) => {
      const angle = (index / entitiesArray.length) * 2 * Math.PI
      const radius = 200
      const x = 300 + Math.cos(angle) * radius
      const y = 300 + Math.sin(angle) * radius

      const node: RelationshipNode = {
        entity,
        x,
        y,
        relationships: Array.from(this.relationships.values()).filter(
          rel => rel.fromEntityId === entity.id || rel.toEntityId === entity.id,
        ),
        connections: Array.from(this.connections.values()).filter(
          conn => conn.fromLocationId === entity.id || conn.toLocationId === entity.id,
        ),
      }

      this.nodes.set(entity.id, node)
    })

    this.renderEntityList()
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Mode selector
    this.container.querySelectorAll('input[name="mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.mode = (e.target as HTMLInputElement).value as 'relationships' | 'connections' | 'both'
        this.render()
      })
    })

    // Toolbar actions
    const autoLayoutBtn = this.container.querySelector('.btn-auto-layout')
    autoLayoutBtn?.addEventListener('click', () => this.autoLayout())

    const clearSelectionBtn = this.container.querySelector('.btn-clear-selection')
    clearSelectionBtn?.addEventListener('click', () => this.clearSelection())

    const exportBtn = this.container.querySelector('.btn-export')
    exportBtn?.addEventListener('click', () => this.exportRelationships())

    // Canvas interactions
    this.svg.addEventListener('mousedown', (e) => this.handleMouseDown(e))
    this.svg.addEventListener('mousemove', (e) => this.handleMouseMove(e))
    this.svg.addEventListener('mouseup', (e) => this.handleMouseUp(e))
    this.svg.addEventListener('wheel', (e) => this.handleWheel(e))
    this.svg.addEventListener('click', (e) => this.handleClick(e))
    this.svg.addEventListener('dblclick', (e) => this.handleDoubleClick(e))

    // Resize handler
    window.addEventListener('resize', () => this.resizeCanvas())
  }

  /**
   * Render the relationship editor
   */
  private render(): void {
    this.clearCanvas()
    this.renderBackground()
    this.renderConnections()
    this.renderRelationships()
    this.renderNodes()
    this.renderDetails()
  }

  /**
   * Clear canvas
   */
  private clearCanvas(): void {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width
    this.canvas.height = rect.height
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Clear SVG
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild)
    }
  }

  /**
   * Render background grid
   */
  private renderBackground(): void {
    const rect = this.canvas.getBoundingClientRect()
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
   * Render connections
   */
  private renderConnections(): void {
    if (this.mode === 'relationships') return

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
  private renderConnection(connection: Connection, fromNode: RelationshipNode, toNode: RelationshipNode): void {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')

    const fromX = (fromNode.x + this.panX) * this.zoom
    const fromY = (fromNode.y + this.panY) * this.zoom
    const toX = (toNode.x + this.panX) * this.zoom
    const toY = (toNode.y + this.panY) * this.zoom

    line.setAttribute('x1', fromX.toString())
    line.setAttribute('y1', fromY.toString())
    line.setAttribute('x2', toX.toString())
    line.setAttribute('y2', toY.toString())
    line.setAttribute('stroke', this.getConnectionColor(connection))
    line.setAttribute('stroke-width', '3')
    line.setAttribute('stroke-dasharray', connection.type === ConnectionType.HIDDEN ? '5,5' : '')
    line.setAttribute('data-connection-id', connection.id)

    if (this.selectedConnection === connection.id) {
      line.setAttribute('stroke', '#2196f3')
      line.setAttribute('stroke-width', '5')
    }

    // Add arrowhead if not bidirectional
    if (!connection.bidirectional) {
      line.setAttribute('marker-end', 'url(#arrowhead)')
    }

    this.svg.appendChild(line)

    // Add connection label
    const midX = (fromX + toX) / 2
    const midY = (fromY + toY) / 2

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('x', midX.toString())
    label.setAttribute('y', (midY - 5).toString())
    label.setAttribute('text-anchor', 'middle')
    label.setAttribute('font-size', (10 * this.zoom).toString())
    label.setAttribute('fill', '#666')
    label.textContent = connection.type

    this.svg.appendChild(label)

    this.ensureArrowheadMarker()
  }

  /**
   * Render relationships
   */
  private renderRelationships(): void {
    if (this.mode === 'connections') return

    for (const relationship of this.relationships.values()) {
      const fromNode = this.nodes.get(relationship.fromEntityId)
      const toNode = this.nodes.get(relationship.toEntityId)

      if (fromNode && toNode) {
        this.renderRelationship(relationship, fromNode, toNode)
      }
    }
  }

  /**
   * Render a single relationship
   */
  private renderRelationship(relationship: Relationship, fromNode: RelationshipNode, toNode: RelationshipNode): void {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')

    const fromX = (fromNode.x + this.panX) * this.zoom
    const fromY = (fromNode.y + this.panY) * this.zoom
    const toX = (toNode.x + this.panX) * this.zoom
    const toY = (toNode.y + this.panY) * this.zoom

    // Create curved path for relationships
    const midX = (fromX + toX) / 2
    const midY = (fromY + toY) / 2
    const controlOffset = 30 * this.zoom

    const pathData = `M ${fromX},${fromY} Q ${midX},${midY - controlOffset} ${toX},${toY}`

    path.setAttribute('d', pathData)
    path.setAttribute('stroke', this.getRelationshipColor(relationship))
    path.setAttribute('stroke-width', (relationship.strength * 4).toString())
    path.setAttribute('fill', 'none')
    path.setAttribute('data-relationship-id', relationship.id)

    if (this.selectedRelationship === relationship.id) {
      path.setAttribute('stroke', '#2196f3')
      path.setAttribute('stroke-width', '6')
    }

    // Add opacity based on public/private
    path.setAttribute('opacity', relationship.isPublic ? '1' : '0.5')

    this.svg.appendChild(path)

    // Add relationship label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('x', midX.toString())
    label.setAttribute('y', (midY - controlOffset - 10).toString())
    label.setAttribute('text-anchor', 'middle')
    label.setAttribute('font-size', (9 * this.zoom).toString())
    label.setAttribute('fill', '#333')
    label.textContent = relationship.type

    this.svg.appendChild(label)
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
  private renderNode(node: RelationshipNode): void {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.setAttribute('data-entity-id', node.entity.id)

    const x = (node.x + this.panX) * this.zoom
    const y = (node.y + this.panY) * this.zoom
    const radius = 25 * this.zoom

    // Node circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', x.toString())
    circle.setAttribute('cy', y.toString())
    circle.setAttribute('r', radius.toString())
    circle.setAttribute('fill', this.getNodeColor(node.entity))
    circle.setAttribute('stroke', this.selectedEntity === node.entity.id ? '#2196f3' : '#333')
    circle.setAttribute('stroke-width', this.selectedEntity === node.entity.id ? '3' : '2')

    // Node label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('x', x.toString())
    text.setAttribute('y', (y + 5).toString())
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('font-size', (10 * this.zoom).toString())
    text.setAttribute('fill', '#fff')
    text.setAttribute('font-weight', 'bold')
    text.textContent = node.entity.name.slice(0, 3).toUpperCase()

    // Entity type indicator
    const typeText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    typeText.setAttribute('x', x.toString())
    typeText.setAttribute('y', (y + radius + 15).toString())
    typeText.setAttribute('text-anchor', 'middle')
    typeText.setAttribute('font-size', (8 * this.zoom).toString())
    typeText.setAttribute('fill', '#666')
    typeText.textContent = node.entity.type

    group.appendChild(circle)
    group.appendChild(text)
    group.appendChild(typeText)

    this.svg.appendChild(group)
  }

  /**
   * Get color for entity node
   */
  private getNodeColor(entity: EditableEntity): string {
    switch (entity.type) {
    case 'person':
      return '#4caf50'
    case 'location':
      return '#2196f3'
    case 'item':
      return '#ff9800'
    case 'information':
      return '#9c27b0'
    default:
      return '#9e9e9e'
    }
  }

  /**
   * Get color for relationship
   */
  private getRelationshipColor(relationship: Relationship): string {
    switch (relationship.type) {
    case RelationshipType.FRIEND:
      return '#4caf50'
    case RelationshipType.ENEMY:
      return '#f44336'
    case RelationshipType.ALLY:
      return '#2196f3'
    case RelationshipType.FAMILY:
      return '#e91e63'
    case RelationshipType.ROMANTIC:
      return '#e91e63'
    case RelationshipType.PROFESSIONAL:
      return '#607d8b'
    case RelationshipType.MENTOR:
      return '#ff9800'
    case RelationshipType.STUDENT:
      return '#ffeb3b'
    default:
      return '#9e9e9e'
    }
  }

  /**
   * Get color for connection
   */
  private getConnectionColor(connection: Connection): string {
    switch (connection.type) {
    case ConnectionType.DIRECT:
      return '#333'
    case ConnectionType.DOOR:
      return '#795548'
    case ConnectionType.PASSAGE:
      return '#607d8b'
    case ConnectionType.STAIRS:
      return '#ff9800'
    case ConnectionType.ELEVATOR:
      return '#2196f3'
    case ConnectionType.PORTAL:
      return '#9c27b0'
    case ConnectionType.HIDDEN:
      return '#9e9e9e'
    case ConnectionType.LOCKED:
      return '#f44336'
    default:
      return '#333'
    }
  }

  /**
   * Render entity list in sidebar
   */
  private renderEntityList(): void {
    const container = this.container.querySelector('.entity-items')
    if (!container) return

    container.innerHTML = Array.from(this.entities.values()).map(entity => `
      <div class="entity-item ${this.selectedEntity === entity.id ? 'selected' : ''}" data-entity-id="${entity.id}">
        <div class="entity-type-indicator" style="background-color: ${this.getNodeColor(entity)}"></div>
        <div class="entity-info">
          <div class="entity-name">${entity.name}</div>
          <div class="entity-type">${entity.type}</div>
        </div>
      </div>
    `).join('')

    // Add click handlers
    container.querySelectorAll('.entity-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const entityId = (item as HTMLElement).dataset.entityId!
        this.selectEntity(entityId)
      })
    })
  }

  /**
   * Render details panel
   */
  private renderDetails(): void {
    const container = this.container.querySelector('.details-content')
    if (!container) return

    if (this.selectedEntity) {
      container.innerHTML = this.renderEntityDetails()
    } else if (this.selectedRelationship) {
      container.innerHTML = this.renderRelationshipDetails()
    } else if (this.selectedConnection) {
      container.innerHTML = this.renderConnectionDetails()
    } else {
      container.innerHTML = '<p>Select an entity, relationship, or connection to view details.</p>'
    }
  }

  /**
   * Render entity details
   */
  private renderEntityDetails(): string {
    if (!this.selectedEntity) return ''

    const entity = this.entities.get(this.selectedEntity)
    if (!entity) return ''

    const node = this.nodes.get(this.selectedEntity)
    const relationshipCount = node?.relationships.length || 0
    const connectionCount = node?.connections.length || 0

    return `
      <div class="entity-details">
        <h5>${entity.name}</h5>
        <p><strong>Type:</strong> ${entity.type}</p>
        <p><strong>Relationships:</strong> ${relationshipCount}</p>
        <p><strong>Connections:</strong> ${connectionCount}</p>
        <div class="detail-actions">
          <button class="btn-add-relationship">Add Relationship</button>
          <button class="btn-add-connection">Add Connection</button>
        </div>
      </div>
    `
  }

  /**
   * Render relationship details
   */
  private renderRelationshipDetails(): string {
    if (!this.selectedRelationship) return ''

    const relationship = this.relationships.get(this.selectedRelationship)
    if (!relationship) return ''

    const fromEntity = this.entities.get(relationship.fromEntityId)
    const toEntity = this.entities.get(relationship.toEntityId)

    return `
      <div class="relationship-details">
        <h5>Relationship</h5>
        <p><strong>From:</strong> ${fromEntity?.name || 'Unknown'}</p>
        <p><strong>To:</strong> ${toEntity?.name || 'Unknown'}</p>
        <p><strong>Type:</strong> ${relationship.type}</p>
        <p><strong>Strength:</strong> ${(relationship.strength * 100).toFixed(0)}%</p>
        <p><strong>Public:</strong> ${relationship.isPublic ? 'Yes' : 'No'}</p>
        ${relationship.description ? `<p><strong>Description:</strong> ${relationship.description}</p>` : ''}
        <div class="detail-actions">
          <button class="btn-edit-relationship">Edit</button>
          <button class="btn-delete-relationship">Delete</button>
        </div>
      </div>
    `
  }

  /**
   * Render connection details
   */
  private renderConnectionDetails(): string {
    if (!this.selectedConnection) return ''

    const connection = this.connections.get(this.selectedConnection)
    if (!connection) return ''

    const fromLocation = this.entities.get(connection.fromLocationId)
    const toLocation = this.entities.get(connection.toLocationId)

    return `
      <div class="connection-details">
        <h5>Connection</h5>
        <p><strong>From:</strong> ${fromLocation?.name || 'Unknown'}</p>
        <p><strong>To:</strong> ${toLocation?.name || 'Unknown'}</p>
        <p><strong>Type:</strong> ${connection.type}</p>
        <p><strong>Bidirectional:</strong> ${connection.bidirectional ? 'Yes' : 'No'}</p>
        ${connection.requirements?.length ? `<p><strong>Requirements:</strong> ${connection.requirements.join(', ')}</p>` : ''}
        ${connection.description ? `<p><strong>Description:</strong> ${connection.description}</p>` : ''}
        <div class="detail-actions">
          <button class="btn-edit-connection">Edit</button>
          <button class="btn-delete-connection">Delete</button>
        </div>
      </div>
    `
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(e: MouseEvent): void {
    const rect = this.svg.getBoundingClientRect()
    const x = (e.clientX - rect.left) / this.zoom - this.panX
    const y = (e.clientY - rect.top) / this.zoom - this.panY

    // Check if clicking on a node
    for (const [entityId, node] of this.nodes) {
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2)
      if (distance <= 25) {
        this.selectEntity(entityId)
        this.isDragging = true
        this.dragOffset = {
          x: x - node.x,
          y: y - node.y,
        }
        e.preventDefault()
        return
      }
    }

    // Clear selection if not clicking on anything
    this.clearSelection()
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(e: MouseEvent): void {
    if (this.isDragging && this.selectedEntity) {
      const rect = this.svg.getBoundingClientRect()
      const x = (e.clientX - rect.left) / this.zoom - this.panX
      const y = (e.clientY - rect.top) / this.zoom - this.panY

      const node = this.nodes.get(this.selectedEntity)
      if (node) {
        node.x = x - this.dragOffset.x
        node.y = y - this.dragOffset.y
        this.render()
      }
    }
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(_e: MouseEvent): void {
    this.isDragging = false
  }

  /**
   * Handle wheel events for zooming
   */
  private handleWheel(e: WheelEvent): void {
    e.preventDefault()

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(3, this.zoom * zoomFactor))

    const rect = this.svg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom)
    this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom)
    this.zoom = newZoom

    this.render()
  }

  /**
   * Handle click events
   */
  private handleClick(e: MouseEvent): void {
    const target = e.target as Element

    // Check for relationship/connection selection
    const relationshipId = target.getAttribute('data-relationship-id')
    if (relationshipId) {
      this.selectRelationship(relationshipId)
      return
    }

    const connectionId = target.getAttribute('data-connection-id')
    if (connectionId) {
      this.selectConnection(connectionId)
      return
    }
  }

  /**
   * Handle double click for creating relationships/connections
   */
  private handleDoubleClick(e: MouseEvent): void {
    if (this.selectedEntity) {
      this.showCreateDialog()
    }
  }

  /**
   * Select entity
   */
  private selectEntity(entityId: EntityId): void {
    this.selectedEntity = entityId
    this.selectedRelationship = null
    this.selectedConnection = null
    this.renderEntityList()
    this.render()
  }

  /**
   * Select relationship
   */
  private selectRelationship(relationshipId: string): void {
    this.selectedRelationship = relationshipId
    this.selectedEntity = null
    this.selectedConnection = null
    this.render()
  }

  /**
   * Select connection
   */
  private selectConnection(connectionId: string): void {
    this.selectedConnection = connectionId
    this.selectedEntity = null
    this.selectedRelationship = null
    this.render()
  }

  /**
   * Clear all selections
   */
  private clearSelection(): void {
    this.selectedEntity = null
    this.selectedRelationship = null
    this.selectedConnection = null
    this.renderEntityList()
    this.render()
  }

  /**
   * Auto layout entities
   */
  private autoLayout(): void {
    const entities = Array.from(this.entities.values())
    const center = { x: 300, y: 300 }
    const radius = 200

    entities.forEach((entity, index) => {
      const angle = (index / entities.length) * 2 * Math.PI
      const node = this.nodes.get(entity.id)
      if (node) {
        node.x = center.x + Math.cos(angle) * radius
        node.y = center.y + Math.sin(angle) * radius
      }
    })

    this.render()
  }

  /**
   * Show create relationship/connection dialog
   */
  private showCreateDialog(): void {
    // This would open a modal dialog for creating relationships/connections
    // For now, just show a simple prompt
    if (this.mode === 'relationships' || this.mode === 'both') {
      const targetEntityId = prompt('Enter target entity ID for relationship:')
      if (targetEntityId && this.entities.has(targetEntityId) && targetEntityId !== this.selectedEntity) {
        this.createRelationship(this.selectedEntity!, targetEntityId)
      }
    }

    if (this.mode === 'connections' || this.mode === 'both') {
      const targetLocationId = prompt('Enter target location ID for connection:')
      if (targetLocationId && this.entities.has(targetLocationId) && targetLocationId !== this.selectedEntity) {
        this.createConnection(this.selectedEntity!, targetLocationId)
      }
    }
  }

  /**
   * Create a new relationship
   */
  private createRelationship(fromEntityId: EntityId, toEntityId: EntityId): void {
    const relationship: Relationship = {
      id: `rel-${Date.now()}`,
      fromEntityId,
      toEntityId,
      type: RelationshipType.NEUTRAL,
      strength: 0.5,
      isPublic: true,
    }

    this.relationships.set(relationship.id, relationship)
    this.buildGraph()
    this.render()

    this.onRelationshipChange?.(Array.from(this.relationships.values()))
    this.feedbackManager.showNotification('Relationship created', FeedbackType.SUCCESS)
  }

  /**
   * Create a new connection
   */
  private createConnection(fromLocationId: EntityId, toLocationId: EntityId): void {
    const connection: Connection = {
      id: `conn-${Date.now()}`,
      fromLocationId,
      toLocationId,
      type: ConnectionType.DIRECT,
      bidirectional: true,
    }

    this.connections.set(connection.id, connection)
    this.buildGraph()
    this.render()

    this.onConnectionChange?.(Array.from(this.connections.values()))
    this.feedbackManager.showNotification('Connection created', FeedbackType.SUCCESS)
  }

  /**
   * Export relationships and connections
   */
  private exportRelationships(): void {
    const data = {
      relationships: Array.from(this.relationships.values()),
      connections: Array.from(this.connections.values()),
      timestamp: Date.now(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'relationships-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Resize canvas to match container
   */
  private resizeCanvas(): void {
    const container = this.container.querySelector('.relationship-canvas-container') as HTMLElement
    if (container) {
      const rect = container.getBoundingClientRect()
      this.canvas.width = rect.width
      this.canvas.height = rect.height
      this.render()
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
   * Update entities
   */
  updateEntities(entities: EditableEntity[]): void {
    this.entities.clear()
    entities.forEach(entity => {
      this.entities.set(entity.id, entity)
    })
    this.buildGraph()
    this.render()
  }

  /**
   * Get current relationships
   */
  getRelationships(): Relationship[] {
    return Array.from(this.relationships.values())
  }

  /**
   * Get current connections
   */
  getConnections(): Connection[] {
    return Array.from(this.connections.values())
  }
}

/**
 * CSS styles for relationship editor
 */
export const relationshipEditorStyles = `
  .relationship-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .relationship-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .mode-selector {
    display: flex;
    gap: 16px;
  }
  
  .mode-selector label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    cursor: pointer;
  }
  
  .toolbar-actions {
    display: flex;
    gap: 8px;
  }
  
  .toolbar-actions button {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 12px;
  }
  
  .toolbar-actions button:hover {
    background: #f5f5f5;
  }
  
  .relationship-canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }
  
  .relationship-canvas {
    position: absolute;
    top: 0;
    left: 0;
  }
  
  .relationship-svg {
    cursor: grab;
  }
  
  .relationship-svg:active {
    cursor: grabbing;
  }
  
  .relationship-sidebar {
    width: 250px;
    background: #f8f9fa;
    border-left: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
  }
  
  .entity-list,
  .relationship-details {
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .entity-list h4,
  .relationship-details h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
  }
  
  .entity-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 4px;
  }
  
  .entity-item:hover {
    background: #e3f2fd;
  }
  
  .entity-item.selected {
    background: #2196f3;
    color: white;
  }
  
  .entity-type-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  
  .entity-info {
    flex: 1;
  }
  
  .entity-name {
    font-size: 12px;
    font-weight: 500;
  }
  
  .entity-type {
    font-size: 10px;
    opacity: 0.7;
  }
  
  .details-content {
    font-size: 12px;
  }
  
  .details-content p {
    margin: 4px 0;
  }
  
  .detail-actions {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .detail-actions button {
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 11px;
  }
  
  .detail-actions button:hover {
    background: #f5f5f5;
  }
  
  .btn-add-relationship {
    background: #4caf50 !important;
    color: white !important;
    border-color: #4caf50 !important;
  }
  
  .btn-add-connection {
    background: #2196f3 !important;
    color: white !important;
    border-color: #2196f3 !important;
  }
  
  .btn-delete-relationship,
  .btn-delete-connection {
    background: #f44336 !important;
    color: white !important;
    border-color: #f44336 !important;
  }
`