/**
 * 因果関係ビュー内で行動（Act）を直接編集するためのヘルパー。
 * ExtendedEntityEditor（汎用エディタ）と Act の相互変換、および
 * storyData への追加・更新・削除を純粋関数として提供する。
 */
import type { StoryData, Act } from '../../types/StoryData'
import type { ExtendedEntity } from '../../types/extendedEntities'

const nowIso = (): string => new Date().toISOString()

/** 参照フィールド（文字列 id / 数値 / 空）を数値 id か undefined に正規化する。 */
const toRefId = (v: unknown): number | undefined => {
  if (v == null || v === '') return undefined
  const n = typeof v === 'string' ? Number.parseInt(v, 10) : Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** 時刻など任意数値フィールドを数値か undefined に正規化する。 */
const toNum = (v: unknown): number | undefined => {
  if (v == null || v === '') return undefined
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Act を ExtendedEntityEditor が扱う ExtendedEntity 形式へ変換する。
 * EntityEditor はトップレベルのフィールドを直接読むため、act の各属性を
 * 展開して載せる。type は ExtendedEntity 種別（'act'）に固定し、
 * 元の行動種別（TAKE/MOVE 等）は actType として保持する。
 */
export const actToEntity = (act: Act): ExtendedEntity => ({
  ...act,
  id: act.id.toString(),
  type: 'act',
  name: act.description || `行動 ${act.id}`,
  description: act.description || '',
  created_at: nowIso(),
  updated_at: nowIso(),
  attributes: act,
  relationships: [],
})

/**
 * 編集結果（ExtendedEntity）を storyData の acts に反映した新しい storyData を返す。
 * フォームのトップレベル値を採用し、参照・時刻は数値へ正規化する。
 * 行動種別（act.type）はフォームの汎用 type（'act'）に上書きされないよう元値を保つ。
 */
export const applyActUpdate = (story: StoryData, entity: ExtendedEntity): StoryData => {
  const numericId = Number(entity.id)
  const e = entity as ExtendedEntity & Record<string, unknown>
  const updatedActs = story.acts.map(a => {
    if (a.id !== numericId) return a
    return {
      ...a,
      personId: toRefId(e.personId) ?? a.personId,
      locationId: toRefId(e.locationId) ?? a.locationId,
      startTime: toNum(e.startTime),
      endTime: toNum(e.endTime),
      informationId: toRefId(e.informationId),
      propId: toRefId(e.propId),
      interactedPersonId: toRefId(e.interactedPersonId),
      id: numericId,
      description: entity.description || entity.name,
    }
  })
  return { ...story, acts: updatedActs }
}

/** 既定値で新規行動を追加し、追加後の storyData と新しい act の id を返す。 */
export const createAct = (story: StoryData): { story: StoryData; newActId: number } => {
  const newActId = Date.now()
  const newAct: Act = {
    id: newActId,
    type: 'MOVE',
    personId: story.persons[0]?.id ?? 1,
    locationId: story.locations[0]?.id ?? 1,
    startTime: 0,
    endTime: 5,
    time: '00:00',
    description: '新規行動',
  }
  return { story: { ...story, acts: [...story.acts, newAct] }, newActId }
}

/** 指定 id の行動を削除した新しい storyData を返す。 */
export const deleteAct = (story: StoryData, actId: number): StoryData => ({
  ...story,
  acts: story.acts.filter(a => a.id !== actId),
})
