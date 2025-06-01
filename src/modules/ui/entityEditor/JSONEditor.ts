/**
 * Enhanced JSON Editor
 *
 * Advanced JSON editor with syntax highlighting, schema validation, and auto-complete
 */

import { VisualFeedbackManager, FeedbackType } from '../visualFeedback'

/**
 * JSON schema definition
 */
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  properties?: Record<string, JSONSchema>
  items?: JSONSchema
  required?: string[]
  enum?: unknown[]
  format?: string
  pattern?: string
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  description?: string
}

/**
 * Validation error
 */
export interface ValidationError {
  path: string
  message: string
  severity: 'error' | 'warning'
  line?: number
  column?: number
}

/**
 * Auto-complete suggestion
 */
export interface AutoCompleteSuggestion {
  text: string
  displayText: string
  type: 'property' | 'value' | 'keyword'
  description?: string
  insertText?: string
}

/**
 * JSON editor configuration
 */
export interface JSONEditorConfig {
  schema?: JSONSchema
  readOnly?: boolean
  lineNumbers?: boolean
  wordWrap?: boolean
  autoFormat?: boolean
  validateOnType?: boolean
  autoComplete?: boolean
  theme?: 'light' | 'dark'
  tabSize?: number
  maxLines?: number
}

/**
 * Change event
 */
export interface JSONChangeEvent {
  value: string
  isValid: boolean
  errors: ValidationError[]
  parsed?: unknown
}

/**
 * Enhanced JSON editor with syntax highlighting and validation
 */
export class JSONEditor {
  private container: HTMLElement
  private textarea: HTMLTextAreaElement
  private lineNumbersElement: HTMLElement
  private highlightElement: HTMLElement
  private suggestionsElement: HTMLElement
  private feedbackManager: VisualFeedbackManager
  private config: JSONEditorConfig

  private currentValue = ''
  private currentErrors: ValidationError[] = []
  private currentSuggestions: AutoCompleteSuggestion[] = []
  private cursorPosition = 0
  private showingSuggestions = false

  // Callbacks
  private onChange?: (event: JSONChangeEvent) => void
  private onValidationChange?: (errors: ValidationError[]) => void

