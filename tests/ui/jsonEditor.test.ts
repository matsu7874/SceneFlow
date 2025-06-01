import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JSONEditor, type JSONSchema, type ValidationError, type JSONChangeEvent } from '../../src/modules/ui/entityEditor/JSONEditor'

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
  },
})

describe('JSONEditor', () => {
  let container: HTMLElement
  let editor: JSONEditor

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    editor = new JSONEditor(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  describe('initialization', () => {
    it('should render JSON editor interface', () => {
      expect(container.querySelector('.json-editor')).toBeTruthy()
      expect(container.querySelector('.json-editor-header')).toBeTruthy()
      expect(container.querySelector('.json-editor-content')).toBeTruthy()
      expect(container.querySelector('.json-textarea')).toBeTruthy()
    })

    it('should initialize with empty JSON object', () => {
      expect(editor.getValue()).toBe('{}')
    })

    it('should show cursor info', () => {
      expect(container.querySelector('.cursor-info')).toBeTruthy()
      expect(container.querySelector('.cursor-info')?.textContent).toMatch(/Line: 1, Column: [13]/)
    })

    it('should show validation status', () => {
      expect(container.querySelector('.validation-status')).toBeTruthy()
      expect(container.querySelector('.validation-status')?.textContent).toBe('Valid JSON')
    })
  })

  describe('configuration', () => {
    it('should accept custom configuration', () => {
      const customEditor = new JSONEditor(container, {
        readOnly: true,
        lineNumbers: false,
        theme: 'dark',
        tabSize: 4,
      })

      expect(customEditor).toBeDefined()
      const textarea = container.querySelector('.json-textarea') as HTMLTextAreaElement
      expect(textarea.readOnly).toBe(true)
    })

    it('should support dark theme', () => {
      const darkEditor = new JSONEditor(container, { theme: 'dark' })
      expect(container.querySelector('.dark-theme')).toBeTruthy()
    })

    it('should support line numbers configuration', () => {
      const editorWithoutLines = new JSONEditor(container, { lineNumbers: false })
      expect(container.querySelector('.line-numbers')).toBeFalsy()
    })
  })

  describe('value management', () => {
    it('should set and get value', () => {
      const testValue = '{"name": "test", "value": 123}'
      editor.setValue(testValue)
      expect(editor.getValue()).toBe(testValue)
    })

    it('should trigger change event on setValue', () => {
      const onChange = vi.fn()
      editor.setOnChange(onChange)

      editor.setValue('{"test": true}')
      expect(onChange).toHaveBeenCalled()
    })

    it('should not trigger change event when specified', () => {
      const onChange = vi.fn()
      editor.setOnChange(onChange)

      editor.setValue('{"test": true}', false)
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('validation', () => {
    it('should validate valid JSON', () => {
      editor.setValue('{"valid": true}')
      const errors = editor.getErrors()
      expect(errors).toHaveLength(0)
    })

    it('should detect syntax errors', () => {
      editor.setValue('{"invalid": true,}') // Trailing comma
      const errors = editor.getErrors()
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].severity).toBe('error')
      expect(errors[0].message).toContain('Syntax error')
    })

    it('should validate against schema', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number', minimum: 0 },
        },
        required: ['name'],
      }

      editor.setSchema(schema)
      editor.setValue('{"age": 25}') // Missing required 'name'

      const errors = editor.getErrors()
      expect(errors.some(e => e.message.includes('Missing required property: name'))).toBe(true)
    })

    it('should validate string constraints', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 3, maxLength: 10 },
        },
      }

      editor.setSchema(schema)
      editor.setValue('{"name": "ab"}') // Too short

      const errors = editor.getErrors()
      expect(errors.some(e => e.message.includes('String too short'))).toBe(true)
    })

    it('should validate number constraints', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          score: { type: 'number', minimum: 0, maximum: 100 },
        },
      }

      editor.setSchema(schema)
      editor.setValue('{"score": -10}') // Below minimum

      const errors = editor.getErrors()
      expect(errors.some(e => e.message.includes('Number too small'))).toBe(true)
    })

    it('should validate enum values', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
        },
      }

      editor.setSchema(schema)
      editor.setValue('{"status": "unknown"}') // Not in enum

      const errors = editor.getErrors()
      expect(errors.some(e => e.message.includes('Value must be one of'))).toBe(true)
    })

    it('should validate array items', () => {
      const schema: JSONSchema = {
        type: 'array',
        items: { type: 'string' },
      }

      editor.setSchema(schema)
      editor.setValue('[1, 2, 3]') // Numbers instead of strings

      const errors = editor.getErrors()
      expect(errors.some(e => e.message.includes('Expected string, but got number'))).toBe(true)
    })
  })

  describe('formatting', () => {
    it('should format JSON', () => {
      editor.setValue('{"a":1,"b":2}')

      // Simulate format button click
      const formatBtn = container.querySelector('.btn-format') as HTMLButtonElement
      formatBtn.click()

      const formatted = editor.getValue()
      expect(formatted).toContain('\n')
      expect(formatted).toContain('  ') // Indentation
    })

    it('should minify JSON', () => {
      editor.setValue('{\n  "a": 1,\n  "b": 2\n}')

      // Simulate minify button click
      const minifyBtn = container.querySelector('.btn-minify') as HTMLButtonElement
      minifyBtn.click()

      const minified = editor.getValue()
      expect(minified).toBe('{"a":1,"b":2}')
    })

    it('should not format invalid JSON', () => {
      editor.setValue('{"invalid": true,}')

      const formatBtn = container.querySelector('.btn-format') as HTMLButtonElement
      formatBtn.click()

      // Should remain unchanged
      expect(editor.getValue()).toBe('{"invalid": true,}')
    })
  })

  describe('auto-complete', () => {
    it('should generate property suggestions', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Person name' },
          age: { type: 'number', description: 'Person age' },
        },
      }

      editor.setSchema(schema)
      editor.setValue('{"na')

      // Auto-complete should be triggered (tested indirectly)
      expect(container.querySelector('.auto-complete-suggestions')).toBeTruthy()
    })

    it('should support disabled auto-complete', () => {
      const editorNoComplete = new JSONEditor(container, { autoComplete: false })
      expect(editorNoComplete).toBeDefined()
    })
  })

  describe('keyboard shortcuts', () => {
    it('should handle tab for indentation', () => {
      const textarea = container.querySelector('.json-textarea') as HTMLTextAreaElement
      textarea.value = '{'
      textarea.selectionStart = textarea.selectionEnd = 1

      // Simulate tab key
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' })
      Object.defineProperty(tabEvent, 'preventDefault', { value: vi.fn() })
      textarea.dispatchEvent(tabEvent)

      expect(tabEvent.preventDefault).toHaveBeenCalled()
    })

    it('should auto-close brackets', () => {
      const textarea = container.querySelector('.json-textarea') as HTMLTextAreaElement
      textarea.selectionStart = textarea.selectionEnd = 0

      // Simulate typing opening brace
      const braceEvent = new KeyboardEvent('keydown', { key: '{' })
      Object.defineProperty(braceEvent, 'preventDefault', { value: vi.fn() })
      textarea.dispatchEvent(braceEvent)

      expect(braceEvent.preventDefault).toHaveBeenCalled()
    })
  })

  describe('copy functionality', () => {
    it('should copy to clipboard', async () => {
      editor.setValue('{"test": true}')

      const copyBtn = container.querySelector('.btn-copy') as HTMLButtonElement
      copyBtn.click()

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('{"test": true}')
    })
  })

  describe('error display', () => {
    it('should show validation status for valid JSON', () => {
      editor.setValue('{"valid": true}')

      const status = container.querySelector('.validation-status')
      expect(status?.classList.contains('valid')).toBe(true)
      expect(status?.textContent).toBe('Valid JSON')
    })

    it('should show validation status for invalid JSON', () => {
      editor.setValue('{"invalid": true,}')

      const status = container.querySelector('.validation-status')
      expect(status?.classList.contains('invalid')).toBe(true)
      expect(status?.textContent).toContain('error')
    })

    it('should display error list', () => {
      editor.setValue('{"invalid": true,}')

      const errorList = container.querySelector('.error-list')
      expect(errorList?.style.display).not.toBe('none')
      expect(container.querySelector('.error-item')).toBeTruthy()
    })

    it('should hide error list when valid', () => {
      editor.setValue('{"valid": true}')

      const errorList = container.querySelector('.error-list')
      expect(errorList?.style.display).toBe('none')
    })
  })

  describe('syntax highlighting', () => {
    it('should highlight JSON syntax', () => {
      editor.setValue('{"string": "value", "number": 123, "boolean": true, "null": null}')

      const highlight = container.querySelector('.syntax-highlight')
      expect(highlight).toBeTruthy()
      // Syntax highlighting is applied via innerHTML manipulation
    })
  })

  describe('line numbers', () => {
    it('should show line numbers by default', () => {
      expect(container.querySelector('.line-numbers')).toBeTruthy()
    })

    it('should update line numbers when content changes', () => {
      editor.setValue('{\n  "line1": true,\n  "line2": false\n}')

      const lineNumbers = container.querySelectorAll('.line-number')
      expect(lineNumbers.length).toBeGreaterThan(1)
    })
  })

  describe('readonly mode', () => {
    it('should disable editing in readonly mode', () => {
      const readonlyEditor = new JSONEditor(container, { readOnly: true })

      const textarea = container.querySelector('.json-textarea') as HTMLTextAreaElement
      expect(textarea.readOnly).toBe(true)

      const formatBtn = container.querySelector('.btn-format') as HTMLButtonElement
      const minifyBtn = container.querySelector('.btn-minify') as HTMLButtonElement
      expect(formatBtn.disabled).toBe(true)
      expect(minifyBtn.disabled).toBe(true)
    })
  })

  describe('focus management', () => {
    it('should focus textarea', () => {
      const textarea = container.querySelector('.json-textarea') as HTMLTextAreaElement
      textarea.focus = vi.fn()

      editor.focus()
      expect(textarea.focus).toHaveBeenCalled()
    })
  })

  describe('callbacks', () => {
    it('should call onChange callback', () => {
      const onChange = vi.fn()
      editor.setOnChange(onChange)

      editor.setValue('{"changed": true}')

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          value: '{"changed": true}',
          isValid: true,
          parsed: { changed: true },
        }),
      )
    })

    it('should call onValidationChange callback', () => {
      const onValidationChange = vi.fn()
      editor.setOnValidationChange(onValidationChange)

      editor.setValue('{"invalid": true,}')

      expect(onValidationChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            severity: 'error',
            message: expect.stringContaining('Syntax error'),
          }),
        ]),
      )
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      editor.setValue('')
      expect(editor.getErrors()).toHaveLength(0)
    })

    it('should handle very large JSON', () => {
      const largeObject = { data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: `item-${i}` })) }
      const largeJSON = JSON.stringify(largeObject)

      editor.setValue(largeJSON)
      expect(editor.getValue()).toBe(largeJSON)
    })

    it('should handle special characters', () => {
      const specialChars = '{"unicode": "\\u0048\\u0065\\u006C\\u006C\\u006F", "emoji": "😀🎉"}'
      editor.setValue(specialChars)
      expect(editor.getErrors()).toHaveLength(0)
    })
  })
})