import React, { useEffect, useMemo, useRef, useState } from 'react'
import styles from './QuickLog.module.css'

export interface ComboOption {
  id: number
  name: string
}

interface EntityComboboxProps {
  label: string
  options: ComboOption[]
  value: number | null
  onSelect: (id: number) => void
  onCreate: (name: string) => number | null
}

export const EntityCombobox: React.FC<EntityComboboxProps> = ({
  label,
  options,
  value,
  onSelect,
  onCreate,
}) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)

  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(blurTimer.current), [])

  const selectedName = useMemo(
    () => options.find(option => option.id === value)?.name ?? '',
    [options, value],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(option => option.name.toLowerCase().includes(q))
  }, [options, query])

  const trimmedQuery = query.trim()
  const hasExactMatch = options.some(option => option.name === trimmedQuery)

  const choose = (id: number): void => {
    onSelect(id)
    setQuery('')
    setOpen(false)
    setFocused(false)
  }

  const create = (): void => {
    const name = query.trim()
    if (!name) return
    const id = onCreate(name)
    if (id === null) return
    onSelect(id)
    setQuery('')
    setOpen(false)
    setFocused(false)
  }

  // 編集中（フォーカス時）は入力中のクエリを、未編集時は確定済みの名前を表示する。
  // 確定値を placeholder で見せると未入力（薄色）と見分けがつかないため、実値として通常色で描画する。
  const isConfirmed = !focused && selectedName !== ''
  const displayValue = focused ? query : selectedName

  return (
    <div className={styles.combobox}>
      <input
        aria-label={label}
        className={isConfirmed ? styles.comboboxConfirmed : undefined}
        placeholder={label}
        value={displayValue}
        onChange={event => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          setFocused(true)
          setQuery('')
          setOpen(true)
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => {
            setOpen(false)
            setFocused(false)
          }, 150)
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault()
            if (filtered.length > 0) {
              choose(filtered[0].id)
            } else if (query.trim()) {
              create()
            }
          }
        }}
      />
      {open && (
        <ul className={styles.options}>
          {filtered.map(option => (
            <li key={option.id}>
              <button type="button" onMouseDown={() => choose(option.id)}>
                {option.name}
              </button>
            </li>
          ))}
          {trimmedQuery && !hasExactMatch && (
            <li>
              <button type="button" onMouseDown={create} className={styles.createOption}>
                + 新規: {trimmedQuery}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
