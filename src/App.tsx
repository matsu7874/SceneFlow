import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import { VisualFeedbackProvider } from './contexts/VisualFeedbackContext'
import { Navigation } from './components/Navigation'
import { NotificationDisplay } from './components/NotificationDisplay'
import { SimulationPage } from './pages/SimulationPage'
import { CausalityPage } from './pages/CausalityPage'
import { EntitiesPage } from './pages/EntitiesPage'
import { MapEditorPage } from './pages/MapEditorPage'
import { RelationshipsPage } from './pages/RelationshipsPage'
import { ValidationPage } from './pages/ValidationPage'
import './App.css'

/**
 * Scene-Flow メインアプリケーションコンポーネント
 */
function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <VisualFeedbackProvider>
          <div className="app">
            <header className="app-header">
              <h1>Scene-Flow</h1>
              <Navigation />
            </header>

            <main className="app-main">
              <Routes>
                <Route path="/" element={<Navigate to="/simulation" replace />} />
                <Route path="/simulation" element={<SimulationPage />} />
                <Route path="/causality" element={<CausalityPage />} />
                <Route path="/entities" element={<EntitiesPage />} />
                <Route path="/map-editor" element={<MapEditorPage />} />
                <Route path="/relationships" element={<RelationshipsPage />} />
                <Route path="/validation" element={<ValidationPage />} />
              </Routes>
            </main>

            <NotificationDisplay />
          </div>
        </VisualFeedbackProvider>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App