  // Syntax highlighting patterns
  private readonly syntaxPatterns = [
    { name: 'string', pattern: /"(?:[^"\\]|\\.)*"/g, className: 'json-string' },
    { name: 'number', pattern: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, className: 'json-number' },
    { name: 'boolean', pattern: /\b(?:true|false)\b/g, className: 'json-boolean' },
    { name: 'null', pattern: /\bnull\b/g, className: 'json-null' },
    { name: 'key', pattern: /"(?:[^"\\]|\\.)*"(?=\s*:)/g, className: 'json-key' },
    { name: 'punctuation', pattern: /[{}[\],:]/g, className: 'json-punctuation' },
  ]

  constructor(
    container: HTMLElement,
    config: JSONEditorConfig = {},
    feedbackManager?: VisualFeedbackManager,
  ) {
    this.container = container
    this.feedbackManager = feedbackManager || new VisualFeedbackManager(container)
    this.config = {
      readOnly: false,
      lineNumbers: true,
      wordWrap: true,
      autoFormat: true,
      validateOnType: true,
      autoComplete: true,
      theme: 'light',
      tabSize: 2,
      maxLines: 50,
      ...config,
    }

    this.render()
    this.setupEventHandlers()
  }

  /**
   * Render the JSON editor
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="json-editor ${this.config.theme === 'dark' ? 'dark-theme' : 'light-theme'}">
        <div class="json-editor-header">
          <div class="editor-info">
            <span class="cursor-info">Line: 1, Column: 1</span>
            <span class="validation-status">Valid JSON</span>
          </div>
          <div class="editor-actions">
            <button class="btn-format" ${this.config.readOnly ? 'disabled' : ''}>Format</button>
            <button class="btn-minify" ${this.config.readOnly ? 'disabled' : ''}>Minify</button>
            <button class="btn-validate">Validate</button>
            <button class="btn-copy">Copy</button>
          </div>
        </div>
        <div class="json-editor-content">
          ${this.config.lineNumbers ? '<div class="line-numbers"></div>' : ''}
          <div class="editor-container">
            <div class="syntax-highlight"></div>
            <textarea 
              class="json-textarea" 
              ${this.config.readOnly ? 'readonly' : ''}
              style="tab-size: ${this.config.tabSize}; max-height: ${this.config.maxLines ? this.config.maxLines * 1.4 + 'em' : 'none'}"
              spellcheck="false"
            ></textarea>
            <div class="auto-complete-suggestions" style="display: none;"></div>
          </div>
        </div>
        <div class="json-editor-footer">
          <div class="error-list"></div>
        </div>
      </div>
    `

    this.textarea = this.container.querySelector('.json-textarea') as HTMLTextAreaElement
    this.lineNumbersElement = this.container.querySelector('.line-numbers') as HTMLElement
    this.highlightElement = this.container.querySelector('.syntax-highlight') as HTMLElement
    this.suggestionsElement = this.container.querySelector('.auto-complete-suggestions') as HTMLElement

    // Initialize with empty content
    this.setValue('{}', false)
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Textarea events
    this.textarea.addEventListener('input', () => this.handleInput())
    this.textarea.addEventListener('keydown', (e) => this.handleKeyDown(e))
    this.textarea.addEventListener('keyup', () => this.updateCursorInfo())
    this.textarea.addEventListener('click', () => this.updateCursorInfo())
    this.textarea.addEventListener('scroll', () => this.syncScroll())

    // Header button events
    const formatBtn = this.container.querySelector('.btn-format')
    formatBtn?.addEventListener('click', () => this.formatJSON())

    const minifyBtn = this.container.querySelector('.btn-minify')
    minifyBtn?.addEventListener('click', () => this.minifyJSON())

    const validateBtn = this.container.querySelector('.btn-validate')
    validateBtn?.addEventListener('click', () => this.validateJSON())

    const copyBtn = this.container.querySelector('.btn-copy')
    copyBtn?.addEventListener('click', () => this.copyToClipboard())

    // Auto-complete suggestion clicks
    this.suggestionsElement.addEventListener('click', (e) => {
      const suggestion = (e.target as HTMLElement).closest('.suggestion-item')
      if (suggestion) {
        const text = (suggestion as HTMLElement).dataset.insertText || (suggestion as HTMLElement).textContent
        if (text) {
          this.insertSuggestion(text)
        }
      }
    })

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target as Node)) {
        this.hideSuggestions()
      }
    })
  }

  /**
   * Handle input changes
   */
  private handleInput(): void {
    this.currentValue = this.textarea.value
    this.updateSyntaxHighlighting()
    this.updateLineNumbers()
    this.updateCursorInfo()

    if (this.config.validateOnType) {
      this.validateJSON()
    }

    if (this.config.autoComplete && !this.config.readOnly) {
      this.updateAutoComplete()
    }

    this.triggerChange()
  }

  /**
   * Handle key down events
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (this.config.readOnly) return

    // Handle tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = this.textarea.selectionStart
      const end = this.textarea.selectionEnd
      const spaces = ' '.repeat(this.config.tabSize || 2)

      this.textarea.value =
        this.textarea.value.substring(0, start) +
        spaces +
        this.textarea.value.substring(end)

      this.textarea.selectionStart = this.textarea.selectionEnd = start + spaces.length
      this.handleInput()
      return
    }

    // Handle auto-complete navigation
    if (this.showingSuggestions) {
      if (e.key === 'Escape') {
        this.hideSuggestions()
        return
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        this.navigateSuggestions(e.key === 'ArrowDown' ? 1 : -1)
        return
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const selected = this.suggestionsElement.querySelector('.suggestion-item.selected')
        if (selected) {
          const text = (selected as HTMLElement).dataset.insertText || (selected as HTMLElement).textContent
          if (text) {
            this.insertSuggestion(text)
          }
        }
        return
      }
    }

    // Auto-close brackets and quotes
    if (e.key === '{') {
      this.insertBrackets('{', '}')
      e.preventDefault()
    } else if (e.key === '[') {
      this.insertBrackets('[', ']')
      e.preventDefault()
    } else if (e.key === '"') {
      this.insertBrackets('"', '"')
      e.preventDefault()
    }
  }

  /**
   * Insert brackets with auto-close
   */
  private insertBrackets(open: string, close: string): void {
    const start = this.textarea.selectionStart
    const end = this.textarea.selectionEnd
    const selectedText = this.textarea.value.substring(start, end)

    this.textarea.value =
      this.textarea.value.substring(0, start) +
      open + selectedText + close +
      this.textarea.value.substring(end)

    // Position cursor inside brackets if no text was selected
    if (selectedText === '') {
      this.textarea.selectionStart = this.textarea.selectionEnd = start + 1
    } else {
      this.textarea.selectionStart = start + 1
      this.textarea.selectionEnd = start + 1 + selectedText.length
    }

    this.handleInput()
  }

  /**
   * Update syntax highlighting
   */
  private updateSyntaxHighlighting(): void {
    if (!this.highlightElement) return

    let highlighted = this.escapeHtml(this.currentValue)

    // Apply syntax highlighting patterns
    this.syntaxPatterns.forEach(pattern => {
      highlighted = highlighted.replace(pattern.pattern, (match) =>
        `<span class="${pattern.className}">${match}</span>`,
      )
    })

    // Add line breaks for proper alignment
    highlighted = highlighted.replace(/\n/g, '\n')

    this.highlightElement.innerHTML = highlighted
    this.syncScroll()
  }

  /**
   * Update line numbers
   */
  private updateLineNumbers(): void {
    if (!this.lineNumbersElement) return

    const lines = this.currentValue.split('\n').length
    const lineNumbers = Array.from({ length: lines }, (_, i) => i + 1)
      .map(num => `<div class="line-number">${num}</div>`)
      .join('')

    this.lineNumbersElement.innerHTML = lineNumbers
  }

  /**
   * Update cursor information
   */
  private updateCursorInfo(): void {
    const cursorInfo = this.container.querySelector('.cursor-info')
    if (!cursorInfo) return

    const position = this.textarea.selectionStart
    const lines = this.currentValue.substring(0, position).split('\n')
    const line = lines.length
    const column = lines[lines.length - 1].length + 1

    cursorInfo.textContent = `Line: ${line}, Column: ${column}`
    this.cursorPosition = position
  }

  /**
   * Sync scroll between textarea and highlight overlay
   */
  private syncScroll(): void {
    if (this.highlightElement) {
      this.highlightElement.scrollTop = this.textarea.scrollTop
      this.highlightElement.scrollLeft = this.textarea.scrollLeft
    }

    if (this.lineNumbersElement) {
      this.lineNumbersElement.scrollTop = this.textarea.scrollTop
    }
  }

  /**
   * Validate JSON
   */
  private validateJSON(): void {
    this.currentErrors = []
    let parsed: unknown = undefined
    let isValid = false

    try {
      if (this.currentValue.trim() === '') {
        isValid = true
      } else {
        parsed = JSON.parse(this.currentValue)
        isValid = true

        // Schema validation
        if (this.config.schema) {
          const schemaErrors = this.validateAgainstSchema(parsed, this.config.schema, '')
          this.currentErrors.push(...schemaErrors)
          isValid = schemaErrors.length === 0
        }
      }
    } catch (error) {
      isValid = false
      const syntaxError = this.parseSyntaxError(error as Error)
      this.currentErrors.push(syntaxError)
    }

    this.updateValidationDisplay()
    this.onValidationChange?.(this.currentErrors)

    return { isValid, parsed, errors: this.currentErrors }
  }

  /**
   * Parse syntax error from JSON.parse
   */
  private parseSyntaxError(error: Error): ValidationError {
    const message = error.message
    let line = 1
    let column = 1

    // Try to extract line/column from error message
    const lineMatch = message.match(/line (\d+)/i)
    const columnMatch = message.match(/column (\d+)/i)
    const positionMatch = message.match(/position (\d+)/i)

    if (lineMatch) {
      line = parseInt(lineMatch[1], 10)
    }
    if (columnMatch) {
      column = parseInt(columnMatch[1], 10)
    }
    if (positionMatch && !lineMatch) {
      const position = parseInt(positionMatch[1], 10)
      const lines = this.currentValue.substring(0, position).split('\n')
      line = lines.length
      column = lines[lines.length - 1].length + 1
    }

    return {
      path: '',
      message: `Syntax error: ${message}`,
      severity: 'error',
      line,
      column,
    }
  }

  /**
   * Validate against JSON schema
   */
  private validateAgainstSchema(value: unknown, schema: JSONSchema, path: string): ValidationError[] {
    const errors: ValidationError[] = []

    // Type validation
    if (schema.type) {
      const actualType = this.getJSONType(value)
      if (actualType !== schema.type) {
        errors.push({
          path,
          message: `Expected ${schema.type}, but got ${actualType}`,
          severity: 'error',
        })
        return errors // Don't continue validation if type is wrong
      }
    }

    // Object validation
    if (schema.type === 'object' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>

      // Required properties
      if (schema.required) {
        schema.required.forEach(key => {
          if (!(key in obj)) {
            errors.push({
              path: path ? `${path}.${key}` : key,
              message: `Missing required property: ${key}`,
              severity: 'error',
            })
          }
        })
      }

      // Property validation
      if (schema.properties) {
        Object.entries(obj).forEach(([key, propValue]) => {
          const propSchema = schema.properties![key]
          if (propSchema) {
            const propPath = path ? `${path}.${key}` : key
            const propErrors = this.validateAgainstSchema(propValue, propSchema, propPath)
            errors.push(...propErrors)
          }
        })
      }
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(value)) {
      if (schema.items) {
        value.forEach((item, index) => {
          const itemPath = `${path}[${index}]`
          const itemErrors = this.validateAgainstSchema(item, schema.items!, itemPath)
          errors.push(...itemErrors)
        })
      }
    }

    // String validation
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({
          path,
          message: `String too short. Minimum length: ${schema.minLength}`,
          severity: 'error',
        })
      }

      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({
          path,
          message: `String too long. Maximum length: ${schema.maxLength}`,
          severity: 'error',
        })
      }

      if (schema.pattern) {
        const regex = new RegExp(schema.pattern)
        if (!regex.test(value)) {
          errors.push({
            path,
            message: `String does not match pattern: ${schema.pattern}`,
            severity: 'error',
          })
        }
      }

      if (schema.enum && !schema.enum.includes(value)) {
        errors.push({
          path,
          message: `Value must be one of: ${schema.enum.join(', ')}`,
          severity: 'error',
        })
      }
    }

    // Number validation
    if (schema.type === 'number' && typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({
          path,
          message: `Number too small. Minimum: ${schema.minimum}`,
          severity: 'error',
        })
      }

      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({
          path,
          message: `Number too large. Maximum: ${schema.maximum}`,
          severity: 'error',
        })
      }
    }

    return errors
  }

  /**
   * Get JSON type of value
   */
  private getJSONType(value: unknown): string {
    if (value === null) return 'null'
    if (Array.isArray(value)) return 'array'
    return typeof value
  }

  /**
   * Update validation display
   */
  private updateValidationDisplay(): void {
    const statusElement = this.container.querySelector('.validation-status')
    const errorListElement = this.container.querySelector('.error-list')

    if (statusElement) {
      if (this.currentErrors.length === 0) {
        statusElement.textContent = 'Valid JSON'
        statusElement.className = 'validation-status valid'
      } else {
        const errorCount = this.currentErrors.filter(e => e.severity === 'error').length
        const warningCount = this.currentErrors.filter(e => e.severity === 'warning').length
        statusElement.textContent = `${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''}`
        statusElement.className = 'validation-status invalid'
      }
    }

    if (errorListElement) {
      if (this.currentErrors.length === 0) {
        errorListElement.style.display = 'none'
      } else {
        errorListElement.style.display = 'block'
        errorListElement.innerHTML = this.currentErrors.map(error => `
          <div class="error-item ${error.severity}">
            <span class="error-location">${error.path || 'root'}${error.line ? ` (line ${error.line})` : ''}</span>
            <span class="error-message">${error.message}</span>
          </div>
        `).join('')
      }
    }
  }

  /**
   * Update auto-complete suggestions
   */
  private updateAutoComplete(): void {
    if (!this.config.autoComplete || this.config.readOnly) return

    const context = this.getAutoCompleteContext()
    this.currentSuggestions = this.generateSuggestions(context)

    if (this.currentSuggestions.length > 0) {
      this.showSuggestions()
    } else {
      this.hideSuggestions()
    }
  }

  /**
   * Get auto-complete context
   */
  private getAutoCompleteContext(): { type: 'key' | 'value' | 'unknown'; path: string; currentToken: string } {
    const beforeCursor = this.currentValue.substring(0, this.cursorPosition)
    const afterCursor = this.currentValue.substring(this.cursorPosition)

    // Simple context detection - in a real implementation this would be more sophisticated
    const inString = (beforeCursor.match(/"/g) || []).length % 2 === 1
    const lastChar = beforeCursor.trim().slice(-1)

    let type: 'key' | 'value' | 'unknown' = 'unknown'
    if (inString && lastChar === '"' && beforeCursor.includes(':')) {
      type = 'value'
    } else if (inString) {
      type = 'key'
    }

    // Extract current token
    const tokenMatch = beforeCursor.match(/"([^"]*)"?$/)
    const currentToken = tokenMatch ? tokenMatch[1] : ''

    return { type, path: '', currentToken }
  }

  /**
   * Generate auto-complete suggestions
   */
  private generateSuggestions(context: { type: 'key' | 'value' | 'unknown'; path: string; currentToken: string }): AutoCompleteSuggestion[] {
    const suggestions: AutoCompleteSuggestion[] = []

    if (!this.config.schema) return suggestions

    if (context.type === 'key') {
      // Suggest property names from schema
      this.addPropertySuggestions(this.config.schema, suggestions, context.currentToken)
    } else if (context.type === 'value') {
      // Suggest values based on schema
      this.addValueSuggestions(this.config.schema, suggestions, context.currentToken)
    }

    return suggestions.filter(s =>
      s.text.toLowerCase().includes(context.currentToken.toLowerCase()),
    ).slice(0, 10)
  }

  /**
   * Add property suggestions from schema
   */
  private addPropertySuggestions(schema: JSONSchema, suggestions: AutoCompleteSuggestion[], filter: string): void {
    if (schema.type === 'object' && schema.properties) {
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        if (key.toLowerCase().includes(filter.toLowerCase())) {
          suggestions.push({
            text: key,
            displayText: key,
            type: 'property',
            description: propSchema.description,
            insertText: key,
          })
        }
      })
    }
  }

  /**
   * Add value suggestions from schema
   */
  private addValueSuggestions(schema: JSONSchema, suggestions: AutoCompleteSuggestion[], filter: string): void {
    // Suggest enum values
    if (schema.enum) {
      schema.enum.forEach(value => {
        const stringValue = JSON.stringify(value)
        if (stringValue.toLowerCase().includes(filter.toLowerCase())) {
          suggestions.push({
            text: stringValue,
            displayText: stringValue,
            type: 'value',
            insertText: stringValue,
          })
        }
      })
    }

    // Suggest type-based values
    if (schema.type === 'boolean') {
      ['true', 'false'].forEach(value => {
        if (value.includes(filter.toLowerCase())) {
          suggestions.push({
            text: value,
            displayText: value,
            type: 'value',
            insertText: value,
          })
        }
      })
    }

    if (schema.type === 'null') {
      if ('null'.includes(filter.toLowerCase())) {
        suggestions.push({
          text: 'null',
          displayText: 'null',
          type: 'value',
          insertText: 'null',
        })
      }
    }
  }

  /**
   * Show auto-complete suggestions
   */
  private showSuggestions(): void {
    if (this.currentSuggestions.length === 0) return

    this.suggestionsElement.innerHTML = this.currentSuggestions.map((suggestion, index) => `
      <div class="suggestion-item ${index === 0 ? 'selected' : ''}" data-insert-text="${suggestion.insertText || suggestion.text}">
        <span class="suggestion-text">${suggestion.displayText}</span>
        <span class="suggestion-type">${suggestion.type}</span>
        ${suggestion.description ? `<span class="suggestion-description">${suggestion.description}</span>` : ''}
      </div>
    `).join('')

    // Position suggestions near cursor
    const rect = this.textarea.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()

    this.suggestionsElement.style.display = 'block'
    this.suggestionsElement.style.left = `${rect.left - containerRect.left}px`
    this.suggestionsElement.style.top = `${rect.top - containerRect.top + 20}px`

    this.showingSuggestions = true
  }

  /**
   * Hide auto-complete suggestions
   */
  private hideSuggestions(): void {
    this.suggestionsElement.style.display = 'none'
    this.showingSuggestions = false
  }

  /**
   * Navigate auto-complete suggestions
   */
  private navigateSuggestions(direction: 1 | -1): void {
    const items = this.suggestionsElement.querySelectorAll('.suggestion-item')
    const currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'))

    if (currentIndex >= 0) {
      items[currentIndex].classList.remove('selected')
    }

    const newIndex = Math.max(0, Math.min(items.length - 1, currentIndex + direction))
    items[newIndex]?.classList.add('selected')
  }

  /**
   * Insert suggestion at cursor
   */
  private insertSuggestion(text: string): void {
    const start = this.textarea.selectionStart
    const end = this.textarea.selectionEnd

    // Find the start of the current token
    const beforeCursor = this.currentValue.substring(0, start)
    const tokenStart = beforeCursor.lastIndexOf('"') + 1

    this.textarea.value =
      this.currentValue.substring(0, tokenStart) +
      text +
      this.currentValue.substring(end)

    this.textarea.selectionStart = this.textarea.selectionEnd = tokenStart + text.length
    this.hideSuggestions()
    this.handleInput()
    this.textarea.focus()
  }

  /**
   * Format JSON with proper indentation
   */
  private formatJSON(): void {
    if (this.config.readOnly) return

    try {
      const parsed = JSON.parse(this.currentValue)
      const formatted = JSON.stringify(parsed, null, this.config.tabSize || 2)
      this.setValue(formatted)
      this.feedbackManager.showNotification('JSON formatted', FeedbackType.SUCCESS)
    } catch (error) {
      this.feedbackManager.showNotification('Cannot format invalid JSON', FeedbackType.ERROR)
    }
  }

  /**
   * Minify JSON
   */
  private minifyJSON(): void {
    if (this.config.readOnly) return

    try {
      const parsed = JSON.parse(this.currentValue)
      const minified = JSON.stringify(parsed)
      this.setValue(minified)
      this.feedbackManager.showNotification('JSON minified', FeedbackType.SUCCESS)
    } catch (error) {
      this.feedbackManager.showNotification('Cannot minify invalid JSON', FeedbackType.ERROR)
    }
  }

  /**
   * Copy to clipboard
   */
  private copyToClipboard(): void {
    navigator.clipboard.writeText(this.currentValue).then(() => {
      this.feedbackManager.showNotification('Copied to clipboard', FeedbackType.SUCCESS)
    }).catch(() => {
      this.feedbackManager.showNotification('Failed to copy', FeedbackType.ERROR)
    })
  }

  /**
   * Trigger change event
   */
  private triggerChange(): void {
    const validation = this.validateJSON()

    this.onChange?.({
      value: this.currentValue,
      isValid: validation.isValid,
      errors: validation.errors,
      parsed: validation.parsed,
    })
  }

  /**
   * Escape HTML for syntax highlighting
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  /**
   * Set editor value
   */
  setValue(value: string, triggerChange = true): void {
    this.currentValue = value
    this.textarea.value = value
    this.updateSyntaxHighlighting()
    this.updateLineNumbers()
    this.updateCursorInfo()

    if (triggerChange) {
      this.validateJSON()
      this.triggerChange()
    }
  }

  /**
   * Get editor value
   */
  getValue(): string {
    return this.currentValue
  }

  /**
   * Set schema for validation
   */
  setSchema(schema: JSONSchema): void {
    this.config.schema = schema
    this.validateJSON()
  }

  /**
   * Get current validation errors
   */
  getErrors(): ValidationError[] {
    return [...this.currentErrors]
  }

  /**
   * Focus the editor
   */
  focus(): void {
    this.textarea.focus()
  }

  /**
   * Register change callback
   */
  setOnChange(callback: (event: JSONChangeEvent) => void): void {
    this.onChange = callback
  }

  /**
   * Register validation change callback
   */
  setOnValidationChange(callback: (errors: ValidationError[]) => void): void {
    this.onValidationChange = callback
  }
}

