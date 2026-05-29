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
  locationId: number | null
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

export interface ConsistencyReport {
  nodes: GraphNode[]
  edges: DependencyEdge[]
  breakages: Breakage[]
  byActId: Map<number, Breakage[]>
}
