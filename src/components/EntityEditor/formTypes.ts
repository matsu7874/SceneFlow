/**
 * スキーマ駆動フォーム（EntityEditor / FieldComponents）の共有型。
 * フィールド値は実行時スキーマで型が決まるため、any ではなく共用体で表す。
 */

export type FieldValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | FieldValue[]
  | { [key: string]: FieldValue }

/** フォーム全体のデータ。エンティティの編集対象フィールドを動的に保持する。 */
export type EntityFormData = Record<string, FieldValue>

export interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'select' | 'array' | 'reference' | 'object' | 'color'
  label?: string
  placeholder?: string
  options?: Array<{ value: string | number; label: string }>
  itemType?: string
  itemSchema?: FieldSchema
  entityType?: string
  schema?: EntitySchema
  validation?: {
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    pattern?: string
    custom?: (value: FieldValue) => string | null
  }
}

export interface EntitySchema {
  fields: Record<string, FieldSchema>
  groups?: Record<string, string[]>
  required?: string[]
}

/** FieldValue がオブジェクト（連想配列）のときだけ返し、それ以外は空オブジェクトを返す。 */
export function asFormObject(value: FieldValue): EntityFormData {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

/** input/select の value 属性に渡せる形へ安全に落とす。 */
export function asInputValue(value: FieldValue): string | number {
  return typeof value === 'string' || typeof value === 'number' ? value : ''
}
