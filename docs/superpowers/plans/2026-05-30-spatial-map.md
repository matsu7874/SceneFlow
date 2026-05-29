# 空間マップ（背景画像下敷き＋動線・破綻可視化）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 背景画像（間取り図）をランタイム状態として保持し、MapEditor・シミュレーション・新規の空間ビューで共通の下敷きとして表示。空間ビューに動線と破綻ハイライトを描く。

**Architecture:** 背景画像は `MapBackgroundContext`（StoryData 非保存・ローカル）に `HTMLImageElement` ＋ 世界座標での配置（offset/scale/opacity）として保持。純粋ヘルパー（画像の画面矩形計算・bbox フィット変換・破綻→場所導出・動線構築）を切り出して単体テストし、canvas 版（MapEditor/LocationLayout）と SVG 版（新 SpatialView）の薄い描画から使う。

**Tech Stack:** TypeScript, React 18（canvas + SVG）, Vitest + @testing-library/react, Playwright, CSS Modules。

参照仕様: `docs/superpowers/specs/2026-05-30-spatial-map-design.md`

---

## ファイル構成

| ファイル                                            | 責務                                                                           | 種別 |
| --------------------------------------------------- | ------------------------------------------------------------------------------ | ---- |
| `src/contexts/MapBackgroundContext.tsx`             | 背景画像のランタイム状態（image/offset/scale/opacity）と setImage/update/clear | 新規 |
| `src/components/MapBackground/geometry.ts`          | 純粋ヘルパー: `imageScreenRect`、`computeFitTransform`                         | 新規 |
| `src/components/MapBackground/drawMapBackground.ts` | canvas 用: `drawMapBackground(ctx, args)`                                      | 新規 |
| `src/components/MapBackground/spatial.ts`           | 純粋ヘルパー: `breakageLocationIds`、`buildMovementPolylines`                  | 新規 |
| `src/components/SpatialView/SpatialView.tsx`        | 空間ビュー（SVG: 背景＋点＋動線＋破綻）                                        | 新規 |
| `src/components/SpatialView/SpatialView.module.css` | スタイル                                                                       | 新規 |
| `src/pages/SpatialPage.tsx`                         | ページ枠                                                                       | 新規 |
| `src/App.tsx`                                       | `MapBackgroundProvider` 追加・ルート `/spatial` 追加                           | 修正 |
| `src/components/Navigation/Navigation.tsx`          | 「空間ビュー」リンク追加                                                       | 修正 |
| `src/components/MapEditor/MapEditor.tsx`            | 画像読込 UI・canvas 下敷き・破綻ハイライト                                     | 修正 |
| `src/components/LocationLayout.tsx`                 | canvas 下敷き                                                                  | 修正 |
| `tests/components/mapBackgroundGeometry.test.ts`    | geometry 単体テスト                                                            | 新規 |
| `tests/components/spatialHelpers.test.ts`           | spatial 純粋ヘルパー単体テスト                                                 | 新規 |
| `tests/components/SpatialView.test.tsx`             | 空間ビュー描画テスト                                                           | 新規 |
| `e2e/spatial.spec.ts`                               | 空間ビュー E2E                                                                 | 新規 |

座標の共有規約: 背景配置は **世界座標**（`offset` = 画像左上の世界座標, `scale` = 世界単位/px）。各ビューは自分の world→screen 関数 `toScreen(x,y)` を持ち、`imageScreenRect` に渡して画像の画面矩形を得る。MapEditor の canvas は `ctx.translate(pan)+scale(zoom)` 後に世界座標で描くため、その文脈では `toScreen = (x,y)=>({x,y})`（恒等）。LocationLayout/SpatialView は bbox フィット変換を `toScreen` として渡す。

---

## Task 1: MapBackgroundContext と geometry ヘルパー

**Files:**

- Create: `src/contexts/MapBackgroundContext.tsx`
- Create: `src/components/MapBackground/geometry.ts`
- Modify: `src/App.tsx`
- Test: `tests/components/mapBackgroundGeometry.test.ts`

