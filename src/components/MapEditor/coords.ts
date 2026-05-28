export interface CanvasPointerEvent {
  clientX: number
  clientY: number
  currentTarget: {
    width: number
    height: number
    getBoundingClientRect(): { left: number; top: number; width: number; height: number }
  }
}

/**
 * Convert a pointer event's client coordinates into canvas-pixel coordinates,
 * accounting for CSS scaling of the canvas element.
 *
 * Guards against a zero-sized bounding rect (e.g. before layout, or in jsdom):
 * without the guard `canvas.width / rect.width` becomes Infinity and every
 * derived coordinate turns into Infinity/NaN, which silently breaks node
 * hit-testing, selection, rubber-band selection, double-click and delete.
 */
export function getCanvasCoords(e: CanvasPointerEvent): { x: number; y: number } {
  const canvas = e.currentTarget
  const rect = canvas.getBoundingClientRect()
  const scaleX = rect.width ? canvas.width / rect.width : 1
  const scaleY = rect.height ? canvas.height / rect.height : 1
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}
