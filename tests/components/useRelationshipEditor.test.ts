import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { ctx } = vi.hoisted(() => ({ ctx: { storyData: null as unknown } }))

vi.mock('../../src/contexts/AppContext', () => ({
  useAppContext: () => ctx,
}))

import { useRelationshipEditor } from '../../src/components/RelationshipEditor/useRelationshipEditor'

beforeEach(() => {
  ctx.storyData = null
})

describe('useRelationshipEditor derivation', () => {
  it('produces an empty graph when no story data is loaded', () => {
    const { result } = renderHook(() => useRelationshipEditor('relationships'))
    expect(result.current.graphData.nodes).toEqual([])
    expect(result.current.graphData.links).toEqual([])
  })

  it('derives person nodes and relationship links from story data', () => {
    ctx.storyData = {
      persons: [
        { id: 1, name: 'Alice', relationships: [{ targetId: '2', type: 'friend' }] },
        { id: 2, name: 'Bob' },
      ],
      locations: [],
      props: [],
      informations: [],
      initialStates: [],
      acts: [],
    }

    const { result } = renderHook(() => useRelationshipEditor('relationships'))

    const { nodes, links } = result.current.graphData
    expect(nodes.map(n => n.id).sort()).toEqual(['1', '2'])
    expect(nodes.every(n => n.type === 'person')).toBe(true)
    expect(links).toHaveLength(1)
    expect(links[0]).toMatchObject({ source: '1', target: '2', type: 'friend' })
  })

  it('deduplicates a bidirectional connection into a single link', () => {
    // Room 1 <-> Room 2 is expressed from both sides; it should collapse to one edge.
    ctx.storyData = {
      persons: [],
      locations: [
        { id: 1, name: 'Room 1', connections: [2] },
        { id: 2, name: 'Room 2', connections: [1] },
      ],
      props: [],
      informations: [],
      initialStates: [],
      acts: [],
    }

    const { result } = renderHook(() => useRelationshipEditor('connections'))

    const { nodes, links } = result.current.graphData
    expect(nodes.map(n => n.id).sort()).toEqual(['1', '2'])
    expect(links).toHaveLength(1)
    expect(links[0]).toMatchObject({ source: '1', target: '2' })
  })

  it('keeps distinct connections between different location pairs', () => {
    ctx.storyData = {
      persons: [],
      locations: [
        { id: 1, name: 'Room 1', connections: [2, 3] },
        { id: 2, name: 'Room 2', connections: [1] },
        { id: 3, name: 'Room 3', connections: [1] },
      ],
      props: [],
      informations: [],
      initialStates: [],
      acts: [],
    }

    const { result } = renderHook(() => useRelationshipEditor('connections'))

    // 1-2 and 1-3 are distinct edges; the reverse halves are deduped.
    expect(result.current.graphData.links).toHaveLength(2)
  })
})
