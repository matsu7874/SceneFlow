/**
 * 因果関係ビュー内で行動（Act）を直接編集するためのヘルパー。
 * ExtendedEntityEditor（汎用エディタ）と Act の相互変換を担い、
 * storyData への追加・更新・削除は QuickLog の正規ヘルパーへ委譲する。
 */
import type { StoryData, Act } from '../../types/StoryData'
import type { ExtendedEntity } from '../../types/extendedEntities'
import { appendAct, applyActPatch, removeAct } from '../QuickLog/quickLogLogic'

/** 参照・時刻などの数値フィールドを数値か undefined に正規化する（id・時刻は整数）。 */
const toNum = (v: unknown): number | undefined => {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Act を ExtendedEntityEditor が扱う ExtendedEntity 形式へ変換する。
 * EntityEditor はトップレベルのフィールドを直接読むため、act の各属性を
 * 展開して載せる。type は ExtendedEntity 種別（'act'）に固定し、
 * 元の行動種別（TAKE/MOVE 等）は applyActUpdate 側で保持する。
 */
export const actToEntity = (act: Act): ExtendedEntity => {
  const now = new Date().toISOString()
  return {
    ...act,
    id: act.id.toString(),
    type: 'act',
    name: act.description || `行動 ${act.id}`,
    description: act.description || '',
    created_at: now,
    updated_at: now,
    attributes: act,
    relationships: [],
  }
}

/**
 * 編集結果（ExtendedEntity）を storyData の acts に反映した新しい storyData を返す。
 * フォームのトップレベル値を数値へ正規化して patch を作り、applyActPatch に委譲する
 * （startTime 変更時の time 文字列同期も applyActPatch が行う）。行動種別（act.type）は
 * patch に含めないことで、フォームの汎用 type（'act'）に上書きされず元値を保つ。
 */
export const applyActUpdate = (story: StoryData, entity: ExtendedEntity): StoryData => {
  const numericId = Number(entity.id)
  const current = story.acts.find(a => a.id === numericId)
  if (!current) return story
  const e = entity as ExtendedEntity & Record<string, unknown>
  const patch: Partial<Act> = {
    personId: toNum(e.personId) ?? current.personId,
    locationId: toNum(e.locationId) ?? current.locationId,
    startTime: toNum(e.startTime),
    endTime: toNum(e.endTime),
    informationId: toNum(e.informationId),
    propId: toNum(e.propId),
    interactedPersonId: toNum(e.interactedPersonId),
    description: entity.description || entity.name,
  }
  return applyActPatch(story, numericId, patch)
}

/** 既定値で新規行動を追加し、追加後の storyData と新しい act の id を返す。 */
export const createAct = (story: StoryData): { story: StoryData; newActId: number } => {
  const { data, id } = appendAct(story, {
    personId: story.persons[0]?.id ?? 1,
    locationId: story.locations[0]?.id ?? 1,
    description: '新規行動',
    startTime: 0,
    type: 'MOVE',
  })
  return { story: data, newActId: id }
}

/** 指定 id の行動を削除した新しい storyData を返す。 */
export const deleteAct = (story: StoryData, actId: number): StoryData => removeAct(story, actId)
