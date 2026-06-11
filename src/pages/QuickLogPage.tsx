import React from 'react'
import { useQuickLog } from '../components/QuickLog/useQuickLog'
import { QuickActInput } from '../components/QuickLog/QuickActInput'
import { ActTimeline } from '../components/QuickLog/ActTimeline'
import { OnboardingBanner } from '../components/common/OnboardingBanner'
import { isStoryEmpty } from '../utils/storyState'
import { useVisualFeedback } from '../contexts/VisualFeedbackContext'
import styles from '../components/QuickLog/QuickLog.module.css'

export const QuickLogPage: React.FC = () => {
  const {
    storyData,
    sortedActs,
    breakagesByActId,
    addAct,
    updateAct,
    deleteAct,
    createPerson,
    createLocation,
  } = useQuickLog()
  const { showNotification } = useVisualFeedback()

  // 削除は1クリックで完了する分、誤操作に気付けるよう復元手段を案内する。
  const handleDelete = (id: number): void => {
    const act = storyData.acts.find(a => a.id === id)
    deleteAct(id)
    showNotification(
      `「${act?.description ?? '出来事'}」を削除しました（Ctrl+Z か右上の「元に戻す」で復元できます）`,
      { type: 'info', duration: 5000 },
    )
  }

  return (
    <div className={`page quick-log-page ${styles.logRoot}`}>
      <header className={styles.pageHeader}>
        <span className={styles.pageEyebrow}>書く</span>
        <h2 className={styles.pageTitle}>イベント入力</h2>
        <p className={styles.pageHint}>
          誰が・どこで・何をしたかを綴ると、そのまま物語データになります。データの読み込みは要りません。
        </p>
      </header>
      {isStoryEmpty(storyData) && <OnboardingBanner />}
      <QuickActInput
        persons={storyData.persons.map(p => ({ id: p.id, name: p.name }))}
        locations={storyData.locations.map(l => ({ id: l.id, name: l.name }))}
        onAdd={payload => {
          addAct(payload)
        }}
        onCreatePerson={createPerson}
        onCreateLocation={createLocation}
      />
      <ActTimeline
        acts={sortedActs}
        persons={storyData.persons}
        locations={storyData.locations}
        props={storyData.props}
        informations={storyData.informations}
        breakagesByActId={breakagesByActId}
        onUpdate={updateAct}
        onDelete={handleDelete}
      />
    </div>
  )
}
