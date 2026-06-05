import type { StoryData, Act } from '../../types/StoryData'

const DEFAULT_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7B731',
  '#A55EEA',
  '#26DE81',
  '#FD9644',
  '#2BCBBA',
]

export function pickColor(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

// 場所用の可視化パレット。人物の暖色寄りパレットと区別しやすいよう寒色〜中間色を並べる。
const LOCATION_COLORS = [
  '#3B82F6',
  '#8B5CF6',
  '#0EA5E9',
  '#14B8A6',
  '#6366F1',
  '#0891B2',
  '#7C3AED',
  '#2563EB',
  '#0D9488',
  '#4F46E5',
]

// プリセットから「まだ使われていない色」を優先的に選ぶ。
// 全色が使用済みになったら seed を使って巡回し、なるべく均等に割り当てる。
function pickUnusedColor(
  palette: string[],
  used: Iterable<string | undefined>,
  seed: number,
): string {
  const set = new Set([...used].filter((c): c is string => Boolean(c)))
  const free = palette.find(color => !set.has(color))
  if (free) return free
  return palette[((seed % palette.length) + palette.length) % palette.length]
}

// 新規人物に被りにくい色をプリセットから割り当てる。色はエンティティ編集で変更できる。
export function assignPersonColor(persons: Array<{ color?: string }>): string {
  return pickUnusedColor(
    DEFAULT_COLORS,
    persons.map(p => p.color),
    persons.length,
  )
}

// 新規場所に被りにくい色をプリセットから割り当てる。色はエンティティ編集で変更できる。
export function assignLocationColor(locations: Array<{ color?: string }>): string {
  return pickUnusedColor(
    LOCATION_COLORS,
    locations.map(l => l.color),
    locations.length,
  )
}

// 色が未設定の既存データ（旧バージョンで作成された場所）向けの表示フォールバック。
// id は 1 始まり。削除されても色が安定するよう index ではなく id を基準にする。
export function pickLocationColor(id: number): string {
  const i = (((id - 1) % LOCATION_COLORS.length) + LOCATION_COLORS.length) % LOCATION_COLORS.length
  return LOCATION_COLORS[i]
}

export function appendPerson(story: StoryData, name: string): { data: StoryData; id: number } {
  const id = nextId(story.persons)
  const person = { id, name, color: assignPersonColor(story.persons) }
  return { data: { ...story, persons: [...story.persons, person] }, id }
}

// マップエディタで配置する前でも空間ビューに表示できるよう、新規場所には初期座標を与える。
// 既存の場所数を元にグリッド状へ配置し、重なりを避ける。利用者はマップエディタで再配置できる。
const LOCATION_GRID_ORIGIN = 100
const LOCATION_GRID_SPACING = 150
const LOCATION_GRID_COLUMNS = 5

export function defaultLocationPosition(index: number): { x: number; y: number } {
  return {
    x: LOCATION_GRID_ORIGIN + (index % LOCATION_GRID_COLUMNS) * LOCATION_GRID_SPACING,
    y: LOCATION_GRID_ORIGIN + Math.floor(index / LOCATION_GRID_COLUMNS) * LOCATION_GRID_SPACING,
  }
}

export function appendLocation(story: StoryData, name: string): { data: StoryData; id: number } {
  const id = nextId(story.locations)
  const { x, y } = defaultLocationPosition(story.locations.length)
  const color = assignLocationColor(story.locations)
  const location = { id, name, connections: [] as number[], color, x, y }
  return { data: { ...story, locations: [...story.locations, location] }, id }
}

export function nextId(items: Array<{ id: number }>): number {
  if (items.length === 0) return 1
  return Math.max(...items.map(item => item.id)) + 1
}

export function timeStringToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

export function minutesToTimeString(total: number): string {
  const safe = ((total % 1440) + 1440) % 1440
  const hours = Math.floor(safe / 60)
  const minutes = safe % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export interface AppendActInput {
  personId: number
  locationId: number
  description: string
  startTime: number
  type?: string
}

export function appendAct(
  story: StoryData,
  input: AppendActInput,
): { data: StoryData; id: number } {
  const id = nextId(story.acts)
  const act: Act = {
    id,
    personId: input.personId,
    locationId: input.locationId,
    description: input.description,
    startTime: input.startTime,
    time: minutesToTimeString(input.startTime),
    ...(input.type ? { type: input.type } : {}),
  }
  // 初期位置が未設定の人物には、この行動の場所を初期状態としてシードする。
  // これがないとシミュレーション（初期状態を起点とする）でデータが反映されない。
  const hasInitial = story.initialStates.some(s => s.personId === input.personId)
  const initialStates = hasInitial
    ? story.initialStates
    : [
        ...story.initialStates,
        { personId: input.personId, locationId: input.locationId, time: '00:00' },
      ]
  return { data: { ...story, initialStates, acts: [...story.acts, act] }, id }
}

export function applyActPatch(story: StoryData, id: number, patch: Partial<Act>): StoryData {
  const resolvedPatch =
    patch.startTime !== undefined && patch.time === undefined
      ? { ...patch, time: minutesToTimeString(patch.startTime) }
      : patch
  return {
    ...story,
    acts: story.acts.map(act => (act.id === id ? { ...act, ...resolvedPatch } : act)),
  }
}

export function removeAct(story: StoryData, id: number): StoryData {
  return { ...story, acts: story.acts.filter(act => act.id !== id) }
}

// 並び替え用の実効時刻（分）。startTime が無いレガシー／読込データでも、
// time 文字列から時刻を復元して時系列順を保つ。どちらも無ければ 0 とみなす。
function effectiveActMinutes(act: Act): number {
  if (act.startTime !== undefined) return act.startTime
  return timeStringToMinutes(act.time) ?? 0
}

export function sortActs(acts: Act[]): Act[] {
  return [...acts].sort((a, b) => effectiveActMinutes(a) - effectiveActMinutes(b) || a.id - b.id)
}
