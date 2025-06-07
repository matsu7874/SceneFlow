import React, { useState } from 'react'
import { MapEditor } from '../components/MapEditor'
import { useAppContext } from '../contexts/AppContext'
import { useVisualFeedback } from '../contexts/VisualFeedbackContext'
import { Location } from '../types'
import './MapEditorPage.css'

export const MapEditorPage: React.FC = () => {
  const { storyData, setStoryData } = useAppContext()
  const { showNotification } = useVisualFeedback()
  const [showGuide, setShowGuide] = useState(true)

  const handleMapSave = (mapData: { locations: Location[]; connections: { from: string; to: string; weight: number; bidirectional: boolean }[] }) => {
    if (storyData) {
      // Convert map editor format to story data format
      const connectionMap = new Map<string, Set<number>>()

      // Initialize with empty sets for all locations
      mapData.locations.forEach(loc => {
        connectionMap.set(loc.id.toString(), new Set<number>())
      })

      // Process all connections
      mapData.connections.forEach(conn => {
        const fromId = conn.from
        const toId = parseInt(conn.to)

        // Add forward connection
        connectionMap.get(fromId)?.add(toId)

        // Add reverse connection if bidirectional
        if (conn.bidirectional) {
          connectionMap.get(conn.to)?.add(parseInt(fromId))
        }
      })

      // Create updated locations with connections and coordinates
      const updatedLocations = mapData.locations.map(loc => ({
        id: typeof loc.id === 'string' ? parseInt(loc.id) : loc.id,
        name: loc.name,
        connections: Array.from(connectionMap.get(loc.id.toString()) || []),
        x: loc.x,
        y: loc.y,
      }))

      setStoryData({
        ...storyData,
        locations: updatedLocations,
      })

      showNotification('マップデータを保存しました', { type: 'success' })
    }
  }

  const convertToMapEditorFormat = () => {
    if (!storyData) return undefined

    // Convert story data locations to map editor format
    const locations: Location[] = storyData.locations.map((loc, index) => ({
      id: loc.id.toString(),
      name: loc.name,
      // Use saved coordinates or arrange in a grid pattern initially
      x: loc.x ?? (200 + (index % 3) * 200),
      y: loc.y ?? (200 + Math.floor(index / 3) * 150),
      description: '',
      tags: [],
    }))

    // Convert connections to bidirectional format
    const connections: { from: string; to: string; weight: number; bidirectional: boolean }[] = []
    const connectionSet = new Set<string>()

    storyData.locations.forEach(loc => {
      loc.connections.forEach(targetId => {
        const connectionKey = `${Math.min(loc.id, targetId)}-${Math.max(loc.id, targetId)}`
        if (!connectionSet.has(connectionKey)) {
          connectionSet.add(connectionKey)
          connections.push({
            from: loc.id.toString(),
            to: targetId.toString(),
            weight: 1,
            bidirectional: true,
          })
        }
      })
    })

    return { locations, connections }
  }

  return (
    <div className="page map-editor-page">
      <h2>マップエディタ</h2>
      <div className="page-content">
        {storyData ? (
          <>
            <MapEditor
              initialData={convertToMapEditorFormat()}
              onSave={handleMapSave}
              width={800}
              height={600}
            />

            {/* 操作ガイドパネル */}
            <div className={`operation-guide ${showGuide ? '' : 'collapsed'}`}>
              <div className="guide-header" onClick={() => setShowGuide(!showGuide)}>
                <h3>操作ガイド</h3>
                <span className="toggle-icon">{showGuide ? '▼' : '▲'}</span>
              </div>

              {showGuide && (
                <div className="guide-content">
                  <div className="guide-section">
                    <h4>基本操作</h4>
                    <ul>
                      <li><strong>ダブルクリック</strong>: 新規ノード作成</li>
                      <li><strong>ドラッグ</strong>: キャンバス移動</li>
                      <li><strong>マウスホイール</strong>: ズーム</li>
                      <li><strong>右クリック</strong>: コンテキストメニュー</li>
                    </ul>
                  </div>

                  <div className="guide-section">
                    <h4>ノード操作</h4>
                    <ul>
                      <li><strong>クリック</strong>: ノード選択</li>
                      <li><strong>Shift+クリック</strong>: 複数選択</li>
                      <li><strong>Shift+ドラッグ</strong>: 範囲選択</li>
                      <li><strong>ノードをドラッグ</strong>: 位置変更</li>
                      <li><strong>ノードをダブルクリック</strong>: ノード編集</li>
                      <li><strong>Delete/Backspace</strong>: 選択中のノード削除</li>
                    </ul>
                  </div>

                  <div className="guide-section">
                    <h4>接続操作</h4>
                    <ul>
                      <li><strong>Ctrl/Cmd+ノードクリック</strong>: 接続開始</li>
                      <li><strong>Connectボタン → ノードクリック</strong>: 接続モード</li>
                      <li><strong>Delete/Backspace</strong>: 選択中の接続削除</li>
                    </ul>
                  </div>

                  <div className="guide-section">
                    <h4>その他の機能</h4>
                    <ul>
                      <li><strong>Ctrl/Cmd+Z</strong>: 元に戻す</li>
                      <li><strong>Ctrl/Cmd+Shift+Z</strong>: やり直し</li>
                      <li><strong>Ctrl/Cmd+A</strong>: すべて選択</li>
                      <li><strong>Esc</strong>: 操作キャンセル</li>
                    </ul>
                  </div>

                  <div className="guide-section">
                    <h4>レイアウト</h4>
                    <ul>
                      <li><strong>Grid</strong>: グリッド配置</li>
                      <li><strong>Circle</strong>: 円形配置</li>
                      <li><strong>Force-Directed</strong>: 力学的配置</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="no-data-message">
            <p>データが読み込まれていません。シミュレーションページで物語データを読み込んでください。</p>
          </div>
        )}
      </div>
    </div>
  )
}