import React, { useEffect, useRef, useState, useCallback } from 'react'
import styles from './MapEditor.module.css'
import { useMapEditor } from './useMapEditor'
import { Location, Connection, Point } from './types'

interface MapEditorProps {
  initialData?: {
    locations: Location[];
    connections: Connection[];
  };
  onSave?: (data: { locations: Location[]; connections: Connection[] }) => void;
  width?: number;
  height?: number;
}

export const MapEditor: React.FC<MapEditorProps> = ({
  initialData,
  onSave,
  width = 800,
  height = 600,
}) => {
  const editor = useMapEditor()
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 })
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 })
  const [showNodeEditor, setShowNodeEditor] = useState<Location | null>(null)
  const [showConnectionEditor, setShowConnectionEditor] = useState<Connection | null>(null)
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; worldX: number; worldY: number; type: 'node' | 'connection' | 'canvas'; target?: any } | null>(null)

  // Initialize with provided data
  useEffect(() => {
    if (initialData) {
      editor.importMapData(JSON.stringify(initialData))
    }
  }, [])

  // Canvas rendering
  useEffect(() => {
    const canvas = editor.canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = width
    canvas.height = height

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, width, height)

      // Save context state
      ctx.save()

      // Apply view transformation
      ctx.translate(editor.state.viewState.panX, editor.state.viewState.panY)
      ctx.scale(editor.state.viewState.zoom, editor.state.viewState.zoom)

      // Draw grid
      if (editor.state.showGrid) {
        drawGrid(ctx, width, height, editor.state.gridSize, editor.state.viewState)
      }

      // Draw connections
      editor.state.mapData.connections.forEach(conn => {
        drawConnection(ctx, conn, editor.state)
      })

      // Draw connecting line
      if (isConnecting && connectingFrom) {
        const fromNode = editor.state.mapData.locations.find(loc => loc.id === connectingFrom)
        if (fromNode) {
          const worldPos = editor.screenToWorld(mousePos.x, mousePos.y)
          ctx.strokeStyle = '#007bff'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.beginPath()
          ctx.moveTo(fromNode.x, fromNode.y)
          ctx.lineTo(worldPos.x, worldPos.y)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // Draw nodes
      editor.state.mapData.locations.forEach(location => {
        drawNode(ctx, location, editor.state)
      })

      // Draw rubber band selection
      if (editor.state.selection.rubberBand) {
        const { startX, startY, endX, endY } = editor.state.selection.rubberBand
        ctx.strokeStyle = '#007bff'
        ctx.fillStyle = 'rgba(0, 123, 255, 0.1)'
        ctx.lineWidth = 1
        ctx.strokeRect(
          Math.min(startX, endX),
          Math.min(startY, endY),
          Math.abs(endX - startX),
          Math.abs(endY - startY),
        )
        ctx.fillRect(
          Math.min(startX, endX),
          Math.min(startY, endY),
          Math.abs(endX - startX),
          Math.abs(endY - startY),
        )
      }

      // Restore context state
      ctx.restore()

      // Draw minimap
      if (editor.state.showMinimap && editor.minimapCanvasRef.current) {
        drawMinimap(editor.minimapCanvasRef.current, editor.state, width, height)
      }
    }

    render()
  }, [editor.state, width, height, isConnecting, connectingFrom, mousePos])

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()

    // Calculate the actual canvas position considering CSS scaling
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    const worldPos = editor.screenToWorld(x, y)

    // Right click - show context menu
    if (e.button === 2) {
      e.preventDefault()
      const node = editor.getNodeAt(worldPos.x, worldPos.y)
      const connection = editor.getConnectionAt(worldPos.x, worldPos.y)

      // Get container position to calculate relative position
      const containerRect = e.currentTarget.parentElement?.getBoundingClientRect()
      const menuX = containerRect ? e.clientX - containerRect.left : e.clientX
      const menuY = containerRect ? e.clientY - containerRect.top : e.clientY

      if (node) {
        setContextMenu({ x: menuX, y: menuY, worldX: worldPos.x, worldY: worldPos.y, type: 'node', target: node })
      } else if (connection) {
        setContextMenu({ x: menuX, y: menuY, worldX: worldPos.x, worldY: worldPos.y, type: 'connection', target: connection })
      } else {
        setContextMenu({ x: menuX, y: menuY, worldX: worldPos.x, worldY: worldPos.y, type: 'canvas' })
      }
      return
    }

    // Left click
    if (e.button === 0) {
      const node = editor.getNodeAt(worldPos.x, worldPos.y)

      if (isConnecting && connectingFrom && node && node.id !== connectingFrom) {
        // Complete connection
        editor.addConnection(connectingFrom, node.id)
        setIsConnecting(false)
        setConnectingFrom(null)
      } else if (node) {
        if (e.shiftKey) {
          // Add to selection (toggle)
          editor.selectNode(node.id, true)
        } else if (e.ctrlKey || e.metaKey) {
          // Start connecting
          setIsConnecting(true)
          setConnectingFrom(node.id)
        } else {
          // Select node and start dragging
          editor.selectNode(node.id)
          editor.setState(prev => ({
            ...prev,
            dragState: {
              active: true,
              nodeId: node.id,
              offsetX: worldPos.x - node.x,
              offsetY: worldPos.y - node.y,
              startX: node.x,
              startY: node.y,
            },
          }))
        }
      } else {
        // Start panning or rubber band selection
        if (e.shiftKey) {
          // Start rubber band selection
          editor.setState(prev => ({
            ...prev,
            selection: {
              ...prev.selection,
              rubberBand: {
                active: true,
                startX: worldPos.x,
                startY: worldPos.y,
                endX: worldPos.x,
                endY: worldPos.y,
              },
            },
          }))
        } else {
          // Start panning
          setIsPanning(true)
          setPanStart({ x: e.clientX, y: e.clientY })
          editor.deselectAll()
        }
      }
    }

    // Middle click - reset view
    if (e.button === 1) {
      editor.resetView()
    }
  }, [editor, isConnecting, connectingFrom])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()

    // Calculate the actual canvas position considering CSS scaling
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    setMousePos({ x, y })
    const worldPos = editor.screenToWorld(x, y)

    if (isPanning) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      editor.pan(dx, dy)
      setPanStart({ x: e.clientX, y: e.clientY })
    } else if (editor.state.dragState.active && editor.state.dragState.nodeId) {
      // Drag selected nodes
      const snappedX = editor.snapToGrid(worldPos.x - editor.state.dragState.offsetX)
      const snappedY = editor.snapToGrid(worldPos.y - editor.state.dragState.offsetY)

      const dx = snappedX - editor.state.dragState.startX
      const dy = snappedY - editor.state.dragState.startY

      // Move all selected nodes
      editor.state.selection.selectedNodes.forEach(nodeId => {
        const node = editor.state.mapData.locations.find(loc => loc.id === nodeId)
        if (node) {
          editor.updateNode(nodeId, {
            x: node.x + dx,
            y: node.y + dy,
          })
        }
      })

      editor.setState(prev => ({
        ...prev,
        dragState: {
          ...prev.dragState,
          startX: snappedX,
          startY: snappedY,
        },
      }))
    } else if (editor.state.selection.rubberBand?.active) {
      // Update rubber band
      editor.setState(prev => ({
        ...prev,
        selection: {
          ...prev.selection,
          rubberBand: {
            ...prev.selection.rubberBand!,
            endX: worldPos.x,
            endY: worldPos.y,
          },
        },
      }))
    }
  }, [editor, isPanning, panStart])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPanning(false)

    // Complete rubber band selection
    if (editor.state.selection.rubberBand?.active) {
      const rect = {
        x: Math.min(editor.state.selection.rubberBand.startX, editor.state.selection.rubberBand.endX),
        y: Math.min(editor.state.selection.rubberBand.startY, editor.state.selection.rubberBand.endY),
        width: Math.abs(editor.state.selection.rubberBand.endX - editor.state.selection.rubberBand.startX),
        height: Math.abs(editor.state.selection.rubberBand.endY - editor.state.selection.rubberBand.startY),
      }

      const selectedNodes = editor.getNodesInRectangle(rect)
      editor.setState(prev => ({
        ...prev,
        selection: {
          selectedNodes,
          selectedConnection: null,
          rubberBand: null,
        },
      }))
    }

    // End dragging
    editor.setState(prev => ({
      ...prev,
      dragState: {
        active: false,
        nodeId: null,
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
      },
    }))
  }, [editor])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    editor.setZoom(editor.state.viewState.zoom * delta)
  }, [editor])

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()

    // Calculate the actual canvas position considering CSS scaling
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    const worldPos = editor.screenToWorld(x, y)

    const node = editor.getNodeAt(worldPos.x, worldPos.y)
    const connection = editor.getConnectionAt(worldPos.x, worldPos.y)

    if (node) {
      setShowNodeEditor(node)
    } else if (connection) {
      setShowConnectionEditor(connection)
    } else {
      // Create new node
      editor.addNode(worldPos.x, worldPos.y)
    }
  }, [editor])

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu) {
        setContextMenu(null)
      }
    }

    if (contextMenu) {
      // Add a small delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside)
      }, 0)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected nodes
      if (e.key === 'Delete' || e.key === 'Backspace') {
        editor.state.selection.selectedNodes.forEach(nodeId => {
          editor.deleteNode(nodeId)
        })
        if (editor.state.selection.selectedConnection) {
          editor.deleteConnection(editor.state.selection.selectedConnection)
        }
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        editor.undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        editor.redo()
      }

      // Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        editor.selectAll()
      }

      // Cancel operations
      if (e.key === 'Escape') {
        setIsConnecting(false)
        setConnectingFrom(null)
        editor.deselectAll()
        setContextMenu(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editor])

  // Helper rendering functions
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, gridSize: number, viewState: any) => {
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 1

    const startX = Math.floor(-viewState.panX / viewState.zoom / gridSize) * gridSize
    const startY = Math.floor(-viewState.panY / viewState.zoom / gridSize) * gridSize
    const endX = startX + width / viewState.zoom + gridSize
    const endY = startY + height / viewState.zoom + gridSize

    for (let x = startX; x < endX; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, startY)
      ctx.lineTo(x, endY)
      ctx.stroke()
    }

    for (let y = startY; y < endY; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
      ctx.stroke()
    }
  }

  const drawConnection = (ctx: CanvasRenderingContext2D, connection: Connection, state: any) => {
    const from = state.mapData.locations.find((loc: Location) => loc.id === connection.from)
    const to = state.mapData.locations.find((loc: Location) => loc.id === connection.to)

    if (!from || !to) return

    const isSelected = state.selection.selectedConnection?.from === connection.from &&
                      state.selection.selectedConnection?.to === connection.to
    const isInPath = state.pathfinding.active && state.pathfinding.path &&
                     state.pathfinding.path.includes(from.id) &&
                     state.pathfinding.path.includes(to.id)

    ctx.strokeStyle = isSelected ? '#ffc107' : isInPath ? '#28a745' : '#666'
    ctx.lineWidth = isSelected ? 3 : isInPath ? 2.5 : 2

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()

    // Draw arrow for directional connections
    if (!connection.bidirectional) {
      const angle = Math.atan2(to.y - from.y, to.x - from.x)
      const headLength = 15
      const nodeRadius = 20

      // Calculate arrow position (at edge of target node)
      const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2)
      const ratio = (dist - nodeRadius) / dist
      const arrowX = from.x + (to.x - from.x) * ratio
      const arrowY = from.y + (to.y - from.y) * ratio

      ctx.beginPath()
      ctx.moveTo(arrowX, arrowY)
      ctx.lineTo(
        arrowX - headLength * Math.cos(angle - Math.PI / 6),
        arrowY - headLength * Math.sin(angle - Math.PI / 6),
      )
      ctx.moveTo(arrowX, arrowY)
      ctx.lineTo(
        arrowX - headLength * Math.cos(angle + Math.PI / 6),
        arrowY - headLength * Math.sin(angle + Math.PI / 6),
      )
      ctx.stroke()
    }

    // Draw weight label
    if (connection.weight !== 1) {
      const midX = (from.x + to.x) / 2
      const midY = (from.y + to.y) / 2

      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(midX - 15, midY - 10, 30, 20)

      ctx.fillStyle = isSelected ? '#ffc107' : '#999'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(connection.weight.toString(), midX, midY)
    }
  }

  const drawNode = (ctx: CanvasRenderingContext2D, location: Location, state: any) => {
    const isSelected = state.selection.selectedNodes.has(location.id)
    const isStart = state.pathfinding.start === location.id
    const isEnd = state.pathfinding.end === location.id
    const isInPath = state.pathfinding.path?.includes(location.id)

    const radius = 20

    // Node fill
    ctx.fillStyle = isStart ? '#007bff' : isEnd ? '#dc3545' : isSelected ? '#444' : '#333'
    ctx.beginPath()
    ctx.arc(location.x, location.y, radius, 0, Math.PI * 2)
    ctx.fill()

    // Node border
    ctx.strokeStyle = isSelected ? '#007bff' : isInPath ? '#28a745' : '#666'
    ctx.lineWidth = isSelected ? 3 : 2
    ctx.stroke()

    // Node label
    ctx.fillStyle = 'white'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(location.name, location.x, location.y)
  }

  const drawMinimap = (canvas: HTMLCanvasElement, state: any, mainWidth: number, mainHeight: number) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const minimapWidth = 200
    const minimapHeight = 150
    canvas.width = minimapWidth
    canvas.height = minimapHeight

    // Background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, minimapWidth, minimapHeight)

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    state.mapData.locations.forEach((loc: Location) => {
      minX = Math.min(minX, loc.x)
      minY = Math.min(minY, loc.y)
      maxX = Math.max(maxX, loc.x)
      maxY = Math.max(maxY, loc.y)
    })

    if (state.mapData.locations.length === 0) {
      minX = minY = 0
      maxX = mainWidth
      maxY = mainHeight
    }

    const padding = 20
    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding

    const scaleX = minimapWidth / (maxX - minX)
    const scaleY = minimapHeight / (maxY - minY)
    const scale = Math.min(scaleX, scaleY) * 0.9

    const offsetX = (minimapWidth - (maxX - minX) * scale) / 2
    const offsetY = (minimapHeight - (maxY - minY) * scale) / 2

    // Draw connections
    ctx.strokeStyle = '#444'
    ctx.lineWidth = 1
    state.mapData.connections.forEach((conn: Connection) => {
      const from = state.mapData.locations.find((loc: Location) => loc.id === conn.from)
      const to = state.mapData.locations.find((loc: Location) => loc.id === conn.to)
      if (!from || !to) return

      ctx.beginPath()
      ctx.moveTo(
        (from.x - minX) * scale + offsetX,
        (from.y - minY) * scale + offsetY,
      )
      ctx.lineTo(
        (to.x - minX) * scale + offsetX,
        (to.y - minY) * scale + offsetY,
      )
      ctx.stroke()
    })

    // Draw nodes
    ctx.fillStyle = '#666'
    state.mapData.locations.forEach((loc: Location) => {
      ctx.beginPath()
      ctx.arc(
        (loc.x - minX) * scale + offsetX,
        (loc.y - minY) * scale + offsetY,
        3,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    })

    // Draw viewport
    ctx.strokeStyle = '#007bff'
    ctx.lineWidth = 2
    ctx.strokeRect(
      (-state.viewState.panX / state.viewState.zoom - minX) * scale + offsetX,
      (-state.viewState.panY / state.viewState.zoom - minY) * scale + offsetY,
      (mainWidth / state.viewState.zoom) * scale,
      (mainHeight / state.viewState.zoom) * scale,
    )
  }

  const getCursorStyle = () => {
    if (isPanning) return styles.grabbing
    if (isConnecting) return styles.crosshair
    if (editor.state.dragState.active) return styles.grabbing
    return styles.canvas
  }

  return (
    <div className={styles.container}>
      <canvas
        ref={editor.canvasRef}
        className={`${styles.canvas} ${getCursorStyle()}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onContextMenu={e => e.preventDefault()}
      />

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <button className={styles.button} onClick={() => editor.addNode(400, 300)}>
            ノード追加
          </button>
          <button
            className={`${styles.button} ${isConnecting ? styles.active : ''}`}
            onClick={() => {
              setIsConnecting(!isConnecting)
              setConnectingFrom(null)
            }}
          >
            接続
          </button>
          <div className={styles.separator} />
          <div className={styles.layoutMenu}>
            <button
              className={styles.button}
              onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            >
              レイアウト ▼
            </button>
            {showLayoutMenu && (
              <div className={styles.layoutDropdown}>
                <div
                  className={`${styles.layoutOption} ${editor.state.layoutAlgorithm === 'manual' ? styles.active : ''}`}
                  onClick={() => {
                    setShowLayoutMenu(false)
                  }}
                >
                  手動
                </div>
                <div
                  className={styles.layoutOption}
                  onClick={() => {
                    editor.applyLayout('grid')
                    setShowLayoutMenu(false)
                  }}
                >
                  グリッド
                </div>
                <div
                  className={styles.layoutOption}
                  onClick={() => {
                    editor.applyLayout('circle')
                    setShowLayoutMenu(false)
                  }}
                >
                  円形
                </div>
                <div
                  className={styles.layoutOption}
                  onClick={() => {
                    editor.applyLayout('force')
                    setShowLayoutMenu(false)
                  }}
                >
                  力学的配置
                </div>
              </div>
            )}
          </div>
          <div className={styles.separator} />
          <button
            className={`${styles.button} ${editor.state.showGrid ? styles.active : ''}`}
            onClick={() => editor.toggleGrid()}
          >
            グリッド
          </button>
          <button
            className={`${styles.button} ${editor.state.showMinimap ? styles.active : ''}`}
            onClick={() => editor.toggleMinimap()}
          >
            ミニマップ
          </button>
        </div>

        <div className={styles.controlGroup}>
          <button
            className={styles.button}
            onClick={editor.undo}
            disabled={!editor.canUndo}
          >
            元に戻す
          </button>
          <button
            className={styles.button}
            onClick={editor.redo}
            disabled={!editor.canRedo}
          >
            やり直し
          </button>
          <div className={styles.separator} />
          <button
            className={styles.button}
            onClick={() => {
              const data = editor.exportMapData()
              navigator.clipboard.writeText(data)
            }}
          >
            エクスポート
          </button>
          <button
            className={styles.button}
            onClick={() => {
              const data = prompt('マップデータを貼り付けてください:')
              if (data) {
                editor.importMapData(data)
              }
            }}
          >
            インポート
          </button>
          {onSave && (
            <>
              <div className={styles.separator} />
              <button
                className={`${styles.button} ${styles.active}`}
                onClick={() => onSave(editor.state.mapData)}
              >
                保存
              </button>
            </>
          )}
        </div>
      </div>

      {/* Zoom controls */}
      <div className={styles.zoomControls}>
        <button
          className={`${styles.button} ${styles.iconButton}`}
          onClick={() => editor.setZoom(editor.state.viewState.zoom * 1.2)}
        >
          +
        </button>
        <div className={styles.zoomLevel}>
          {Math.round(editor.state.viewState.zoom * 100)}%
        </div>
        <button
          className={`${styles.button} ${styles.iconButton}`}
          onClick={() => editor.setZoom(editor.state.viewState.zoom * 0.8)}
        >
          -
        </button>
        <button
          className={`${styles.button} ${styles.iconButton}`}
          onClick={editor.resetView}
        >
          ⟲
        </button>
      </div>

      {/* Minimap */}
      {editor.state.showMinimap && (
        <div className={styles.minimap}>
          <canvas ref={editor.minimapCanvasRef} className={styles.minimapCanvas} />
        </div>
      )}

      {/* Stats */}
      <div className={styles.stats}>
        <div>ノード数: {editor.state.mapData.locations.length}</div>
        <div>接続数: {editor.state.mapData.connections.length}</div>
        <div>選択中: {editor.state.selection.selectedNodes.size}</div>
      </div>

      {/* Path info */}
      {editor.state.pathfinding.active && editor.state.pathfinding.path && (
        <div className={styles.pathInfo}>
          <h4>パスが見つかりました</h4>
          <div>ステップ数: {editor.state.pathfinding.path.length}</div>
          <div>
            コスト: {(() => {
              const pathfinder = new (require('./pathfinding').AStar)(
                editor.state.mapData.locations,
                editor.state.mapData.connections,
              )
              return pathfinder.getPathCost(editor.state.pathfinding.path)
            })()}
          </div>
        </div>
      )}

      {/* Node editor */}
      {showNodeEditor && (
        <div
          className={styles.nodeEditor}
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <h3>ノード編集</h3>
          <div className={styles.formGroup}>
            <label>名前</label>
            <input
              type="text"
              value={showNodeEditor.name}
              onChange={e => setShowNodeEditor({ ...showNodeEditor, name: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>説明</label>
            <textarea
              value={showNodeEditor.description || ''}
              onChange={e => setShowNodeEditor({ ...showNodeEditor, description: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>タグ (カンマ区切り)</label>
            <input
              type="text"
              value={showNodeEditor.tags?.join(', ') || ''}
              onChange={e => setShowNodeEditor({
                ...showNodeEditor,
                tags: e.target.value.split(',').map(t => t.trim()).filter(t => t),
              })}
            />
          </div>
          <div className={styles.formActions}>
            <button
              className={styles.button}
              onClick={() => setShowNodeEditor(null)}
            >
              キャンセル
            </button>
            <button
              className={`${styles.button} ${styles.active}`}
              onClick={() => {
                editor.updateNode(showNodeEditor.id, showNodeEditor)
                setShowNodeEditor(null)
              }}
            >
              保存
            </button>
          </div>
        </div>
      )}

      {/* Connection editor */}
      {showConnectionEditor && (
        <div
          className={styles.connectionEditor}
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <h3>接続編集</h3>
          <div className={styles.formGroup}>
            <label>重み</label>
            <input
              type="number"
              value={showConnectionEditor.weight}
              onChange={e => setShowConnectionEditor({
                ...showConnectionEditor,
                weight: parseFloat(e.target.value) || 1,
              })}
            />
          </div>
          <div className={styles.checkbox}>
            <input
              type="checkbox"
              id="bidirectional"
              checked={showConnectionEditor.bidirectional}
              onChange={e => setShowConnectionEditor({
                ...showConnectionEditor,
                bidirectional: e.target.checked,
              })}
            />
            <label htmlFor="bidirectional">双方向</label>
          </div>
          <div className={styles.formActions}>
            <button
              className={styles.button}
              onClick={() => setShowConnectionEditor(null)}
            >
              キャンセル
            </button>
            <button
              className={`${styles.button} ${styles.active}`}
              onClick={() => {
                editor.updateConnection(
                  {
                    from: showConnectionEditor.from,
                    to: showConnectionEditor.to,
                    weight: 1,
                    bidirectional: true,
                  },
                  showConnectionEditor,
                )
                setShowConnectionEditor(null)
              }}
            >
              保存
            </button>
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          {contextMenu.type === 'canvas' && (
            <>
              <div
                className={styles.contextMenuItem}
                onClick={() => {
                  // Use the stored world coordinates
                  editor.addNode(contextMenu.worldX, contextMenu.worldY)
                  setContextMenu(null)
                }}
              >
                ここにノード追加
              </div>
              <div
                className={styles.contextMenuItem}
                onClick={() => {
                  const data = editor.exportMapData()
                  navigator.clipboard.writeText(data)
                  setContextMenu(null)
                }}
              >
                マップをエクスポート
              </div>
            </>
          )}
          {contextMenu.type === 'node' && (
            <>
              <div
                className={styles.contextMenuItem}
                onClick={() => {
                  setShowNodeEditor(contextMenu.target)
                  setContextMenu(null)
                }}
              >
                ノード編集
              </div>
              <div
                className={styles.contextMenuItem}
                onClick={() => {
                  if (!editor.state.pathfinding.start) {
                    editor.setState(prev => ({
                      ...prev,
                      pathfinding: {
                        ...prev.pathfinding,
                        active: true,
                        start: contextMenu.target.id,
                      },
                    }))
                  } else if (!editor.state.pathfinding.end && contextMenu.target.id !== editor.state.pathfinding.start) {
                    editor.findPath(editor.state.pathfinding.start, contextMenu.target.id)
                  }
                  setContextMenu(null)
                }}
              >
                {!editor.state.pathfinding.start ? 'パス開始点に設定' :
                  editor.state.pathfinding.start === contextMenu.target.id ? 'パス開始点' : 'パス終了点に設定'}
              </div>
              <div className={styles.contextMenuSeparator} />
              <div
                className={styles.contextMenuItem}
                onClick={() => {
                  editor.deleteNode(contextMenu.target.id)
                  setContextMenu(null)
                }}
              >
                ノード削除
              </div>
            </>
          )}
          {contextMenu.type === 'connection' && (
            <>
              <div
                className={styles.contextMenuItem}
                onClick={() => {
                  setShowConnectionEditor(contextMenu.target)
                  setContextMenu(null)
                }}
              >
                接続編集
              </div>
              <div
                className={styles.contextMenuItem}
                onClick={() => {
                  editor.deleteConnection(contextMenu.target)
                  setContextMenu(null)
                }}
              >
                接続削除
              </div>
            </>
          )}
          <div className={styles.contextMenuSeparator} />
          <div
            className={styles.contextMenuItem}
            onClick={() => setContextMenu(null)}
          >
            キャンセル
          </div>
        </div>
      )}

      {/* Help text removed - now using dedicated guide panel */}
    </div>
  )
}