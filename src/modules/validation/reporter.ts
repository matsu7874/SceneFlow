/**
 * Validation Reporter
 *
 * Automatic validation system for temporal conflicts and logical inconsistencies
 */

import type {
  Act,
  WorldState,
  ValidationResult,
  TimelineValidation,
  ConflictInfo,
  SuggestionInfo,
  EntityId,
} from '../../types/causality'
import { CausalityEngine } from '../causality/engine'

/**
 * Validation issue severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Validation issue types
 */
export enum ValidationIssueType {
  PRECONDITION_VIOLATED = 'precondition_violated',
  TEMPORAL_PARADOX = 'temporal_paradox',
  UNREACHABLE_STATE = 'unreachable_state',
  DEADLOCK = 'deadlock',
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  INCONSISTENT_STATE = 'inconsistent_state',
  MISSING_PREREQUISITE = 'missing_prerequisite',
  REDUNDANT_ACT = 'redundant_act',
}

/**
 * Detailed validation issue
 */
export interface ValidationIssue {
  id: string
  type: ValidationIssueType
  severity: ValidationSeverity
  title: string
  description: string
  affectedActIds: EntityId[]
  affectedEntities: EntityId[]
  timestamp?: number
  suggestions: ValidationSuggestion[]
  autoFixAvailable: boolean
}

/**
 * Validation suggestion for fixing issues
 */
export interface ValidationSuggestion {
  id: string
  description: string
  actionType: 'add_act' | 'remove_act' | 'modify_act' | 'reorder_acts'
  confidence: number // 0-1
  estimatedEffort: 'low' | 'medium' | 'high'
  parameters?: Record<string, unknown>
}

/**
 * Validation report
 */
export interface ValidationReport {
  timestamp: number
  totalIssues: number
  issuesBySeverity: Record<ValidationSeverity, number>
  issuesByType: Record<ValidationIssueType, number>
  issues: ValidationIssue[]
  suggestions: ValidationSuggestion[]
  validationDuration: number
  recommendations: string[]
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  enableTemporalParadoxDetection: boolean
  enableDeadlockDetection: boolean
  enableRedundancyDetection: boolean
  enableStateConsistencyCheck: boolean
  maxValidationTime: number // milliseconds
  suggestionConfidenceThreshold: number
}

/**
 * Validation reporter for automatic conflict detection and resolution suggestions
 */
export class ValidationReporter {
  private engine: CausalityEngine
  private config: ValidationConfig
  private issueCounter: number = 0
  private suggestionCounter: number = 0

  constructor(engine: CausalityEngine, config?: Partial<ValidationConfig>) {
    this.engine = engine
    this.config = {
      enableTemporalParadoxDetection: true,
      enableDeadlockDetection: true,
      enableRedundancyDetection: true,
      enableStateConsistencyCheck: true,
      maxValidationTime: 5000,
      suggestionConfidenceThreshold: 0.6,
      ...config,
    }
  }

