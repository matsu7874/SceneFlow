import React, { useMemo } from 'react'
import { ExtendedEntity, EntityType, entityTypeLabel } from '../../types/extendedEntities'
import { EntityEditor } from './EntityEditor'
import type { EntityFormData, EntitySchema } from './formTypes'
import { useVisualFeedback } from '../../contexts/VisualFeedbackContext'
import { useAppContext } from '../../contexts/AppContext'
import { generateEventsFromActs } from '../../utils/eventGeneration'
import { ACT_KINDS } from '../../modules/consistency/actKinds'
import styles from './EntityEditor.module.css'

interface ExtendedEntityEditorProps {
  entity: ExtendedEntity
  onUpdate: (entity: ExtendedEntity) => void
  onDelete: () => void
}

// Entity schemas for different types
const entitySchemas: Record<EntityType, EntitySchema> = {
  person: {
    fields: {
      name: { type: 'string', label: '名前', validation: { minLength: 1 } },
      color: { type: 'color', label: '色' },
      description: { type: 'string', label: '説明' },
      age: { type: 'number', label: '年齢', validation: { min: 0, max: 200 } },
      occupation: { type: 'string', label: '職業' },
      personality: { type: 'string', label: '性格' },
      goals: { type: 'array', label: '目標', itemType: 'string' },
      relationships: {
        type: 'array',
        label: '関係性',
        itemType: 'object',
        itemSchema: {
          type: 'object',
          schema: {
            fields: {
              targetId: { type: 'reference', label: '人物', entityType: 'person' },
              type: { type: 'string', label: 'タイプ', placeholder: '例: 友人、恋人、ライバル' },
            },
          },
        },
      },
    },
    groups: {
      基本情報: ['name', 'color', 'description', 'age', 'occupation'],
      キャラクター: ['personality', 'goals'],
      関係性: ['relationships'],
    },
    required: ['name'],
  },

  location: {
    fields: {
      name: { type: 'string', label: '名前', validation: { minLength: 1 } },
      color: { type: 'color', label: '色' },
      description: { type: 'string', label: '説明' },
      // フィールド名は ExtendedEntity の判別子 type と衝突しないよう locationType とし、
      // 保存時に Location.type へ書き戻す（EntitiesPage 側で対応）。
      locationType: {
        type: 'select',
        label: 'タイプ',
        options: [
          { value: 'indoor', label: '屋内' },
          { value: 'outdoor', label: '屋外' },
          { value: 'transit', label: '移動場所' },
        ],
      },
      capacity: { type: 'number', label: '収容人数', validation: { min: 1 } },
      connectedTo: {
        type: 'array',
        label: '接続された場所',
        itemType: 'reference',
        entityType: 'location',
      },
      properties: {
        type: 'object',
        label: 'プロパティ',
        schema: {
          fields: {
            isLocked: { type: 'boolean', label: 'ロック状態' },
            requiredItem: { type: 'reference', label: '必要なアイテム', entityType: 'prop' },
            atmosphere: { type: 'string', label: '雰囲気' },
          },
        },
      },
    },
    groups: {
      基本情報: ['name', 'color', 'description', 'locationType', 'capacity'],
      接続: ['connectedTo'],
      プロパティ: ['properties'],
    },
    required: ['name'],
  },

  prop: {
    fields: {
      name: { type: 'string', label: '名前', validation: { minLength: 1 } },
      description: { type: 'string', label: '説明' },
      category: {
        type: 'select',
        label: 'カテゴリー',
        options: [
          { value: 'LARGE_PROP', label: '大道具' },
          { value: 'SMALL_PROP', label: '小道具' },
        ],
      },
      isPortable: { type: 'boolean', label: '持ち運び可能' },
      isConsumable: { type: 'boolean', label: '消費可能' },
      isCombineable: { type: 'boolean', label: '組み合わせ可能' },
      combinesWith: {
        type: 'array',
        label: '組み合わせ対象',
        itemType: 'reference',
        entityType: 'prop',
      },
      currentLocation: { type: 'reference', label: '現在の場所', entityType: 'location' },
      owner: { type: 'reference', label: '所有者', entityType: 'person' },
    },
    groups: {
      基本情報: ['name', 'description', 'category'],
      プロパティ: ['isPortable', 'isConsumable', 'isCombineable', 'combinesWith'],
      場所: ['currentLocation', 'owner'],
    },
    required: ['name', 'category'],
  },

  information: {
    fields: {
      name: { type: 'string', label: '名前', validation: { minLength: 1 } },
      content: { type: 'string', label: '内容' },
      description: { type: 'string', label: '説明' },
      category: {
        type: 'select',
        label: 'カテゴリー',
        options: [
          { value: 'FACT', label: '事実' },
          { value: 'RUMOR', label: '噂' },
          { value: 'SECRET', label: '秘密' },
          { value: 'INSTRUCTION', label: '指示' },
          { value: 'LOCATION', label: '場所情報' },
        ],
      },
      isSecret: { type: 'boolean', label: '秘密情報' },
      requiresContext: {
        type: 'array',
        label: '必要な文脈',
        itemType: 'reference',
        entityType: 'information',
      },
      enablesActions: { type: 'array', label: '可能にするアクション', itemType: 'string' },
      revealsInformation: {
        type: 'array',
        label: '明らかになる情報',
        itemType: 'reference',
        entityType: 'information',
      },
      subject: { type: 'reference', label: '対象（誰/何について）', entityType: 'anyEntity' },
      aspect: { type: 'string', label: '観点（例: 髪色、居場所。同一論点のキー）' },
      value: { type: 'string', label: '値（例: 茶色）' },
      truth: { type: 'boolean', label: 'この値が真実（観点ごとに1つ）' },
      misinfoType: {
        type: 'select',
        label: '誤情報の種別',
        options: [
          { value: '', label: '（指定なし）' },
          { value: 'lie', label: '嘘（意図的）' },
          { value: 'mistake', label: '見間違い・勘違い' },
        ],
      },
    },
    groups: {
      基本情報: ['name', 'content', 'description', 'category'],
      プロパティ: ['isSecret', 'requiresContext'],
      効果: ['enablesActions', 'revealsInformation'],
      '言明（矛盾検出用）': ['subject', 'aspect', 'value', 'truth', 'misinfoType'],
    },
    required: ['name', 'content', 'category'],
  },

  act: {
    fields: {
      id: { type: 'string', label: 'ID' },
      // フィールド名は ExtendedEntity の判別子 type と衝突しないよう actType とし、
      // 保存時に Act.type へ書き戻す（actEditing の actToEntity/applyActUpdate で対応）。
      actType: { type: 'select', label: '行動種別', options: ACT_KINDS },
      personId: { type: 'reference', label: '人物', entityType: 'person' },
      locationId: { type: 'reference', label: '場所', entityType: 'location' },
      startTime: { type: 'number', label: '開始時間（分）' },
      endTime: { type: 'number', label: '終了時間（分）' },
      description: { type: 'string', label: '説明' },
      informationId: {
        type: 'reference',
        label: '情報（証言・取得情報）',
        entityType: 'information',
      },
      propId: { type: 'reference', label: '小道具', entityType: 'prop' },
      interactedPersonId: { type: 'reference', label: '相手の人物', entityType: 'person' },
    },
    groups: {
      基本情報: ['id', 'actType', 'description'],
      参照: ['personId', 'locationId'],
      タイミング: ['startTime', 'endTime'],
      関連: ['informationId', 'propId', 'interactedPersonId'],
    },
    required: ['id'],
  },

  event: {
    fields: {
      id: { type: 'string', label: 'ID' },
      name: { type: 'string', label: '名前' },
      description: { type: 'string', label: '説明' },
      trigger: {
        type: 'object',
        label: 'トリガー',
        schema: {
          fields: {
            type: {
              type: 'select',
              label: 'タイプ',
              options: [
                { value: 'time', label: '時間' },
                { value: 'actCompleted', label: 'アクト完了' },
                { value: 'condition', label: '条件' },
              ],
            },
            time: { type: 'number', label: '時間（分）' },
            actId: { type: 'reference', label: 'アクト', entityType: 'act' },
          },
        },
      },
      actions: {
        type: 'array',
        label: 'アクション',
        itemType: 'object',
        itemSchema: {
          type: 'object',
          schema: {
            fields: {
              type: { type: 'string', label: 'アクションタイプ' },
              description: { type: 'string', label: '説明' },
            },
          },
        },
      },
    },
    groups: {
      基本情報: ['id', 'name', 'description'],
      トリガー: ['trigger'],
      アクション: ['actions'],
    },
    required: ['id'],
  },
}

