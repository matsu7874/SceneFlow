export type ActKindValue =
  | ''
  | 'MOVE'
  | 'TAKE'
  | 'GIVE'
  | 'DROP'
  | 'USE'
  | 'LEARN'
  | 'SPEAK'
  | 'ATTACK'
  | 'INCAPACITATE'
  | 'KILL'
  | 'WAKE'

export interface ActKindDef {
  value: ActKindValue
  label: string
}

export const ACT_KINDS: ActKindDef[] = [
  { value: '', label: 'その他' },
  { value: 'MOVE', label: '移動' },
  { value: 'TAKE', label: '取得（物）' },
  { value: 'GIVE', label: '受け渡し' },
  { value: 'DROP', label: '設置' },
  { value: 'USE', label: '使用' },
  { value: 'LEARN', label: '取得（情報）' },
  { value: 'SPEAK', label: '会話/共有' },
  { value: 'ATTACK', label: '攻撃（負傷させる）' },
  { value: 'INCAPACITATE', label: '昏倒させる' },
  { value: 'KILL', label: '殺害' },
  { value: 'WAKE', label: '蘇生・覚醒' },
]

// 対象（interactedPersonId）の状態を変える種別。
export const STATE_CHANGE_KINDS = new Set<ActKindValue>(['ATTACK', 'INCAPACITATE', 'KILL', 'WAKE'])

const KNOWN = new Set<string>(ACT_KINDS.map(k => k.value).filter(v => v !== ''))

export function getActKind(act: { type?: string }): ActKindValue {
  const t = (act.type ?? '').toUpperCase()
  return (KNOWN.has(t) ? t : '') as ActKindValue
}
