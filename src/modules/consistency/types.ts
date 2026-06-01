export type DiagnosticCategory = 'position' | 'colocation' | 'item' | 'info'

// グラフのノード ID: Act の id（number）または初期シードの文字列キー
export type NodeId = number | string

export type FactRef =
  | { kind: 'at'; personId: number; locationId: number }
  | { kind: 'owns'; personId: number; propId: number }
  | { kind: 'propAt'; propId: number; locationId: number }
  | { kind: 'knows'; personId: number; informationId: number }

export interface GraphNode {
  id: NodeId
  actId: number | null
  personId: number
  locationId: number
  startTime: number
  label: string
}

export interface DependencyEdge {
  from: NodeId
  to: number
  fact: FactRef
}

export interface Breakage {
  actId: number
  category: DiagnosticCategory
  fact: FactRef | null
  message: string
}

// ある人物が、同一 (subject, aspect) で value の異なる情報を同時に保有した瞬間。
export interface ClaimRef {
  infoId: number
  value: string
  producer: NodeId
}

export interface Contradiction {
  id: string
  personId: number // 矛盾に気づいた人物
  subject: number
  aspect: string
  actId: number // 発覚ポイントとなった act（後から来た言明を取得した act）
  incoming: ClaimRef // 後から来た言明
  existing: ClaimRef // 既に保有していた言明
  kind: 'truth-conflict' | 'testimony-conflict'
  time: number
}

export interface ConsistencyReport {
  nodes: GraphNode[]
  edges: DependencyEdge[]
  breakages: Breakage[]
  byActId: Map<number, Breakage[]>
  contradictions: Contradiction[]
}
