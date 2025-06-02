import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { StoryData, Act, Event } from '../../types'
import { useVisualFeedback } from '../../contexts/VisualFeedbackContext'
import { CausalityEngine } from '../../modules/core/causalityEngine'
import styles from './CausalityView.module.css'

interface CausalityViewProps {
  storyData: StoryData
  currentTime?: number
  onTimeSeek?: (minutes: number) => void
}

interface Node {
  id: string
  type: 'act' | 'event'
  data: Act | Event
  x: number
  y: number
  time: number
  causedBy: string[]
  causes: string[]
}

interface ViewState {
  scale: number
  offsetX: number
  offsetY: number
}

export const CausalityView: React.FC<CausalityViewProps> = ({ 
  storyData, 
  currentTime = 0,
  onTimeSeek 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [viewState, setViewState] = useState<ViewState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  })
  
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  
  const { showNotification } = useVisualFeedback()
  
  // Initialize causality engine
  const causalityEngine = useMemo(() => {
    return new CausalityEngine(storyData)
  }, [storyData])

  // Build node graph
  const nodes = useMemo(() => {
    const nodeMap = new Map<string, Node>()
    const relationships = causalityEngine.getCausalRelationships()
    
    // Create nodes for acts
    storyData.acts.forEach((act, index) => {
      const node: Node = {
        id: `act-${act.id}`,
        type: 'act',
        data: act,
        x: 0,
        y: 0,
        time: act.startTime || 0,
        causedBy: [],
        causes: []
      }
      nodeMap.set(node.id, node)
    })
    
    // Create nodes for events
    storyData.events.forEach((event, index) => {
      const node: Node = {
        id: `event-${event.id}`,
        type: 'event',
        data: event,
        x: 0,
        y: 0,
        time: 0, // Will be calculated based on trigger
        causedBy: [],
        causes: []
      }
      nodeMap.set(node.id, node)
    })
    
    // Build relationships
    relationships.forEach(rel => {
      const fromNode = nodeMap.get(rel.from)
      const toNode = nodeMap.get(rel.to)
      if (fromNode && toNode) {
        fromNode.causes.push(rel.to)
        toNode.causedBy.push(rel.from)
      }
    })
    
    // Layout nodes
    layoutNodes(Array.from(nodeMap.values()))
    
    return Array.from(nodeMap.values())
  }, [storyData, causalityEngine])

  // Layout algorithm
  const layoutNodes = (nodes: Node[]) => {
    const timeGroups = new Map<number, Node[]>()
    
    // Group by time
    nodes.forEach(node => {
      const time = Math.floor(node.time / 60) * 60 // Round to nearest hour
      if (!timeGroups.has(time)) {
        timeGroups.set(time, [])
      }
      timeGroups.get(time)!.push(node)
    })
    
    // Position nodes
    const times = Array.from(timeGroups.keys()).sort((a, b) => a - b)
    times.forEach((time, timeIndex) => {
      const nodesAtTime = timeGroups.get(time)!
      const spacing = 120
      const yStart = -(nodesAtTime.length - 1) * spacing / 2
      
      nodesAtTime.forEach((node, nodeIndex) => {
        node.x = timeIndex * 200 + 100
        node.y = yStart + nodeIndex * spacing + 100
      })
    })
  }

  // Convert coordinates
  const worldToScreen = useCallback((x: number, y: number) => {
    return {
      x: (x - viewState.offsetX) * viewState.scale,
      y: (y - viewState.offsetY) * viewState.scale
    }
  }, [viewState])

  const screenToWorld = useCallback((x: number, y: number) => {
    return {
      x: x / viewState.scale + viewState.offsetX,
      y: y / viewState.scale + viewState.offsetY
    }
  }, [viewState])

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Save context
    ctx.save()
    
    // Apply transformations
    ctx.scale(viewState.scale, viewState.scale)
    ctx.translate(-viewState.offsetX, -viewState.offsetY)
    
    // Draw connections
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2
    
    nodes.forEach(node => {
      node.causes.forEach(targetId => {
        const targetNode = nodes.find(n => n.id === targetId)
        if (targetNode) {
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          
          // Draw curved line
          const cp1x = node.x + (targetNode.x - node.x) * 0.5
          const cp1y = node.y
          const cp2x = node.x + (targetNode.x - node.x) * 0.5
          const cp2y = targetNode.y
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, targetNode.x, targetNode.y)
          ctx.stroke()
          
          // Draw arrowhead
          const angle = Math.atan2(targetNode.y - cp2y, targetNode.x - cp2x)
          const arrowSize = 10
          
          ctx.beginPath()
          ctx.moveTo(targetNode.x, targetNode.y)
          ctx.lineTo(
            targetNode.x - arrowSize * Math.cos(angle - Math.PI / 6),
            targetNode.y - arrowSize * Math.sin(angle - Math.PI / 6)
          )
          ctx.lineTo(
            targetNode.x - arrowSize * Math.cos(angle + Math.PI / 6),
            targetNode.y - arrowSize * Math.sin(angle + Math.PI / 6)
          )
          ctx.closePath()
          ctx.fillStyle = '#94a3b8'
          ctx.fill()
        }
      })
    })
    
    // Restore context
    ctx.restore()
  }, [nodes, viewState])

  // Handle mouse events
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(Math.max(viewState.scale * delta, 0.1), 5)
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const worldPos = screenToWorld(mouseX, mouseY)
      
      setViewState(prev => ({
        scale: newScale,
        offsetX: worldPos.x - mouseX / newScale,
        offsetY: worldPos.y - mouseY / newScale
      }))
    }
  }, [viewState.scale, screenToWorld])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const worldPos = screenToWorld(x, y)
      
      // Check if clicking on a node
      const clickedNode = nodes.find(node => {
        const dx = worldPos.x - node.x
        const dy = worldPos.y - node.y
        return Math.sqrt(dx * dx + dy * dy) < 40
      })
      
      if (clickedNode) {
        setSelectedNode(clickedNode.id)
        showNotification(`Selected: ${clickedNode.data.id}`, { type: 'info' })
        
        if (onTimeSeek && clickedNode.type === 'act') {
          const act = clickedNode.data as Act
          onTimeSeek(act.startTime || 0)
        }
      } else {
        setIsPanning(true)
        setPanStart({ x: e.clientX, y: e.clientY })
      }
    }
  }, [nodes, screenToWorld, showNotification, onTimeSeek])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      
      setViewState(prev => ({
        ...prev,
        offsetX: prev.offsetX - dx / prev.scale,
        offsetY: prev.offsetY - dy / prev.scale
      }))
      
      setPanStart({ x: e.clientX, y: e.clientY })
    } else {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const worldPos = screenToWorld(x, y)
        
        const hoveredNode = nodes.find(node => {
          const dx = worldPos.x - node.x
          const dy = worldPos.y - node.y
          return Math.sqrt(dx * dx + dy * dy) < 40
        })
        
        setHoveredNode(hoveredNode?.id || null)
      }
    }
  }, [isPanning, panStart, screenToWorld, nodes])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Update canvas size
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current
      const canvas = canvasRef.current
      const svg = svgRef.current
      
      if (container && canvas && svg) {
        const rect = container.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height
        svg.setAttribute('width', rect.width.toString())
        svg.setAttribute('height', rect.height.toString())
      }
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Render when view state changes
  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  return (
    <div 
      ref={containerRef}
      className={styles.container}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas 
        ref={canvasRef}
        className={styles.canvas}
      />
      <svg 
        ref={svgRef}
        className={styles.svg}
      >
        {nodes.map(node => {
          const pos = worldToScreen(node.x, node.y)
          const isSelected = node.id === selectedNode
          const isHovered = node.id === hoveredNode
          const radius = 35
          
          return (
            <g key={node.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius}
                className={`${styles.node} ${styles[node.type]} ${isSelected ? styles.selected : ''} ${isHovered ? styles.hovered : ''}`}
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className={styles.nodeText}
              >
                {node.data.id.slice(0, 8)}
              </text>
            </g>
          )
        })}
      </svg>
      <div className={styles.controls}>
        <button onClick={() => setViewState({ scale: 1, offsetX: 0, offsetY: 0 })}>
          Reset View
        </button>
        <span>Scale: {viewState.scale.toFixed(2)}x</span>
      </div>
    </div>
  )
}