  /**
   * Generate comprehensive validation report
   */
  async generateReport(initialState: WorldState): Promise<ValidationReport> {
    const startTime = Date.now()
    const issues: ValidationIssue[] = []
    const suggestions: ValidationSuggestion[] = []

    try {
      // Basic timeline validation
      const timelineValidation = this.engine.validateTimeline(initialState)
      issues.push(...this.convertTimelineValidationToIssues(timelineValidation))

      // Additional validation checks
      if (this.config.enableTemporalParadoxDetection) {
        issues.push(...await this.detectTemporalParadoxes())
      }

      if (this.config.enableDeadlockDetection) {
        issues.push(...await this.detectDeadlocks(initialState))
      }

      if (this.config.enableRedundancyDetection) {
        issues.push(...await this.detectRedundantActs())
      }

      if (this.config.enableStateConsistencyCheck) {
        issues.push(...await this.checkStateConsistency(initialState))
      }

      // Generate suggestions for each issue
      for (const issue of issues) {
        const issueSuggestions = await this.generateSuggestionsForIssue(issue, initialState)
        suggestions.push(...issueSuggestions)
        issue.suggestions = issueSuggestions
      }

      // Filter suggestions by confidence threshold
      const filteredSuggestions = suggestions.filter(
        s => s.confidence >= this.config.suggestionConfidenceThreshold
      )

      const validationDuration = Date.now() - startTime

      return {
        timestamp: Date.now(),
        totalIssues: issues.length,
        issuesBySeverity: this.groupIssuesBySeverity(issues),
        issuesByType: this.groupIssuesByType(issues),
        issues,
        suggestions: filteredSuggestions,
        validationDuration,
        recommendations: this.generateRecommendations(issues, filteredSuggestions),
      }
    } catch (error) {
      // Validation timeout or error
      return {
        timestamp: Date.now(),
        totalIssues: 0,
        issuesBySeverity: {
          [ValidationSeverity.ERROR]: 0,
          [ValidationSeverity.WARNING]: 0,
          [ValidationSeverity.INFO]: 0,
        },
        issuesByType: {} as Record<ValidationIssueType, number>,
        issues: [],
        suggestions: [],
        validationDuration: Date.now() - startTime,
        recommendations: ['Validation failed due to timeout or error'],
      }
    }
  }

  /**
   * Convert timeline validation results to issues
   */
  private convertTimelineValidationToIssues(validation: TimelineValidation): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    for (const conflict of validation.conflicts) {
      const issue: ValidationIssue = {
        id: this.generateIssueId(),
        type: this.getIssueTypeFromConflict(conflict),
        severity: ValidationSeverity.ERROR,
        title: 'Timeline Conflict',
        description: conflict.description,
        affectedActIds: [conflict.actId1, conflict.actId2].filter((id, index, arr) => arr.indexOf(id) === index),
        affectedEntities: [],
        timestamp: conflict.timestamp,
        suggestions: [],
        autoFixAvailable: false,
      }

      issues.push(issue)
    }

