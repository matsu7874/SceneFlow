import { Location, Connection } from './types'

interface Node {
  id: string;
  g: number; // Cost from start
  h: number; // Heuristic cost to end
  f: number; // Total cost (g + h)
  parent: Node | null;
}

export class AStar {
  private locations: Map<string, Location>
  private connections: Map<string, Map<string, number>>

  constructor(locations: Location[], connections: Connection[]) {
    this.locations = new Map(locations.map(loc => [loc.id, loc]))
    this.connections = new Map()

    // Build adjacency list
    connections.forEach(conn => {
      if (!this.connections.has(conn.from)) {
        this.connections.set(conn.from, new Map())
      }
      this.connections.get(conn.from)!.set(conn.to, conn.weight)

      if (conn.bidirectional) {
        if (!this.connections.has(conn.to)) {
          this.connections.set(conn.to, new Map())
        }
        this.connections.get(conn.to)!.set(conn.from, conn.weight)
      }
    })
  }

  private heuristic(a: Location, b: Location): number {
    // Euclidean distance
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  findPath(startId: string, endId: string): string[] | null {
    const startLoc = this.locations.get(startId)
    const endLoc = this.locations.get(endId)

    if (!startLoc || !endLoc) {
      return null
    }

    const openSet = new Map<string, Node>()
    const closedSet = new Set<string>()

    const startNode: Node = {
      id: startId,
      g: 0,
      h: this.heuristic(startLoc, endLoc),
      f: 0,
      parent: null,
    }
    startNode.f = startNode.g + startNode.h

    openSet.set(startId, startNode)

    while (openSet.size > 0) {
      // Find node with lowest f score
      let current: Node | null = null
      let lowestF = Infinity

      openSet.forEach(node => {
        if (node.f < lowestF) {
          lowestF = node.f
          current = node
        }
      })

      if (!current) break

      if (current.id === endId) {
        // Reconstruct path
        const path: string[] = []
        let node: Node | null = current
        while (node) {
          path.unshift(node.id)
          node = node.parent
        }
        return path
      }

      openSet.delete(current.id)
      closedSet.add(current.id)

      // Check neighbors
      const neighbors = this.connections.get(current.id)
      if (neighbors) {
        neighbors.forEach((weight, neighborId) => {
          if (closedSet.has(neighborId)) return

          const neighborLoc = this.locations.get(neighborId)
          if (!neighborLoc) return

          const tentativeG = current!.g + weight

          const existingNode = openSet.get(neighborId)
          if (!existingNode || tentativeG < existingNode.g) {
            const node: Node = {
              id: neighborId,
              g: tentativeG,
              h: this.heuristic(neighborLoc, endLoc),
              f: 0,
              parent: current,
            }
            node.f = node.g + node.h
            openSet.set(neighborId, node)
          }
        })
      }
    }

    return null
  }

  getPathCost(path: string[]): number {
    if (path.length < 2) return 0

    let cost = 0
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i]
      const to = path[i + 1]
      const weight = this.connections.get(from)?.get(to)
      if (weight !== undefined) {
        cost += weight
      }
    }
    return cost
  }
}

// Layout algorithms
export function gridLayout(locations: Location[], gridSize: number = 150): Location[] {
  const cols = Math.ceil(Math.sqrt(locations.length))

  return locations.map((loc, index) => ({
    ...loc,
    x: (index % cols) * gridSize + gridSize,
    y: Math.floor(index / cols) * gridSize + gridSize,
  }))
}

export function circleLayout(locations: Location[], radius: number = 200): Location[] {
  const centerX = 400
  const centerY = 300
  const angleStep = (2 * Math.PI) / locations.length

  return locations.map((loc, index) => ({
    ...loc,
    x: centerX + radius * Math.cos(index * angleStep),
    y: centerY + radius * Math.sin(index * angleStep),
  }))
}

export function forceDirectedLayout(
  locations: Location[],
  connections: Connection[],
  iterations: number = 100,
): Location[] {
  // Simple force-directed layout
  const nodes = locations.map(loc => ({
    ...loc,
    vx: 0,
    vy: 0,
  }))

  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const k = Math.sqrt((800 * 600) / nodes.length) // Ideal spring length

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsive forces between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1

        const repulsion = (k * k) / dist
        const fx = (dx / dist) * repulsion
        const fy = (dy / dist) * repulsion

        nodes[i].vx += fx
        nodes[i].vy += fy
        nodes[j].vx -= fx
        nodes[j].vy -= fy
      }
    }

    // Attractive forces for connected nodes
    connections.forEach(conn => {
      const from = nodeMap.get(conn.from)
      const to = nodeMap.get(conn.to)
      if (!from || !to) return

      const dx = to.x - from.x
      const dy = to.y - from.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1

      const attraction = (dist * dist) / k
      const fx = (dx / dist) * attraction * 0.1
      const fy = (dy / dist) * attraction * 0.1

      from.vx += fx
      from.vy += fy
      to.vx -= fx
      to.vy -= fy
    })

    // Apply forces
    nodes.forEach(node => {
      node.x += node.vx * 0.1
      node.y += node.vy * 0.1

      // Keep nodes within bounds
      node.x = Math.max(50, Math.min(750, node.x))
      node.y = Math.max(50, Math.min(550, node.y))

      // Damping
      node.vx *= 0.8
      node.vy *= 0.8
    })
  }

  return nodes.map(({ vx, vy, ...loc }) => loc)
}