import React, { useState, useEffect } from 'react'
import { EntityEditor } from '../components/EntityEditor'
import { useAppContext } from '../contexts/AppContext'
import { ExtendedEntity, EntityType } from '../types/extendedEntities'

export const EntitiesPage: React.FC = () => {
  const { storyData, setStoryData } = useAppContext()
  const [entities, setEntities] = useState<ExtendedEntity[]>([])
  const [selectedEntity, setSelectedEntity] = useState<ExtendedEntity | null>(null)

  useEffect(() => {
    if (storyData) {
      // Convert story data entities to ExtendedEntity format
      const convertedEntities: ExtendedEntity[] = [
        ...storyData.persons.map(person => ({
          id: person.id,
          type: 'person' as EntityType,
          name: person.name,
          description: person.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attributes: {},
          relationships: []
        })),
        ...storyData.locations.map(location => ({
          id: location.id,
          type: 'location' as EntityType,
          name: location.name,
          description: location.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attributes: {},
          relationships: []
        }))
      ]
      setEntities(convertedEntities)
    }
  }, [storyData])

  const handleEntityUpdate = (updatedEntity: ExtendedEntity) => {
    setEntities(prev => prev.map(e => e.id === updatedEntity.id ? updatedEntity : e))
    
    // Update story data if needed
    if (storyData) {
      if (updatedEntity.type === 'person') {
        const updatedPersons = storyData.persons.map(p => 
          p.id === updatedEntity.id ? { ...p, name: updatedEntity.name } : p
        )
        setStoryData({ ...storyData, persons: updatedPersons })
      } else if (updatedEntity.type === 'location') {
        const updatedLocations = storyData.locations.map(l => 
          l.id === updatedEntity.id ? { ...l, name: updatedEntity.name } : l
        )
        setStoryData({ ...storyData, locations: updatedLocations })
      }
    }
  }

  const handleEntityCreate = () => {
    const newEntity: ExtendedEntity = {
      id: `entity_${Date.now()}`,
      type: 'person',
      name: 'New Entity',
      description: 'New entity description',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attributes: {},
      relationships: []
    }
    setEntities([...entities, newEntity])
    setSelectedEntity(newEntity)
  }

  const handleEntityDelete = (entityId: string) => {
    setEntities(entities.filter(e => e.id !== entityId))
    if (selectedEntity?.id === entityId) {
      setSelectedEntity(null)
    }
  }

  return (
    <div className="page entities-page">
      <h2>Entity Management</h2>
      <div className="page-content">
        <div className="entities-list">
          <div className="entities-header">
            <h3>Entities</h3>
            <button onClick={handleEntityCreate} className="create-button">
              + New Entity
            </button>
          </div>
          <div className="entity-items">
            {entities.map(entity => (
              <div
                key={entity.id}
                className={`entity-item ${selectedEntity?.id === entity.id ? 'selected' : ''}`}
                onClick={() => setSelectedEntity(entity)}
              >
                <span className="entity-type">{entity.type}</span>
                <span className="entity-name">{entity.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="entity-editor-container">
          {selectedEntity ? (
            <EntityEditor
              entity={selectedEntity}
              onUpdate={handleEntityUpdate}
              onDelete={() => handleEntityDelete(selectedEntity.id)}
            />
          ) : (
            <div className="no-selection">
              <p>Select an entity to edit or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}