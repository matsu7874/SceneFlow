import { describe, it, expect } from 'vitest'
import { imageScreenRect, computeFitTransform } from '../../src/components/MapBackground/geometry'

describe('imageScreenRect', () => {
  it('恒等変換では offset と naturalSize*scale をそのまま返す', () => {
    const rect = imageScreenRect(
      { offsetX: 10, offsetY: 20, scale: 2, naturalWidth: 100, naturalHeight: 50 },
      (x, y) => ({ x, y }),
    )
    expect(rect).toEqual({ x: 10, y: 20, width: 200, height: 100 })
  })
  it('toScreen の拡大・平行移動を反映する', () => {
    const rect = imageScreenRect(
      { offsetX: 0, offsetY: 0, scale: 1, naturalWidth: 10, naturalHeight: 10 },
      (x, y) => ({ x: x * 3 + 5, y: y * 3 + 7 }),
    )
    expect(rect).toEqual({ x: 5, y: 7, width: 30, height: 30 })
  })
})

describe('computeFitTransform', () => {
  it('点群の中心をキャンバス中心に写す', () => {
    const toScreen = computeFitTransform(
      [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ],
      200,
      200,
      0,
    )
    expect(toScreen(50, 50)).toEqual({ x: 100, y: 100 })
  })
  it('点が1つでも中心に写る（ゼロ割回避）', () => {
    const toScreen = computeFitTransform([{ x: 5, y: 5 }], 200, 100, 0)
    expect(toScreen(5, 5)).toEqual({ x: 100, y: 50 })
  })
  it('点が無ければ中心へ寄せる', () => {
    const toScreen = computeFitTransform([], 200, 100, 0)
    expect(toScreen(0, 0)).toEqual({ x: 100, y: 50 })
  })
})
