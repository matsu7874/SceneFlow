import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface MapBackgroundValue {
  image: HTMLImageElement | null
  offsetX: number
  offsetY: number
  scale: number
  opacity: number
  setImage: (file: File) => void
  update: (
    partial: Partial<{ offsetX: number; offsetY: number; scale: number; opacity: number }>,
  ) => void
  clear: () => void
}

const MapBackgroundContext = createContext<MapBackgroundValue | undefined>(undefined)

export const MapBackgroundProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [image, setImageEl] = useState<HTMLImageElement | null>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [scale, setScale] = useState(1)
  const [opacity, setOpacity] = useState(0.5)

  const setImage = useCallback((file: File): void => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = (): void => {
      setImageEl(prev => {
        if (prev) URL.revokeObjectURL(prev.src)
        return img
      })
      setOffsetX(0)
      setOffsetY(0)
      setScale(1)
      setOpacity(0.5)
    }
    img.onerror = (): void => {
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [])

  const update = useCallback(
    (
      partial: Partial<{ offsetX: number; offsetY: number; scale: number; opacity: number }>,
    ): void => {
      if (partial.offsetX !== undefined) setOffsetX(partial.offsetX)
      if (partial.offsetY !== undefined) setOffsetY(partial.offsetY)
      if (partial.scale !== undefined) setScale(partial.scale)
      if (partial.opacity !== undefined) setOpacity(partial.opacity)
    },
    [],
  )

  const clear = useCallback((): void => {
    setImageEl(prev => {
      if (prev) URL.revokeObjectURL(prev.src)
      return null
    })
  }, [])

  return (
    <MapBackgroundContext.Provider
      value={{ image, offsetX, offsetY, scale, opacity, setImage, update, clear }}
    >
      {children}
    </MapBackgroundContext.Provider>
  )
}

export const useMapBackground = (): MapBackgroundValue => {
  const ctx = useContext(MapBackgroundContext)
  if (!ctx) throw new Error('useMapBackground must be used within a MapBackgroundProvider')
  return ctx
}
