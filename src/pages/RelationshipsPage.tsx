import React from 'react'
import { RelationshipEditor } from '../components/RelationshipEditor'
import { useAppContext } from '../contexts/AppContext'

export const RelationshipsPage: React.FC = () => {
  const { storyData } = useAppContext()

  if (!storyData) {
    return (
      <div className="page relationships-page">
        <h2>Relationship Editor</h2>
        <div className="no-data-message">
          <p>No story data loaded. Please load data from the Simulation page first.</p>
        </div>
      </div>
    )
  }

  // Convert story data to entities format expected by RelationshipEditor
  const entities = [
    ...storyData.persons.map(person => ({
      id: person.id,
      type: 'person' as const,
      name: person.name,
      description: person.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attributes: {},
      relationships: []
    })),
    ...storyData.locations.map(location => ({
      id: location.id,
      type: 'location' as const,
      name: location.name,
      description: location.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attributes: {},
      relationships: []
    }))
  ]

  return (
    <div className="page relationships-page">
      <h2>Relationship Editor</h2>
      <div className="page-content">
        <RelationshipEditor entities={entities} />
      </div>
    </div>
  )
}