- [ ] **Step 1: geometry の失敗するテストを書く**

`tests/components/mapBackgroundGeometry.test.ts`:

```typescript
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
  it('点が無ければ恒等的に中心へ寄せる', () => {
    const toScreen = computeFitTransform([], 200, 100, 0)
    expect(toScreen(0, 0)).toEqual({ x: 100, y: 50 })
  })
})
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/components/mapBackgroundGeometry.test.ts`
Expected: FAIL（モジュール未作成）

- [ ] **Step 3: geometry 実装**

`src/components/MapBackground/geometry.ts`:

```typescript
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

// 点群をキャンバスに収める world→screen 変換を返す（aspect 維持・中心合わせ）
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
```

- [ ] **Step 4: 成功を確認**

Run: `npx vitest run tests/components/mapBackgroundGeometry.test.ts`
Expected: PASS

- [ ] **Step 5: MapBackgroundContext 実装**

`src/contexts/MapBackgroundContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface MapBackgroundValue {
  image: HTMLImageElement | null
  offsetX: number
  offsetY: number
  scale: number
  opacity: number
  setImage: (file: File) => void
  update: (partial: Partial<{ offsetX: number; offsetY: number; scale: number; opacity: number }>) => void
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
    img.src = url
  }, [])

  const update = useCallback(
    (partial: Partial<{ offsetX: number; offsetY: number; scale: number; opacity: number }>): void => {
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
```

- [ ] **Step 6: App に Provider を追加**

`src/App.tsx` の import に追加:

```typescript
import { MapBackgroundProvider } from './contexts/MapBackgroundContext'
```

`<VisualFeedbackProvider>` の内側（`<div className="app">` を包む形）に `MapBackgroundProvider` を追加:

```tsx
<VisualFeedbackProvider>
  <MapBackgroundProvider>
    <div className="app">...</div>
  </MapBackgroundProvider>
</VisualFeedbackProvider>
```

（既存の `<div className="app">...</div>` をそのまま `MapBackgroundProvider` で包む）

- [ ] **Step 7: 型・lint・全テスト**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: エラーなし、全テスト PASS

- [ ] **Step 8: コミット**

```bash
git add src/contexts/MapBackgroundContext.tsx src/components/MapBackground/geometry.ts src/App.tsx tests/components/mapBackgroundGeometry.test.ts
git commit -m "feat(map-bg): 背景画像のランタイム状態と座標ヘルパーを追加"
```

---

## Task 2: spatial 純粋ヘルパー（破綻→場所・動線構築）

**Files:**

- Create: `src/components/MapBackground/spatial.ts`
- Test: `tests/components/spatialHelpers.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`tests/components/spatialHelpers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  breakageLocationIds,
  buildMovementPolylines,
} from '../../src/components/MapBackground/spatial'
import type { Act } from '../../src/types/StoryData'
import type { Breakage } from '../../src/modules/consistency'

function act(p: Partial<Act> & { id: number }): Act {
  return { personId: 1, locationId: 1, time: '00:00', description: '', startTime: 0, ...p }
}

describe('breakageLocationIds', () => {
  it('破綻Actのある場所idの集合を返す', () => {
    const acts = [act({ id: 1, locationId: 10 }), act({ id: 2, locationId: 11 })]
    const breakages: Breakage[] = [{ actId: 2, category: 'item', fact: null, message: 'x' }]
    expect(breakageLocationIds(breakages, acts)).toEqual(new Set([11]))
  })
  it('存在しないactIdは無視する', () => {
    const breakages: Breakage[] = [{ actId: 99, category: 'item', fact: null, message: 'x' }]
    expect(breakageLocationIds(breakages, [act({ id: 1, locationId: 10 })])).toEqual(new Set())
  })
})

