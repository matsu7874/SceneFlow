import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { useAppContext } from '../../contexts/AppContext'
import { Person, Location, Relationship, Connection } from '../../types'

export type EditorMode = 'relationships' | 'connections';

export interface GraphNode {
  id: string;
  name: string;
  type: 'person' | 'location';
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  id: string;
  type: string;
  strength: number;
  details?: Relationship | Connection;
}

export interface FilterOptions {
  entityId?: string;
  relationshipType?: string;
}

export function useRelationshipEditor(mode: EditorMode) {
  const {
    persons,
    locations,
    relationships,
    connections,
    updateRelationship,
    deleteRelationship,
    updateConnection,
    deleteConnection,
  } = useAppContext()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({})
  const [selectedItem, setSelectedItem] = useState<Relationship | Connection | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'node' | 'link';
    item: GraphNode | GraphLink;
  } | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Process data into graph format
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []
    const nodeMap = new Map<string, GraphNode>()

    if (mode === 'relationships') {
      // Add person nodes
      persons.forEach(person => {
        const node: GraphNode = {
          id: person.id,
          name: person.name,
          type: 'person',
        }
        nodes.push(node)
        nodeMap.set(person.id, node)
      })

      // Add relationship links
      relationships.forEach(rel => {
        if (nodeMap.has(rel.person1Id) && nodeMap.has(rel.person2Id)) {
          links.push({
            source: rel.person1Id,
            target: rel.person2Id,
            id: rel.id,
            type: rel.type,
            strength: rel.strength || 0.5,
            details: rel,
          })
        }
      })
    } else {
      // Add location nodes
      locations.forEach(location => {
        const node: GraphNode = {
          id: location.id,
          name: location.name,
          type: 'location',
        }
        nodes.push(node)
        nodeMap.set(location.id, node)
      })

      // Add connection links
      connections.forEach(conn => {
        if (nodeMap.has(conn.location1Id) && nodeMap.has(conn.location2Id)) {
          links.push({
            source: conn.location1Id,
            target: conn.location2Id,
            id: conn.id,
            type: conn.type,
            strength: conn.strength || 0.5,
            details: conn,
          })
        }
      })
    }

    // Apply filters
    let filteredNodes = nodes
    let filteredLinks = links

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredNodes = nodes.filter(node =>
        node.name.toLowerCase().includes(query),
      )
      const nodeIds = new Set(filteredNodes.map(n => n.id))
      filteredLinks = links.filter(link =>
        nodeIds.has(typeof link.source === 'string' ? link.source : link.source.id) &&
        nodeIds.has(typeof link.target === 'string' ? link.target : link.target.id),
      )
    }

    if (filterOptions.entityId) {
      filteredLinks = filteredLinks.filter(link =>
        (typeof link.source === 'string' ? link.source : link.source.id) === filterOptions.entityId ||
        (typeof link.target === 'string' ? link.target : link.target.id) === filterOptions.entityId,
      )
      const connectedNodeIds = new Set<string>()
      filteredLinks.forEach(link => {
        connectedNodeIds.add(typeof link.source === 'string' ? link.source : link.source.id)
        connectedNodeIds.add(typeof link.target === 'string' ? link.target : link.target.id)
      })
      connectedNodeIds.add(filterOptions.entityId)
      filteredNodes = filteredNodes.filter(node => connectedNodeIds.has(node.id))
    }

    if (filterOptions.relationshipType) {
      filteredLinks = filteredLinks.filter(link => link.type === filterOptions.relationshipType)
      const connectedNodeIds = new Set<string>()
      filteredLinks.forEach(link => {
        connectedNodeIds.add(typeof link.source === 'string' ? link.source : link.source.id)
        connectedNodeIds.add(typeof link.target === 'string' ? link.target : link.target.id)
      })
      filteredNodes = filteredNodes.filter(node => connectedNodeIds.has(node.id))
    }

    return { nodes: filteredNodes, links: filteredLinks }
  }, [mode, persons, locations, relationships, connections, searchQuery, filterOptions])

  // Initialize D3 force simulation
  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    const { width, height } = dimensions

    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(graphData.links)
        .id(d => d.id)
        .distance(100)
        .strength(d => d.strength))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))

    simulationRef.current = simulation

    // Update positions on tick
    simulation.on('tick', () => {
      // Update link positions
      svg.selectAll<SVGLineElement, GraphLink>('.link')
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0)

      // Update node positions
      svg.selectAll<SVGGElement, GraphNode>('.node')
        .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`)
    })

    return () => {
      simulation.stop()
    }
  }, [graphData, dimensions])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Node drag behavior
  const handleDragStart = useCallback((event: any, d: GraphNode) => {
    if (!simulationRef.current) return
    if (!event.active) simulationRef.current.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
  }, [])

  const handleDrag = useCallback((event: any, d: GraphNode) => {
    d.fx = event.x
    d.fy = event.y
  }, [])

  const handleDragEnd = useCallback((event: any, d: GraphNode) => {
    if (!simulationRef.current) return
    if (!event.active) simulationRef.current.alphaTarget(0)
    d.fx = null
    d.fy = null
  }, [])

  // Context menu handlers
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: GraphNode) => {
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      item: node,
    })
  }, [])

  const handleLinkContextMenu = useCallback((event: React.MouseEvent, link: GraphLink) => {
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'link',
      item: link,
    })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Selection handlers
  const handleNodeClick = useCallback((node: GraphNode) => {
    // Find all relationships/connections involving this node
    const relatedItems = graphData.links
      .filter(link =>
        (typeof link.source === 'string' ? link.source : link.source.id) === node.id ||
        (typeof link.target === 'string' ? link.target : link.target.id) === node.id,
      )
      .map(link => link.details)
      .filter(Boolean)

    if (relatedItems.length === 1 && relatedItems[0]) {
      setSelectedItem(relatedItems[0])
    }
  }, [graphData.links])

  const handleLinkClick = useCallback((link: GraphLink) => {
    if (link.details) {
      setSelectedItem(link.details)
    }
  }, [])

  // Update handlers
  const handleUpdateStrength = useCallback((id: string, strength: number) => {
    if (mode === 'relationships') {
      const relationship = relationships.find(r => r.id === id)
      if (relationship) {
        updateRelationship(id, { ...relationship, strength })
      }
    } else {
      const connection = connections.find(c => c.id === id)
      if (connection) {
        updateConnection(id, { ...connection, strength })
      }
    }
  }, [mode, relationships, connections, updateRelationship, updateConnection])

  const handleDelete = useCallback((id: string) => {
    if (mode === 'relationships') {
      deleteRelationship(id)
    } else {
      deleteConnection(id)
    }
    setSelectedItem(null)
  }, [mode, deleteRelationship, deleteConnection])

  // Get available filter options
  const availableFilters = useMemo(() => {
    const entityOptions = mode === 'relationships'
      ? persons.map(p => ({ id: p.id, name: p.name }))
      : locations.map(l => ({ id: l.id, name: l.name }))

    const typeOptions = Array.from(new Set(
      graphData.links.map(link => link.type),
    )).filter(Boolean)

    return { entityOptions, typeOptions }
  }, [mode, persons, locations, graphData.links])

  return {
    // Data
    graphData,
    selectedItem,
    hoveredNode,
    hoveredLink,
    contextMenu,
    searchQuery,
    filterOptions,
    availableFilters,

    // Refs
    svgRef,
    dimensions,

    // Handlers
    setSearchQuery,
    setFilterOptions,
    setSelectedItem,
    setHoveredNode,
    setHoveredLink,
    handleNodeClick,
    handleLinkClick,
    handleNodeContextMenu,
    handleLinkContextMenu,
    handleCloseContextMenu,
    handleDragStart,
    handleDrag,
    handleDragEnd,
    handleUpdateStrength,
    handleDelete,
  }
}