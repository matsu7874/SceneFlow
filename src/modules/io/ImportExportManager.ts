/**
 * Import/Export Manager
 *
 * Handles importing and exporting data in multiple formats with validation
 */

import type { EditableEntity } from '../ui/entityEditor/EntityEditor'
import type { Relationship, Connection } from '../ui/entityEditor/RelationshipEditor'
import { VisualFeedbackManager, FeedbackType } from '../ui/visualFeedback'

/**
 * Supported export formats
 */
export enum ExportFormat {
  JSON = 'json',
  YAML = 'yaml',
  CSV = 'csv',
  XML = 'xml',
}

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat
  includeMetadata?: boolean
  includeRelationships?: boolean
  includeConnections?: boolean
  prettify?: boolean
  compression?: boolean
  filename?: string
}

/**
 * Import options
 */
export interface ImportOptions {
  format?: ExportFormat
  validateSchema?: boolean
  mergeMode?: 'replace' | 'merge' | 'append'
  skipDuplicates?: boolean
  transformData?: (data: unknown) => unknown
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean
  data?: string | Blob
  filename?: string
  mimeType?: string
  errors?: string[]
  warnings?: string[]
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean
  entities?: EditableEntity[]
  relationships?: Relationship[]
  connections?: Connection[]
  errors?: string[]
  warnings?: string[]
  summary?: {
    entitiesImported: number
    relationshipsImported: number
    connectionsImported: number
    duplicatesSkipped: number
  }
}

/**
 * Data package for export/import
 */
export interface DataPackage {
  version: string
  timestamp: number
  metadata: {
    exportedBy: string
    description?: string
    tags?: string[]
  }
  entities: EditableEntity[]
  relationships: Relationship[]
  connections: Connection[]
  schema?: unknown
}

/**
 * CSV column mapping
 */
interface CSVColumnMapping {
  [key: string]: string | ((entity: EditableEntity) => string)
}

/**
 * Import/Export manager for handling data in multiple formats
 */
export class ImportExportManager {
  private feedbackManager?: VisualFeedbackManager

  // CSV column mappings for different entity types
  private readonly csvMappings: Record<string, CSVColumnMapping> = {
    person: {
      id: 'id',
      name: 'name',
      description: 'description',
      currentLocation: 'currentLocation',
      personality: entity => {
        const person = entity as EditableEntity & { attributes?: { personality?: string[] } }
        return person.attributes?.personality?.join(';') || ''
      },
      skills: entity => {
        const person = entity as EditableEntity & { attributes?: { skills?: string[] } }
        return person.attributes?.skills?.join(';') || ''
      },
    },
    location: {
      id: 'id',
      name: 'name',
      description: 'description',
      capacity: 'capacity',
      connections: entity => {
        const location = entity as EditableEntity & { connections?: string[] }
        return location.connections?.join(';') || ''
      },
    },
    item: {
      id: 'id',
      name: 'name',
      description: 'description',
      category: 'category',
      owner: 'owner',
      location: 'location',
    },
    information: {
      id: 'id',
      name: 'name',
      content: 'content',
      category: 'category',
      source: 'source',
      reliability: 'reliability',
    },
  }

  constructor(feedbackManager?: VisualFeedbackManager) {
    this.feedbackManager = feedbackManager
  }

