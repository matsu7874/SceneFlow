import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import { VisualFeedbackProvider } from './contexts/VisualFeedbackContext'
import { MapBackgroundProvider } from './contexts/MapBackgroundContext'
import { Navigation } from './components/Navigation'
import { NotificationDisplay } from './components/NotificationDisplay'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SimulationPage } from './pages/SimulationPage'
import { DataPage } from './pages/DataPage'
import { CausalityPage } from './pages/CausalityPage'
import { EntitiesPage } from './pages/EntitiesPage'
import { ValidationPage } from './pages/ValidationPage'
import { QuickLogPage } from './pages/QuickLogPage'
import { OpportunityPage } from './pages/OpportunityPage'
import { SpaceWorkspacePage } from './pages/SpaceWorkspacePage'
import { RelationshipsPage } from './pages/RelationshipsPage'
import './App.css'

// ページ単位で ErrorBoundary を張る。ルート全体を1枚で包むとクラッシュ時に
// ナビゲーションごと使えなくなるが、ページ単位なら他ページへ退避できる。
const withBoundary = (page: React.ReactElement): React.ReactElement => (
  <ErrorBoundary>{page}</ErrorBoundary>
)

/**
 * Scene-Flow メインアプリケーションコンポーネント
 */
function App(): React.ReactNode {
  return (
    // GitHub Pages のサブパス配信（base: /scene-flow/）でもルーティングが機能するようにする
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
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
                  <Route path="/simulation" element={withBoundary(<SimulationPage />)} />
                  <Route path="/data" element={withBoundary(<DataPage />)} />
                  <Route path="/causality" element={withBoundary(<CausalityPage />)} />
                  <Route path="/entities" element={withBoundary(<EntitiesPage />)} />
                  <Route path="/relationships" element={withBoundary(<RelationshipsPage />)} />
                  <Route path="/space" element={withBoundary(<SpaceWorkspacePage />)} />
                  {/* 旧ルートは空間ワークスペースへ統合（後方互換のためリダイレクト） */}
                  <Route path="/map-editor" element={<Navigate to="/space" replace />} />
                  <Route path="/spatial" element={<Navigate to="/space" replace />} />
                  <Route path="/validation" element={withBoundary(<ValidationPage />)} />
                  <Route path="/opportunity" element={withBoundary(<OpportunityPage />)} />
                  <Route path="/log" element={withBoundary(<QuickLogPage />)} />
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
