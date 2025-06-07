import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import styles from './ColorPicker.module.css'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  disabled?: boolean
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  label = '色',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [tempColor, setTempColor] = useState(value)
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })
  const pickerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Default color palette
  const colorPalette = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E', '#6B7280', '#374151', '#1F2937',
  ]

  useEffect(() => {
    setTempColor(value)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Update popover position
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setPopoverPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
        })
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleColorChange = (color: string) => {
    setTempColor(color)
    onChange(color)
  }

  const isValidHexColor = (color: string): boolean => {
    return /^#[0-9A-F]{6}$/i.test(color)
  }

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setTempColor(newValue)

    if (isValidHexColor(newValue)) {
      onChange(newValue)
    }
  }

  const popoverContent = isOpen && !disabled && (
    <div
      ref={pickerRef}
      className={styles.popover}
      style={{
        position: 'fixed',
        top: `${popoverPosition.top}px`,
        left: `${popoverPosition.left}px`,
      }}
    >
      <div className={styles.paletteSection}>
        <h4>プリセットカラー</h4>
        <div className={styles.colorGrid}>
          {colorPalette.map((color) => (
            <button
              key={color}
              type="button"
              className={styles.paletteColor}
              style={{ backgroundColor: color }}
              onClick={() => handleColorChange(color)}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className={styles.pickerSection}>
        <h4>カスタムカラー</h4>
        <input
          type="color"
          value={tempColor}
          onChange={(e) => handleColorChange(e.target.value)}
          className={styles.nativeColorPicker}
        />
      </div>
    </div>
  )

  return (
    <>
      <div className={styles.colorPicker}>
        <label className={styles.label}>{label}</label>
        <div className={styles.inputGroup}>
          <button
            ref={buttonRef}
            type="button"
            className={styles.colorButton}
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            style={{ backgroundColor: value }}
          >
            <span className={styles.colorPreview} />
          </button>
          <input
            type="text"
            value={tempColor}
            onChange={handleTextInputChange}
            className={styles.colorInput}
            placeholder="#000000"
            disabled={disabled}
          />
        </div>
      </div>
      {popoverContent && ReactDOM.createPortal(
        popoverContent,
        document.body,
      )}
    </>
  )
}