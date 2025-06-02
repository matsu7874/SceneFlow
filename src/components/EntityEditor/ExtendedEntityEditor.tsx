import React, { useMemo } from 'react'
import { ExtendedEntity, EntityType } from '../../types/extendedEntities'
import { EntityEditor } from './EntityEditor'
import { useVisualFeedback } from '../../contexts/VisualFeedbackContext'
import styles from './EntityEditor.module.css'

interface ExtendedEntityEditorProps {
  entity: ExtendedEntity
  onUpdate: (entity: ExtendedEntity) => void
  onDelete: () => void
}

// Entity schemas for different types
const entitySchemas: Record<EntityType, any> = {
  person: {
    fields: {
      name: { type: 'string', label: '名前', validation: { required: true, minLength: 1 } },
      description: { type: 'string', label: '説明' },
      age: { type: 'number', label: '年齢', validation: { min: 0, max: 200 } },
      occupation: { type: 'string', label: '職業' },
      personality: { type: 'string', label: '性格' },
      goals: { type: 'array', label: '目標', itemType: 'string' },
      relationships: { type: 'array', label: '関係性', itemType: 'object', itemSchema: {
        type: 'object',
        schema: {
          fields: {
            targetId: { type: 'reference', label: '人物', entityType: 'person' },
            type: { type: 'select', label: 'タイプ', options: [
              { value: 'friend', label: '友人' },
              { value: 'enemy', label: '敵' },
              { value: 'family', label: '家族' },
              { value: 'colleague', label: '同僚' },
              { value: 'romantic', label: '恋愛関係' }
            ]}
          }
        }
      }}
    },
    groups: {
      '基本情報': ['name', 'description', 'age', 'occupation'],
      'キャラクター': ['personality', 'goals'],
      '関係性': ['relationships']
    },
    required: ['name']
  },
  
  location: {
    fields: {
      name: { type: 'string', label: '名前', validation: { required: true, minLength: 1 } },
      description: { type: 'string', label: '説明' },
      type: { type: 'select', label: 'タイプ', options: [
        { value: 'indoor', label: '屋内' },
        { value: 'outdoor', label: '屋外' },
        { value: 'transit', label: '移動場所' }
      ]},
      capacity: { type: 'number', label: '収容人数', validation: { min: 1 } },
      connectedTo: { type: 'array', label: '接続された場所', itemType: 'reference', entityType: 'location' },
      properties: { type: 'object', label: 'プロパティ', schema: {
        fields: {
          isLocked: { type: 'boolean', label: 'ロック状態' },
          requiredItem: { type: 'reference', label: '必要なアイテム', entityType: 'prop' },
          atmosphere: { type: 'string', label: '雰囲気' }
        }
      }}
    },
    groups: {
      '基本情報': ['name', 'description', 'type', 'capacity'],
      '接続': ['connectedTo'],
      'プロパティ': ['properties']
    },
    required: ['name']
  },
  
  prop: {
    fields: {
      name: { type: 'string', label: '名前', validation: { required: true, minLength: 1 } },
      description: { type: 'string', label: '説明' },
      category: { type: 'select', label: 'カテゴリー', options: [
        { value: 'LARGE_PROP', label: '大道具' },
        { value: 'SMALL_PROP', label: '小道具' }
      ]},
      isPortable: { type: 'boolean', label: '持ち運び可能' },
      isConsumable: { type: 'boolean', label: '消費可能' },
      isCombineable: { type: 'boolean', label: '組み合わせ可能' },
      combinesWith: { type: 'array', label: '組み合わせ対象', itemType: 'reference', entityType: 'prop' },
      currentLocation: { type: 'reference', label: '現在の場所', entityType: 'location' },
      owner: { type: 'reference', label: '所有者', entityType: 'person' }
    },
    groups: {
      '基本情報': ['name', 'description', 'category'],
      'プロパティ': ['isPortable', 'isConsumable', 'isCombineable', 'combinesWith'],
      '場所': ['currentLocation', 'owner']
    },
    required: ['name', 'category']
  },
  
  information: {
    fields: {
      name: { type: 'string', label: '名前', validation: { required: true, minLength: 1 } },
      content: { type: 'string', label: '内容' },
      description: { type: 'string', label: '説明' },
      category: { type: 'select', label: 'カテゴリー', options: [
        { value: 'FACT', label: '事実' },
        { value: 'RUMOR', label: '噂' },
        { value: 'SECRET', label: '秘密' },
        { value: 'INSTRUCTION', label: '指示' },
        { value: 'LOCATION', label: '場所情報' }
      ]},
      isSecret: { type: 'boolean', label: '秘密情報' },
      requiresContext: { type: 'array', label: '必要な文脈', itemType: 'reference', entityType: 'information' },
      enablesActions: { type: 'array', label: '可能にするアクション', itemType: 'string' },
      revealsInformation: { type: 'array', label: '明らかになる情報', itemType: 'reference', entityType: 'information' }
    },
    groups: {
      '基本情報': ['name', 'content', 'description', 'category'],
      'プロパティ': ['isSecret', 'requiresContext'],
      '効果': ['enablesActions', 'revealsInformation']
    },
    required: ['name', 'content', 'category']
  },
  
  act: {
    fields: {
      id: { type: 'string', label: 'ID', validation: { required: true } },
      type: { type: 'string', label: 'タイプ' },
      personId: { type: 'reference', label: '人物', entityType: 'person' },
      locationId: { type: 'reference', label: '場所', entityType: 'location' },
      startTime: { type: 'number', label: '開始時間（分）' },
      endTime: { type: 'number', label: '終了時間（分）' },
      description: { type: 'string', label: '説明' }
    },
    groups: {
      '基本情報': ['id', 'type', 'description'],
      '参照': ['personId', 'locationId'],
      'タイミング': ['startTime', 'endTime']
    },
    required: ['id', 'type']
  },
  
  event: {
    fields: {
      id: { type: 'string', label: 'ID', validation: { required: true } },
      name: { type: 'string', label: '名前' },
      description: { type: 'string', label: '説明' },
      trigger: { type: 'object', label: 'トリガー', schema: {
        fields: {
          type: { type: 'select', label: 'タイプ', options: [
            { value: 'time', label: '時間' },
            { value: 'actCompleted', label: 'アクト完了' },
            { value: 'condition', label: '条件' }
          ]},
          time: { type: 'number', label: '時間（分）' },
          actId: { type: 'reference', label: 'アクト', entityType: 'act' }
        }
      }},
      actions: { type: 'array', label: 'アクション', itemType: 'object', itemSchema: {
        type: 'object',
        schema: {
          fields: {
            type: { type: 'string', label: 'アクションタイプ' },
            description: { type: 'string', label: '説明' }
          }
        }
      }}
    },
    groups: {
      '基本情報': ['id', 'name', 'description'],
      'トリガー': ['trigger'],
      'アクション': ['actions']
    },
    required: ['id']
  }
}

