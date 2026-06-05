export { analyzeStory } from './checker'
export {
  isMisinformation,
  truthValueFor,
  misinfoChain,
  duplicateTruthSlots,
} from './misinformation'
export type { MisinfoChain, TruthSlot } from './misinformation'
export { ACT_KINDS, getActKind } from './actKinds'
export type { ActKindValue, ActKindDef } from './actKinds'
export {
  reconstructAt,
  distinctActTimes,
  whoWasAt,
  propAccessOpportunity,
  knowledgeByInfo,
} from './opportunity'
export type { WorldSnapshot, PersonPresence, KnowledgeEntry } from './opportunity'
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
