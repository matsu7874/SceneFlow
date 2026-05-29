import { imageScreenRect, type ImagePlacement, type ToScreen } from './geometry'

interface DrawArgs {
  image: HTMLImageElement | null
  placement: ImagePlacement
  opacity: number
  toScreen: ToScreen
}

export function drawMapBackground(ctx: CanvasRenderingContext2D, args: DrawArgs): void {
  const { image, placement, opacity, toScreen } = args
  if (!image) return
  const rect = imageScreenRect(placement, toScreen)
  const prevAlpha = ctx.globalAlpha
  ctx.globalAlpha = opacity
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height)
  ctx.globalAlpha = prevAlpha
}
