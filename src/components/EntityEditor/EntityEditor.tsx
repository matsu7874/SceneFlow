import React, { useState, useCallback, useEffect } from 'react';
import { useVisualFeedback } from '../../contexts/VisualFeedbackContext';
import {
  StringField,
  NumberField,
  BooleanField,
  SelectField,
  ArrayField,
  ReferenceField,
  ObjectField,
  FieldGroup
} from './FieldComponents';
import styles from './EntityEditor.module.css';

export interface EntityEditorProps {
  entityType: string;
  entityData: any;
  schema: EntitySchema;
  onChange: (data: any) => void;
  onSave?: (data: any) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  entities?: Record<string, Array<{ id: string; name: string }>>;
}

interface EntitySchema {
  fields: Record<string, FieldSchema>;
  groups?: Record<string, string[]>;
  required?: string[];
}

interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'select' | 'array' | 'reference' | 'object';
  label?: string;
  placeholder?: string;
  options?: Array<{ value: string | number; label: string }>;
  itemType?: string;
  itemSchema?: FieldSchema;
  entityType?: string;
  schema?: EntitySchema;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: (value: any) => string | null;
  };
}

export const EntityEditor: React.FC<EntityEditorProps> = ({
  entityType,
  entityData,
  schema,
  onChange,
  onSave,
  onCancel,
  readOnly = false,
  entities = {}
}) => {
  const { showNotification } = useVisualFeedback();
  const [data, setData] = useState(entityData || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Update local data when entityData prop changes
  useEffect(() => {
    setData(entityData || {});
    setErrors({});
    setTouched({});
  }, [entityData]);

  // Validate a single field
  const validateField = useCallback((name: string, value: any, fieldSchema: FieldSchema): string | null => {
    // Required field validation
    if (schema.required?.includes(name) && !value) {
      return `${fieldSchema.label || name} is required`;
    }

    // Type-specific validation
    if (fieldSchema.validation) {
      const { min, max, minLength, maxLength, pattern, custom } = fieldSchema.validation;

      if (fieldSchema.type === 'string' && value) {
        if (minLength && value.length < minLength) {
          return `Minimum length is ${minLength}`;
        }
        if (maxLength && value.length > maxLength) {
          return `Maximum length is ${maxLength}`;
        }
        if (pattern && !new RegExp(pattern).test(value)) {
          return `Invalid format`;
        }
      }

      if (fieldSchema.type === 'number' && value !== null && value !== undefined) {
        if (min !== undefined && value < min) {
          return `Minimum value is ${min}`;
        }
        if (max !== undefined && value > max) {
          return `Maximum value is ${max}`;
        }
      }

      if (custom) {
        const customError = custom(value);
        if (customError) return customError;
      }
    }

    return null;
  }, [schema.required]);

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    Object.entries(schema.fields).forEach(([fieldName, fieldSchema]) => {
      const error = validateField(fieldName, data[fieldName], fieldSchema);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [schema.fields, data, validateField]);

  // Handle field change
  const handleFieldChange = useCallback((name: string, value: any) => {
    const newData = { ...data, [name]: value };
    setData(newData);
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate field if touched
    const fieldSchema = schema.fields[name];
    if (fieldSchema) {
      const error = validateField(name, value, fieldSchema);
      setErrors(prev => ({
        ...prev,
        [name]: error || ''
      }));
    }
    
    // Notify parent of change
    onChange(newData);
  }, [data, onChange, schema.fields, validateField]);

  // Handle save
  const handleSave = useCallback(() => {
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(schema.fields).forEach(field => {
      allTouched[field] = true;
    });
    setTouched(allTouched);

    // Validate all fields
    if (validateAll()) {
      if (onSave) {
        onSave(data);
        showNotification(`${entityType} saved successfully`, { type: 'success' });
      }
    } else {
      showNotification('Please fix validation errors', { type: 'error' });
    }
  }, [validateAll, onSave, data, entityType, showNotification, schema.fields]);

  // Render field based on type
  const renderField = (fieldName: string, fieldSchema: FieldSchema, fieldData: any, path: string = ''): React.ReactNode => {
    const fullPath = path + fieldName;
    const error = touched[fullPath] ? errors[fullPath] : undefined;
    const isRequired = schema.required?.includes(fieldName);

    const commonProps = {
      name: fieldName,
      value: fieldData,
      onChange: (name: string, value: any) => handleFieldChange(fullPath, value),
      error,
      required: isRequired,
      disabled: readOnly
    };

    switch (fieldSchema.type) {
      case 'string':
        return (
          <StringField
            {...commonProps}
            placeholder={fieldSchema.placeholder}
          />
        );

      case 'number':
        return (
          <NumberField
            {...commonProps}
            min={fieldSchema.validation?.min}
            max={fieldSchema.validation?.max}
          />
        );

      case 'boolean':
        return <BooleanField {...commonProps} />;

      case 'select':
        return (
          <SelectField
            {...commonProps}
            options={fieldSchema.options || []}
          />
        );

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
                      value={item}
                      onChange={(e) => onChange(e.target.value)}
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
                );
              } else if (fieldSchema.itemType === 'object' && fieldSchema.itemSchema) {
                return (
                  <div className={styles.arrayItemContent}>
                    {renderFields(fieldSchema.itemSchema as any, item, `${fullPath}[${index}].`)}
                    <button
                      type="button"
                      onClick={onRemove}
                      disabled={readOnly}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  </div>
                );
              }
              return null;
            }}
          />
        );

      case 'reference':
        return (
          <ReferenceField
            {...commonProps}
            entityType={fieldSchema.entityType || ''}
            entities={entities[fieldSchema.entityType || ''] || []}
          />
        );

      case 'object':
        return (
          <ObjectField
            {...commonProps}
            schema={fieldSchema.schema}
            renderFields={renderFields}
          />
        );

      default:
        return null;
    }
  };

  // Render all fields
  const renderFields = (fieldsSchema: EntitySchema, fieldsData: any, pathPrefix: string = ''): React.ReactNode => {
    return Object.entries(fieldsSchema.fields).map(([fieldName, fieldSchema]) => (
      <div key={fieldName} className={styles.fieldRow}>
        <label className={styles.fieldLabel}>
          {fieldSchema.label || fieldName}
          {schema.required?.includes(fieldName) && <span className={styles.required}>*</span>}
        </label>
        {renderField(fieldName, fieldSchema, fieldsData[fieldName], pathPrefix)}
      </div>
    ));
  };

  // Render fields by groups or all fields
  const renderContent = () => {
    if (schema.groups) {
      return Object.entries(schema.groups).map(([groupName, fieldNames]) => (
        <FieldGroup key={groupName} title={groupName}>
          {fieldNames.map(fieldName => {
            const fieldSchema = schema.fields[fieldName];
            if (!fieldSchema) return null;
            
            return (
              <div key={fieldName} className={styles.fieldRow}>
                <label className={styles.fieldLabel}>
                  {fieldSchema.label || fieldName}
                  {schema.required?.includes(fieldName) && <span className={styles.required}>*</span>}
                </label>
                {renderField(fieldName, fieldSchema, data[fieldName])}
              </div>
            );
          })}
        </FieldGroup>
      ));
    }

    return renderFields(schema, data);
  };

  return (
    <div className={styles.entityEditor}>
      <div className={styles.header}>
        <h2>Edit {entityType}</h2>
      </div>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        {renderContent()}

        <div className={styles.actions}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          )}
          {onSave && !readOnly && (
            <button
              type="submit"
              className={styles.saveButton}
            >
              Save
            </button>
          )}
        </div>
      </form>
    </div>
  );
};