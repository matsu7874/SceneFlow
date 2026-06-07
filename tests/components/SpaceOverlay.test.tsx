import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { SpaceOverlay } from '../../src/components/Space/SpaceOverlay'
import type { MapOverlayInfo } from '../../src/components/MapEditor/MapEditor'
import type { MovementPolyline } from '../../src/components/MapBackground/spatial'
import type { Person } from '../../src/types/StoryData'

const persons: Person[] = [{ id: 1, name: '太郎', color: '#3b82f6' }]

const info: MapOverlayInfo = {
  worldToScreen: (x, y) => ({ x, y }),
  zoom: 1,
  mapData: {
    locations: [
      { id: '10', name: '広場', x: 0, y: 0 },
      { id: '11', name: '図書館', x: 100, y: 0 },
    ],
    connections: [],
  },
  width: 800,
  height: 600,
}

const polylines: MovementPolyline[] = [{ personId: 1, locationIds: [10, 11] }]
const breakLocs = new Set<number>([11])

describe('SpaceOverlay', () => {
  it('各場所のマーカーを testid 付きで描画する', () => {
    render(
      <SpaceOverlay
        info={info}
        persons={persons}
        polylines={polylines}
        breakLocs={breakLocs}
        showMovement
        showBreakage
      />,
    )
    expect(screen.getByTestId('spatial-loc-10')).toBeInTheDocument()
    expect(screen.getByTestId('spatial-loc-11')).toBeInTheDocument()
  })

  it('動線表示ONで人物の動線を描画する', () => {
    render(
      <SpaceOverlay
        info={info}
        persons={persons}
        polylines={polylines}
        breakLocs={breakLocs}
        showMovement
        showBreakage
      />,
    )
    expect(screen.getByTestId('spatial-path-1')).toBeInTheDocument()
  })

  it('動線表示OFFでは動線を描画しない', () => {
    render(
      <SpaceOverlay
        info={info}
        persons={persons}
        polylines={polylines}
        breakLocs={breakLocs}
        showMovement={false}
        showBreakage
      />,
    )
    expect(screen.queryByTestId('spatial-path-1')).not.toBeInTheDocument()
  })

  it('破綻のある場所を data-breakage=true で示す', () => {
    render(
      <SpaceOverlay
        info={info}
        persons={persons}
        polylines={polylines}
        breakLocs={breakLocs}
        showMovement
        showBreakage
      />,
    )
    expect(screen.getByTestId('spatial-loc-11')).toHaveAttribute('data-breakage', 'true')
    expect(screen.getByTestId('spatial-loc-10')).toHaveAttribute('data-breakage', 'false')
  })
})
