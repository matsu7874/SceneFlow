import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import { VisualFeedbackProvider } from './contexts/VisualFeedbackContext'
import { MapBackgroundProvider } from './contexts/MapBackgroundContext'
import { Navigation } from './components/Navigation'
import { NotificationDisplay } from './components/NotificationDisplay'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'

// ページはルート単位で遅延読み込みし、初期バンドルから分離する
// （kuromoji などページ固有の重い依存を該当ページのチャンクに閉じ込める）。
// React.lazy + Suspense を使わないのは、react-router v7 が遷移を startTransition で
// 包むため、初回サスペンド中は旧ページが表示されたままになり、ローディング表示が
// 出せないうえ E2E の assertion ポーリング下で遷移のコミットが進まなくなるため。
// useEffect + setState による読み込みならコミットが遅延されず、挙動が決定的になる。
function lazyPage<K extends string>(
  loader: () => Promise<Record<K, React.ComponentType>>,
  exportName: K,
): React.FC {
  let cached: React.ComponentType | null = null
  const LazyPage: React.FC = () => {
    const [Comp, setComp] = useState<React.ComponentType | null>(() => cached)
    useEffect(() => {
      if (Comp) return
      let mounted = true
      void loader().then(m => {
        cached = m[exportName]
        if (mounted) setComp(() => m[exportName])
      })
      return () => {
        mounted = false
      }
    }, [Comp])
    return Comp ? <Comp /> : <div className="page" aria-busy="true" />
  }
  LazyPage.displayName = `LazyPage(${exportName})`
  return LazyPage
}

const SimulationPage = lazyPage(() => import('./pages/SimulationPage'), 'SimulationPage')
const DataPage = lazyPage(() => import('./pages/DataPage'), 'DataPage')
const CausalityPage = lazyPage(() => import('./pages/CausalityPage'), 'CausalityPage')
const EntitiesPage = lazyPage(() => import('./pages/EntitiesPage'), 'EntitiesPage')
const ValidationPage = lazyPage(() => import('./pages/ValidationPage'), 'ValidationPage')
const QuickLogPage = lazyPage(() => import('./pages/QuickLogPage'), 'QuickLogPage')
const OpportunityPage = lazyPage(() => import('./pages/OpportunityPage'), 'OpportunityPage')
const SpaceWorkspacePage = lazyPage(
  () => import('./pages/SpaceWorkspacePage'),
  'SpaceWorkspacePage',
)
const RelationshipsPage = lazyPage(() => import('./pages/RelationshipsPage'), 'RelationshipsPage')

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