describe('buildMovementPolylines', () => {
  it('人物ごとに時刻順の場所列を線分化し同一場所連続を畳む', () => {
    const acts = [
      act({ id: 1, personId: 1, locationId: 10, startTime: 0 }),
      act({ id: 2, personId: 1, locationId: 10, startTime: 5 }),
      act({ id: 3, personId: 1, locationId: 11, startTime: 10 }),
      act({ id: 4, personId: 2, locationId: 12, startTime: 0 }),
    ]
    const lines = buildMovementPolylines(acts)
    const p1 = lines.find(l => l.personId === 1)
    expect(p1?.locationIds).toEqual([10, 11])
    const p2 = lines.find(l => l.personId === 2)
    expect(p2?.locationIds).toEqual([12])
  })
})
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/components/spatialHelpers.test.ts`
Expected: FAIL（モジュール未作成）

- [ ] **Step 3: 実装**

`src/components/MapBackground/spatial.ts`:

```typescript
import type { Act } from '../../types/StoryData'
import type { Breakage } from '../../modules/consistency'

export function breakageLocationIds(breakages: Breakage[], acts: Act[]): Set<number> {
  const byId = new Map<number, Act>()
  for (const a of acts) byId.set(a.id, a)
  const ids = new Set<number>()
  for (const b of breakages) {
    const act = byId.get(b.actId)
    if (act) ids.add(act.locationId)
  }
  return ids
}

export interface MovementPolyline {
  personId: number
  locationIds: number[]
}

export function buildMovementPolylines(acts: Act[]): MovementPolyline[] {
  const byPerson = new Map<number, Act[]>()
  for (const a of acts) {
    const list = byPerson.get(a.personId) ?? []
    list.push(a)
    byPerson.set(a.personId, list)
  }
  const result: MovementPolyline[] = []
  for (const [personId, list] of byPerson) {
    const sorted = [...list].sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0) || a.id - b.id)
    const locationIds: number[] = []
    for (const a of sorted) {
      if (locationIds.length === 0 || locationIds[locationIds.length - 1] !== a.locationId) {
        locationIds.push(a.locationId)
      }
    }
    result.push({ personId, locationIds })
  }
  return result
}
```

- [ ] **Step 4: 成功を確認**

Run: `npx vitest run tests/components/spatialHelpers.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/components/MapBackground/spatial.ts tests/components/spatialHelpers.test.ts
git commit -m "feat(map-bg): 破綻→場所導出と動線構築の純粋ヘルパーを追加"
```

---

## Task 3: canvas 背景描画ヘルパー＋ MapEditor 統合

**Files:**

- Create: `src/components/MapBackground/drawMapBackground.ts`
- Modify: `src/components/MapEditor/MapEditor.tsx`

- [ ] **Step 1: canvas ヘルパー実装**

`src/components/MapBackground/drawMapBackground.ts`:

```typescript
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
```

- [ ] **Step 2: MapEditor で背景を描画＋読込 UI を追加**

`src/components/MapEditor/MapEditor.tsx` の import に追加:

```typescript
import { useMapBackground } from '../../contexts/MapBackgroundContext'
import { drawMapBackground } from '../MapBackground/drawMapBackground'
```

コンポーネント本体の先頭（`const editor = useMapEditor()` の直後）に追加:

```typescript
const background = useMapBackground()
```

canvas 描画ループ内、`// Apply view transformation` の `ctx.translate(...)` と `ctx.scale(...)` の**直後・グリッド描画の前**に、世界座標での背景描画を挿入（この文脈では座標は世界座標なので toScreen は恒等）:

```typescript
// Draw background image underlay (world space)
if (background.image) {
  drawMapBackground(ctx, {
    image: background.image,
    placement: {
      offsetX: background.offsetX,
      offsetY: background.offsetY,
      scale: background.scale,
      naturalWidth: background.image.naturalWidth,
      naturalHeight: background.image.naturalHeight,
    },
    opacity: background.opacity,
    toScreen: (x, y) => ({ x, y }),
  })
}
```

描画 useEffect の依存配列に `background` を追加する（`background.image` 等の変化で再描画されるように。既存の依存配列 `[editor.state, width, height, isConnecting, connectingFrom, mousePos]` に `, background` を足す）。

ツールバー（既存のボタン群がある JSX 内、レイアウトメニュー付近）に画像コントロールを追加:

