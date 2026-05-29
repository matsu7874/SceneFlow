import React from 'react'
import { useQuickLog } from '../components/QuickLog/useQuickLog'
import { QuickActInput } from '../components/QuickLog/QuickActInput'
import { ActTimeline } from '../components/QuickLog/ActTimeline'

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

  if (!storyData) {
    return (
      <div className="page quick-log-page">
        <h2>イベント入力</h2>
        <div className="no-data-message">
          <p>
            データが読み込まれていません。シミュレーションページで物語データを読み込んでください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page quick-log-page">
      <h2>イベント入力</h2>
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
        onDelete={deleteAct}
      />
    </div>
  )
}
