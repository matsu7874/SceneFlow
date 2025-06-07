import React, { useState, useCallback } from 'react'
import { ColorPicker } from '../ColorPicker'
import styles from './EntityEditor.module.css'

interface FieldProps {
  name: string;
  value: any;
  onChange: (name: string, value: any) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

// String Field Component
export const StringField: React.FC<FieldProps & { placeholder?: string }> = ({
  name,
  value,
  onChange,
  error,
  required,
  disabled,
  placeholder,
}) => {
  return (
    <div className={styles.field}>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={error ? styles.error : ''}
      />
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  )
}

// Number Field Component
export const NumberField: React.FC<FieldProps & { min?: number; max?: number; step?: number }> = ({
  name,
  value,
  onChange,
  error,
  required,
  disabled,
  min,
  max,
  step,
}) => {
  return (
    <div className={styles.field}>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(name, e.target.value ? parseFloat(e.target.value) : null)}
        min={min}
        max={max}
        step={step}
        required={required}
        disabled={disabled}
        className={error ? styles.error : ''}
      />
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  )
}

// Boolean Field Component
export const BooleanField: React.FC<FieldProps> = ({
  name,
  value,
  onChange,
  error,
  disabled,
}) => {
  return (
    <div className={styles.field}>
      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={value || false}
          onChange={(e) => onChange(name, e.target.checked)}
          disabled={disabled}
        />
        <span>{name}</span>
      </label>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  )
}

// Select Field Component
interface SelectFieldProps extends FieldProps {
  options: Array<{ value: string | number; label: string }>;
  multiple?: boolean;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  name,
  value,
  onChange,
  error,
  required,
  disabled,
  options,
  multiple,
}) => {
  return (
    <div className={styles.field}>
      <select
        value={value || (multiple ? [] : '')}
        onChange={(e) => {
          if (multiple) {
            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
            onChange(name, selectedOptions)
          } else {
            onChange(name, e.target.value)
          }
        }}
        multiple={multiple}
        required={required}
        disabled={disabled}
        className={error ? styles.error : ''}
      >
        {!multiple && <option value="">-- Select --</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  )
}

// Array Field Component
interface ArrayFieldProps extends FieldProps {
  itemType: string;
  itemSchema?: any;
  renderItem: (item: any, index: number, onChange: (value: any) => void, onRemove: () => void) => React.ReactNode;
}

export const ArrayField: React.FC<ArrayFieldProps> = ({
  name,
  value,
  onChange,
  error,
  disabled,
  itemType,
  renderItem,
}) => {
  const items = Array.isArray(value) ? value : []

  const handleAdd = () => {
    let newItem
    if (itemType === 'string') {
      newItem = ''
    } else if (itemType === 'number') {
      newItem = 0
    } else if (itemType === 'reference') {
      newItem = null
    } else {
      newItem = {}
    }
    onChange(name, [...items, newItem])
  }

  const handleItemChange = (index: number, newValue: any) => {
    const newItems = [...items]
    newItems[index] = newValue
    onChange(name, newItems)
  }

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(name, newItems)
  }

  return (
    <div className={styles.arrayField}>
      <div className={styles.arrayItems}>
        {items.map((item, index) => (
          <div key={index} className={styles.arrayItem}>
            {renderItem(
              item,
              index,
              (newValue) => handleItemChange(index, newValue),
              () => handleRemove(index),
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled}
        className={styles.addButton}
      >
        + 追加
      </button>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  )
}

// Reference Field Component
interface ReferenceFieldProps extends FieldProps {
  entityType: string;
  entities: Array<{ id: string; name: string }>;
}

export const ReferenceField: React.FC<ReferenceFieldProps> = ({
  name,
  value,
  onChange,
  error,
  required,
  disabled,
  entityType,
  entities,
}) => {
  return (
    <div className={styles.field}>
      <select
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        required={required}
        disabled={disabled}
        className={error ? styles.error : ''}
      >
        <option value="">-- Select {entityType} --</option>
        {entities.map((entity) => (
          <option key={entity.id} value={entity.id}>
            {entity.name}
          </option>
        ))}
      </select>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  )
}

// Object Field Component (for nested objects)
interface ObjectFieldProps extends FieldProps {
  schema: any;
  renderFields: (schema: any, data: any, path: string) => React.ReactNode;
}

export const ObjectField: React.FC<ObjectFieldProps> = ({
  name,
  value,
  onChange,
  error,
  disabled,
  schema,
  renderFields,
}) => {
  const [collapsed, setCollapsed] = useState(false)
  const objectValue = value || {}

  const handleFieldChange = (fieldName: string, fieldValue: any) => {
    onChange(name, {
      ...objectValue,
      [fieldName]: fieldValue,
    })
  }

  return (
    <div className={styles.objectField}>
      <div
        className={styles.objectHeader}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className={styles.collapseIcon}>{collapsed ? '▶' : '▼'}</span>
        <span>{name}</span>
      </div>
      {!collapsed && (
        <div className={styles.objectContent}>
          {renderFields(schema, objectValue, `${name}.`)}
        </div>
      )}
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  )
}

// Field Group Component for organizing fields
interface FieldGroupProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

// Color Field Component
export const ColorField: React.FC<FieldProps> = ({
  name,
  value,
  onChange,
  error,
  disabled,
}) => {
  return (
    <div className={styles.field}>
      <ColorPicker
        value={value || '#3B82F6'}
        onChange={(color) => onChange(name, color)}
        disabled={disabled}
      />
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  )
}

// Field Group Component for organizing fields
interface FieldGroupProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export const FieldGroup: React.FC<FieldGroupProps> = ({
  title,
  children,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className={styles.fieldGroup}>
      <div
        className={styles.fieldGroupHeader}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={styles.collapseIcon}>{expanded ? '▼' : '▶'}</span>
        <h3>{title}</h3>
      </div>
      {expanded && (
        <div className={styles.fieldGroupContent}>
          {children}
        </div>
      )}
    </div>
  )
}