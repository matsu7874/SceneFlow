import React from 'react'
import { CausalityView } from '../components/CausalityView'
import { useAppContext } from '../contexts/AppContext'
import { ErrorBoundary } from '../components/ErrorBoundary'

export const CausalityPage: React.FC = () => {
  const { storyData } = useAppContext()

  if (!storyData) {
    return (
      <div className="page causality-page">
        <h2>Causality Analysis</h2>
        <div className="no-data-message">
          <p>No story data loaded. Please load data from the Simulation page first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page causality-page">
      <h2>Causality Analysis</h2>
      <div className="page-content">
        <ErrorBoundary>
          <CausalityView storyData={storyData} />
        </ErrorBoundary>
      </div>
    </div>
  )
}