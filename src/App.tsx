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
import { ValidationPage } from './pages/ValidationPage'
import { QuickLogPage } from './pages/QuickLogPage'
import { OpportunityPage } from './pages/OpportunityPage'
import { SpaceWorkspacePage } from './pages/SpaceWorkspacePage'
import { RelationshipsPage } from './pages/RelationshipsPage'
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
                <Navigation />
              </header>

              <main className="app-main">
                <Routes>
                  <Route path="/" element={<Navigate to="/log" replace />} />
                  <Route path="/simulation" element={<SimulationPage />} />
                  <Route path="/causality" element={<CausalityPage />} />
                  <Route path="/entities" element={<EntitiesPage />} />
                  <Route path="/relationships" element={<RelationshipsPage />} />
                  <Route path="/space" element={<SpaceWorkspacePage />} />
                  {/* 旧ルートは空間ワークスペースへ統合（後方互換のためリダイレクト） */}
                  <Route path="/map-editor" element={<Navigate to="/space" replace />} />
                  <Route path="/spatial" element={<Navigate to="/space" replace />} />
                  <Route path="/validation" element={<ValidationPage />} />
                  <Route path="/opportunity" element={<OpportunityPage />} />
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
