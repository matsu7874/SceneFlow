import React from 'react'
import { useAppContext } from '../contexts/AppContext'
import { SpatialView } from '../components/SpatialView/SpatialView'
import styles from '../components/SpatialView/SpatialView.module.css'

export const SpatialPage: React.FC = () => {
  const { storyData } = useAppContext()

  return (
    <div className="page spatial-page">
      {/* 計器的なページ見出し（overline + title パターン） */}
      <header className={styles.pageHeader}>
        <span className={styles.pageEyebrow}>Visualization</span>
        <h2 className={styles.pageTitle}>空間ビュー</h2>
        <p className={styles.pageHint}>
          各人物の動線を物理配置上に表示します。赤い場所は破綻が起きた地点です。
        </p>
      </header>

      {storyData ? (
        <SpatialView storyData={storyData} />
      ) : (
        <div className={styles.noData} role="status">
          <p className={styles.noDataText}>
            データが読み込まれていません。シミュレーションページで物語データを読み込んでください。
          </p>
        </div>
      )}
    </div>
  )
}
