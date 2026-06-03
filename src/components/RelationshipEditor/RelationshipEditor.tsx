import React, { useEffect, useState } from 'react'
import * as d3 from 'd3'
import styles from './RelationshipEditor.module.css'
import { useRelationshipEditor, EditorMode, GraphNode, GraphLink } from './useRelationshipEditor'
import { Relationship, Connection } from '../../types'

export interface RelationshipEditorProps {
  initialMode?: EditorMode
  onItemSelect?: (item: Relationship | Connection) => void
  className?: string
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
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', event => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Create links
    linksGroup
      .selectAll<SVGLineElement, GraphLink>('line')
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
    const nodes = nodesGroup
      .selectAll<SVGGElement, GraphNode>('g')
      .data(graphData.nodes)
      .join('g')
      .attr('class', d => `${styles.node} ${hoveredNode === d.id ? styles.highlighted : ''}`)
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', handleDragStart)
          .on('drag', handleDrag)
          .on('end', handleDragEnd) as any,
      )
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
    nodes.append('circle').attr('class', styles.nodeCircle).attr('r', 20)

    // Add labels to nodes
    nodes
      .append('text')
      .attr('class', styles.nodeLabel)
      .attr('dy', 35)
      .text(d => d.name)
      .style('font-size', '12px')

    // Add type indicator to nodes
    nodes
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .style('font-size', '11px')
      .style('fill', 'white')
      .style('font-family', 'var(--font-sans)')
      .style('font-weight', '600')
      .text(d => (d.type === 'person' ? 'P' : 'L'))
  }, [
    graphData,
    hoveredNode,
    hoveredLink,
    handleNodeClick,
    handleLinkClick,
    handleNodeContextMenu,
    handleLinkContextMenu,
    handleDragStart,
    handleDrag,
    handleDragEnd,
    setHoveredNode,
    setHoveredLink,
  ])

  // Handle clicks outside context menu
  useEffect(() => {
    if (contextMenu) {
      const handleClick = (): void => handleCloseContextMenu()
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

  const handleFilterSelect = (type: 'entity' | 'type', value: string): void => {
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

  const clearFilters = (): void => {
    setFilterOptions({})
    setSearchQuery('')
  }

  const hasActiveFilters = searchQuery || filterOptions.entityId || filterOptions.relationshipType

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>{mode === 'relationships' ? '関係グラフ' : '接続マップ'}</h2>

        <div className={styles.controls}>
          {/* Search */}
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon} aria-hidden="true">
              ⌕
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="検索..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="グラフを検索"
            />
          </div>

          {/* Filter */}
          <div className={styles.filterDropdown}>
            <button
              className={styles.filterButton}
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              aria-label="フィルター"
              aria-expanded={showFilterMenu}
            >
              フィルター
              {hasActiveFilters && <span className={styles.filterBadge} aria-hidden="true" />}
            </button>

            {showFilterMenu && (
              <div className={styles.filterMenu} role="menu">
                <div className={styles.filterSection}>
                  <div className={styles.filterSectionTitle}>
                    {mode === 'relationships' ? '人物' : '場所'}で絞込
                  </div>
                  {availableFilters.entityOptions.map(entity => (
                    <div
                      key={entity.id}
                      className={`${styles.filterOption} ${
                        filterOptions.entityId === entity.id ? styles.active : ''
                      }`}
                      onClick={() => handleFilterSelect('entity', entity.id)}
                      role="menuitemcheckbox"
                      aria-checked={filterOptions.entityId === entity.id}
                    >
                      {entity.name}
                    </div>
                  ))}
                </div>

                {availableFilters.typeOptions.length > 0 && (
                  <>
                    <div className={styles.filterMenuDivider} />
                    <div className={styles.filterSection}>
                      <div className={styles.filterSectionTitle}>タイプで絞込</div>
                      {availableFilters.typeOptions.map(type => (
                        <div
                          key={type}
                          className={`${styles.filterOption} ${
                            filterOptions.relationshipType === type ? styles.active : ''
                          }`}
                          onClick={() => handleFilterSelect('type', type)}
                          role="menuitemcheckbox"
                          aria-checked={filterOptions.relationshipType === type}
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
                    <div className={styles.filterOption} onClick={clearFilters} role="menuitem">
                      フィルターをクリア
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mode Toggle */}
          <div className={styles.modeToggle} role="group" aria-label="表示モード">
            <button
              className={`${styles.modeButton} ${mode === 'relationships' ? styles.active : ''}`}
              onClick={() => setMode('relationships')}
              aria-pressed={mode === 'relationships'}
            >
              関係
            </button>
            <button
              className={`${styles.modeButton} ${mode === 'connections' ? styles.active : ''}`}
              onClick={() => setMode('connections')}
              aria-pressed={mode === 'connections'}
            >
              接続
            </button>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div className={styles.graphContainer}>
        {graphData.nodes.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon} aria-hidden="true">
              {mode === 'relationships' ? '◎' : '◇'}
            </div>
            <p className={styles.emptyText}>
              {mode === 'relationships' ? '関係性がありません' : '接続がありません'}
            </p>
            <p className={styles.emptyHint}>
              {mode === 'relationships'
                ? '人物同士の関係性を追加するとここに表示されます'
                : '場所同士の接続を追加するとここに表示されます'}
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
          onClick={e => e.stopPropagation()}
          role="menu"
        >
          {contextMenu.type === 'node' ? (
            <>
              <div className={styles.contextMenuItem} role="menuitem">
                すべての接続を表示
              </div>
              <div className={styles.contextMenuItem} role="menuitem">
                {(contextMenu.item as GraphNode).type === 'person' ? '人物' : '場所'}を編集
              </div>
            </>
          ) : (
            <>
              <div className={styles.contextMenuItem} role="menuitem">
                {mode === 'relationships' ? '関係性' : '接続'}を編集
              </div>
              <div className={styles.contextMenuDivider} />
              <div
                className={`${styles.contextMenuItem} ${styles.danger}`}
                onClick={() => handleDelete((contextMenu.item as GraphLink).id)}
                role="menuitem"
              >
                削除
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
              {mode === 'relationships' ? '関係性の詳細' : '接続の詳細'}
            </h3>
            <button
              className={styles.closeButton}
              onClick={() => setSelectedItem(null)}
              aria-label="詳細パネルを閉じる"
            >
              ✕
            </button>
          </div>

          <div className={styles.detailsContent}>
            <div className={styles.detailsSection}>
              <div className={styles.detailsSectionTitle}>情報</div>

              <div className={styles.detailsField}>
                <div className={styles.detailsLabel}>タイプ</div>
                <div className={styles.detailsValue}>
                  <span className={styles.typePill}>{selectedItem.type}</span>
                </div>
              </div>

              {mode === 'relationships' && 'person1Id' in selectedItem && (
                <div className={styles.detailsField}>
                  <div className={styles.detailsLabel}>対象</div>
                  <div className={styles.detailsValue}>
                    {graphData.nodes.find(n => n.id === selectedItem.person1Id)?.name || '不明'} &{' '}
                    {graphData.nodes.find(n => n.id === selectedItem.person2Id)?.name || '不明'}
                  </div>
                </div>
              )}

              {mode === 'connections' && 'location1Id' in selectedItem && (
                <div className={styles.detailsField}>
                  <div className={styles.detailsLabel}>対象</div>
                  <div className={styles.detailsValue}>
                    {graphData.nodes.find(n => n.id === selectedItem.location1Id)?.name || '不明'} &{' '}
                    {graphData.nodes.find(n => n.id === selectedItem.location2Id)?.name || '不明'}
                  </div>
                </div>
              )}

              <div className={styles.detailsField}>
                <div className={styles.detailsLabel}>強度</div>
                <input
                  type="range"
                  className={styles.strengthSlider}
                  min="0"
                  max="1"
                  step="0.1"
                  value={selectedItem.strength || 0.5}
                  onChange={e => handleUpdateStrength(selectedItem.id, parseFloat(e.target.value))}
                  aria-label="関係強度"
                />
                <div className={styles.detailsValue}>
                  {((selectedItem.strength || 0.5) * 100).toFixed(0)}%
                </div>
              </div>

              {selectedItem.description && (
                <div className={styles.detailsField}>
                  <div className={styles.detailsLabel}>説明</div>
                  <div className={styles.detailsValue}>{selectedItem.description}</div>
                </div>
              )}
            </div>

            <div className={styles.actionButtons}>
              <button className={styles.actionButton}>編集</button>
              <button
                className={`${styles.actionButton} ${styles.danger}`}
                onClick={() => handleDelete(selectedItem.id)}
                aria-label="削除"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RelationshipEditor