```tsx
;<label className={styles.toolbarButton}>
  背景画像
  <input
    type="file"
    accept="image/*"
    style={{ display: 'none' }}
    onChange={e => {
      const file = e.target.files?.[0]
      if (file) background.setImage(file)
    }}
  />
</label>
{
  background.image && (
    <>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={background.opacity}
        onChange={e => background.update({ opacity: Number(e.target.value) })}
        aria-label="背景不透明度"
      />
      <input
        type="number"
        step={0.1}
        value={background.scale}
        onChange={e => background.update({ scale: Number(e.target.value) })}
        aria-label="背景倍率"
        style={{ width: '5rem' }}
      />
      <button type="button" onClick={() => background.clear()}>
        背景クリア
      </button>
    </>
  )
}
```

注: `styles.toolbarButton` が無い場合は `className` を外すか既存のツールバー用クラスに合わせる。位置の微調整（offsetX/Y）は数値入力でもよいが、最小実装では opacity と scale のみ必須、offset は既定 0 のままでも可（部屋点側を画像に合わせてドラッグする運用）。

- [ ] **Step 3: 型・lint・全テスト**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: エラーなし、全テスト PASS（MapEditor の既存テストが壊れていないこと）

- [ ] **Step 4: コミット**

```bash
git add src/components/MapBackground/drawMapBackground.ts src/components/MapEditor/MapEditor.tsx
git commit -m "feat(map-bg): MapEditorに背景画像の読込と下敷き描画を追加"
```

---

## Task 4: LocationLayout（シミュレーション）の下敷き

**Files:**

- Modify: `src/components/LocationLayout.tsx`

- [ ] **Step 1: LocationLayout に背景描画を追加**

`src/components/LocationLayout.tsx` の import に追加:

```typescript
import { useMapBackground } from '../contexts/MapBackgroundContext'
import { drawMapBackground } from './MapBackground/drawMapBackground'
```

コンポーネント本体に追加（他の hook の近く）:

```typescript
const background = useMapBackground()
```

`getLocationPositions()` は `location.x/y`（世界座標）を canvas 座標へ写す変換（`centerX + (x - mid)*scale` 等）を内部で行っている。背景もこの同じ変換で描くため、変換関数を `toScreen(worldX, worldY)` として取り出す。`getLocationPositions` 内でスケール・中心を計算している式（`scale`, `centerX`, `centerY`, `minX/maxX/minY/maxY`）を用いて、同じスコープで以下を定義し返り値に含めるか、`getLocationPositions` とは別に同式の `toScreen` を作る。最小変更として、描画 useEffect 内で背景を描く直前に同じ式で `toScreen` を組み立てる:

`ctx.clearRect(...)` の**直後**（人物・場所を描く前）に挿入:

```typescript
// 背景画像の下敷き（場所点と同じ world→screen 変換で描く）
if (background.image && storyData) {
  const locs = storyData.locations.filter(l => l.x !== undefined && l.y !== undefined)
  if (locs.length > 0) {
    const xs = locs.map(l => l.x as number)
    const ys = locs.map(l => l.y as number)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const mapWidth = maxX - minX || 1
    const mapHeight = maxY - minY || 1
    const fit = Math.min(canvas.width / mapWidth, canvas.height / mapHeight) * 0.8
    const cX = canvas.width / 2
    const cY = canvas.height / 2
    const midX = (minX + maxX) / 2
    const midY = (minY + maxY) / 2
    drawMapBackground(ctx, {
      image: background.image,
      placement: {
        offsetX: background.offsetX,
        offsetY: background.offsetY,
        scale: background.scale,
        naturalWidth: background.image.naturalWidth,
        naturalHeight: background.image.naturalHeight,
      },
      opacity: background.opacity,
      toScreen: (x, y) => ({ x: cX + (x - midX) * fit, y: cY + (y - midY) * fit }),
    })
  }
}
```