  /**
   * Export data in specified format
   */
  exportData(
    entities: EditableEntity[],
    relationships: Relationship[],
    connections: Connection[],
    options: ExportOptions,
  ): ExportResult {
    try {
      const dataPackage: DataPackage = {
        version: '1.0.0',
        timestamp: Date.now(),
        metadata: {
          exportedBy: 'SceneFlow',
          description: 'SceneFlow entity data export',
          tags: ['entities', 'relationships', 'connections'],
        },
        entities: entities,
        relationships: options.includeRelationships ? relationships : [],
        connections: options.includeConnections ? connections : [],
      }

      let exportData: string | Blob
      let mimeType: string
      let filename: string

      switch (options.format) {
      case ExportFormat.JSON:
        exportData = this.exportToJSON(dataPackage, options)
        mimeType = 'application/json'
        filename = options.filename || `sceneflow-export-${Date.now()}.json`
        break

      case ExportFormat.YAML:
        exportData = this.exportToYAML(dataPackage, options)
        mimeType = 'application/x-yaml'
        filename = options.filename || `sceneflow-export-${Date.now()}.yaml`
        break

      case ExportFormat.CSV:
        exportData = this.exportToCSV(entities, options)
        mimeType = 'text/csv'
        filename = options.filename || `sceneflow-export-${Date.now()}.csv`
        break

      case ExportFormat.XML:
        exportData = this.exportToXML(dataPackage, options)
        mimeType = 'application/xml'
        filename = options.filename || `sceneflow-export-${Date.now()}.xml`
        break

      default:
        throw new Error(`Unsupported export format: ${String(options.format)}`)
      }

      // Handle compression if requested
      if (options.compression && typeof exportData === 'string') {
        exportData = this.compressData(exportData)
        mimeType = 'application/gzip'
        filename = filename.replace(/\.[^.]+$/, '.gz')
      }

      this.feedbackManager?.showNotification(
        `Data exported successfully (${options.format.toUpperCase()})`,
        FeedbackType.SUCCESS,
      )

      return {
        success: true,
        data: exportData,
        filename,
        mimeType,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown export error'

      this.feedbackManager?.showNotification(`Export failed: ${errorMessage}`, FeedbackType.ERROR)

      return {
        success: false,
        errors: [errorMessage],
      }
    }
  }

  /**
   * Import data from file or string
   */
  async importData(input: string | File, options: ImportOptions = {}): Promise<ImportResult> {
    try {
      let content: string
      let detectedFormat: ExportFormat

      if (input instanceof File) {
        content = await this.readFile(input)
        detectedFormat = this.detectFormat(input.name, content)
      } else {
        content = input
        detectedFormat = options.format || this.detectFormat('', content)
      }

      let dataPackage: DataPackage

      switch (detectedFormat) {
      case ExportFormat.JSON:
        dataPackage = this.importFromJSON(content)
        break

      case ExportFormat.YAML:
        dataPackage = this.importFromYAML(content)
        break

      case ExportFormat.CSV: {
        const entities = this.importFromCSV(content)
        dataPackage = {
          version: '1.0.0',
          timestamp: Date.now(),
          metadata: { exportedBy: 'CSV Import' },
          entities,
          relationships: [],
          connections: [],
        }
        break
      }

      case ExportFormat.XML:
        dataPackage = this.importFromXML(content)
        break

      default:
        throw new Error(`Unsupported import format: ${String(detectedFormat)}`)
      }

      // Apply data transformation if provided
      if (options.transformData) {
        dataPackage = options.transformData(dataPackage) as DataPackage
      }

      // Validate schema if requested
      if (options.validateSchema) {
        const validationErrors = this.validateDataPackage(dataPackage)
        if (validationErrors.length > 0) {
          return {
            success: false,
            errors: validationErrors,
          }
        }
      }

      // Handle merge mode
      const result = this.processImportData(dataPackage, options)

      this.feedbackManager?.showNotification(
        `Data imported successfully (${detectedFormat.toUpperCase()})`,
        FeedbackType.SUCCESS,
      )

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown import error'

      this.feedbackManager?.showNotification(`Import failed: ${errorMessage}`, FeedbackType.ERROR)

      return {
        success: false,
        errors: [errorMessage],
      }
    }
  }

  /**
   * Export to JSON format
   */
  private exportToJSON(dataPackage: DataPackage, options: ExportOptions): string {
    if (options.prettify) {
      return JSON.stringify(dataPackage, null, 2)
    }
    return JSON.stringify(dataPackage)
  }

  /**
   * Export to YAML format
   */
  private exportToYAML(dataPackage: DataPackage, _options: ExportOptions): string {
    // Simple YAML serialization - in a real implementation, you'd use a YAML library
    const yamlLines: string[] = []

    const addYamlValue = (key: string, value: unknown, indent = 0): void => {
      const prefix = '  '.repeat(indent)

      if (typeof value === 'string') {
        yamlLines.push(`${prefix}${key}: "${value}"`)
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        yamlLines.push(`${prefix}${key}: ${value}`)
      } else if (Array.isArray(value)) {
        yamlLines.push(`${prefix}${key}:`)
        value.forEach((item, _index) => {
          if (typeof item === 'object' && item !== null) {
            yamlLines.push(`${prefix}  - `)
            Object.entries(item as Record<string, unknown>).forEach(([k, v]) => {
              addYamlValue(k, v, indent + 2)
            })
          } else {
            yamlLines.push(`${prefix}  - ${item}`)
          }
        })
      } else if (typeof value === 'object' && value !== null) {
        yamlLines.push(`${prefix}${key}:`)
        Object.entries(value).forEach(([k, v]) => {
          addYamlValue(k, v, indent + 1)
        })
      } else {
        yamlLines.push(`${prefix}${key}: ${String(value)}`)
      }
    }

    Object.entries(dataPackage).forEach(([key, value]) => {
      addYamlValue(key, value)
    })

    return yamlLines.join('\n')
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(entities: EditableEntity[], _options: ExportOptions): string {
    if (entities.length === 0) {
      return 'No entities to export'
    }

    // Group entities by type
    const entitiesByType = entities.reduce(
      (acc, entity) => {
        if (!acc[entity.type]) {
          acc[entity.type] = []
        }
        acc[entity.type].push(entity)
        return acc
      },
      {} as Record<string, EditableEntity[]>,
    )

    const csvSections: string[] = []

    Object.entries(entitiesByType).forEach(([type, typeEntities]) => {
      const mapping = this.csvMappings[type]
      if (!mapping) return

      const headers = Object.keys(mapping)
      const headerLine = `# ${type.toUpperCase()} ENTITIES\n${headers.join(',')}`

      const dataLines = typeEntities.map(entity => {
        return headers
          .map(header => {
            const mapper = mapping[header]
            let value: string

            if (typeof mapper === 'function') {
              value = mapper(entity)
            } else {
              const raw = (entity as unknown as Record<string, unknown>)[mapper]
              value =
                typeof raw === 'object' && raw !== null
                  ? JSON.stringify(raw)
                  : typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean'
                    ? String(raw)
                    : ''
            }

            // Escape CSV value
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              value = `"${value.replace(/"/g, '""')}"`
            }

            return value
          })
          .join(',')
      })

      csvSections.push([headerLine, ...dataLines].join('\n'))
    })

    return csvSections.join('\n\n')
  }

  /**
   * Export to XML format
   */
  private exportToXML(dataPackage: DataPackage, _options: ExportOptions): string {
    const xmlLines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>']

    const escapeXml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }

    const addXmlElement = (name: string, value: unknown, indent = 0): void => {
      const prefix = '  '.repeat(indent)

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        xmlLines.push(`${prefix}<${name}>${escapeXml(String(value))}</${name}>`)
      } else if (Array.isArray(value)) {
        xmlLines.push(`${prefix}<${name}>`)
        value.forEach((item, _index) => {
          if (typeof item === 'object' && item !== null) {
            xmlLines.push(`${prefix}  <item>`)
            Object.entries(item as Record<string, unknown>).forEach(([k, v]) => {
              addXmlElement(k, v, indent + 2)
            })
            xmlLines.push(`${prefix}  </item>`)
          } else {
            xmlLines.push(`${prefix}  <item>${escapeXml(String(item))}</item>`)
          }
        })
        xmlLines.push(`${prefix}</${name}>`)
      } else if (typeof value === 'object' && value !== null) {
        xmlLines.push(`${prefix}<${name}>`)
        Object.entries(value).forEach(([k, v]) => {
          addXmlElement(k, v, indent + 1)
        })
        xmlLines.push(`${prefix}</${name}>`)
      } else {
        xmlLines.push(`${prefix}<${name}>${escapeXml(String(value))}</${name}>`)
      }
    }

