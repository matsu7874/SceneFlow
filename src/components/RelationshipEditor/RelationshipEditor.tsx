import React, { useEffect, useState } from 'react'
import * as d3 from 'd3'
import styles from './RelationshipEditor.module.css'
import { useRelationshipEditor, EditorMode, GraphNode, GraphLink } from './useRelationshipEditor'
import { Relationship, Connection } from '../../types'

export interface RelationshipEditorProps {
  initialMode?: EditorMode;
  onItemSelect?: (item: Relationship | Connection) => void;
  className?: string;
}

const RelationshipEditor: React.FC<RelationshipEditorProps> = ({
  initialMode = 'relationships',
  onItemSelect,
  className,
}) => {
  const [mode, setMode] = useState<EditorMode>(initialMode)
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  const {
    graphData,
    selectedItem,
    hoveredNode,
    hoveredLink,
    contextMenu,
    searchQuery,
    filterOptions,
    availableFilters,
    svgRef,
    dimensions,
    setSearchQuery,
    setFilterOptions,
    setSelectedItem,
    setHoveredNode,
    setHoveredLink,
    handleNodeClick,
    handleLinkClick,
    handleNodeContextMenu,
    handleLinkContextMenu,
    handleCloseContextMenu,
    handleDragStart,
    handleDrag,
    handleDragEnd,
    handleUpdateStrength,
    handleDelete,
  } = useRelationshipEditor(mode)

  // Initialize D3 elements
  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return

    const svg = d3.select(svgRef.current)

    // Clear previous elements
    svg.selectAll('*').remove()

    // Create container groups
    const g = svg.append('g')
    const linksGroup = g.append('g').attr('class', 'links')
    const nodesGroup = g.append('g').attr('class', 'nodes')

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Create links
    const links = linksGroup.selectAll<SVGLineElement, GraphLink>('line')
      .data(graphData.links)
      .join('line')
      .attr('class', d => `${styles.link} ${hoveredLink === d.id ? styles.highlighted : ''}`)
      .attr('stroke-width', d => Math.max(1, d.strength * 5))
      .on('click', (event, d) => {
        event.stopPropagation()
        handleLinkClick(d)
      })
      .on('contextmenu', (event, d) => {
        handleLinkContextMenu(event, d)
      })
      .on('mouseenter', (event, d) => setHoveredLink(d.id))
      .on('mouseleave', () => setHoveredLink(null))

    // Create nodes
    const nodes = nodesGroup.selectAll<SVGGElement, GraphNode>('g')
      .data(graphData.nodes)
      .join('g')
      .attr('class', d => `${styles.node} ${hoveredNode === d.id ? styles.highlighted : ''}`)
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', handleDragStart)
        .on('drag', handleDrag)
        .on('end', handleDragEnd) as any)
      .on('click', (event, d) => {
        event.stopPropagation()
        handleNodeClick(d)
      })
      .on('contextmenu', (event, d) => {
        handleNodeContextMenu(event, d)
      })
      .on('mouseenter', (event, d) => setHoveredNode(d.id))
      .on('mouseleave', () => setHoveredNode(null))

    // Add circles to nodes
    nodes.append('circle')
      .attr('class', styles.nodeCircle)
      .attr('r', 20)

    // Add labels to nodes
    nodes.append('text')
      .attr('class', styles.nodeLabel)
      .attr('dy', 35)
      .text(d => d.name)
      .style('font-size', '12px')

    // Add icons to nodes
    nodes.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .style('font-size', '14px')
      .style('fill', 'white')
      .text(d => d.type === 'person' ? '👤' : '📍')

  }, [graphData, hoveredNode, hoveredLink, handleNodeClick, handleLinkClick,
    handleNodeContextMenu, handleLinkContextMenu, handleDragStart, handleDrag, handleDragEnd,
    setHoveredNode, setHoveredLink])

  // Handle clicks outside context menu
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => handleCloseContextMenu()
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu, handleCloseContextMenu])

  // Notify parent of selection
  useEffect(() => {
    if (selectedItem && onItemSelect) {
      onItemSelect(selectedItem)
    }
  }, [selectedItem, onItemSelect])

  const handleFilterSelect = (type: 'entity' | 'type', value: string) => {
    if (type === 'entity') {
      setFilterOptions(prev => ({
        ...prev,
        entityId: prev.entityId === value ? undefined : value,
      }))
    } else {
      setFilterOptions(prev => ({
        ...prev,
        relationshipType: prev.relationshipType === value ? undefined : value,
      }))
    }
    setShowFilterMenu(false)
  }

  const clearFilters = () => {
    setFilterOptions({})
    setSearchQuery('')
  }

  const hasActiveFilters = searchQuery || filterOptions.entityId || filterOptions.relationshipType

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          {mode === 'relationships' ? 'Relationship Graph' : 'Connection Map'}
        </h2>

        <div className={styles.controls}>
          {/* Search */}
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter */}
          <div className={styles.filterDropdown}>
            <button
              className={styles.filterButton}
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <span>🔽</span>
              Filter
              {hasActiveFilters && <span className={styles.filterBadge}>•</span>}
            </button>

            {showFilterMenu && (
              <div className={styles.filterMenu}>
                <div className={styles.filterSection}>
                  <div className={styles.filterSectionTitle}>
                    By {mode === 'relationships' ? 'Person' : 'Location'}
                  </div>
                  {availableFilters.entityOptions.map(entity => (
                    <div
                      key={entity.id}
                      className={`${styles.filterOption} ${
                        filterOptions.entityId === entity.id ? styles.active : ''
                      }`}
                      onClick={() => handleFilterSelect('entity', entity.id)}
                    >
                      {entity.name}
                    </div>
                  ))}
                </div>

                {availableFilters.typeOptions.length > 0 && (
                  <>
                    <div className={styles.filterMenuDivider} />
                    <div className={styles.filterSection}>
                      <div className={styles.filterSectionTitle}>By Type</div>
                      {availableFilters.typeOptions.map(type => (
                        <div
                          key={type}
                          className={`${styles.filterOption} ${
                            filterOptions.relationshipType === type ? styles.active : ''
                          }`}
                          onClick={() => handleFilterSelect('type', type)}
                        >
                          {type}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {hasActiveFilters && (
                  <>
                    <div className={styles.filterMenuDivider} />
                    <div
                      className={styles.filterOption}
                      onClick={clearFilters}
                    >
                      Clear Filters
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mode Toggle */}
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeButton} ${mode === 'relationships' ? styles.active : ''}`}
              onClick={() => setMode('relationships')}
            >
              <span>👥</span>
              Relationships
            </button>
            <button
              className={`${styles.modeButton} ${mode === 'connections' ? styles.active : ''}`}
              onClick={() => setMode('connections')}
            >
              <span>📍</span>
              Connections
            </button>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div className={styles.graphContainer}>
        {graphData.nodes.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <span style={{ fontSize: '48px' }}>{mode === 'relationships' ? '👥' : '📍'}</span>
            </div>
            <p className={styles.emptyText}>
              No {mode === 'relationships' ? 'relationships' : 'connections'} to display
            </p>
            <p className={styles.emptyHint}>
              {mode === 'relationships'
                ? 'Create relationships between persons to see them here'
                : 'Create connections between locations to see them here'}
            </p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className={styles.svg}
            width={dimensions.width}
            height={dimensions.height}
          />
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'node' ? (
            <>
              <div className={styles.contextMenuItem}>
                <span>🔗</span>
                View All Connections
              </div>
              <div className={styles.contextMenuItem}>
                <span>✏️</span>
                Edit {(contextMenu.item as GraphNode).type === 'person' ? 'Person' : 'Location'}
              </div>
            </>
          ) : (
            <>
              <div className={styles.contextMenuItem}>
                <span>✏️</span>
                Edit {mode === 'relationships' ? 'Relationship' : 'Connection'}
              </div>
              <div className={styles.contextMenuDivider} />
              <div
                className={`${styles.contextMenuItem} ${styles.danger}`}
                onClick={() => handleDelete((contextMenu.item as GraphLink).id)}
              >
                <span>🗑️</span>
                Delete
              </div>
            </>
          )}
        </div>
      )}

      {/* Details Panel */}
      {selectedItem && (
        <div className={`${styles.detailsPanel} ${styles.open}`}>
          <div className={styles.detailsHeader}>
            <h3 className={styles.detailsTitle}>
              {mode === 'relationships' ? 'Relationship Details' : 'Connection Details'}
            </h3>
            <button
              className={styles.closeButton}
              onClick={() => setSelectedItem(null)}
            >
              <span style={{ fontSize: '20px' }}>✕</span>
            </button>
          </div>

          <div className={styles.detailsContent}>
            <div className={styles.detailsSection}>
              <div className={styles.detailsSectionTitle}>Information</div>

              <div className={styles.detailsField}>
                <div className={styles.detailsLabel}>Type</div>
                <div className={styles.detailsValue}>{selectedItem.type}</div>
              </div>

              {mode === 'relationships' && 'person1Id' in selectedItem && (
                <>
                  <div className={styles.detailsField}>
                    <div className={styles.detailsLabel}>Between</div>
                    <div className={styles.detailsValue}>
                      {graphData.nodes.find(n => n.id === selectedItem.person1Id)?.name || 'Unknown'} & {' '}
                      {graphData.nodes.find(n => n.id === selectedItem.person2Id)?.name || 'Unknown'}
                    </div>
                  </div>
                </>
              )}

              {mode === 'connections' && 'location1Id' in selectedItem && (
                <>
                  <div className={styles.detailsField}>
                    <div className={styles.detailsLabel}>Between</div>
                    <div className={styles.detailsValue}>
                      {graphData.nodes.find(n => n.id === selectedItem.location1Id)?.name || 'Unknown'} & {' '}
                      {graphData.nodes.find(n => n.id === selectedItem.location2Id)?.name || 'Unknown'}
                    </div>
                  </div>
                </>
              )}

              <div className={styles.detailsField}>
                <div className={styles.detailsLabel}>Strength</div>
                <input
                  type="range"
                  className={styles.strengthSlider}
                  min="0"
                  max="1"
                  step="0.1"
                  value={selectedItem.strength || 0.5}
                  onChange={(e) => handleUpdateStrength(selectedItem.id, parseFloat(e.target.value))}
                />
                <div className={styles.detailsValue}>
                  {((selectedItem.strength || 0.5) * 100).toFixed(0)}%
                </div>
              </div>

              {selectedItem.description && (
                <div className={styles.detailsField}>
                  <div className={styles.detailsLabel}>Description</div>
                  <div className={styles.detailsValue}>{selectedItem.description}</div>
                </div>
              )}
            </div>

            <div className={styles.actionButtons}>
              <button className={styles.actionButton}>
                <span>✏️</span>
                Edit
              </button>
              <button
                className={`${styles.actionButton} ${styles.danger}`}
                onClick={() => handleDelete(selectedItem.id)}
              >
                <span>🗑️</span>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RelationshipEditor