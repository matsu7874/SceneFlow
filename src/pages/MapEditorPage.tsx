import React from 'react'
import { MapEditor } from '../components/MapEditor'
import { useAppContext } from '../contexts/AppContext'

export const MapEditorPage: React.FC = () => {
  const { storyData, setStoryData } = useAppContext()

  const handleMapUpdate = (mapData: any) => {
    if (storyData) {
      // Update story data with new map information
      setStoryData({
        ...storyData,
        // Add map data to story data structure if needed
      })
    }
  }

  return (
    <div className="page map-editor-page">
      <h2>Map Editor</h2>
      <div className="page-content">
        {storyData ? (
          <MapEditor />
        ) : (
          <div className="no-data-message">
            <p>No story data loaded. Please load data from the Simulation page first.</p>
          </div>
        )}
      </div>
    </div>
  )
}