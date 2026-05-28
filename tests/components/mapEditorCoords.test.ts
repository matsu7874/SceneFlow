import { describe, it, expect } from 'vitest'
import { getCanvasCoords } from '../../src/components/MapEditor/coords'

interface FakeRect {
  left: number
  top: number
  width: number
  height: number
}

function makeEvent(
  clientX: number,
  clientY: number,
  canvas: { width: number; height: number; rect: FakeRect },
) {
  return {
    clientX,
    clientY,
    currentTarget: {
      width: canvas.width,
      height: canvas.height,
      getBoundingClientRect: () => canvas.rect,
    },
  }
}

describe('getCanvasCoords', () => {
  it('returns client coordinates relative to the rect when the canvas is not scaled', () => {
    const e = makeEvent(150, 120, {
      width: 800,
      height: 600,
      rect: { left: 0, top: 0, width: 800, height: 600 },
    })
    expect(getCanvasCoords(e)).toEqual({ x: 150, y: 120 })
  })

  it('subtracts the rect offset before scaling', () => {
    const e = makeEvent(150, 120, {
      width: 800,
      height: 600,
      rect: { left: 50, top: 20, width: 800, height: 600 },
    })
    expect(getCanvasCoords(e)).toEqual({ x: 100, y: 100 })
  })

  it('applies CSS scaling when the rendered size differs from the canvas size', () => {
    // Canvas is 800x600 internally but rendered at 400x300 (2x scale).
    const e = makeEvent(100, 90, {
      width: 800,
      height: 600,
      rect: { left: 0, top: 0, width: 400, height: 300 },
    })
    expect(getCanvasCoords(e)).toEqual({ x: 200, y: 180 })
  })

  it('falls back to scale 1 when the rect has zero width (no division by zero)', () => {
    const e = makeEvent(100, 100, {
      width: 800,
      height: 600,
      rect: { left: 0, top: 0, width: 0, height: 0 },
    })
    const { x, y } = getCanvasCoords(e)
    expect(x).toBe(100)
    expect(y).toBe(100)
    expect(Number.isFinite(x)).toBe(true)
    expect(Number.isFinite(y)).toBe(true)
  })

  it('guards each axis independently when only one dimension is zero', () => {
    const e = makeEvent(100, 100, {
      width: 800,
      height: 600,
      rect: { left: 0, top: 0, width: 400, height: 0 },
    })
    const { x, y } = getCanvasCoords(e)
    expect(x).toBe(200) // scaled by 800/400
    expect(y).toBe(100) // height guard -> scale 1
    expect(Number.isFinite(y)).toBe(true)
  })
})
