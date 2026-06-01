export { analyzeStory } from './checker'
export { isMisinformation, truthValueFor, misinfoChain } from './misinformation'
export type { MisinfoChain } from './misinformation'
export { ACT_KINDS, getActKind } from './actKinds'
export type { ActKindValue, ActKindDef } from './actKinds'
export type {
  Breakage,
  ClaimRef,
  Contradiction,
  ConsistencyReport,
  DependencyEdge,
  DiagnosticCategory,
  FactRef,
  GraphNode,
  NodeId,
} from './types'
