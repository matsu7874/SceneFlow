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

export function appendPerson(story: StoryData, name: string): { data: StoryData; id: number } {
  const id = nextId(story.persons)
  const person = { id, name, color: pickColor(story.persons.length) }
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
  const location = { id, name, connections: [] as number[], x, y }
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

export function sortActs(acts: Act[]): Act[] {
  return [...acts].sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0) || a.id - b.id)
}
