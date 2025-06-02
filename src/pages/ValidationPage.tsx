import React from 'react'
import { ValidationReporter } from '../components/ValidationReporter'
import { useAppContext } from '../contexts/AppContext'

export const ValidationPage: React.FC = () => {
  const { storyData } = useAppContext()

  return (
    <div className="page validation-page">
      <h2>Story Validation</h2>
      <div className="page-content">
        {storyData ? (
          <ValidationReporter storyData={storyData} />
        ) : (
          <div className="no-data-message">
            <p>No story data loaded. Please load data from the Simulation page first.</p>
          </div>
        )}
      </div>
    </div>
  )
}