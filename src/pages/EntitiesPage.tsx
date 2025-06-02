import React, { useState, useEffect } from 'react'
import { ExtendedEntityEditor } from '../components/EntityEditor/ExtendedEntityEditor'
import { useAppContext } from '../contexts/AppContext'
import { ExtendedEntity, EntityType } from '../types/extendedEntities'
import { useVisualFeedback } from '../contexts/VisualFeedbackContext'

const getEntityTypeLabel = (type: EntityType): string => {
  const labels: Record<EntityType, string> = {
    person: '人物',
    location: '場所',
    prop: '小道具',
    information: '情報',
    act: '行動',
    event: 'イベント',
  }
  return labels[type] || type
}

export const EntitiesPage: React.FC = () => {
  const { storyData, setStoryData } = useAppContext()
  const { showNotification } = useVisualFeedback()
  const [entities, setEntities] = useState<ExtendedEntity[]>([])
  const [selectedEntity, setSelectedEntity] = useState<ExtendedEntity | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<EntityType | 'all'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (storyData) {
      // Convert story data entities to ExtendedEntity format
      const convertedEntities: ExtendedEntity[] = [
        ...storyData.persons.map(person => ({
          id: person.id.toString(),
          type: 'person' as EntityType,
          name: person.name,
          description: person.name || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attributes: person,
          relationships: [],
        })),
        ...storyData.locations.map(location => ({
          id: location.id.toString(),
          type: 'location' as EntityType,
          name: location.name,
          description: location.name || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attributes: location,
          relationships: [],
        })),
        ...storyData.props.map(prop => ({
          id: prop.id.toString(),
          type: 'prop' as EntityType,
          name: prop.name,
          description: prop.name || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attributes: prop,
          relationships: [],
        })),
        ...storyData.informations.map(info => ({
          id: info.id.toString(),
          type: 'information' as EntityType,
          name: info.content.substring(0, 50) + (info.content.length > 50 ? '...' : ''),
          description: info.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attributes: info,
          relationships: [],
        })),
        ...storyData.acts.map(act => ({
          id: act.id.toString(),
          type: 'act' as EntityType,
          name: act.description || `行動 ${act.id}`,
          description: act.description || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attributes: act,
          relationships: [],
        })),
        ...storyData.events.map(event => ({
          id: event.id.toString(),
          type: 'event' as EntityType,
          name: `イベント ${event.id}`,
          description: `${event.eventTime} - ${event.triggerType}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attributes: event,
          relationships: [],
        })),
      ]
      setEntities(convertedEntities)
    }
  }, [storyData])

  const handleEntityUpdate = (updatedEntity: ExtendedEntity): void => {
    setEntities(prev => prev.map(e => (e.id === updatedEntity.id ? updatedEntity : e)))

    // Update story data if needed
    if (storyData) {
      const numericId = Number(updatedEntity.id)
      if (updatedEntity.type === 'person') {
        const updatedPersons = storyData.persons.map(p =>
          p.id === numericId ? { ...p, name: updatedEntity.name } : p,
        )
        setStoryData({ ...storyData, persons: updatedPersons })
      } else if (updatedEntity.type === 'location') {
        const updatedLocations = storyData.locations.map(l =>
          l.id === numericId ? { ...l, name: updatedEntity.name } : l,
        )
        setStoryData({ ...storyData, locations: updatedLocations })
      }
    }
  }

  const handleEntityCreate = (type: EntityType): void => {
    const newId = Date.now()
    const newEntity: ExtendedEntity = {
      id: newId.toString(),
      type,
      name: `新規${getEntityTypeLabel(type)}`,
      description: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attributes: {},
      relationships: [],
    }
    setEntities([...entities, newEntity])
    setSelectedEntity(newEntity)
    setShowCreateModal(false)
    showNotification(`新しい${getEntityTypeLabel(type)}を作成しました`, { type: 'success' })

    // Also update story data
    if (storyData) {
      switch (type) {
        case 'person':
          setStoryData({
            ...storyData,
            persons: [...storyData.persons, { id: newId, name: newEntity.name, color: '#888888' }],
          })
          break
        case 'location':
          setStoryData({
            ...storyData,
            locations: [
              ...storyData.locations,
              { id: newId, name: newEntity.name, connections: [] },
            ],
          })
          break
        case 'prop':
          setStoryData({
            ...storyData,
            props: [...storyData.props, { id: newId, name: newEntity.name }],
          })
          break
        case 'information':
          setStoryData({
            ...storyData,
            informations: [...storyData.informations, { id: newId, content: newEntity.name }],
          })
          break
        case 'act':
          setStoryData({
            ...storyData,
            acts: [
              ...storyData.acts,
              {
                id: newId,
                personId: 1,
                locationId: 1,
                time: '00:00',
                description: newEntity.name,
              },
            ],
          })
          break
        case 'event':
          setStoryData({
            ...storyData,
            events: [
              ...storyData.events,
              {
                id: newId,
                triggerType: '時刻',
                triggerValue: '00:00',
                eventTime: '00:00',
                personId: 1,
                actId: 1,
              },
            ],
          })
          break
      }
    }
  }

  const handleEntityDelete = (entityId: string): void => {
    const entity = entities.find(e => e.id === entityId)
    if (!entity) return

    setEntities(entities.filter(e => e.id !== entityId))
    if (selectedEntity?.id === entityId) {
      setSelectedEntity(null)
    }

    // Also update story data
    if (storyData) {
      const numericId = Number(entityId)
      switch (entity.type) {
        case 'person':
          setStoryData({
            ...storyData,
            persons: storyData.persons.filter(p => p.id !== numericId),
          })
          break
        case 'location':
          setStoryData({
            ...storyData,
            locations: storyData.locations.filter(l => l.id !== numericId),
          })
          break
        case 'prop':
          setStoryData({
            ...storyData,
            props: storyData.props.filter(p => p.id !== numericId),
          })
          break
        case 'information':
          setStoryData({
            ...storyData,
            informations: storyData.informations.filter(i => i.id !== numericId),
          })
          break
        case 'act':
          setStoryData({
            ...storyData,
            acts: storyData.acts.filter(a => a.id !== numericId),
          })
          break
        case 'event':
          setStoryData({
            ...storyData,
            events: storyData.events.filter(e => e.id !== numericId),
          })
          break
      }
    }
  }

  // Filter entities based on search and type
  const filteredEntities = entities.filter(entity => {
    const matchesSearch =
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === 'all' || entity.type === selectedType
    return matchesSearch && matchesType
  })

  // Group entities by type
  const groupedEntities = filteredEntities.reduce(
    (acc, entity) => {
      if (!acc[entity.type]) {
        acc[entity.type] = []
      }
      acc[entity.type].push(entity)
      return acc
    },
    {} as Record<EntityType, ExtendedEntity[]>,
  )

  if (!storyData) {
    return (
      <div className="page entities-page">
        <h2>エンティティ管理</h2>
        <div className="no-data-message">
          <p>
            データが読み込まれていません。シミュレーションページで物語データを読み込んでください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page entities-page">
      <h2>エンティティ管理</h2>
      <div className="page-content">
        <div className="entities-list">
          <div className="entities-header">
            <h3>エンティティ ({filteredEntities.length})</h3>
            <button onClick={() => setShowCreateModal(true)} className="create-button">
              + 新規作成
            </button>
          </div>

          <div className="entities-controls">
            <input
              type="text"
              placeholder="エンティティを検索..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as EntityType | 'all')}
              className="type-filter"
            >
              <option value="all">すべてのタイプ</option>
              <option value="person">人物</option>
              <option value="location">場所</option>
              <option value="prop">小道具</option>
              <option value="information">情報</option>
              <option value="act">行動</option>
              <option value="event">イベント</option>
            </select>
          </div>

          <div className="entity-items">
            {Object.entries(groupedEntities).map(([type, typeEntities]) => (
              <div key={type} className="entity-group">
                <h4 className="entity-group-title">
                  {getEntityTypeLabel(type as EntityType)} ({typeEntities.length})
                </h4>
                {typeEntities.map(entity => (
                  <div
                    key={entity.id}
                    className={`entity-item ${selectedEntity?.id === entity.id ? 'selected' : ''}`}
                    onClick={() => setSelectedEntity(entity)}
                  >
                    <span className="entity-type-badge">{entity.type}</span>
                    <div className="entity-info">
                      <span className="entity-name">{entity.name}</span>
                      <span className="entity-id">{entity.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {filteredEntities.length === 0 && (
              <div className="no-results">条件に一致するエンティティが見つかりません。</div>
            )}
          </div>
        </div>

        <div className="entity-editor-container">
          {selectedEntity ? (
            <ExtendedEntityEditor
              entity={selectedEntity}
              onUpdate={handleEntityUpdate}
              onDelete={() => handleEntityDelete(selectedEntity.id)}
            />
          ) : (
            <div className="no-selection">
              <p>編集するエンティティを選択するか、新規作成してください</p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>新規エンティティ作成</h3>
            <p>作成するエンティティのタイプを選択してください：</p>
            <div className="entity-type-buttons">
              <button onClick={() => handleEntityCreate('person')} className="type-button">
                <span className="type-icon">👤</span>
                <span>人物</span>
              </button>
              <button onClick={() => handleEntityCreate('location')} className="type-button">
                <span className="type-icon">📍</span>
                <span>場所</span>
              </button>
              <button onClick={() => handleEntityCreate('prop')} className="type-button">
                <span className="type-icon">📦</span>
                <span>小道具</span>
              </button>
              <button onClick={() => handleEntityCreate('information')} className="type-button">
                <span className="type-icon">💭</span>
                <span>情報</span>
              </button>
              <button onClick={() => handleEntityCreate('act')} className="type-button">
                <span className="type-icon">🎬</span>
                <span>行動</span>
              </button>
              <button onClick={() => handleEntityCreate('event')} className="type-button">
                <span className="type-icon">⚡</span>
                <span>イベント</span>
              </button>
            </div>
            <button onClick={() => setShowCreateModal(false)} className="cancel-button">
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