/**
 * CSS styles for JSON editor
 */
export const jsonEditorStyles = `
  .json-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }
  
  .json-editor.dark-theme {
    background: #1e1e1e;
    color: #d4d4d4;
    border-color: #3e3e3e;
  }
  
  .json-editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
    font-size: 12px;
  }
  
  .dark-theme .json-editor-header {
    background: #2d2d2d;
    border-color: #3e3e3e;
  }
  
  .editor-info {
    display: flex;
    gap: 16px;
  }
  
  .cursor-info {
    color: #666;
  }
  
  .validation-status.valid {
    color: #4caf50;
  }
  
  .validation-status.invalid {
    color: #f44336;
  }
  
  .editor-actions {
    display: flex;
    gap: 4px;
  }
  
  .editor-actions button {
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 3px;
    background: white;
    cursor: pointer;
    font-size: 11px;
  }
  
  .editor-actions button:hover:not(:disabled) {
    background: #f5f5f5;
  }
  
  .editor-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .dark-theme .editor-actions button {
    background: #3e3e3e;
    border-color: #555;
    color: #d4d4d4;
  }
  
  .json-editor-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  
  .line-numbers {
    background: #f8f9fa;
    border-right: 1px solid #e0e0e0;
    padding: 8px 4px;
    font-size: 12px;
    line-height: 1.4;
    color: #666;
    min-width: 40px;
    text-align: right;
    overflow: hidden;
  }
  
  .dark-theme .line-numbers {
    background: #2d2d2d;
    border-color: #3e3e3e;
    color: #858585;
  }
  
  .line-number {
    height: 1.4em;
  }
  
  .editor-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }
  
  .syntax-highlight {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 8px;
    margin: 0;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 12px;
    line-height: 1.4;
    color: transparent;
    background: transparent;
    overflow: auto;
    pointer-events: none;
    white-space: pre;
    word-wrap: break-word;
  }
  
  .json-textarea {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 8px;
    margin: 0;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 12px;
    line-height: 1.4;
    background: transparent;
    color: inherit;
    resize: none;
    overflow: auto;
    white-space: pre;
    word-wrap: break-word;
    caret-color: currentColor;
  }
  
  .dark-theme .json-textarea {
    background: #1e1e1e;
  }
  
  /* Syntax highlighting colors */
  .json-string {
    color: #22863a;
  }
  
  .json-number {
    color: #005cc5;
  }
  
  .json-boolean {
    color: #d73a49;
  }
  
  .json-null {
    color: #6f42c1;
  }
  
  .json-key {
    color: #032f62;
    font-weight: bold;
  }
  
  .json-punctuation {
    color: #24292e;
  }
  
  /* Dark theme syntax colors */
  .dark-theme .json-string {
    color: #9ecbff;
  }
  
  .dark-theme .json-number {
    color: #79b8ff;
  }
  
  .dark-theme .json-boolean {
    color: #ffab70;
  }
  
  .dark-theme .json-null {
    color: #b392f0;
  }
  
  .dark-theme .json-key {
    color: #9ecbff;
    font-weight: bold;
  }
  
  .dark-theme .json-punctuation {
    color: #e1e4e8;
  }
  
  .auto-complete-suggestions {
    position: absolute;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    font-size: 12px;
  }
  
  .dark-theme .auto-complete-suggestions {
    background: #2d2d2d;
    border-color: #3e3e3e;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
  
  .suggestion-item {
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .suggestion-item:last-child {
    border-bottom: none;
  }
  
  .suggestion-item:hover,
  .suggestion-item.selected {
    background: #e3f2fd;
  }
  
  .dark-theme .suggestion-item:hover,
  .dark-theme .suggestion-item.selected {
    background: #0d47a1;
  }
  
  .suggestion-text {
    font-weight: bold;
  }
  
  .suggestion-type {
    font-size: 10px;
    color: #666;
    margin-left: 8px;
  }
  
  .suggestion-description {
    display: block;
    font-size: 10px;
    color: #888;
    margin-top: 2px;
  }
  
  .json-editor-footer {
    border-top: 1px solid #e0e0e0;
  }
  
  .dark-theme .json-editor-footer {
    border-color: #3e3e3e;
  }
  
  .error-list {
    max-height: 150px;
    overflow-y: auto;
    padding: 8px;
    background: #fff8f0;
    font-size: 12px;
  }
  
  .dark-theme .error-list {
    background: #2d1b0e;
  }
  
  .error-item {
    padding: 4px 0;
    border-bottom: 1px solid #f0e6d2;
  }
  
  .error-item:last-child {
    border-bottom: none;
  }
  
  .error-item.error {
    color: #d32f2f;
  }
  
  .error-item.warning {
    color: #f57c00;
  }
  
  .error-location {
    font-weight: bold;
    margin-right: 8px;
  }
  
  .error-message {
    color: inherit;
  }
`