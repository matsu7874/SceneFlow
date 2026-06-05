import type { Act, Location } from '../../types/StoryData'
import type { Breakage } from '../../modules/consistency'

const LAYOUT_WIDTH = 800
const LAYOUT_HEIGHT = 600
const LAYOUT_MARGIN = 40

/**
 * 各場所に描画用のワールド座標を割り当てる。
 *
 * すべての場所が x/y を持つ場合はそのまま使う（マップエディタで配置した地図を尊重）。
 * 一部でも座標が欠けている場合は、接続関係から力学的レイアウトを計算して補完する。
 * これにより、JSONインポートや座標未設定のサンプルでも空間ビューが空にならない。
 *
 * 既に座標を持つ場所は初期位置として固定（pinned）し、未配置の場所だけを
 * その周囲に落ち着かせるため、手配置済みの地図を壊さない。
 * 乱数を使わず初期配置を円形にするため、同じ入力からは常に同じ結果になる（決定的）。
 */
export function resolveLocationPositions(
  locations: Location[],
): Map<number, { x: number; y: number }> {
  const result = new Map<number, { x: number; y: number }>()
  if (locations.length === 0) return result

  const hasCoord = (l: Location): boolean => l.x !== undefined && l.y !== undefined
  if (locations.every(hasCoord)) {
    for (const l of locations) result.set(l.id, { x: l.x as number, y: l.y as number })
    return result
  }

  const cx = LAYOUT_WIDTH / 2
  const cy = LAYOUT_HEIGHT / 2
  const radius = Math.min(LAYOUT_WIDTH, LAYOUT_HEIGHT) / 2 - LAYOUT_MARGIN * 2

  interface LayoutNode {
    id: number
    x: number
    y: number
    vx: number
    vy: number
    pinned: boolean
  }
  const nodes: LayoutNode[] = locations.map((l, i) => {
    const angle = (2 * Math.PI * i) / locations.length
    return {
      id: l.id,
      x: hasCoord(l) ? (l.x as number) : cx + radius * Math.cos(angle),
      y: hasCoord(l) ? (l.y as number) : cy + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
      pinned: hasCoord(l),
    }
  })
  const byId = new Map(nodes.map(n => [n.id, n]))

  // 接続を無向エッジ集合に正規化（重複除去・存在しない接続先は無視）。
  const edges: Array<[number, number]> = []
  const seen = new Set<string>()
  for (const l of locations) {
    for (const to of l.connections ?? []) {
      if (!byId.has(to) || to === l.id) continue
      const key = l.id < to ? `${l.id}-${to}` : `${to}-${l.id}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push([l.id, to])
    }
  }

  const k = Math.sqrt((LAYOUT_WIDTH * LAYOUT_HEIGHT) / nodes.length)
  // 場所数が多い場合は反復回数を抑えて描画コストを制御する。
  const iterations = nodes.length > 120 ? 60 : 200
  for (let iter = 0; iter < iterations; iter++) {
    // 斥力（全ペア）
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        const rep = (k * k) / dist
        const fx = (dx / dist) * rep
        const fy = (dy / dist) * rep
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }
    }
    // 引力（接続されたノード間）
    for (const [from, to] of edges) {
      const a = byId.get(from)
      const b = byId.get(to)
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
      const att = (dist * dist) / k
      const fx = (dx / dist) * att * 0.1
      const fy = (dy / dist) * att * 0.1
      a.vx += fx
      a.vy += fy
      b.vx -= fx
      b.vy -= fy
    }
    for (const n of nodes) {
      if (n.pinned) {
        n.vx = 0
        n.vy = 0
        continue
      }
      n.x += n.vx * 0.1
      n.y += n.vy * 0.1
      n.x = Math.max(LAYOUT_MARGIN, Math.min(LAYOUT_WIDTH - LAYOUT_MARGIN, n.x))
      n.y = Math.max(LAYOUT_MARGIN, Math.min(LAYOUT_HEIGHT - LAYOUT_MARGIN, n.y))
      n.vx *= 0.85
      n.vy *= 0.85
    }
  }
  for (const n of nodes) result.set(n.id, { x: n.x, y: n.y })
  return result
}

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
