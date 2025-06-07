import React, { useState } from 'react'
import { RelationshipEditor } from '../components/RelationshipEditor'
import { CharacterRelationshipDiagram } from '../components/CharacterRelationshipDiagram'
import { useAppContext } from '../contexts/AppContext'

export const RelationshipsPage: React.FC = () => {
  const { storyData } = useAppContext()
  const [viewMode, setViewMode] = useState<'diagram' | 'editor'>('diagram')

  if (!storyData) {
    return (
      <div className="page relationships-page">
        <h2>関係性</h2>
        <div className="no-data-message">
          <p>データが読み込まれていません。シミュレーションページで物語データを読み込んでください。</p>
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
      relationships: [],
    })),
    ...storyData.locations.map(location => ({
      id: location.id,
      type: 'location' as const,
      name: location.name,
      description: location.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attributes: {},
      relationships: [],
    })),
  ]

  return (
    <div className="page relationships-page">
      <h2>関係性</h2>
      <div className="view-mode-selector">
        <button
          className={viewMode === 'diagram' ? 'active' : ''}
          onClick={() => setViewMode('diagram')}
        >
          相関図
        </button>
        <button
          className={viewMode === 'editor' ? 'active' : ''}
          onClick={() => setViewMode('editor')}
        >
          エディタ
        </button>
      </div>
      <div className="page-content">
        {viewMode === 'diagram' ? (
          <CharacterRelationshipDiagram persons={storyData.persons} />
        ) : (
          <RelationshipEditor entities={entities} />
        )}
      </div>
    </div>
  )
}