import type { StoryData, Location as StoryLocation } from '../../types/StoryData'
import type { Location as MapLocation, Connection, MapData } from './types'
import { resolveLocationPositions } from '../MapBackground/spatial'

// 座標解決に失敗した場合のグリッド状フォールバック（決定的）。
const fallbackX = (index: number): number => 200 + (index % 3) * 200
const fallbackY = (index: number): number => 200 + Math.floor(index / 3) * 150

/**
 * StoryData.locations を MapEditor 内部の MapData（id:string）へ変換する。
 *
 * 座標は resolveLocationPositions で解決する（既に座標を持つ場所はそのまま固定し、
 * 未設定の場所だけ接続関係から力学的に決定的配置する）。これにより座標なしデータでも
 * 綺麗な初期レイアウトになる。description は表示用に引き継ぐ。
 * 接続は無向エッジとして重複除去し、双方向接続として表現する。
 */
export function storyDataToMapEditor(storyData: StoryData): MapData {
  const positions = resolveLocationPositions(storyData.locations)
  const locations: MapLocation[] = storyData.locations.map((loc, index) => {
    const p = positions.get(loc.id) ?? { x: fallbackX(index), y: fallbackY(index) }
    return {
      id: String(loc.id),
      name: loc.name,
      x: p.x,
      y: p.y,
      description: loc.description ?? '',
      tags: [],
    }
  })

  const connections: Connection[] = []
  const seen = new Set<string>()
  for (const loc of storyData.locations) {
    for (const targetId of loc.connections ?? []) {
      const key = `${Math.min(loc.id, targetId)}-${Math.max(loc.id, targetId)}`
      if (seen.has(key)) continue
      seen.add(key)
      connections.push({
        from: String(loc.id),
        to: String(targetId),
        weight: 1,
        bidirectional: true,
      })
    }
  }

  return { locations, connections }
}

/**
 * MapEditor の MapData を StoryData.locations へ非破壊マージで書き戻す。
 *
 * 既存 Location の付帯フィールド（type/capacity/travelTime/color/description/aliases/properties）は
 * 保全し、name・x・y・connections のみ上書きする。場所の詳細編集はエンティティ編集に集約する設計のため、
 * ここでそれらを破棄しないことが重要（旧 handleMapSave の破壊的変換を是正）。
 *
 * id マッピングは元データから安全に逆引きする（parseInt の盲信を避ける）。
 * MapEditor が採番した新規ノードは、既存 id と衝突しない数値 id を割り当てる。
 */
export function mapEditorToStoryData(mapData: MapData, prev: StoryData): StoryData {
  // 既存 Location を文字列 id でルックアップ
  const prevById = new Map<string, StoryLocation>()
  for (const loc of prev.locations) prevById.set(String(loc.id), loc)

  // 新規ノード採番の起点（既存・MapEditor 双方の数値 id の最大値 + 1）
  let maxId = 0
  for (const loc of prev.locations) maxId = Math.max(maxId, loc.id)
  for (const node of mapData.locations) {
    const n = Number(node.id)
    if (Number.isFinite(n)) maxId = Math.max(maxId, n)
  }

  // MapEditor の文字列 id → StoryData の数値 id
  const idMap = new Map<string, number>()
  let nextId = maxId + 1
  for (const node of mapData.locations) {
    const existing = prevById.get(node.id)
    if (existing) {
      idMap.set(node.id, existing.id)
    } else {
      const n = Number(node.id)
      idMap.set(node.id, Number.isInteger(n) && n > 0 ? n : nextId++)
    }
  }

  // 接続を数値 id ベースの無向集合へ
  const connById = new Map<number, Set<number>>()
  for (const node of mapData.locations) {
    connById.set(idMap.get(node.id) as number, new Set<number>())
  }
  for (const conn of mapData.connections) {
    const from = idMap.get(conn.from)
    const to = idMap.get(conn.to)
    if (from === undefined || to === undefined) continue
    connById.get(from)?.add(to)
    if (conn.bidirectional) connById.get(to)?.add(from)
  }

  const updatedLocations: StoryLocation[] = mapData.locations.map(node => {
    const id = idMap.get(node.id) as number
    const existing = prevById.get(node.id)
    return {
      ...(existing ?? {}),
      id,
      name: node.name,
      connections: Array.from(connById.get(id) ?? []),
      x: node.x,
      y: node.y,
    }
  })

  return { ...prev, locations: updatedLocations }
}
