import React from 'react'
import { ValidationReporter } from '../components/ValidationReporter'
import { useAppContext } from '../contexts/AppContext'

export const ValidationPage: React.FC = () => {
  const { storyData } = useAppContext()

  return (
    <div className="page validation-page">
      <h2>検証</h2>
      <div className="page-content">
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
