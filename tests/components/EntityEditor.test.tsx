import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntityEditor } from '../../src/components/EntityEditor'
import React from 'react'

// Mock the visual feedback hook
vi.mock('../../src/contexts/VisualFeedbackContext', () => ({
  useVisualFeedback: vi.fn(() => ({
    showNotification: vi.fn(),
    showError: vi.fn(),
  })),
}))

describe('EntityEditor', () => {
  const user = userEvent.setup()
  const mockOnChange = vi.fn()
  const mockOnSave = vi.fn()
  const mockOnCancel = vi.fn()

  const testSchema = {
    fields: {
      name: {
        type: 'string' as const,
        label: '名前',
        placeholder: '名前を入力',
        validation: {
          minLength: 1,
          maxLength: 50,
        },
      },
      age: {
        type: 'number' as const,
        label: '年齢',
        validation: {
          min: 0,
          max: 150,
        },
      },
      active: {
        type: 'boolean' as const,
        label: 'アクティブ',
      },
    },
    required: ['name'],
  }

  const testData = {
    name: 'Test Person',
    age: 30,
    active: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all fields from schema', () => {
    render(
      <EntityEditor
        entityType="person"
        entityData={testData}
        schema={testSchema}
        onChange={mockOnChange}
      />,
    )

    // Check that field labels are present
    expect(screen.getByText('名前')).toBeInTheDocument()
    expect(screen.getByText('年齢')).toBeInTheDocument()
    expect(screen.getByText('アクティブ')).toBeInTheDocument()

    // Check that inputs are present
    expect(screen.getByDisplayValue('Test Person')).toBeInTheDocument()
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
  })

  it('displays initial values', () => {
    render(
      <EntityEditor
        entityType="person"
        entityData={testData}
        schema={testSchema}
        onChange={mockOnChange}
      />,
    )

    expect(screen.getByDisplayValue('Test Person')).toBeInTheDocument()
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('calls onChange when field values change', async () => {
    render(
      <EntityEditor
        entityType="person"
        entityData={testData}
        schema={testSchema}
        onChange={mockOnChange}
      />,
    )

    const nameInput = screen.getByDisplayValue('Test Person')
    await user.clear(nameInput)
    await user.type(nameInput, 'New Name')

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Name',
      }),
    )
  })

  it('validates required fields', async () => {
    render(
      <EntityEditor
        entityType="person"
        entityData={{ ...testData, name: '' }}
        schema={testSchema}
        onChange={mockOnChange}
        onSave={mockOnSave}
      />,
    )

    const saveButton = screen.getByText('Save')
    await user.click(saveButton)

    // The save should not be called with invalid data
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('validates field constraints', async () => {
    render(
      <EntityEditor
        entityType="person"
        entityData={testData}
        schema={testSchema}
        onChange={mockOnChange}
      />,
    )

    const ageInput = screen.getByDisplayValue('30')
    await user.clear(ageInput)
    await user.type(ageInput, '200')

    // Tab out to trigger validation
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/Maximum value is 150/)).toBeInTheDocument()
    })
  })

  it('calls onSave with valid data', async () => {
    render(
      <EntityEditor
        entityType="person"
        entityData={testData}
        schema={testSchema}
        onChange={mockOnChange}
        onSave={mockOnSave}
      />,
    )

    const saveButton = screen.getByText('Save')
    await user.click(saveButton)

    expect(mockOnSave).toHaveBeenCalledWith(testData)
  })

  it('calls onCancel when cancel button is clicked', async () => {
    render(
      <EntityEditor
        entityType="person"
        entityData={testData}
        schema={testSchema}
        onChange={mockOnChange}
        onCancel={mockOnCancel}
      />,
    )

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('disables fields in readOnly mode', () => {
    render(
      <EntityEditor
        entityType="person"
        entityData={testData}
        schema={testSchema}
        onChange={mockOnChange}
        readOnly={true}
      />,
    )

    expect(screen.getByDisplayValue('Test Person')).toBeDisabled()
    expect(screen.getByDisplayValue('30')).toBeDisabled()
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('handles select fields', () => {
    const schemaWithSelect = {
      fields: {
        role: {
          type: 'select' as const,
          label: '役割',
          options: [
            { value: 'admin', label: '管理者' },
            { value: 'user', label: 'ユーザー' },
          ],
        },
      },
    }

    render(
      <EntityEditor
        entityType="person"
        entityData={{ role: 'admin' }}
        schema={schemaWithSelect}
        onChange={mockOnChange}
      />,
    )

    const selectElement = screen.getByRole('combobox')
    expect(selectElement).toHaveValue('admin')
    expect(screen.getByRole('option', { name: '管理者' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'ユーザー' })).toBeInTheDocument()
  })

  it('handles array fields', async () => {
    const schemaWithArray = {
      fields: {
        tags: {
          type: 'array' as const,
          label: 'タグ',
          itemType: 'string',
        },
      },
    }

    render(
      <EntityEditor
        entityType="person"
        entityData={{ tags: ['tag1', 'tag2'] }}
        schema={schemaWithArray}
        onChange={mockOnChange}
      />,
    )

    // Check that array items are rendered as inputs
    expect(screen.getByDisplayValue('tag1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('tag2')).toBeInTheDocument()

    const addButton = screen.getByText(/Add Item/i)
    await user.click(addButton)

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['tag1', 'tag2', ''],
      }),
    )
  })

  it('groups fields when groups are defined', () => {
    const schemaWithGroups = {
      fields: {
        firstName: { type: 'string' as const, label: '名' },
        lastName: { type: 'string' as const, label: '姓' },
        email: { type: 'string' as const, label: 'メール' },
        phone: { type: 'string' as const, label: '電話' },
      },
      groups: {
        '基本情報': ['firstName', 'lastName'],
        '連絡先': ['email', 'phone'],
      },
    }

    render(
      <EntityEditor
        entityType="person"
        entityData={{}}
        schema={schemaWithGroups}
        onChange={mockOnChange}
      />,
    )

    expect(screen.getByText('基本情報')).toBeInTheDocument()
    expect(screen.getByText('連絡先')).toBeInTheDocument()
  })
})