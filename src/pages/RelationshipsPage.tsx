import React, { useState } from 'react'
import { RelationshipEditor } from '../components/RelationshipEditor'
import { CharacterRelationshipDiagram } from '../components/CharacterRelationshipDiagram'
import { useAppContext } from '../contexts/AppContext'
import styles from './RelationshipsPage.module.css'

export const RelationshipsPage: React.FC = () => {
  const { storyData } = useAppContext()
  const [viewMode, setViewMode] = useState<'diagram' | 'editor'>('diagram')

  if (!storyData) {
    return (
      <div className={`page relationships-page ${styles.pageRoot}`}>
        <div className={styles.pageHeader}>
          <span className={styles.pageEyebrow}>Relationships</span>
          <h2 className={styles.pageTitle}>関係性</h2>
        </div>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            ◎
          </span>
          <p className={styles.emptyTitle}>データが読み込まれていません</p>
          <p className={styles.emptyHint}>
            シミュレーションページで物語データを読み込んでください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`page relationships-page ${styles.pageRoot}`}>
      {/* ページ見出し */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <span className={styles.pageEyebrow}>Relationships</span>
          <h2 className={styles.pageTitle}>関係性</h2>
        </div>

        {/* ビュー切替タブ */}
        <div className={styles.viewTabs} role="tablist" aria-label="表示切替">
          <button
            className={`${styles.viewTab} ${viewMode === 'diagram' ? styles.active : ''}`}
            onClick={() => setViewMode('diagram')}
            role="tab"
            aria-selected={viewMode === 'diagram'}
            aria-controls="relationships-panel"
          >
            相関図
          </button>
          <button
            className={`${styles.viewTab} ${viewMode === 'editor' ? styles.active : ''}`}
            onClick={() => setViewMode('editor')}
            role="tab"
            aria-selected={viewMode === 'editor'}
            aria-controls="relationships-panel"
          >
            エディタ
          </button>
        </div>
      </div>

      {/* コンテンツパネル */}
      <div id="relationships-panel" className={styles.pageContent} role="tabpanel">
        {viewMode === 'diagram' ? (
          <CharacterRelationshipDiagram persons={storyData.persons} />
        ) : (
          <RelationshipEditor initialMode="relationships" />
        )}
      </div>
    </div>
  )
}
