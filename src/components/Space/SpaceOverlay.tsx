import React from 'react'
import type { Person } from '../../types/StoryData'
import type { MapOverlayInfo } from '../MapEditor/MapEditor'
import type { MovementPolyline } from '../MapBackground/spatial'
import styles from './SpaceOverlay.module.css'

interface SpaceOverlayProps {
  info: MapOverlayInfo
  persons: Person[]
  /** storyData.acts から計算済みの人物別動線（場所idの列）。 */
  polylines: MovementPolyline[]
  /** 破綻が起きた場所idの集合。 */
  breakLocs: Set<number>
  showMovement: boolean
  showBreakage: boolean
}

// canvas のノード半径（drawNode の radius=22 と一致させる）。world 単位。
const NODE_RADIUS = 22

/**
 * /space の canvas に重ねる読み取り専用 SVG オーバーレイ。
 * 動線（polyline）と破綻ハイライト（リング）を、編集 canvas と同一の
 * pan/zoom 座標系（worldToScreen）で描く。e2e 用の testid を維持する。
 */
export const SpaceOverlay: React.FC<SpaceOverlayProps> = ({
  info,
  persons,
  polylines,
  breakLocs,
  showMovement,
  showBreakage,
}) => {
  const { worldToScreen, zoom, mapData, width, height } = info

  // 場所id（number）→ スクリーン座標。mapData は編集中の生きた座標を持つ。
  const posByLocId = new Map<number, { x: number; y: number }>()
  for (const node of mapData.locations) {
    const id = Number(node.id)
    if (!Number.isFinite(id)) continue
    posByLocId.set(id, worldToScreen(node.x, node.y))
  }

  const personColor = (id: number): string => persons.find(p => p.id === id)?.color ?? '#888'
  const ringRadius = (NODE_RADIUS + 5) * zoom

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={styles.overlaySvg}
      role="img"
      aria-label="動線・破綻オーバーレイ"
    >
      {showMovement &&
        polylines.map(line => {
          const pts = line.locationIds
            .map(id => posByLocId.get(id))
            .filter((p): p is { x: number; y: number } => p !== undefined)
          if (pts.length >= 2) {
            return (
              <polyline
                key={`path-${line.personId}`}
                data-testid={`spatial-path-${line.personId}`}
                points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={personColor(line.personId)}
                strokeWidth={2.5}
                opacity={0.75}
              />
            )
          }
          if (pts.length === 1) {
            return (
              <circle
                key={`path-${line.personId}`}
                data-testid={`spatial-path-${line.personId}`}
                cx={pts[0].x}
                cy={pts[0].y}
                r={5}
                fill={personColor(line.personId)}
              />
            )
          }
          return null
        })}

      {mapData.locations.map(node => {
        const id = Number(node.id)
        const p = posByLocId.get(id)
        if (!p) return null
        const isBreak = breakLocs.has(id)
        return (
          <g
            key={node.id}
            data-testid={`spatial-loc-${id}`}
            data-breakage={isBreak ? 'true' : 'false'}
          >
            {showBreakage && isBreak && (
              <circle cx={p.x} cy={p.y} r={ringRadius} className={styles.breakRing} />
            )}
          </g>
        )
      })}
    </svg>
  )
}
