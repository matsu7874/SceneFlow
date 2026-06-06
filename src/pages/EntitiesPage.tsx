import React, { useState, useEffect } from 'react'
import { ExtendedEntityEditor } from '../components/EntityEditor/ExtendedEntityEditor'
import { useAppContext } from '../contexts/AppContext'
import { ExtendedEntity, EntityType, entityTypeLabel } from '../types/extendedEntities'
import { useVisualFeedback } from '../contexts/VisualFeedbackContext'
import { generateEventsFromActs } from '../utils/eventGeneration'
import { replaceEntityInList } from './entitiesPageLogic'
import { applyActUpdate, deleteAct } from '../components/CausalityView/actEditing'
import { assignPersonColor, assignLocationColor } from '../components/QuickLog/quickLogLogic'
import { ExtractionPanel } from '../components/EntityExtraction/ExtractionPanel'

const getEntityTypeLabel = (type: EntityType): string => entityTypeLabel(type)

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
          ...person,
          id: person.id.toString(),
          type: 'person' as EntityType,
          name: person.name,
          description: person.description || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attributes: person,
          relationships: person.relationships || [],
          color: person.color,
        })),
        ...storyData.locations.map(location => ({
          ...location,
          id: location.id.toString(),
          type: 'location' as EntityType,
          name: location.name,
          description: location.description || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attributes: location,
          relationships: [],
          color: location.color,
          connectedTo: location.connections?.map(conn => conn.toString()) || [],
        })),
        ...storyData.props.map(prop => ({
          ...prop,
          id: prop.id.toString(),
          type: 'prop' as EntityType,
          name: prop.name,
          description: prop.description || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attributes: prop,
          relationships: [],
        })),
        ...storyData.informations.map(info => ({
          ...info,
          id: info.id.toString(),
          type: 'information' as EntityType,
          name:
            info.name || info.content.substring(0, 50) + (info.content.length > 50 ? '...' : ''),
          description: info.description || info.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attributes: info,
          relationships: [],
        })),
        ...storyData.acts.map(act => ({
          ...act,
          id: act.id.toString(),
          type: 'act' as EntityType,
          name: act.description || `行動 ${act.id}`,
          description: act.description || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          attributes: act,
          relationships: [],
        })),
        // Events are generated from acts
        ...generateEventsFromActs(storyData.acts || []).map(event => ({
          ...event,
          id: event.id.toString(),
          type: 'event' as EntityType,
          name: event.name || `イベント ${event.id}`,
          description: event.description || `${event.eventTime} - ${event.triggerType}`,
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
    setEntities(prev => replaceEntityInList(prev, updatedEntity))
    setSelectedEntity(updatedEntity)

    // Update story data with all fields
    if (storyData) {
      const numericId = Number(updatedEntity.id)

      switch (updatedEntity.type) {
        case 'person': {
          const updatedPersons = storyData.persons.map(p =>
            p.id === numericId
              ? {
                  ...p,
                  ...updatedEntity.attributes,
                  id: numericId,
                  name: updatedEntity.name,
                  color:
                    updatedEntity.color || updatedEntity.attributes?.color || p.color || '#3B82F6',
                }
              : p,
          )
          setStoryData({ ...storyData, persons: updatedPersons })
          break
        }

        case 'location': {
          const updatedLocations = storyData.locations.map(l =>
            l.id === numericId
              ? {
                  ...l,
                  ...updatedEntity.attributes,
                  id: numericId,
                  name: updatedEntity.name,
                  color: updatedEntity.color || updatedEntity.attributes?.color || l.color,
                  connections: (updatedEntity.connectedTo || updatedEntity.connections || []).map(
                    (id: string | number) => (typeof id === 'string' ? parseInt(id) : id),
                  ),
                }
              : l,
          )
          setStoryData({ ...storyData, locations: updatedLocations })
          break
        }

        case 'prop': {
          const updatedProps = storyData.props.map(p =>
            p.id === numericId
              ? {
                  ...p,
                  ...updatedEntity.attributes,
                  id: numericId,
                  name: updatedEntity.name,
                }
              : p,
          )
          setStoryData({ ...storyData, props: updatedProps })
          break
        }

        case 'information': {
          const updatedInformations = storyData.informations.map(i =>
            i.id === numericId
              ? {
                  ...i,
                  ...updatedEntity.attributes,
                  id: numericId,
                  content: updatedEntity.content || updatedEntity.name,
                }
              : i,
          )
          setStoryData({ ...storyData, informations: updatedInformations })
          break
        }

        case 'act': {
          // 参照・時刻フィールドの編集も保存されるよう、トップレベル値を採用する共通ヘルパーで反映する。
          setStoryData(applyActUpdate(storyData, updatedEntity))
          break
        }

        case 'event':
          // Events are generated from acts, so we can't update them directly
          showNotification('イベントは行動から自動生成されるため、直接編集できません', {
            type: 'warning',
          })
          break
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
            persons: [
              ...storyData.persons,
              {
                id: newId,
                name: newEntity.name,
                color: assignPersonColor(storyData.persons),
                description: '',
                age: 30,
                occupation: '',
                personality: '',
                goals: [],
                relationships: [],
              },
            ],
          })
          break
        case 'location':
          setStoryData({
            ...storyData,
            locations: [
              ...storyData.locations,
              {
                id: newId,
                name: newEntity.name,
                connections: [],
                color: assignLocationColor(storyData.locations),
                description: '',
                type: 'indoor',
                capacity: 10,
                connectedTo: [],
                properties: {
                  isLocked: false,
                  atmosphere: '',
                },
              },
            ],
          })
          break
        case 'prop':
          setStoryData({
            ...storyData,
            props: [
              ...storyData.props,
              {
                id: newId,
                name: newEntity.name,
                description: '',
                category: 'SMALL_PROP',
                isPortable: true,
                isConsumable: false,
                isCombineable: false,
                combinesWith: [],
                currentLocation: '',
                owner: '',
              },
            ],
          })
          break
        case 'information':
          setStoryData({
            ...storyData,
            informations: [
              ...storyData.informations,
              {
                id: newId,
                name: newEntity.name,
                content: newEntity.name,
                description: '',
                category: 'FACT',
                isSecret: false,
                requiresContext: [],
                enablesActions: [],
                revealsInformation: [],
              },
            ],
          })
          break
        case 'act':
          setStoryData({
            ...storyData,
            acts: [
              ...storyData.acts,
              {
                id: newId,
                type: 'move',
                personId: 1,
                locationId: 1,
                startTime: 0,
                endTime: 5,
                time: '00:00',
                description: newEntity.name,
              },
            ],
          })
          break
        case 'event':
          // Events are generated from acts, so we can't create them directly
          showNotification('イベントは行動から自動生成されます', { type: 'info' })
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
          setStoryData(deleteAct(storyData, numericId))
          break
        case 'event':
          // Events are generated from acts, so we can't delete them directly
          showNotification('イベントは行動から自動生成されるため、削除できません', {
            type: 'warning',
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
      <ExtractionPanel
        storyData={storyData}
        onCommit={next => setStoryData(next)}
        onNotify={(message, type) => showNotification(message, { type })}
      />
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
                    key={`${entity.type}-${entity.id}`}
                    className={`entity-item ${
                      selectedEntity?.id === entity.id && selectedEntity?.type === entity.type
                        ? 'selected'
                        : ''
                    }`}
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