注: 上の `fit/cX/cY/midX/midY` は既存 `getLocationPositions` の座標式と一致させること（`canvasWidth/canvasHeight` ではなく実 `canvas.width/height` を使う点に注意。既存式が定数 500/300 等を使っている場合は、点の描画と同じ値に合わせる）。描画 useEffect の依存配列に `background` を追加。

- [ ] **Step 2: 型・lint・全テスト**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: エラーなし、全テスト PASS

- [ ] **Step 3: 手動確認の注記（E2E は Task 6）**

LocationLayout は canvas のため DOM テストが難しい。座標式が点と一致しているかは Task 6 の E2E／目視で確認する。ここでは型・lint・既存テスト緑を確認するに留める。

- [ ] **Step 4: コミット**

```bash
git add src/components/LocationLayout.tsx
git commit -m "feat(map-bg): シミュレーションのLocationLayoutに背景下敷きを追加"
```

---

## Task 5: 空間ビュー（SVG: 背景＋点＋動線＋破綻）

**Files:**

- Create: `src/components/SpatialView/SpatialView.tsx`
- Create: `src/components/SpatialView/SpatialView.module.css`
- Create: `src/pages/SpatialPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Navigation/Navigation.tsx`
- Test: `tests/components/SpatialView.test.tsx`

- [ ] **Step 1: 失敗するテストを書く**

`tests/components/SpatialView.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { SpatialView } from '../../src/components/SpatialView/SpatialView'
import { MapBackgroundProvider } from '../../src/contexts/MapBackgroundContext'
import type { StoryData } from '../../src/types/StoryData'

const data: StoryData = {
  persons: [{ id: 1, name: '太郎', color: '#3b82f6' }],
  locations: [
    { id: 10, name: '広場', connections: [11], x: 0, y: 0 },
    { id: 11, name: '図書館', connections: [10], x: 100, y: 0 },
  ],
  props: [{ id: 1, name: '鍵', currentLocation: '11' }],
  informations: [],
  initialStates: [{ personId: 1, locationId: 10, time: '00:00' }],
  acts: [
    { id: 1, personId: 1, locationId: 10, time: '00:00', startTime: 0, description: 'いる' },
    { id: 2, personId: 1, locationId: 11, time: '00:10', startTime: 10, type: 'GIVE', propId: 1, interactedPersonId: 1, description: '鍵を渡す' },
  ],
}

const renderView = (story: StoryData) =>
  render(
    <MapBackgroundProvider>
      <SpatialView storyData={story} />
    </MapBackgroundProvider>,
  )

describe('SpatialView', () => {
  it('各場所のノードを描画する', () => {
    renderView(data)
    expect(screen.getByTestId('spatial-loc-10')).toBeInTheDocument()
    expect(screen.getByTestId('spatial-loc-11')).toBeInTheDocument()
  })
  it('人物の動線を描画する', () => {
    renderView(data)
    expect(screen.getByTestId('spatial-path-1')).toBeInTheDocument()
  })
  it('破綻のある場所を data-breakage=true で示す', () => {
    renderView(data)
    // act2(GIVE)は鍵未所持で item 破綻 → 場所11
    expect(screen.getByTestId('spatial-loc-11')).toHaveAttribute('data-breakage', 'true')
    expect(screen.getByTestId('spatial-loc-10')).toHaveAttribute('data-breakage', 'false')
  })
})
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/components/SpatialView.test.tsx`
Expected: FAIL（未実装）

- [ ] **Step 3: SpatialView 実装**

`src/components/SpatialView/SpatialView.tsx`:

