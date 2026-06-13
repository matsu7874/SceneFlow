import React, { useState, useCallback, useEffect } from 'react'
import { useVisualFeedback } from '../../contexts/VisualFeedbackContext'
import {
  StringField,
  NumberField,
  BooleanField,
  SelectField,
  ArrayField,
  ReferenceField,
  ObjectField,
  FieldGroup,
  ColorField,
} from './FieldComponents'
import styles from './EntityEditor.module.css'
import { entityTypeLabel, type EntityType } from '../../types/extendedEntities'
import {
  asFormObject,
  asInputValue,
  type EntityFormData,
  type EntitySchema,
  type FieldSchema,
  type FieldValue,
} from './formTypes'

export type { EntityFormData, EntitySchema, FieldSchema, FieldValue } from './formTypes'

// Set a (possibly dot-delimited) nested path on an object, returning a new
// object with each level along the path copied so nested edits aren't lost.
function setNestedValue(obj: EntityFormData, path: string, value: FieldValue): EntityFormData {
  const dot = path.indexOf('.')
  if (dot === -1) {
    return { ...obj, [path]: value }
  }
  const head = path.slice(0, dot)
  const rest = path.slice(dot + 1)
  return { ...obj, [head]: setNestedValue(asFormObject(obj[head]), rest, value) }
}

export interface EntityEditorProps {
  entityType: string
  entityData: EntityFormData
  schema: EntitySchema
  onChange: (data: EntityFormData) => void
  onSave?: (data: EntityFormData) => void
  onCancel?: () => void
  readOnly?: boolean
  entities?: Record<string, Array<{ id: string; name: string }>>
}