export const ExtendedEntityEditor: React.FC<ExtendedEntityEditorProps> = ({
  entity,
  onUpdate,
  onDelete
}) => {
  const { showNotification } = useVisualFeedback()
  
  const schema = useMemo(() => {
    return entitySchemas[entity.type] || entitySchemas.person
  }, [entity.type])
  
  const handleSave = (data: any) => {
    const updatedEntity: ExtendedEntity = {
      ...entity,
      ...data,
      updated_at: new Date().toISOString()
    }
    onUpdate(updatedEntity)
    showNotification(`${entity.type}を保存しました`, { type: 'success' })
  }
  
  const handleChange = (data: any) => {
    // Real-time updates if needed
  }
  
  return (
    <div className={styles.extendedEditor}>
      <div className={styles.editorHeader}>
        <h3>{entity.type}を編集: {entity.name}</h3>
        <button 
          className={styles.deleteButton}
          onClick={() => {
            if (confirm(`この${entity.type}を削除してもよろしいですか？`)) {
              onDelete()
              showNotification(`${entity.type}を削除しました`, { type: 'info' })
            }
          }}
        >
          削除
        </button>
      </div>
      
      <EntityEditor
        entityType={entity.type}
        entityData={entity}
        schema={schema}
        onChange={handleChange}
        onSave={handleSave}
      />
    </div>
  )
}