export const ExtendedEntityEditor: React.FC<ExtendedEntityEditorProps> = ({
  entity,
  onUpdate,
  onDelete,
}) => {
  const { showNotification } = useVisualFeedback()
  const { storyData } = useAppContext()

  const schema = useMemo(() => {
    return entitySchemas[entity.type] || entitySchemas.person
  }, [entity.type])

  // Prepare entities for reference fields
  const entities = useMemo<Record<string, Array<{ id: string; name: string }>>>(() => {
    if (!storyData) return {}

    const result: Record<string, Array<{ id: string; name: string }>> = {
      person: storyData.persons.map(p => ({ id: p.id.toString(), name: p.name })),
      location: storyData.locations.map(l => ({ id: l.id.toString(), name: l.name })),
      prop: storyData.props.map(p => ({ id: p.id.toString(), name: p.name })),
      information: storyData.informations.map(i => ({
        id: i.id.toString(),
        name: i.content.substring(0, 50),
      })),
      act: storyData.acts.map(a => ({ id: a.id.toString(), name: a.description || `Act ${a.id}` })),
      event: generateEventsFromActs(storyData.acts).map(e => ({
        id: e.id.toString(),
        name: `Event ${e.id}`,
      })),
      // 情報の「対象」は人物・場所・小道具のいずれも取り得るため統合リストを提供する。
      anyEntity: [
        ...storyData.persons.map(p => ({ id: p.id.toString(), name: `👤 ${p.name}` })),
        ...storyData.locations.map(l => ({ id: l.id.toString(), name: `📍 ${l.name}` })),
        ...storyData.props.map(p => ({ id: p.id.toString(), name: `📦 ${p.name}` })),
      ],
    }
    return result
  }, [storyData])

  const handleSave = (data: EntityFormData): void => {
    // For location entities, ensure connectedTo is properly set
    if (entity.type === 'location' && Array.isArray(data.connectedTo)) {
      data.connections = data.connectedTo.map(id => (typeof id === 'string' ? parseInt(id) : id))
    }

    // 情報の構造化言明: subject は参照のため文字列で入る。矛盾検出は数値idで比較するため変換する。
    // 未選択や空文字の任意項目は保存対象から除外する。
    if (entity.type === 'information') {
      if (data.subject === '' || data.subject == null) {
        delete data.subject
      } else {
        data.subject = typeof data.subject === 'string' ? parseInt(data.subject, 10) : data.subject
      }
      if (!data.misinfoType) delete data.misinfoType
    }

    // 動的フォームの値の集合（EntityFormData）を静的なエンティティ型へ戻す境界。
    // フィールド構成はスキーマで保証されるため、ここでのみ明示的に変換する。
    const updatedEntity = {
      ...entity,
      ...data,
      updated_at: new Date().toISOString(),
    } as ExtendedEntity
    onUpdate(updatedEntity)
    showNotification(`${entityTypeLabel(entity.type)}を保存しました`, { type: 'success' })
  }

  const handleChange = (_data: EntityFormData): void => {
    // Real-time updates if needed
  }

  return (
    <div className={styles.extendedEditor}>
      <div className={styles.editorHeader}>
        <h3>
          {entityTypeLabel(entity.type)}を編集: {entity.name}
        </h3>
        <button
          className={styles.deleteButton}
          onClick={() => {
            if (confirm(`「${entity.name}」を削除してもよろしいですか？`)) {
              onDelete()
              showNotification(
                `${entityTypeLabel(entity.type)}を削除しました（Ctrl+Z か右上の「元に戻す」で復元できます）`,
                { type: 'info', duration: 5000 },
              )
            }
          }}
        >
          削除
        </button>
      </div>

      <EntityEditor
        entityType={entity.type}
        // 静的なエンティティ型を動的フォームの値の集合として渡す境界（handleSave で逆変換）
        entityData={entity as unknown as EntityFormData}
        schema={schema}
        onChange={handleChange}
        onSave={handleSave}
        entities={entities}
      />
    </div>
  )
}
