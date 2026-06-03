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

  // 動線に登場する人物のみ凡例に表示
  const legendPersons = useMemo(() => {
    const ids = new Set(polylines.map(l => l.personId))
    return storyData.persons.filter(p => ids.has(p.id))
  }, [storyData.persons, polylines])

  const hasBreakage = breakLocs.size > 0

  return (
    <div className={styles.spatialRoot}>
      {/* 凡例 */}
      <div className={styles.legend} aria-label="凡例">
        <span className={styles.legendLabel}>凡例</span>
        <div className={styles.legendItems}>
          {legendPersons.length === 0 ? (
            <span className={styles.legendEmpty}>人物の動線なし</span>
          ) : (
            legendPersons.map(p => (
              <span key={p.id} className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: p.color }}
                  aria-hidden="true"
                />
                {p.name}
              </span>
            ))
          )}
        </div>
        {hasBreakage && (
          <span className={styles.legendDanger}>
            <span className={styles.legendDangerDot} aria-hidden="true" />
            破綻地点
          </span>
        )}
      </div>

      {/* SVG キャンバス */}
      <div className={styles.svgWrap}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className={styles.svg}
          role="img"
          aria-label="空間動線ビュー"
        >
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
                <text
                  x={p.x + 12}
                  y={p.y + 4}
                  className={isBreak ? styles.labelBreak : styles.label}
                >
                  {l.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* 配置済み場所がない場合の空状態 */}
      {placed.length === 0 && (
        <div className={styles.empty} role="status">
          <span className={styles.emptyMark} aria-hidden="true">
            🗺️
          </span>
          <p className={styles.emptyTitle}>場所が配置されていません</p>
          <p className={styles.emptyHint}>
            マップエディタで場所に座標を設定すると、ここに動線が表示されます。
          </p>
        </div>
      )}
    </div>
  )
}
