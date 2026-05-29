export type ActKindValue = '' | 'MOVE' | 'TAKE' | 'GIVE' | 'DROP' | 'USE' | 'LEARN' | 'SPEAK'

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
]

const KNOWN = new Set<string>(['MOVE', 'TAKE', 'GIVE', 'DROP', 'USE', 'LEARN', 'SPEAK'])

export function getActKind(act: { type?: string }): ActKindValue {
  const t = (act.type ?? '').toUpperCase()
  return (KNOWN.has(t) ? t : '') as ActKindValue
}
