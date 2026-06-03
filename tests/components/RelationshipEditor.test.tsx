import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RelationshipEditor } from '../../src/components/RelationshipEditor'
import { AppProvider, useAppContext } from '../../src/contexts/AppContext'
import type { StoryData } from '../../src/types/StoryData'
import '@testing-library/jest-dom'

const sampleStoryData: StoryData = {
  persons: [
    {
      id: 1,
      name: 'Alice',
      color: '#ff0000',
      relationships: [{ targetId: '2', type: 'friend' }],
    },
    { id: 2, name: 'Bob', color: '#00ff00' },
  ],
  locations: [
    { id: 1, name: 'Room 1', connections: [2] },
    { id: 2, name: 'Room 2', connections: [1] },
  ],
  props: [],
  informations: [],
  initialStates: [],
  acts: [],
}

const Seeder: React.FC<{ data: StoryData | null; children: React.ReactNode }> = ({
  data,
  children,
}) => {
  const { setStoryData } = useAppContext()
  React.useEffect(() => {
    setStoryData(data)
  }, [data, setStoryData])
  return <>{children}</>
}

describe('RelationshipEditor', () => {
  it('renders without crashing when no story data is loaded', () => {
    render(
      <AppProvider>
        <RelationshipEditor initialMode="relationships" />
      </AppProvider>,
    )

    expect(screen.getByText('関係性がありません')).toBeInTheDocument()
  })

  it('derives relationship nodes from the loaded story data', async () => {
    render(
      <AppProvider>
        <Seeder data={sampleStoryData}>
          <RelationshipEditor initialMode="relationships" />
        </Seeder>
      </AppProvider>,
    )

    await waitFor(() => {
      expect(screen.queryByText(/No relationships to display/i)).not.toBeInTheDocument()
    })
  })
})
