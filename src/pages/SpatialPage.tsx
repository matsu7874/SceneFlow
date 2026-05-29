import React from 'react'
import { useAppContext } from '../contexts/AppContext'
import { SpatialView } from '../components/SpatialView/SpatialView'

export const SpatialPage: React.FC = () => {
  const { storyData } = useAppContext()
  if (!storyData) {
    return (
      <div className="page spatial-page">
        <h2>空間ビュー</h2>
        <div className="no-data-message">
          <p>
            データが読み込まれていません。シミュレーションページで物語データを読み込んでください。
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="page spatial-page">
      <h2>空間ビュー</h2>
      <SpatialView storyData={storyData} />
    </div>
  )
}
