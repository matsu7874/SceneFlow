export interface Person {
  id: number
  name: string
  color: string
  description?: string
  age?: number
  occupation?: string
  personality?: string
  goals?: string[]
  relationships?: Array<{
    targetId: string
    type: string
  }>
}

export interface Location {
  id: number
  name: string
  connections: number[]
  color?: string
  description?: string
  type?: 'indoor' | 'outdoor' | 'transit'
  capacity?: number
  connectedTo?: string[]
  properties?: {
    isLocked?: boolean
    requiredItem?: string
    atmosphere?: string
  }
  // この場所へ隣接地から移動するのにかかる分数（アリバイの時間検証用、任意）。
  // 未設定なら 0 とみなし、所要時間チェックは発火しない（既存データは無影響）。
  travelTime?: number
  x?: number
  y?: number
}

export interface Prop {
  id: number
  name: string
  description?: string
  category?: 'LARGE_PROP' | 'SMALL_PROP'
  isPortable?: boolean
  isConsumable?: boolean
  isCombineable?: boolean
  combinesWith?: string[]
  currentLocation?: string
  owner?: string
}

export interface Information {
  id: number
  name?: string
  content: string
  description?: string
  category?: 'FACT' | 'RUMOR' | 'SECRET' | 'INSTRUCTION' | 'LOCATION'
  isSecret?: boolean
  requiresContext?: string[]
  enablesActions?: string[]
  revealsInformation?: string[]
  // 構造化言明（誤情報・矛盾の検出用、すべて任意）。
  // 同一 (subject, aspect) で value が異なる情報どうしが矛盾とみなされる。
  subject?: number // 何についての情報か（person/location/prop の id）
  aspect?: string // どの観点か（例: "髪色", "居場所"）= 同一論点判定のキー
  value?: string // その観点での値（例: "茶色"）
  truth?: boolean // この value が (subject, aspect) の真実か（slot ごとに最大1つ）
  misinfoType?: 'lie' | 'mistake' // 誤情報の発生原因（嘘 / 見間違い）
}

export interface InitialState {
  personId: number
  locationId: number
  time: string
}

export interface Act {
  id: number
  type?: string
  personId: number
  locationId: number
  startTime?: number
  endTime?: number
  time: string
  description: string
  propId?: number
  informationId?: number
  interactedPersonId?: number
  itemId?: number
}

export interface Event {
  id: number
  name?: string
  description?: string
  trigger?: {
    type: 'time' | 'actCompleted' | 'condition'
    time?: number
    actId?: string
  }
  actions?: Array<{
    type: string
    description: string
  }>
  triggerType?: '時刻' | '行動' | '条件'
  triggerValue?: string
  eventTime?: string
  personId?: number
  actId?: number
}

export interface StoryData {
  persons: Person[]
  locations: Location[]
  props: Prop[]
  informations: Information[]
  initialStates: InitialState[]
  acts: Act[]
}

/**
 * 何も入力されていない空の物語データを生成する。
 * イベント入力をゼロから始める場合や、JSON表示の初期値として利用する。
 */
export function createEmptyStoryData(): StoryData {
  return {
    persons: [],
    locations: [],
    props: [],
    informations: [],
    initialStates: [],
    acts: [],
  }
}
