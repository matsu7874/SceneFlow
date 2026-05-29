import React, { useMemo } from 'react'
import type { StoryData } from '../../types/StoryData'
import { analyzeStory } from '../../modules/consistency'
import { useMapBackground } from '../../contexts/MapBackgroundContext'
import { computeFitTransform, imageScreenRect } from '../MapBackground/geometry'
import { breakageLocationIds, buildMovementPolylines } from '../MapBackground/spatial'
import styles from './SpatialView.module.css'

interface SpatialViewProps {
  storyData: StoryData
}

const WIDTH = 800
const HEIGHT = 600
const PADDING = 60

export const SpatialView: React.FC<SpatialViewProps> = ({ storyData }) => {
  const background = useMapBackground()
  const report = useMemo(() => analyzeStory(storyData), [storyData])

  const placed = useMemo(
    () => storyData.locations.filter(l => l.x !== undefined && l.y !== undefined),
    [storyData.locations],
  )
  const toScreen = useMemo(
    () =>
      computeFitTransform(
        placed.map(l => ({ x: l.x as number, y: l.y as number })),
        WIDTH,
        HEIGHT,
        PADDING,
      ),
    [placed],
  )

  const locById = useMemo(() => {
    const m = new Map<number, { x: number; y: number }>()
    for (const l of placed) m.set(l.id, toScreen(l.x as number, l.y as number))
    return m
  }, [placed, toScreen])

  const breakLocs = useMemo(
    () => breakageLocationIds(report.breakages, storyData.acts),
    [report, storyData.acts],
  )
  const polylines = useMemo(() => buildMovementPolylines(storyData.acts), [storyData.acts])

  const personColor = (id: number): string =>
    storyData.persons.find(p => p.id === id)?.color ?? '#888'

  const bgRect =
    background.image !== null
      ? imageScreenRect(
          {
            offsetX: background.offsetX,
            offsetY: background.offsetY,
            scale: background.scale,
            naturalWidth: background.image.naturalWidth,
            naturalHeight: background.image.naturalHeight,
          },
          toScreen,
        )
      : null

  return (
    <div className={styles.container}>
      <p className={styles.hint}>
        各人物の動線を物理配置上に表示します。赤い場所は破綻が起きた地点です。
      </p>
      <svg width={WIDTH} height={HEIGHT} className={styles.svg}>
        {bgRect !== null && background.image !== null && (
          <image
            href={background.image.src}
            x={bgRect.x}
            y={bgRect.y}
            width={bgRect.width}
            height={bgRect.height}
            opacity={background.opacity}
            preserveAspectRatio="none"
          />
        )}
        {polylines.map(line => {
          const pts = line.locationIds
            .map(id => locById.get(id))
            .filter((p): p is { x: number; y: number } => p !== undefined)
          if (pts.length >= 2) {
            return (
              <polyline
                key={`path-${line.personId}`}
                data-testid={`spatial-path-${line.personId}`}
                points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={personColor(line.personId)}
                strokeWidth={2}
                opacity={0.7}
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
                r={3}
                fill={personColor(line.personId)}
              />
            )
          }
          return null
        })}
        {placed.map(l => {
          const p = locById.get(l.id)
          if (!p) return null
          const isBreak = breakLocs.has(l.id)
          return (
            <g
              key={l.id}
              data-testid={`spatial-loc-${l.id}`}
              data-breakage={isBreak ? 'true' : 'false'}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={8}
                className={isBreak ? styles.breakNode : styles.node}
              />
              <text x={p.x + 12} y={p.y + 4} className={styles.label}>
                {l.name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
