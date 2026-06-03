import React from 'react'
import { ValidationReporter } from '../components/ValidationReporter'
import { useAppContext } from '../contexts/AppContext'
import styles from '../components/ValidationReporter/ValidationReporter.module.css'

export const ValidationPage: React.FC = () => {
  const { storyData } = useAppContext()

  return (
    <div className="page validation-page">
      <div className="page-content">
        {/* ページ見出し */}
        <header className={styles.pageHeader}>
          <span className={styles.pageEyebrow}>Diagnostics</span>
          <h2 className={styles.pageTitle}>検証</h2>
          <p className={styles.pageHint}>
            物語の因果・動線・所持・情報の整合性をリアルタイムで検査します。
          </p>
        </header>

        {storyData ? (
          <ValidationReporter storyData={storyData} />
        ) : (
          <div className="no-data-message">
            <p>
              物語データが読み込まれていません。先にシミュレーションページでデータを読み込んでください。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
