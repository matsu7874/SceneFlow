import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { SpatialView } from '../../src/components/SpatialView/SpatialView'
import { MapBackgroundProvider } from '../../src/contexts/MapBackgroundContext'
import type { StoryData } from '../../src/types/StoryData'

const data: StoryData = {
  persons: [{ id: 1, name: '太郎', color: '#3b82f6' }],
  locations: [
    { id: 10, name: '広場', connections: [11], x: 0, y: 0 },
    { id: 11, name: '図書館', connections: [10], x: 100, y: 0 },
  ],
  props: [{ id: 1, name: '鍵', currentLocation: '11' }],
  informations: [],
  initialStates: [{ personId: 1, locationId: 10, time: '00:00' }],
  acts: [
    { id: 1, personId: 1, locationId: 10, time: '00:00', startTime: 0, description: 'いる' },
    {
      id: 2,
      personId: 1,
      locationId: 11,
      time: '00:10',
      startTime: 10,
      type: 'GIVE',
      propId: 1,
      interactedPersonId: 1,
      description: '鍵を渡す',
    },
  ],
}

const renderView = (story: StoryData): ReturnType<typeof render> =>
  render(
    <MapBackgroundProvider>
      <SpatialView storyData={story} />
    </MapBackgroundProvider>,
  )

describe('SpatialView', () => {
  it('各場所のノードを描画する', () => {
    renderView(data)
    expect(screen.getByTestId('spatial-loc-10')).toBeInTheDocument()
    expect(screen.getByTestId('spatial-loc-11')).toBeInTheDocument()
  })
  it('人物の動線を描画する', () => {
    renderView(data)
    expect(screen.getByTestId('spatial-path-1')).toBeInTheDocument()
  })
  it('破綻のある場所を data-breakage=true で示す', () => {
    renderView(data)
    expect(screen.getByTestId('spatial-loc-11')).toHaveAttribute('data-breakage', 'true')
    expect(screen.getByTestId('spatial-loc-10')).toHaveAttribute('data-breakage', 'false')
  })
})
