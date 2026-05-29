export interface ScreenPoint {
  x: number
  y: number
}

export type ToScreen = (x: number, y: number) => ScreenPoint

export interface ImagePlacement {
  offsetX: number
  offsetY: number
  scale: number
  naturalWidth: number
  naturalHeight: number
}

export interface ScreenRect {
  x: number
  y: number
  width: number
  height: number
}

export function imageScreenRect(p: ImagePlacement, toScreen: ToScreen): ScreenRect {
  const tl = toScreen(p.offsetX, p.offsetY)
  const br = toScreen(p.offsetX + p.naturalWidth * p.scale, p.offsetY + p.naturalHeight * p.scale)
  return { x: tl.x, y: tl.y, width: br.x - tl.x, height: br.y - tl.y }
}

export function computeFitTransform(
  points: ScreenPoint[],
  width: number,
  height: number,
  padding: number,
): ToScreen {
  const cx = width / 2
  const cy = height / 2
  if (points.length === 0) {
    return () => ({ x: cx, y: cy })
  }
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const pt of points) {
    minX = Math.min(minX, pt.x)
    maxX = Math.max(maxX, pt.x)
    minY = Math.min(minY, pt.y)
    maxY = Math.max(maxY, pt.y)
  }
  const spanX = maxX - minX
  const spanY = maxY - minY
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  const usableW = Math.max(1, width - padding * 2)
  const usableH = Math.max(1, height - padding * 2)
  const scale =
    spanX === 0 && spanY === 0 ? 1 : Math.min(usableW / (spanX || 1), usableH / (spanY || 1))
  return (x, y) => ({ x: cx + (x - midX) * scale, y: cy + (y - midY) * scale })
}
