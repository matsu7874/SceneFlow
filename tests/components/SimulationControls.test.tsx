import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SimulationControls } from '../../src/components/SimulationControls'
import React from 'react'

describe('SimulationControls', () => {
  const user = userEvent.setup()
  const mockProps = {
    isPlaying: false,
    currentTime: 0,
    maxTime: 1440, // 24 hours in minutes
    speed: 1,
    onPlayPause: vi.fn(),
    onTimeChange: vi.fn(),
    onSpeedChange: vi.fn(),
    disabled: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders control buttons', () => {
    render(<SimulationControls {...mockProps} />)

    expect(screen.getByText(/再生|Play/i)).toBeInTheDocument()
  })

  it('displays current time', () => {
    render(<SimulationControls {...mockProps} currentTime={540} />)

    expect(screen.getByText('09:00:00')).toBeInTheDocument()
  })

  it('displays playback speed', () => {
    render(<SimulationControls {...mockProps} speed={2} />)

    const speedSelect = screen.getByRole('combobox')
    expect(speedSelect).toHaveValue('2')
  })

  it('calls onPlayPause when play button is clicked', async () => {
    render(<SimulationControls {...mockProps} />)

    const playButton = screen.getByText(/再生|Play/i)
    await user.click(playButton)

    expect(mockProps.onPlayPause).toHaveBeenCalled()
  })

  it('shows pause text when playing', () => {
    render(<SimulationControls {...mockProps} isPlaying={true} />)

    expect(screen.getByText(/一時停止|Pause/i)).toBeInTheDocument()
  })

  it('changes playback speed', async () => {
    render(<SimulationControls {...mockProps} />)

    const speedControl = screen.getByRole('combobox')
    await user.selectOptions(speedControl, '2')

    expect(mockProps.onSpeedChange).toHaveBeenCalledWith(2)
  })

  it('displays available speed options', () => {
    render(<SimulationControls {...mockProps} />)

    expect(screen.getByRole('option', { name: '1x' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '2x' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '5x' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '10x' })).toBeInTheDocument()
  })

  it('shows time slider', () => {
    render(<SimulationControls {...mockProps} currentTime={300} />)

    const timeSlider = screen.getByRole('slider')
    expect(timeSlider).toBeInTheDocument()
    expect(timeSlider).toHaveValue('300')
  })

  it('updates time when slider is moved', async () => {
    render(<SimulationControls {...mockProps} />)

    const timeSlider = screen.getByRole('slider')

    // Change slider value
    fireEvent.change(timeSlider, { target: { value: '600' } })

    expect(mockProps.onTimeChange).toHaveBeenCalledWith(600)
  })

  it('formats time display correctly', () => {
    const { rerender } = render(<SimulationControls {...mockProps} currentTime={0} />)
    expect(screen.getByText('00:00:00')).toBeInTheDocument()

    rerender(<SimulationControls {...mockProps} currentTime={90} />)
    expect(screen.getByText('01:30:00')).toBeInTheDocument()

    rerender(<SimulationControls {...mockProps} currentTime={1439} />)
    expect(screen.getByText('23:59:00')).toBeInTheDocument()
  })

  it('disables controls when disabled prop is true', () => {
    render(<SimulationControls {...mockProps} disabled={true} />)

    const playButton = screen.getByText(/再生|Play/i)
    const speedControl = screen.getByRole('combobox')
    const timeSlider = screen.getByRole('slider')

    expect(playButton).toBeDisabled()
    expect(speedControl).toBeDisabled()
    expect(timeSlider).toBeDisabled()
  })

  it('shows correct max time on slider', () => {
    render(<SimulationControls {...mockProps} maxTime={720} />)

    const timeSlider = screen.getByRole('slider')
    expect(timeSlider).toHaveAttribute('max', '720')
  })

  it('handles edge case times correctly', () => {
    render(<SimulationControls {...mockProps} currentTime={1440} />)
    // Should handle 24:00 as 00:00 or show 24:00
    const timeText = screen.getByText(/00:00|24:00/)
    expect(timeText).toBeInTheDocument()
  })
})