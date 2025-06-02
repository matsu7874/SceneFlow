import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { StoryData } from '../../types'
import { CausalityEngine } from '../../modules/core/causalityEngine'
import { useVisualFeedback } from '../../contexts/VisualFeedbackContext'
import styles from './ValidationReporter.module.css'

interface ValidationReporterProps {
  storyData: StoryData
  onAutoFix?: (fixes: ValidationFix[]) => void
  className?: string
}

interface ValidationIssue {
  id: string
  type: 'error' | 'warning' | 'info'
  category: string
  message: string
  details?: string
  entityType?: string
  entityId?: string
  suggestion?: string
  autoFixable?: boolean
}

interface ValidationFix {
  issueId: string
  description: string
  apply: () => void
}

export const ValidationReporter: React.FC<ValidationReporterProps> = ({
  storyData,
  onAutoFix,
  className
}) => {
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set())
  
  const { showNotification } = useVisualFeedback()
  
  const causalityEngine = useMemo(() => {
    return new CausalityEngine(storyData)
  }, [storyData])

  // Run validation
  const runValidation = useCallback(async () => {
    setIsValidating(true)
    const newIssues: ValidationIssue[] = []
    let issueId = 0

    try {
      // 1. Check for missing required fields
      storyData.persons.forEach(person => {
        if (!person.name || person.name.trim() === '') {
          newIssues.push({
            id: `issue-${issueId++}`,
            type: 'error',
            category: 'Missing Data',
            message: `Person "${person.id}" has no name`,
            entityType: 'person',
            entityId: person.id,
            suggestion: 'Add a name to this person',
            autoFixable: false
          })
        }
      })

      storyData.locations.forEach(location => {
        if (!location.name || location.name.trim() === '') {
          newIssues.push({
            id: `issue-${issueId++}`,
            type: 'error',
            category: 'Missing Data',
            message: `Location "${location.id}" has no name`,
            entityType: 'location',
            entityId: location.id,
            suggestion: 'Add a name to this location',
            autoFixable: false
          })
        }
      })

      // 2. Check for duplicate IDs
      const idSets = {
        persons: new Set<string>(),
        locations: new Set<string>(),
        props: new Set<string>(),
        acts: new Set<string>(),
        events: new Set<string>()
      }

      const checkDuplicates = (items: any[], type: string, set: Set<string>) => {
        items.forEach(item => {
          if (set.has(item.id)) {
            newIssues.push({
              id: `issue-${issueId++}`,
              type: 'error',
              category: 'Duplicate ID',
              message: `Duplicate ${type} ID: "${item.id}"`,
              entityType: type,
              entityId: item.id,
              suggestion: `Change the ID to make it unique`,
              autoFixable: false
            })
          }
          set.add(item.id)
        })
      }

      checkDuplicates(storyData.persons, 'person', idSets.persons)
      checkDuplicates(storyData.locations, 'location', idSets.locations)
      checkDuplicates(storyData.props, 'prop', idSets.props)
      checkDuplicates(storyData.acts, 'act', idSets.acts)
      checkDuplicates(storyData.events, 'event', idSets.events)

      // 3. Check for invalid references
      storyData.acts.forEach(act => {
        if (act.personId && !idSets.persons.has(act.personId)) {
          newIssues.push({
            id: `issue-${issueId++}`,
            type: 'error',
            category: 'Invalid Reference',
            message: `Act "${act.id}" references non-existent person "${act.personId}"`,
            entityType: 'act',
            entityId: act.id,
            suggestion: 'Update the person reference or create the missing person',
            autoFixable: false
          })
        }

        if (act.locationId && !idSets.locations.has(act.locationId)) {
          newIssues.push({
            id: `issue-${issueId++}`,
            type: 'error',
            category: 'Invalid Reference',
            message: `Act "${act.id}" references non-existent location "${act.locationId}"`,
            entityType: 'act',
            entityId: act.id,
            suggestion: 'Update the location reference or create the missing location',
            autoFixable: false
          })
        }
      })

      // 4. Check for timing conflicts
      const personSchedules = new Map<string, Array<{start: number, end: number, actId: string}>>()
      
      storyData.acts.forEach(act => {
        if (act.personId && act.startTime !== undefined && act.endTime !== undefined) {
          if (!personSchedules.has(act.personId)) {
            personSchedules.set(act.personId, [])
          }
          personSchedules.get(act.personId)!.push({
            start: act.startTime,
            end: act.endTime,
            actId: act.id
          })
        }
      })

      personSchedules.forEach((schedule, personId) => {
        schedule.sort((a, b) => a.start - b.start)
        
        for (let i = 0; i < schedule.length - 1; i++) {
          if (schedule[i].end > schedule[i + 1].start) {
            newIssues.push({
              id: `issue-${issueId++}`,
              type: 'warning',
              category: 'Timing Conflict',
              message: `Person "${personId}" has overlapping acts: "${schedule[i].actId}" and "${schedule[i + 1].actId}"`,
              details: `First act ends at ${schedule[i].end}, second act starts at ${schedule[i + 1].start}`,
              entityType: 'person',
              entityId: personId,
              suggestion: 'Adjust act times to avoid overlap',
              autoFixable: false
            })
          }
        }
      })

      // 5. Check for unreachable locations
      const locationConnections = new Map<string, Set<string>>()
      
      storyData.locations.forEach(location => {
        locationConnections.set(location.id, new Set())
      })

      // Build connection graph
      storyData.locations.forEach(location => {
        location.connectedTo?.forEach(targetId => {
          if (idSets.locations.has(targetId)) {
            locationConnections.get(location.id)?.add(targetId)
          }
        })
      })

      // Find disconnected components
      const visited = new Set<string>()
      const components: string[][] = []

      const dfs = (locationId: string, component: string[]) => {
        if (visited.has(locationId)) return
        visited.add(locationId)
        component.push(locationId)
        
        locationConnections.get(locationId)?.forEach(connectedId => {
          dfs(connectedId, component)
        })
        
        // Check reverse connections
        locationConnections.forEach((connections, fromId) => {
          if (connections.has(locationId)) {
            dfs(fromId, component)
          }
        })
      }

      storyData.locations.forEach(location => {
        if (!visited.has(location.id)) {
          const component: string[] = []
          dfs(location.id, component)
          components.push(component)
        }
      })

      if (components.length > 1) {
        components.forEach((component, index) => {
          if (component.length === 1) {
            newIssues.push({
              id: `issue-${issueId++}`,
              type: 'warning',
              category: 'Isolated Location',
              message: `Location "${component[0]}" is not connected to any other location`,
              entityType: 'location',
              entityId: component[0],
              suggestion: 'Connect this location to others or remove it if unused',
              autoFixable: false
            })
          } else {
            newIssues.push({
              id: `issue-${issueId++}`,
              type: 'info',
              category: 'Disconnected Group',
              message: `Group of ${component.length} locations is disconnected from others`,
              details: `Locations: ${component.join(', ')}`,
              suggestion: 'Consider connecting these location groups',
              autoFixable: false
            })
          }
        })
      }

      // 6. Check causality
      const conflicts = causalityEngine.validateCausality()
      conflicts.forEach(conflict => {
        newIssues.push({
          id: `issue-${issueId++}`,
          type: 'error',
          category: 'Causality Conflict',
          message: conflict.message,
          details: conflict.description,
          suggestion: conflict.suggestion,
          autoFixable: false
        })
      })

      setIssues(newIssues)
      showNotification(`Validation complete: ${newIssues.length} issues found`, {
        type: newIssues.length === 0 ? 'success' : 'warning'
      })
    } catch (error) {
      showNotification('Validation failed', { type: 'error' })
      console.error('Validation error:', error)
    } finally {
      setIsValidating(false)
    }
  }, [storyData, causalityEngine, showNotification])

  // Run validation on mount and when data changes
  useEffect(() => {
    runValidation()
  }, [runValidation])

  // Filter issues
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (selectedCategory !== 'all' && issue.category !== selectedCategory) return false
      if (selectedType !== 'all' && issue.type !== selectedType) return false
      return true
    })
  }, [issues, selectedCategory, selectedType])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(issues.map(issue => issue.category))
    return ['all', ...Array.from(cats)]
  }, [issues])

  // Count by type
  const typeCounts = useMemo(() => {
    const counts = { error: 0, warning: 0, info: 0 }
    issues.forEach(issue => {
      counts[issue.type]++
    })
    return counts
  }, [issues])

  const toggleExpanded = (issueId: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev)
      if (next.has(issueId)) {
        next.delete(issueId)
      } else {
        next.add(issueId)
      }
      return next
    })
  }

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.header}>
        <h3>Validation Report</h3>
        <button 
          className={styles.refreshButton}
          onClick={runValidation}
          disabled={isValidating}
        >
          {isValidating ? 'Validating...' : 'Refresh'}
        </button>
      </div>

      <div className={styles.summary}>
        <div className={`${styles.summaryItem} ${styles.error}`}>
          <span className={styles.icon}>❌</span>
          <span>{typeCounts.error} Errors</span>
        </div>
        <div className={`${styles.summaryItem} ${styles.warning}`}>
          <span className={styles.icon}>⚠️</span>
          <span>{typeCounts.warning} Warnings</span>
        </div>
        <div className={`${styles.summaryItem} ${styles.info}`}>
          <span className={styles.icon}>ℹ️</span>
          <span>{typeCounts.info} Info</span>
        </div>
      </div>

      <div className={styles.filters}>
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className={styles.filterSelect}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Types</option>
          <option value="error">Errors Only</option>
          <option value="warning">Warnings Only</option>
          <option value="info">Info Only</option>
        </select>
      </div>

      <div className={styles.issuesList}>
        {filteredIssues.length === 0 ? (
          <div className={styles.noIssues}>
            {issues.length === 0 
              ? '✅ No validation issues found!'
              : 'No issues match the selected filters'
            }
          </div>
        ) : (
          filteredIssues.map(issue => (
            <div 
              key={issue.id}
              className={`${styles.issue} ${styles[issue.type]}`}
              onClick={() => toggleExpanded(issue.id)}
            >
              <div className={styles.issueHeader}>
                <span className={styles.issueIcon}>
                  {issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <span className={styles.issueCategory}>{issue.category}</span>
                <span className={styles.issueMessage}>{issue.message}</span>
              </div>
              
              {expandedIssues.has(issue.id) && (
                <div className={styles.issueDetails}>
                  {issue.details && (
                    <p className={styles.detail}>
                      <strong>Details:</strong> {issue.details}
                    </p>
                  )}
                  {issue.suggestion && (
                    <p className={styles.suggestion}>
                      <strong>Suggestion:</strong> {issue.suggestion}
                    </p>
                  )}
                  {issue.entityType && issue.entityId && (
                    <p className={styles.entity}>
                      <strong>Entity:</strong> {issue.entityType} - {issue.entityId}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}