import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JsonDataInput } from '../../src/components/JsonDataInput'
import { VisualFeedbackProvider } from '../../src/contexts/VisualFeedbackContext'
import React from 'react'

// Mock validation module
vi.mock('../../src/utils/validation', () => ({
  validateStoryData: vi.fn(() => ({ isValid: true, errors: [] })),
}))

describe('JsonDataInput', () => {
  const mockOnDataLoad = vi.fn()
  const user = userEvent.setup()

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <VisualFeedbackProvider>{children}</VisualFeedbackProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders textarea and load button', () => {
    render(
      <TestWrapper>
        <JsonDataInput onDataLoad={mockOnDataLoad} />
      </TestWrapper>,
    )

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '物語データをロード' })).toBeInTheDocument()
  })

  it('loads valid JSON data without events field', async () => {
    const testData = {
      persons: [{ id: 1, name: 'Test Person', color: '#FF0000' }],
      locations: [{ id: 1, name: 'Test Location', connections: [] }],
      acts: [{ id: 1, personId: 1, locationId: 1, time: '09:00:00', description: 'Test Act' }],
      props: [],
      informations: [],
      initialStates: [{ personId: 1, locationId: 1, time: '09:00:00' }],
    }

    render(
      <TestWrapper>
        <JsonDataInput onDataLoad={mockOnDataLoad} />
      </TestWrapper>,
    )

    const textarea = screen.getByRole('textbox')
    const loadButton = screen.getByRole('button', { name: '物語データをロード' })

    // Clear and set new JSON
    fireEvent.change(textarea, { target: { value: JSON.stringify(testData, null, 2) } })

    // Click load button
    fireEvent.click(loadButton)

    // Check that onDataLoad was called with the correct data
    await waitFor(() => {
      expect(mockOnDataLoad).toHaveBeenCalledWith(testData)
    })

    // Check no error is displayed
    expect(screen.queryByText(/JSONの解析に失敗しました/)).not.toBeInTheDocument()
    expect(screen.queryByText(/eventsは必須フィールド/)).not.toBeInTheDocument()
  })

  it('handles JSON parse errors', async () => {
    render(
      <TestWrapper>
        <JsonDataInput onDataLoad={mockOnDataLoad} />
      </TestWrapper>,
    )

    const textarea = screen.getByRole('textbox')
    const loadButton = screen.getByRole('button', { name: '物語データをロード' })

    // Set invalid JSON
    fireEvent.change(textarea, { target: { value: '{ invalid json }' } })

    // Click load button
    fireEvent.click(loadButton)

    // Check error is displayed
    await waitFor(() => {
      expect(screen.getByText(/JSONの解析に失敗しました/)).toBeInTheDocument()
    })

    // Check that onDataLoad was not called
    expect(mockOnDataLoad).not.toHaveBeenCalled()
  })

  it('handles validation errors', async () => {
    // Mock validation to return errors
    const { validateStoryData } = await import('../../src/utils/validation')
    vi.mocked(validateStoryData).mockReturnValueOnce({
      isValid: false,
      errors: ['Test validation error'],
    })

    render(
      <TestWrapper>
        <JsonDataInput onDataLoad={mockOnDataLoad} />
      </TestWrapper>,
    )

    const textarea = screen.getByRole('textbox')
    const loadButton = screen.getByRole('button', { name: '物語データをロード' })

    // Set valid JSON that will fail validation
    fireEvent.change(textarea, { target: { value: JSON.stringify({ persons: [] }, null, 2) } })

    // Click load button
    fireEvent.click(loadButton)

    // Check error is displayed
    await waitFor(() => {
      expect(screen.getByText('Test validation error')).toBeInTheDocument()
    })

    // Check that onDataLoad was not called
    expect(mockOnDataLoad).not.toHaveBeenCalled()
  })

  it('uses default Momotaro data initially', () => {
    render(
      <TestWrapper>
        <JsonDataInput onDataLoad={mockOnDataLoad} />
      </TestWrapper>,
    )

    const textarea = screen.getByRole('textbox')
    const value = textarea.value

    // Check that default data contains Momotaro
    expect(value).toContain('桃太郎')
    expect(value).toContain('おじいさん')
    expect(value).toContain('おばあさん')

    // Check that it does NOT contain events field
    const parsed = JSON.parse(value)
    expect(parsed.events).toBeUndefined()
  })
})