export const EntityEditor: React.FC<EntityEditorProps> = ({
  entityType,
  entityData,
  schema,
  onChange,
  onSave,
  onCancel,
  readOnly = false,
  entities = {},
}) => {
  const { showNotification } = useVisualFeedback()
  const [data, setData] = useState<EntityFormData>(entityData || {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Update local data when entityData prop changes
  useEffect(() => {
    setData(entityData || {})
    setErrors({})
    setTouched({})
  }, [entityData])

  // Validate a single field
  const validateField = useCallback(
    (name: string, value: FieldValue, fieldSchema: FieldSchema): string | null => {
      // Required field validation
      if (schema.required?.includes(name) && !value) {
        return `${fieldSchema.label || name}は必須です`
      }

      // Type-specific validation
      if (fieldSchema.validation) {
        const { min, max, minLength, maxLength, pattern, custom } = fieldSchema.validation

        if (fieldSchema.type === 'string' && typeof value === 'string' && value) {
          if (minLength && value.length < minLength) {
            return `${minLength}文字以上で入力してください`
          }
          if (maxLength && value.length > maxLength) {
            return `${maxLength}文字以内で入力してください`
          }
          if (pattern && !new RegExp(pattern).test(value)) {
            return '形式が正しくありません'
          }
        }

        if (fieldSchema.type === 'number' && typeof value === 'number') {
          if (min !== undefined && value < min) {
            return `${min}以上の値を入力してください`
          }
          if (max !== undefined && value > max) {
            return `${max}以下の値を入力してください`
          }
        }

        if (custom) {
          const customError = custom(value)
          if (customError) return customError
        }
      }

      return null
    },
    [schema.required],
  )

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    let isValid = true

    Object.entries(schema.fields).forEach(([fieldName, fieldSchema]) => {
      const error = validateField(fieldName, data[fieldName], fieldSchema)
      if (error) {
        newErrors[fieldName] = error
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }, [schema.fields, data, validateField])

  // Handle field change
  const handleFieldChange = useCallback(
    (name: string, value: FieldValue) => {
      const newData = setNestedValue(data, name, value)
      setData(newData)

      // Mark field as touched
      setTouched(prev => ({ ...prev, [name]: true }))

      // Validate field if touched
      const fieldSchema = schema.fields[name]
      if (fieldSchema) {
        const error = validateField(name, value, fieldSchema)
        setErrors(prev => ({
          ...prev,
          [name]: error || '',
        }))
      }

      // Notify parent of change
      onChange(newData)
    },
    [data, onChange, schema.fields, validateField],
  )

  // Handle save
  const handleSave = useCallback(() => {
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {}
    Object.keys(schema.fields).forEach(field => {
      allTouched[field] = true
    })
    setTouched(allTouched)

    // Validate all fields
    if (validateAll()) {
      if (onSave) {
        onSave(data)
        showNotification(`${entityType} saved successfully`, { type: 'success' })
      }
    } else {
      showNotification('Please fix validation errors', { type: 'error' })
    }
  }, [validateAll, onSave, data, entityType, showNotification, schema.fields])

  // Render field based on type
  const renderField = (
    fieldName: string,
    fieldSchema: FieldSchema,
    fieldData: FieldValue,
    path: string = '',
  ): React.ReactNode => {
    const fullPath = path + fieldName
    const error = touched[fullPath] ? errors[fullPath] : undefined
    const isRequired = schema.required?.includes(fieldName)

    const commonProps = {
      name: fieldName,
      value: fieldData,
      onChange: (_name: string, value: FieldValue) => handleFieldChange(fullPath, value),
      error,
      required: isRequired,
      disabled: readOnly,
    }

    switch (fieldSchema.type) {
      case 'string':
        return <StringField {...commonProps} placeholder={fieldSchema.placeholder} />

      case 'number':
        return (
          <NumberField
            {...commonProps}
            min={fieldSchema.validation?.min}
            max={fieldSchema.validation?.max}
          />
        )

      case 'boolean':
        return <BooleanField {...commonProps} label={fieldSchema.label || fieldName} />

      case 'select':
        return <SelectField {...commonProps} options={fieldSchema.options || []} />

      case 'array':
        return (
          <ArrayField
            {...commonProps}
            itemType={fieldSchema.itemType || 'string'}
            itemSchema={fieldSchema.itemSchema}
            renderItem={(item, index, onChange, onRemove) => {
              if (fieldSchema.itemType === 'string') {
                return (
                  <div className={styles.arrayItemContent}>
                    <input
                      type="text"
                      value={asInputValue(item)}
                      onChange={e => onChange(e.target.value)}
                      disabled={readOnly}
                    />
                    <button
                      type="button"
                      onClick={onRemove}
                      disabled={readOnly}
                      className={styles.removeButton}
                    >
                      ×
                    </button>
                  </div>
                )
              } else if (fieldSchema.itemType === 'reference' && fieldSchema.entityType) {
                return (
                  <div className={styles.arrayItemContent}>
                    <select
                      value={asInputValue(item)}
                      onChange={e => onChange(e.target.value)}
                      disabled={readOnly}
                      className={styles.referenceSelect}
                    >
                      <option value="">-- Select {fieldSchema.entityType} --</option>
                      {(entities[fieldSchema.entityType] || []).map(entity => (
                        <option key={entity.id} value={entity.id}>
                          {entity.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={onRemove}
                      disabled={readOnly}
                      className={styles.removeButton}
                    >
                      ×
                    </button>
                  </div>
                )
              } else if (fieldSchema.itemType === 'object' && fieldSchema.itemSchema) {
                const itemObj = asFormObject(item)
                return (
                  <div className={styles.arrayItemContent}>
                    <div className={styles.objectInArray}>
                      {Object.entries(fieldSchema.itemSchema.schema?.fields || {}).map(
                        ([subFieldName, subFieldSchema]) => (
                          <div key={subFieldName} className={styles.inlineField}>
                            <label>{subFieldSchema.label || subFieldName}:</label>
                            {subFieldSchema.type === 'reference' ? (
                              <select
                                value={asInputValue(itemObj[subFieldName])}
                                onChange={e =>
                                  onChange({ ...itemObj, [subFieldName]: e.target.value })
                                }
                                disabled={readOnly}
                              >
                                <option value="">-- Select {subFieldSchema.entityType} --</option>
                                {(entities[subFieldSchema.entityType || ''] || []).map(entity => (
                                  <option key={entity.id} value={entity.id}>
                                    {entity.name}
                                  </option>
                                ))}
                              </select>
                            ) : subFieldSchema.type === 'select' ? (
                              <select
                                value={asInputValue(itemObj[subFieldName])}
                                onChange={e =>
                                  onChange({ ...itemObj, [subFieldName]: e.target.value })
                                }
                                disabled={readOnly}
                              >
                                <option value="">-- Select --</option>
                                {(subFieldSchema.options || []).map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={asInputValue(itemObj[subFieldName])}
                                onChange={e =>
                                  onChange({ ...itemObj, [subFieldName]: e.target.value })
                                }
                                disabled={readOnly}
                              />
                            )}
                          </div>
                        ),
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={onRemove}
                      disabled={readOnly}
                      className={styles.removeButton}
                    >
                      ×
                    </button>
                  </div>
                )
              }
              return null
            }}
          />
        )

      case 'reference':
        return (
          <ReferenceField
            {...commonProps}
            entityType={fieldSchema.entityType || ''}
            entities={entities[fieldSchema.entityType || ''] || []}
          />
        )

      case 'object':
        return (
          <ObjectField {...commonProps} schema={fieldSchema.schema} renderFields={renderFields} />
        )

      case 'color':
        return <ColorField {...commonProps} />

      default:
        return null
    }
  }

  // Render all fields
  const renderFields = (
    fieldsSchema: EntitySchema,
    fieldsData: EntityFormData,
    pathPrefix: string = '',
  ): React.ReactNode => {
    return Object.entries(fieldsSchema.fields).map(([fieldName, fieldSchema]) => (
      <div key={fieldName} className={styles.fieldRow}>
        {/* boolean はチェックボックス自身がクリック可能なラベルを持つため、外側ラベルを重複表示しない */}
        {fieldSchema.type !== 'boolean' && (
          <label className={styles.fieldLabel}>
            {fieldSchema.label || fieldName}
            {schema.required?.includes(fieldName) && <span className={styles.required}>*</span>}
          </label>
        )}
        {renderField(fieldName, fieldSchema, fieldsData[fieldName], pathPrefix)}
      </div>
    ))
  }

  // Render fields by groups or all fields
  const renderContent = (): React.ReactNode => {
    if (schema.groups) {
      return Object.entries(schema.groups).map(([groupName, fieldNames]) => (
        <FieldGroup key={groupName} title={groupName}>
          {fieldNames.map(fieldName => {
            const fieldSchema = schema.fields[fieldName]
            if (!fieldSchema) return null

            return (
              <div key={fieldName} className={styles.fieldRow}>
                {fieldSchema.type !== 'boolean' && (
                  <label className={styles.fieldLabel}>
                    {fieldSchema.label || fieldName}
                    {schema.required?.includes(fieldName) && (
                      <span className={styles.required}>*</span>
                    )}
                  </label>
                )}
                {renderField(fieldName, fieldSchema, data[fieldName])}
              </div>
            )
          })}
        </FieldGroup>
      ))
    }

    return renderFields(schema, data)
  }

  return (
    <div className={styles.entityEditor}>
      <div className={styles.header}>
        <h2>{entityTypeLabel(entityType as EntityType)}の編集</h2>
      </div>

      <form
        className={styles.form}
        onSubmit={e => {
          e.preventDefault()
          handleSave()
        }}
      >
        {renderContent()}

        <div className={styles.actions}>
          {onCancel && (
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              キャンセル
            </button>
          )}
          {onSave && !readOnly && (
            <button type="submit" className={styles.saveButton}>
              保存
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