    return issues
  }

  /**
   * Detect temporal paradoxes in the timeline
   */
  private async detectTemporalParadoxes(): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = []
    const acts = Array.from(this.engine.getActs().values())
      .sort((a, b) => a.timestamp - b.timestamp)

    // Check for circular dependencies
    const dependencies = this.buildDependencyGraph(acts)
    const cycles = this.detectCycles(dependencies)

    for (const cycle of cycles) {
      const issue: ValidationIssue = {
        id: this.generateIssueId(),
        type: ValidationIssueType.CIRCULAR_DEPENDENCY,
        severity: ValidationSeverity.ERROR,
        title: 'Circular Dependency Detected',
        description: `Acts form a circular dependency: ${cycle.join(' → ')}`,
        affectedActIds: cycle,
        affectedEntities: [],
        suggestions: [],
        autoFixAvailable: true,
      }

      issues.push(issue)
    }

    // Check for temporal inconsistencies
    for (let i = 0; i < acts.length - 1; i++) {
      const currentAct = acts[i]
      const nextAct = acts[i + 1]

      if (this.hasTemporalInconsistency(currentAct, nextAct)) {
        const issue: ValidationIssue = {
          id: this.generateIssueId(),
          type: ValidationIssueType.TEMPORAL_PARADOX,
          severity: ValidationSeverity.ERROR,
          title: 'Temporal Paradox',
          description: `Act "${nextAct.description}" cannot occur after "${currentAct.description}" due to temporal constraints`,
          affectedActIds: [currentAct.id, nextAct.id],
          affectedEntities: [...currentAct.getAffectedEntities(), ...nextAct.getAffectedEntities()],
          timestamp: nextAct.timestamp,
          suggestions: [],
          autoFixAvailable: true,
        }

        issues.push(issue)
      }
    }

    return issues
  }

  /**
   * Detect deadlocks in the timeline
   */
  private async detectDeadlocks(initialState: WorldState): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = []
    const acts = Array.from(this.engine.getActs().values())

    // Simulate timeline execution to find deadlocks
    let currentState = { ...initialState }
    const blockedActs: Act[] = []

    for (const act of acts.sort((a, b) => a.timestamp - b.timestamp)) {
      const validation = act.checkPreconditions(currentState)

      if (!validation.valid) {
        blockedActs.push(act)

        // Check if this creates a deadlock
        if (this.isDeadlock(act, blockedActs, currentState)) {
          const issue: ValidationIssue = {
            id: this.generateIssueId(),
            type: ValidationIssueType.DEADLOCK,
            severity: ValidationSeverity.ERROR,
            title: 'Deadlock Detected',
            description: `Act "${act.description}" is blocked and creates a deadlock situation`,
            affectedActIds: [act.id, ...blockedActs.map(a => a.id)],
            affectedEntities: act.getAffectedEntities(),
            timestamp: act.timestamp,
            suggestions: [],
            autoFixAvailable: true,
          }

          issues.push(issue)
        }
      } else {
        currentState = act.applyPostconditions(currentState)
        // Remove this act from blocked list if it was there
        const index = blockedActs.findIndex(a => a.id === act.id)
        if (index >= 0) {
          blockedActs.splice(index, 1)
        }
      }
    }

    return issues
  }

  /**
   * Detect redundant acts
   */
  private async detectRedundantActs(): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = []
    const acts = Array.from(this.engine.getActs().values())

    // Group acts by type and affected entities
    const actGroups = new Map<string, Act[]>()

    for (const act of acts) {
      const key = `${act.type}:${act.getAffectedEntities().sort().join(',')}`
      if (!actGroups.has(key)) {
        actGroups.set(key, [])
      }
      actGroups.get(key)!.push(act)
    }

    // Check for redundant acts in each group
    for (const [key, groupActs] of actGroups) {
      if (groupActs.length > 1) {
        const redundantActs = this.findRedundantActsInGroup(groupActs)

        for (const redundantAct of redundantActs) {
          const issue: ValidationIssue = {
            id: this.generateIssueId(),
            type: ValidationIssueType.REDUNDANT_ACT,
            severity: ValidationSeverity.WARNING,
            title: 'Redundant Act',
            description: `Act "${redundantAct.description}" appears to be redundant`,
            affectedActIds: [redundantAct.id],
            affectedEntities: redundantAct.getAffectedEntities(),
            timestamp: redundantAct.timestamp,
            suggestions: [],
            autoFixAvailable: true,
          }

          issues.push(issue)
        }
      }
    }

    return issues
  }

  /**
   * Check state consistency throughout the timeline
   */
  private async checkStateConsistency(initialState: WorldState): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = []
    const acts = Array.from(this.engine.getActs().values())
      .sort((a, b) => a.timestamp - b.timestamp)

    let currentState = { ...initialState }

    for (const act of acts) {
      // Check preconditions
      const validation = act.checkPreconditions(currentState)

      if (!validation.valid) {
        for (const error of validation.errors) {
          const issue: ValidationIssue = {
            id: this.generateIssueId(),
            type: ValidationIssueType.PRECONDITION_VIOLATED,
            severity: ValidationSeverity.ERROR,
            title: 'Precondition Violated',
            description: error.message,
            affectedActIds: [act.id],
            affectedEntities: error.affectedEntities || [],
            timestamp: act.timestamp,
            suggestions: [],
            autoFixAvailable: error.suggestion ? true : false,
          }

          issues.push(issue)
        }
      } else {
        // Apply postconditions and check for inconsistencies
        const newState = act.applyPostconditions(currentState)
        const inconsistencies = this.findStateInconsistencies(currentState, newState, act)

        for (const inconsistency of inconsistencies) {
          issues.push(inconsistency)
        }

        currentState = newState
      }
    }

    return issues
  }

  /**
   * Generate suggestions for a specific issue
   */
  private async generateSuggestionsForIssue(
    issue: ValidationIssue,
    initialState: WorldState
  ): Promise<ValidationSuggestion[]> {
    const suggestions: ValidationSuggestion[] = []

    switch (issue.type) {
    case ValidationIssueType.PRECONDITION_VIOLATED:
      suggestions.push(...this.generatePreconditionFixSuggestions(issue, initialState))
      break

    case ValidationIssueType.CIRCULAR_DEPENDENCY:
      suggestions.push(...this.generateCircularDependencyFixSuggestions(issue))
      break

    case ValidationIssueType.DEADLOCK:
      suggestions.push(...this.generateDeadlockFixSuggestions(issue, initialState))
      break

    case ValidationIssueType.REDUNDANT_ACT:
      suggestions.push(...this.generateRedundancyFixSuggestions(issue))
      break

    case ValidationIssueType.TEMPORAL_PARADOX:
      suggestions.push(...this.generateTemporalParadoxFixSuggestions(issue))
      break

    default:
      // Generic suggestions
      suggestions.push({
        id: this.generateSuggestionId(),
        description: 'Review the affected acts manually',
        actionType: 'modify_act',
        confidence: 0.3,
        estimatedEffort: 'medium',
      })
    }

    return suggestions
  }

  /**
   * Generate suggestions for precondition violations
   */
  private generatePreconditionFixSuggestions(
    issue: ValidationIssue,
    initialState: WorldState
  ): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = []
    const act = this.engine.getActs().get(issue.affectedActIds[0])

    if (!act) return suggestions

    // Suggest adding prerequisite acts
    const missingPrerequisites = this.findMissingPrerequisites(act, initialState)

    for (const prerequisite of missingPrerequisites) {
      suggestions.push({
        id: this.generateSuggestionId(),
        description: `Add ${prerequisite.type} to satisfy preconditions`,
        actionType: 'add_act',
        confidence: 0.8,
        estimatedEffort: 'low',
        parameters: {
          actType: prerequisite.type,
          insertBefore: act.id,
          entities: prerequisite.entities,
        },
      })
    }

    // Suggest modifying the act
    suggestions.push({
      id: this.generateSuggestionId(),
      description: 'Modify act parameters to match current state',
      actionType: 'modify_act',
      confidence: 0.6,
      estimatedEffort: 'medium',
      parameters: {
        actId: act.id,
      },
    })

    return suggestions
  }

  /**
   * Generate suggestions for circular dependencies
   */
  private generateCircularDependencyFixSuggestions(issue: ValidationIssue): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = []

    // Suggest removing one act from the cycle
    for (const actId of issue.affectedActIds) {
      suggestions.push({
        id: this.generateSuggestionId(),
        description: `Remove act "${actId}" to break the circular dependency`,
        actionType: 'remove_act',
        confidence: 0.7,
        estimatedEffort: 'low',
        parameters: {
          actId,
        },
      })
    }

    // Suggest reordering acts
    suggestions.push({
      id: this.generateSuggestionId(),
      description: 'Reorder acts to eliminate circular dependencies',
      actionType: 'reorder_acts',
      confidence: 0.8,
      estimatedEffort: 'medium',
      parameters: {
        actIds: issue.affectedActIds,
      },
    })

    return suggestions
  }

  /**
   * Generate suggestions for deadlocks
   */
  private generateDeadlockFixSuggestions(
    issue: ValidationIssue,
    initialState: WorldState
  ): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = []

    // Similar to precondition violations - add missing prerequisites
    const act = this.engine.getActs().get(issue.affectedActIds[0])
    if (act) {
      const missingPrerequisites = this.findMissingPrerequisites(act, initialState)

      for (const prerequisite of missingPrerequisites) {
        suggestions.push({
          id: this.generateSuggestionId(),
          description: `Add ${prerequisite.type} to resolve deadlock`,
          actionType: 'add_act',
          confidence: 0.9,
          estimatedEffort: 'low',
          parameters: {
            actType: prerequisite.type,
            insertBefore: act.id,
            entities: prerequisite.entities,
          },
        })
      }
    }

    return suggestions
  }

  /**
   * Generate suggestions for redundant acts
   */
  private generateRedundancyFixSuggestions(issue: ValidationIssue): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = []

    suggestions.push({
      id: this.generateSuggestionId(),
      description: 'Remove redundant act',
      actionType: 'remove_act',
      confidence: 0.8,
      estimatedEffort: 'low',
      parameters: {
        actId: issue.affectedActIds[0],
      },
    })

    return suggestions
  }

  /**
   * Generate suggestions for temporal paradoxes
   */
  private generateTemporalParadoxFixSuggestions(issue: ValidationIssue): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = []

    suggestions.push({
      id: this.generateSuggestionId(),
      description: 'Reorder acts to resolve temporal paradox',
      actionType: 'reorder_acts',
      confidence: 0.8,
      estimatedEffort: 'medium',
      parameters: {
        actIds: issue.affectedActIds,
      },
    })

    return suggestions
  }

  /**
   * Helper methods
   */

  private generateIssueId(): string {
    return `issue-${++this.issueCounter}`
  }

  private generateSuggestionId(): string {
    return `suggestion-${++this.suggestionCounter}`
  }

  private getIssueTypeFromConflict(conflict: ConflictInfo): ValidationIssueType {
    switch (conflict.type) {
    case 'precondition_violated':
      return ValidationIssueType.PRECONDITION_VIOLATED
    default:
      return ValidationIssueType.INCONSISTENT_STATE
    }
  }

  private groupIssuesBySeverity(issues: ValidationIssue[]): Record<ValidationSeverity, number> {
    const counts = {
      [ValidationSeverity.ERROR]: 0,
      [ValidationSeverity.WARNING]: 0,
      [ValidationSeverity.INFO]: 0,
    }

    for (const issue of issues) {
      counts[issue.severity]++
    }

    return counts
  }

  private groupIssuesByType(issues: ValidationIssue[]): Record<ValidationIssueType, number> {
    const counts: Record<string, number> = {}

    for (const issue of issues) {
      counts[issue.type] = (counts[issue.type] || 0) + 1
    }

    return counts as Record<ValidationIssueType, number>
  }

  private generateRecommendations(issues: ValidationIssue[], suggestions: ValidationSuggestion[]): string[] {
    const recommendations: string[] = []

    if (issues.length === 0) {
      recommendations.push('Timeline is valid with no detected issues')
      return recommendations
    }

    const errorCount = issues.filter(i => i.severity === ValidationSeverity.ERROR).length
    const warningCount = issues.filter(i => i.severity === ValidationSeverity.WARNING).length

    if (errorCount > 0) {
      recommendations.push(`Address ${errorCount} critical error${errorCount > 1 ? 's' : ''} first`)
    }

    if (warningCount > 0) {
      recommendations.push(`Consider reviewing ${warningCount} warning${warningCount > 1 ? 's' : ''}`)
    }

    const autoFixCount = suggestions.filter(s => s.confidence > 0.8).length
    if (autoFixCount > 0) {
      recommendations.push(`${autoFixCount} issue${autoFixCount > 1 ? 's' : ''} can be auto-fixed with high confidence`)
    }

    return recommendations
  }

  private buildDependencyGraph(acts: Act[]): Map<EntityId, EntityId[]> {
    const dependencies = new Map<EntityId, EntityId[]>()

    for (const act of acts) {
      dependencies.set(act.id, [])
    }

    // Build dependencies based on shared entities and temporal order
    for (let i = 0; i < acts.length; i++) {
      for (let j = i + 1; j < acts.length; j++) {
        const actA = acts[i]
        const actB = acts[j]

        if (this.actsDependOnEachOther(actA, actB)) {
          dependencies.get(actB.id)!.push(actA.id)
        }
      }
    }

    return dependencies
  }

  private detectCycles(dependencies: Map<EntityId, EntityId[]>): EntityId[][] {
    const cycles: EntityId[][] = []
    const visited = new Set<EntityId>()
    const recursionStack = new Set<EntityId>()

    const dfs = (nodeId: EntityId, path: EntityId[]): void => {
      visited.add(nodeId)
      recursionStack.add(nodeId)

      const deps = dependencies.get(nodeId) || []
      for (const depId of deps) {
        if (!visited.has(depId)) {
          dfs(depId, [...path, nodeId])
        } else if (recursionStack.has(depId)) {
          // Found a cycle
          const cycleStartIndex = path.indexOf(depId)
          if (cycleStartIndex >= 0) {
            cycles.push([...path.slice(cycleStartIndex), nodeId])
          }
        }
      }

      recursionStack.delete(nodeId)
    }

    for (const nodeId of dependencies.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, [])
      }
    }

    return cycles
  }

  private hasTemporalInconsistency(actA: Act, actB: Act): boolean {
    // Check if actB depends on results from actA but occurs before it
    const entitiesA = new Set(actA.getAffectedEntities())
    const entitiesB = new Set(actB.getAffectedEntities())

    // If they share entities and B comes after A temporally but before causally
    if (actA.timestamp < actB.timestamp) {
      for (const entityA of entitiesA) {
        if (entitiesB.has(entityA)) {
          // Check if B's preconditions require A's postconditions
          // This is a simplified check - in practice, would be more sophisticated
          return false // For now, assume no temporal inconsistency
        }
      }
    }

    return false
  }

  private isDeadlock(act: Act, blockedActs: Act[], currentState: WorldState): boolean {
    // Simplified deadlock detection
    // Check if this act is blocking others and no other acts can unblock it
    const requiredEntities = act.getAffectedEntities()

    for (const blockedAct of blockedActs) {
      const blockedEntities = blockedAct.getAffectedEntities()
      if (requiredEntities.some(e => blockedEntities.includes(e))) {
        return true
      }
    }

    return false
  }

  private findRedundantActsInGroup(acts: Act[]): Act[] {
    // Simple redundancy detection - acts with identical effects
    const redundant: Act[] = []

    for (let i = 0; i < acts.length - 1; i++) {
      for (let j = i + 1; j < acts.length; j++) {
        if (this.actsHaveIdenticalEffects(acts[i], acts[j])) {
          redundant.push(acts[j]) // Keep the first one, mark later ones as redundant
        }
      }
    }

    return redundant
  }

  private actsHaveIdenticalEffects(actA: Act, actB: Act): boolean {
    // Simplified comparison - in practice, would compare postconditions
    return (
      actA.type === actB.type &&
      JSON.stringify(actA.getAffectedEntities().sort()) === 
      JSON.stringify(actB.getAffectedEntities().sort())
    )
  }

  private findStateInconsistencies(
    oldState: WorldState,
    newState: WorldState,
    act: Act
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check for invalid state transitions
    // This is a placeholder for more sophisticated state consistency checks

    return issues
  }

  private actsDependOnEachOther(actA: Act, actB: Act): boolean {
    const entitiesA = new Set(actA.getAffectedEntities())
    const entitiesB = new Set(actB.getAffectedEntities())

    // Check if they share any entities
    for (const entityA of entitiesA) {
      if (entitiesB.has(entityA)) {
        return true
      }
    }

    return false
  }

  private findMissingPrerequisites(
    act: Act,
    _initialState: WorldState
  ): Array<{ type: string; entities: EntityId[] }> {
    // This would analyze the act's preconditions and suggest what's missing
    // For now, return a placeholder
    return []
  }

  /**
   * Update validation configuration
   */
  updateConfig(config: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config }
  }
}