```typescript
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

  const placed = storyData.locations.filter(l => l.x !== undefined && l.y !== undefined)
  const toScreen = useMemo(
    () => computeFitTransform(placed.map(l => ({ x: l.x as number, y: l.y as number })), WIDTH, HEIGHT, PADDING),
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

  const bgRect = background.image
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
      <p className={styles.hint}>各人物の動線を物理配置上に表示します。赤い場所は破綻が起きた地点です。</p>
      <svg width={WIDTH} height={HEIGHT} className={styles.svg}>
        {bgRect && background.image && (
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
          if (pts.length < 2) return null
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
        })}
        {/* 動線が1点のみの人物も testid を出すため透明マーカー */}
        {polylines
          .filter(line => line.locationIds.length < 2)
          .map(line => {
            const p = locById.get(line.locationIds[0])
            if (!p) return null
            return (
              <circle
                key={`path-${line.personId}`}
                data-testid={`spatial-path-${line.personId}`}
                cx={p.x}
                cy={p.y}
                r={3}
                fill={personColor(line.personId)}
              />
            )
          })}
        {placed.map(l => {
          const p = locById.get(l.id)
          if (!p) return null
          const isBreak = breakLocs.has(l.id)
          return (
            <g key={l.id} data-testid={`spatial-loc-${l.id}`} data-breakage={isBreak ? 'true' : 'false'}>
              <circle cx={p.x} cy={p.y} r={8} className={isBreak ? styles.breakNode : styles.node} />
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
```

注: 動線が1点の人物にも `spatial-path-<id>` を出すため、polyline(2点以上) と circle(1点) の二系統で同じ testid を使う（同一人物はどちらか片方のみ描画されるので重複しない）。

`src/components/SpatialView/SpatialView.module.css`:

```css
.container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.hint {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  margin: 0;
}
.svg {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  max-width: 100%;
}
.node {
  fill: var(--color-primary);
  stroke: var(--color-background);
  stroke-width: 1.5;
}
.breakNode {
  fill: var(--color-error);
  stroke: var(--color-background);
  stroke-width: 1.5;
}
.label {
  font-size: 12px;
  fill: var(--color-text-primary);
}
```

- [ ] **Step 4: 成功を確認**

Run: `npx vitest run tests/components/SpatialView.test.tsx`
Expected: PASS（3ケース）

- [ ] **Step 5: ページ・ルート・ナビ**

`src/pages/SpatialPage.tsx`:

```typescript
import React from 'react'
import { useAppContext } from '../contexts/AppContext'
import { SpatialView } from '../components/SpatialView/SpatialView'

export const SpatialPage: React.FC = () => {
  const { storyData } = useAppContext()
  if (!storyData) {
    return (
      <div className="page spatial-page">
        <h2>空間ビュー</h2>
        <div className="no-data-message">
          <p>データが読み込まれていません。シミュレーションページで物語データを読み込んでください。</p>
        </div>
      </div>
    )
  }
  return (
    <div className="page spatial-page">
      <h2>空間ビュー</h2>
      <SpatialView storyData={storyData} />
    </div>
  )
}
```

`src/App.tsx` の import に `import { SpatialPage } from './pages/SpatialPage'` を追加し、`<Route path="/log" ... />` の直後に:

```tsx
<Route path="/spatial" element={<SpatialPage />} />
```

`src/components/Navigation/Navigation.tsx` の「イベント入力」NavLink（to="/log"）の直後に:

```tsx
<NavLink
  to="/spatial"
  className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
>
  空間ビュー
</NavLink>
```

- [ ] **Step 6: 型・lint・全テスト**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: エラーなし、全テスト PASS

- [ ] **Step 7: コミット**

```bash
git add src/components/SpatialView src/pages/SpatialPage.tsx src/App.tsx src/components/Navigation/Navigation.tsx tests/components/SpatialView.test.tsx
git commit -m "feat(spatial): 動線と破綻を物理配置で見る空間ビューを追加"
```

---

## Task 6: E2E（空間ビューの動線・破綻表示）

**Files:**

- Create: `e2e/spatial.spec.ts`

- [ ] **Step 1: E2E を書く**