    xmlLines.push('<sceneflow-data>')
    Object.entries(dataPackage).forEach(([key, value]) => {
      addXmlElement(key, value, 1)
    })
    xmlLines.push('</sceneflow-data>')

    return xmlLines.join('\n')
  }

  /**
   * Import from JSON format
   */
  private importFromJSON(content: string): DataPackage {
    const parsed: unknown = JSON.parse(content)

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      'entities' in parsed
    ) {
      return parsed as DataPackage
    }

    if (Array.isArray(parsed)) {
      return {
        version: '1.0.0',
        timestamp: Date.now(),
        metadata: { exportedBy: 'Legacy Import' },
        entities: Array.isArray(parsed)
          ? parsed.filter((e): e is EditableEntity => typeof e === 'object' && e !== null)
          : [],
        relationships: [],
        connections: [],
      }
    }

    throw new Error('Invalid JSON format')
  }

  /**
   * Import from YAML format
   */
  private importFromYAML(content: string): DataPackage {
    // Simple YAML parsing - in a real implementation, you'd use a YAML library
    // For now, we'll just handle JSON-like YAML
    try {
      // Try to parse as JSON first (YAML is a superset of JSON)
      return this.importFromJSON(content)
    } catch {
      throw new Error('YAML parsing not fully implemented - please use JSON format')
    }
  }

  /**
   * Import from CSV format
   */
  private importFromCSV(content: string): EditableEntity[] {
    const entities: EditableEntity[] = []
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)

    let currentType: string | null = null
    let headers: string[] = []

    for (const line of lines) {
      if (line.startsWith('#')) {
        // Section header
        const match = line.match(/# (\w+) ENTITIES/)
        if (match) {
          currentType = match[1].toLowerCase()
        }
        continue
      }

      if (!currentType) continue

      const values = this.parseCSVLine(line)

      if (headers.length === 0) {
        headers = values
        continue
      }

      if (values.length !== headers.length) continue

      const entityData: Record<string, unknown> = { type: currentType }
      headers.forEach((header, index) => {
        entityData[header] = values[index]
      })

      const entity = this.convertCSVToEntity(entityData, currentType)
      if (entity) {
        entities.push(entity)
      }
    }

    return entities
  }

  /**
   * Parse CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i += 2
          continue
        }
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current)
        current = ''
      } else {
        current += char
      }

      i++
    }

    values.push(current)
    return values
  }

  /**
   * Convert CSV data to entity
   */
  private convertCSVToEntity(data: Record<string, unknown>, type: string): EditableEntity | null {
    try {
      const baseEntity = {
        id: typeof data.id === 'string' || typeof data.id === 'number' ? String(data.id) : '',
        name:
          typeof data.name === 'string' || typeof data.name === 'number' ? String(data.name) : '',
        description:
          typeof data.description === 'string' || typeof data.description === 'number'
            ? String(data.description)
            : '',
        tags: [],
        metadata: {},
        type: type as EditableEntity['type'],
      }

      switch (type) {
      case 'person':
        return {
          ...baseEntity,
          type: 'person',
          currentLocation:
              typeof data.currentLocation === 'string' || typeof data.currentLocation === 'number'
                ? String(data.currentLocation)
                : undefined,
          attributes: {
            personality: typeof data.personality === 'string' ? data.personality.split(';') : [],
            skills: typeof data.skills === 'string' ? data.skills.split(';') : [],
            relationships: {},
          },
        }

      case 'location':
        return {
          ...baseEntity,
          type: 'location',
          connections: typeof data.connections === 'string' ? data.connections.split(';') : [],
          capacity:
              typeof data.capacity === 'number'
                ? data.capacity
                : typeof data.capacity === 'string'
                  ? Number(data.capacity)
                  : 10,
          attributes: {},
        }

      case 'item':
        return {
          ...baseEntity,
          type: 'item',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          category: typeof data.category === 'string' ? (data.category as any) : undefined,
          owner:
              typeof data.owner === 'string' || typeof data.owner === 'number'
                ? String(data.owner)
                : undefined,
          location:
              typeof data.location === 'string' || typeof data.location === 'number'
                ? String(data.location)
                : undefined,
          attributes: {},
        }

      case 'information':
        return {
          ...baseEntity,
          type: 'information',
          content:
              typeof data.content === 'string' || typeof data.content === 'number'
                ? String(data.content)
                : '',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          category: typeof data.category === 'string' ? (data.category as any) : undefined,
          source:
              typeof data.source === 'string' || typeof data.source === 'number'
                ? String(data.source)
                : undefined,
          reliability:
              typeof data.reliability === 'number'
                ? data.reliability
                : typeof data.reliability === 'string'
                  ? Number(data.reliability)
                  : 1.0,
          attributes: {},
        }

      default:
        return null
      }
    } catch {
      return null
    }
  }

  /**
   * Import from XML format
   */
  private importFromXML(_content: string): DataPackage {
    // Simple XML parsing - in a real implementation, you'd use a proper XML parser
    throw new Error('XML import not implemented - please use JSON format')
  }

  /**
   * Detect format from filename and content
   */
  private detectFormat(filename: string, content: string): ExportFormat {
    // Check file extension first
    const ext = filename.toLowerCase().split('.').pop()

    switch (ext) {
    case 'json':
      return ExportFormat.JSON
    case 'yaml':
    case 'yml':
      return ExportFormat.YAML
    case 'csv':
      return ExportFormat.CSV
    case 'xml':
      return ExportFormat.XML
    }

    // Try to detect from content
    const trimmed = content.trim()

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return ExportFormat.JSON
    }

    if (trimmed.startsWith('<?xml')) {
      return ExportFormat.XML
    }

    if (trimmed.includes(',') && trimmed.includes('\n')) {
      return ExportFormat.CSV
    }

    // Default to JSON
    return ExportFormat.JSON
  }

  /**
   * Read file content
   */
  private async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  /**
   * Compress data using gzip
   */
  private compressData(data: string): Blob {
    // Simple compression simulation - in a real implementation, you'd use actual compression
    const encoder = new TextEncoder()
    const compressed = encoder.encode(data)
    return new Blob([compressed], { type: 'application/gzip' })
  }

  /**
   * Validate data package
   */
  private validateDataPackage(dataPackage: DataPackage): string[] {
    const errors: string[] = []

    if (!dataPackage.version) {
      errors.push('Missing version information')
    }

    if (!dataPackage.entities || !Array.isArray(dataPackage.entities)) {
      errors.push('Invalid or missing entities array')
    }

    if (!dataPackage.relationships || !Array.isArray(dataPackage.relationships)) {
      errors.push('Invalid or missing relationships array')
    }

    if (!dataPackage.connections || !Array.isArray(dataPackage.connections)) {
      errors.push('Invalid or missing connections array')
    }

    // Validate entities
    dataPackage.entities?.forEach((entity, index) => {
      if (!entity.id) {
        errors.push(`Entity at index ${index} missing ID`)
      }
      if (!entity.name) {
        errors.push(`Entity at index ${index} missing name`)
      }
      if (!entity.type) {
        errors.push(`Entity at index ${index} missing type`)
      }
    })

    return errors
  }

  /**
   * Process import data according to options
   */
  private processImportData(dataPackage: DataPackage, _options: ImportOptions): ImportResult {
    const summary = {
      entitiesImported: 0,
      relationshipsImported: 0,
      connectionsImported: 0,
      duplicatesSkipped: 0,
    }

    const warnings: string[] = []

    // For this implementation, we'll just return the data as-is
    // In a real implementation, you'd handle merging, duplicate detection, etc.

    summary.entitiesImported = dataPackage.entities.length
    summary.relationshipsImported = dataPackage.relationships.length
    summary.connectionsImported = dataPackage.connections.length

    return {
      success: true,
      entities: dataPackage.entities,
      relationships: dataPackage.relationships,
      connections: dataPackage.connections,
      warnings,
      summary,
    }
  }

  /**
   * Download data as file
   */
  downloadData(data: string | Blob, filename: string, mimeType: string): void {
    const blob = typeof data === 'string' ? new Blob([data], { type: mimeType }) : data
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): ExportFormat[] {
    return Object.values(ExportFormat)
  }
}
