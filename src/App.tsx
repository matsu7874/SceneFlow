import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import { VisualFeedbackProvider } from './contexts/VisualFeedbackContext'
import { MapBackgroundProvider } from './contexts/MapBackgroundContext'
import { Navigation } from './components/Navigation'
import { NotificationDisplay } from './components/NotificationDisplay'
import { SimulationPage } from './pages/SimulationPage'
import { CausalityPage } from './pages/CausalityPage'
import { EntitiesPage } from './pages/EntitiesPage'
import { MapEditorPage } from './pages/MapEditorPage'
import { ValidationPage } from './pages/ValidationPage'
import { QuickLogPage } from './pages/QuickLogPage'
import './App.css'

/**
 * Scene-Flow メインアプリケーションコンポーネント
 */
function App(): React.ReactNode {
  return (
    <BrowserRouter>
      <AppProvider>
        <VisualFeedbackProvider>
          <MapBackgroundProvider>
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
                  <Route path="/validation" element={<ValidationPage />} />
                  <Route path="/log" element={<QuickLogPage />} />
                </Routes>
              </main>

              <NotificationDisplay />
            </div>
          </MapBackgroundProvider>
        </VisualFeedbackProvider>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