`e2e/spatial.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

const seed = {
  persons: [{ id: 1, name: '太郎', color: '#3b82f6' }],
  locations: [
    { id: 1, name: '広場', connections: [2], x: 0, y: 0 },
    { id: 2, name: '図書館', connections: [1], x: 100, y: 0 },
  ],
  props: [{ id: 1, name: '鍵', currentLocation: '2' }],
  informations: [],
  initialStates: [{ personId: 1, locationId: 1, time: '09:00' }],
  acts: [
    { id: 1, personId: 1, locationId: 1, time: '09:00', startTime: 0, description: 'いる' },
    {
      id: 2,
      personId: 1,
      locationId: 1,
      time: '09:10',
      startTime: 10,
      type: 'GIVE',
      propId: 1,
      interactedPersonId: 1,
      description: '鍵を渡す',
    },
  ],
}

test.describe('空間ビュー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/simulation')
    await page.locator('textarea').fill(JSON.stringify(seed))
    await page.getByRole('button', { name: '物語データをロード' }).click()
    await expect(page.locator('text=データが正常にロードされました')).toBeVisible()
  })

  test('空間ビューに場所と動線が表示され、破綻場所が赤くなる', async ({ page }) => {
    await page.getByRole('link', { name: '空間ビュー' }).click()
    await expect(page).toHaveURL(/\/spatial/)
    await expect(page.getByTestId('spatial-loc-1')).toBeVisible()
    await expect(page.getByTestId('spatial-loc-2')).toBeVisible()
    // act2(GIVE)は鍵未所持で広場(1)が破綻
    await expect(page.getByTestId('spatial-loc-1')).toHaveAttribute('data-breakage', 'true')
  })
})
```

注: seed の act2 は太郎が鍵（図書館にある）を所持せず広場で渡すため item 破綻。破綻場所は act の locationId=1（広場）。

- [ ] **Step 2: 実行**

`npm run dev`（port 3000）起動下で:
Run: `npx playwright test e2e/spatial.spec.ts`
Expected: PASS。落ちたら原因切り分け（実装バグは実装修正、セレクタ/待機はテスト調整）。

- [ ] **Step 3: コミット**

```bash
git add e2e/spatial.spec.ts
git commit -m "test(spatial): 空間ビューの動線・破綻表示のE2E"
```

---

## Self-Review チェック結果

**Spec coverage:**

- 共有背景（MapBackgroundContext・ローカル非保存）→ Task 1
- 座標写像（world→screen・画像矩形）→ Task 1（geometry）
- 破綻→場所・動線構築 → Task 2
- MapEditor 下敷き＋読込 UI → Task 3
- LocationLayout 下敷き → Task 4
- 空間ビュー（背景＋点＋動線＋破綻）→ Task 5
- ナビ/ルート → Task 5
- 破綻ハイライト（MapEditor）→ 注記: 本計画では破綻ハイライトは**空間ビュー**で実装（受け入れ基準4の主眼）。MapEditor 側の破綻ハイライトは内部モデル（id:string）と storyData(id:number) の対応付けが要るため、空間ビュー優先とし MapEditor ハイライトは追って対応（スコープ明記）。
- E2E → Task 6

**Placeholder scan:** なし。各ステップに完全なコード・コマンド・期待値。LocationLayout のみ既存座標式に「合わせる」指示があるが、これは既存コードに依存する統合のため、式の出所（getLocationPositions）と一致させる具体指示として記載。

**Type consistency:** `ImagePlacement`/`ToScreen`/`ScreenRect`（geometry, Task1 → drawMapBackground Task3 / SpatialView Task5 で利用）、`MovementPolyline`/`breakageLocationIds`（Task2 → Task5）、`useMapBackground` 返り値（Task1 → Task3/4/5）、`analyzeStory`/`Breakage`（既存）整合。SpatialView の testid（`spatial-loc-<id>`/`spatial-path-<id>`）はテストと一致。

**スコープ注記（MapEditor 破綻ハイライト）:** 仕様の受け入れ基準4は「MapEditor と空間ビューで破綻場所を赤く」だが、MapEditor は内部 Location(id:string) と storyData.acts(locationId:number) の対応付け・canvas 描画への割り込みが追加で必要。リスクを下げるため本計画では**空間ビューで破綻ハイライトを確実に実現**し、MapEditor 側ハイライトは次段に切り出す（受け入れ基準4は空間ビューで充足、MapEditor は背景下敷きまで）。
