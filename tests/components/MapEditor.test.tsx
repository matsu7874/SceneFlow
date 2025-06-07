import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MapEditor } from '../../src/components/MapEditor'
import { vi } from 'vitest'
import '@testing-library/jest-dom'

describe('MapEditor', () => {
  const defaultProps = {
    width: 800,
    height: 600,
    onSave: vi.fn(),
  }

  const mockInitialData = {
    locations: [
      { id: '1', name: 'Location 1', x: 100, y: 100, description: '', tags: [] },
      { id: '2', name: 'Location 2', x: 200, y: 200, description: '', tags: [] },
      { id: '3', name: 'Location 3', x: 300, y: 300, description: '', tags: [] },
    ],
    connections: [
      { from: '1', to: '2', weight: 1, bidirectional: true },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Multiple Selection', () => {
    it('should add node to selection when Shift+click', async () => {
      const { container } = render(
        <MapEditor {...defaultProps} initialData={mockInitialData} />,
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()

      // Click first node to select it
      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 100,
        clientY: 100,
      })
      fireEvent.mouseUp(canvas!)

      // Shift+click second node to add to selection
      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 200,
        clientY: 200,
        shiftKey: true,
      })
      fireEvent.mouseUp(canvas!)

      // Check that both nodes are selected
      const stats = screen.getByText(/選択中: 2/)
      expect(stats).toBeInTheDocument()
    })

    it('should maintain selection when Shift+clicking already selected node', async () => {
      const { container } = render(
        <MapEditor {...defaultProps} initialData={mockInitialData} />,
      )

      const canvas = container.querySelector('canvas')

      // Select first node
      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 100,
        clientY: 100,
      })
      fireEvent.mouseUp(canvas!)

      // Wait for selection to update
      await waitFor(() => {
        expect(screen.getByText(/選択中: 1/)).toBeInTheDocument()
      })

      // Shift+click same node (should deselect it)
      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 100,
        clientY: 100,
        shiftKey: true,
      })
      fireEvent.mouseUp(canvas!)

      // Should have zero selected (toggle behavior)
      await waitFor(() => {
        expect(screen.getByText(/選択中: 0/)).toBeInTheDocument()
      })
    })

    it('should allow deselecting node with Shift+click', async () => {
      const { container } = render(
        <MapEditor {...defaultProps} initialData={mockInitialData} />,
      )

      const canvas = container.querySelector('canvas')

      // Select two nodes with shift
      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 100,
        clientY: 100,
      })
      fireEvent.mouseUp(canvas!)

      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 200,
        clientY: 200,
        shiftKey: true,
      })
      fireEvent.mouseUp(canvas!)

      // Shift+click first node again to deselect
      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 100,
        clientY: 100,
        shiftKey: true,
      })
      fireEvent.mouseUp(canvas!)

      // Should have only one selected
      const stats = screen.getByText(/選択中: 1/)
      expect(stats).toBeInTheDocument()
    })
  })

  describe('Select All', () => {
    it('should select all nodes with Ctrl+A', async () => {
      const { container } = render(
        <MapEditor {...defaultProps} initialData={mockInitialData} />,
      )

      // Press Ctrl+A
      fireEvent.keyDown(window, {
        key: 'a',
        ctrlKey: true,
      })

      // All 3 nodes should be selected
      const stats = screen.getByText(/選択中: 3/)
      expect(stats).toBeInTheDocument()
    })

    it('should select all nodes with Cmd+A on Mac', async () => {
      const { container } = render(
        <MapEditor {...defaultProps} initialData={mockInitialData} />,
      )

      // Press Cmd+A
      fireEvent.keyDown(window, {
        key: 'a',
        metaKey: true,
      })

      // All 3 nodes should be selected
      const stats = screen.getByText(/選択中: 3/)
      expect(stats).toBeInTheDocument()
    })

    it('should prevent default browser behavior for Ctrl+A', async () => {
      const { container } = render(
        <MapEditor {...defaultProps} initialData={mockInitialData} />,
      )

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      act(() => {
        window.dispatchEvent(event)
      })

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('Rubber Band Selection', () => {
    it('should start rubber band selection with Shift+drag on empty area', async () => {
      const { container } = render(
        <MapEditor {...defaultProps} initialData={mockInitialData} />,
      )

      const canvas = container.querySelector('canvas')

      // Start rubber band selection
      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 50,
        clientY: 50,
        shiftKey: true,
      })

      // Drag to create selection area
      fireEvent.mouseMove(canvas!, {
        clientX: 350,
        clientY: 350,
      })

      // Visual feedback should be shown (this would be visible on canvas)
      // We can't directly test canvas rendering, but we can verify state changes

      fireEvent.mouseUp(canvas!)

      // All nodes within the area should be selected
      const stats = screen.getByText(/選択中: 3/)
      expect(stats).toBeInTheDocument()
    })

    it('should select only nodes within rubber band area', async () => {
      const { container } = render(
        <MapEditor {...defaultProps} initialData={mockInitialData} />,
      )

      const canvas = container.querySelector('canvas')

      // Start rubber band selection that includes only first two nodes
      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 50,
        clientY: 50,
        shiftKey: true,
      })

      fireEvent.mouseMove(canvas!, {
        clientX: 250,
        clientY: 250,
      })

      fireEvent.mouseUp(canvas!)

      // Only first two nodes should be selected
      const stats = screen.getByText(/選択中: 2/)
      expect(stats).toBeInTheDocument()
    })

    it('should clear previous selection when starting rubber band', async () => {
      const { container } = render(
        <MapEditor {...defaultProps} initialData={mockInitialData} />,
      )

      const canvas = container.querySelector('canvas')

      // First select a node
      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 100,
        clientY: 100,
      })
      fireEvent.mouseUp(canvas!)

      // Start rubber band selection
      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 250,
        clientY: 250,
        shiftKey: true,
      })

      fireEvent.mouseMove(canvas!, {
        clientX: 350,
        clientY: 350,
      })

      fireEvent.mouseUp(canvas!)

      // Only the node in rubber band area should be selected
      const stats = screen.getByText(/選択中: 1/)
      expect(stats).toBeInTheDocument()
    })
  })

  describe('Canvas Double Click', () => {
    it('should create new node on canvas double click', async () => {
      const { container } = render(
        <MapEditor {...defaultProps} initialData={mockInitialData} />,
      )

      const canvas = container.querySelector('canvas')

      // Double click on empty area
      fireEvent.doubleClick(canvas!, {
        clientX: 400,
        clientY: 400,
      })

      // Should have 4 nodes now
      await waitFor(() => {
        const stats = screen.getByText(/ノード数: 4/)
        expect(stats).toBeInTheDocument()
      })
    })

    it('should not create node when double clicking on existing node', async () => {
      const { container } = render(
        <MapEditor {...defaultProps} initialData={mockInitialData} />,
      )

      const canvas = container.querySelector('canvas')

      // Double click on existing node
      fireEvent.doubleClick(canvas!, {
        clientX: 100,
        clientY: 100,
      })

      // Should still have 3 nodes
      const stats = screen.getByText(/ノード数: 3/)
      expect(stats).toBeInTheDocument()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should delete selected nodes with Delete key', async () => {
      const { container } = render(
        <MapEditor {...defaultProps} initialData={mockInitialData} />,
      )

      const canvas = container.querySelector('canvas')

      // Select a node
      fireEvent.mouseDown(canvas!, {
        button: 0,
        clientX: 100,
        clientY: 100,
      })
      fireEvent.mouseUp(canvas!)

      // Press Delete
      fireEvent.keyDown(window, { key: 'Delete' })

      // Should have 2 nodes left
      await waitFor(() => {
        const stats = screen.getByText(/ノード数: 2/)
        expect(stats).toBeInTheDocument()
      })
    })

    it('should cancel operations with Escape key', async () => {
      const { container } = render(
        <MapEditor {...defaultProps} initialData={mockInitialData} />,
      )

      const canvas = container.querySelector('canvas')

      // Start connecting mode
      const connectButton = screen.getByText('接続')
      fireEvent.click(connectButton)

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' })

      // Connect button should not be active
      expect(connectButton).not.toHaveClass('active')
    })
  })
})