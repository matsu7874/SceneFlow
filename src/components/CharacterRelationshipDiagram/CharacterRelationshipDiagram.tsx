import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Person } from '../../types/StoryData'
import { ColorPicker } from '../ColorPicker'
import { useAppContext } from '../../contexts/AppContext'
import styles from './CharacterRelationshipDiagram.module.css'

interface CharacterRelationshipDiagramProps {
  persons: Person[]
}

interface Node {
  id: string
  name: string
  x: number
  y: number
  vx: number
  vy: number
  color: string
}

interface Link {
  source: string
  target: string
  type: string
}

export const CharacterRelationshipDiagram: React.FC<CharacterRelationshipDiagramProps> = ({ persons }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const animationFrameRef = useRef<number>()
  const { storyData, setStoryData } = useAppContext()

  // Initialize nodes and links
  useEffect(() => {
    const newNodes: Node[] = []
    const newLinks: Link[] = []

    // Create nodes from persons
    persons.forEach((person, index) => {
      const angle = (index / persons.length) * 2 * Math.PI
      const radius = 200
      newNodes.push({
        id: person.id.toString(),
        name: person.name,
        x: 400 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        color: person.color || '#3B82F6',
      })

      // Create links from relationships
      if (person.relationships) {
        person.relationships.forEach(rel => {
          // Check if target person exists
          if (persons.find(p => p.id.toString() === rel.targetId)) {
            newLinks.push({
              source: person.id.toString(),
              target: rel.targetId,
              type: rel.type,
            })
          }
        })
      }
    })

    nodesRef.current = newNodes
    setLinks(newLinks)
  }, [persons])

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const nodes = nodesRef.current

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply forces
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].vx *= 0.99 // Start with damping
      nodes[i].vy *= 0.99

      // Repulsion between nodes
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue

        const dx = nodes[j].x - nodes[i].x
        const dy = nodes[j].y - nodes[i].y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        if (distance < 150) {
          const force = (150 - distance) * 0.05
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force
          nodes[i].vx -= fx
          nodes[i].vy -= fy
        }
      }
    }

    // Apply attraction for connected nodes
    links.forEach(link => {
      const source = nodes.find(n => n.id === link.source)
      const target = nodes.find(n => n.id === link.target)
      if (source && target) {
        const dx = target.x - source.x
        const dy = target.y - source.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        if (distance > 100) {
          const force = (distance - 100) * 0.005
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force
          source.vx += fx
          source.vy += fy
          target.vx -= fx
          target.vy -= fy
        }
      }
    })

    // Apply center gravity
    nodes.forEach(node => {
      const dx = 400 - node.x
      const dy = 300 - node.y
      node.vx += dx * 0.0005
      node.vy += dy * 0.0005
    })

    // Update positions
    nodes.forEach(node => {
      node.x += node.vx
      node.y += node.vy

      // Keep nodes within bounds
      node.x = Math.max(50, Math.min(750, node.x))
      node.y = Math.max(50, Math.min(550, node.y))
    })

    // Draw links
    ctx.strokeStyle = '#94A3B8'
    ctx.lineWidth = 2
    links.forEach(link => {
      const source = nodes.find(n => n.id === link.source)
      const target = nodes.find(n => n.id === link.target)
      if (source && target) {
        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        ctx.stroke()

        // Draw relationship type label
        const midX = (source.x + target.x) / 2
        const midY = (source.y + target.y) / 2
        ctx.save()
        ctx.fillStyle = '#475569'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Background for text
        const textWidth = ctx.measureText(link.type).width
        ctx.fillStyle = 'white'
        ctx.fillRect(midX - textWidth/2 - 4, midY - 8, textWidth + 8, 16)

        ctx.fillStyle = '#475569'
        ctx.fillText(link.type, midX, midY)
        ctx.restore()
      }
    })

    // Draw nodes
    nodes.forEach(node => {
      const isHovered = node.id === hoveredNode
      const isSelected = node.id === selectedNode

      // Node circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, isHovered ? 35 : 30, 0, 2 * Math.PI)
      ctx.fillStyle = node.color
      ctx.fill()

      if (isSelected) {
        ctx.strokeStyle = '#1E40AF'
        ctx.lineWidth = 3
        ctx.stroke()
      } else if (isHovered) {
        ctx.strokeStyle = '#60A5FA'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Node label
      ctx.fillStyle = 'white'
      ctx.font = `${isHovered ? '14px' : '12px'} sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.name, node.x, node.y)
    })

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [hoveredNode, selectedNode, links])

  // Start animation
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [animate])

  // Handle mouse events
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Find node under mouse
    let foundNode: string | null = null
    nodesRef.current.forEach(node => {
      const dx = x - node.x
      const dy = y - node.y
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        foundNode = node.id
      }
    })

    setHoveredNode(foundNode)
    canvas.style.cursor = foundNode ? 'pointer' : 'default'
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Find clicked node
    let clickedNode: string | null = null
    nodesRef.current.forEach(node => {
      const dx = x - node.x
      const dy = y - node.y
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        clickedNode = node.id
      }
    })

    setSelectedNode(clickedNode)
  }

  const handleColorChange = (personId: string, color: string) => {
    if (!storyData) return

    const updatedPersons = storyData.persons.map(p =>
      p.id.toString() === personId ? { ...p, color } : p,
    )

    setStoryData({ ...storyData, persons: updatedPersons })

    // Update node color in ref
    const node = nodesRef.current.find(n => n.id === personId)
    if (node) {
      node.color = color
    }
  }

  const selectedNodeData = nodesRef.current.find(n => n.id === selectedNode)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>キャラクター相関図</h3>
        <p className={styles.hint}>ノードをクリックして選択、色を変更できます</p>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className={styles.canvas}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={() => setHoveredNode(null)}
      />
      {selectedNode && selectedNodeData && (
        <div className={styles.selectedInfo}>
          <h4>選択中: {selectedNodeData.name}</h4>
          <div className={styles.colorSection}>
            <ColorPicker
              value={selectedNodeData.color || '#3B82F6'}
              onChange={(color) => handleColorChange(selectedNode, color)}
              label="キャラクターカラー"
            />
          </div>
          <div className={styles.relationships}>
            <h5>関係性:</h5>
            {links
              .filter(link => link.source === selectedNode || link.target === selectedNode)
              .map((link, index) => {
                const otherNodeId = link.source === selectedNode ? link.target : link.source
                const otherNode = nodesRef.current.find(n => n.id === otherNodeId)
                const direction = link.source === selectedNode ? '→' : '←'
                return (
                  <div key={index} className={styles.relationship}>
                    {direction} {otherNode?.name}: {link.type}
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}