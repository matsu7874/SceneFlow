import React from 'react'
import { CausalityView } from '../components/CausalityView'
import { useAppContext } from '../contexts/AppContext'
import { ErrorBoundary } from '../components/ErrorBoundary'

const headerStyle: React.CSSProperties = {
  marginBottom: 'var(--space-5)',
  paddingBottom: 'var(--space-4)',
  borderBottom: '1px solid var(--line)',
  position: 'relative',
}

const eyebrowStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
  fontFamily: 'var(--font-sans)',
}

const titleStyle: React.CSSProperties = {
  margin: '0.2rem 0 0.3rem',
  fontFamily: 'var(--font-sans)',
  fontWeight: 700,
  fontSize: '1.5rem',
  lineHeight: 1.2,
  color: 'var(--ink)',
}

const hintStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.88rem',
  lineHeight: 1.65,
  color: 'var(--ink-2)',
  fontFamily: 'var(--font-sans)',
}

const accentBarStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  bottom: -1,
  width: '3rem',
  height: '2px',
  background: 'var(--accent)',
}

const emptyStyle: React.CSSProperties = {
  marginTop: 'var(--space-5)',
  padding: 'var(--space-6) var(--space-5)',
  textAlign: 'center',
  background: 'var(--color-background)',
  border: '1px dashed var(--line-strong)',
  borderRadius: 'var(--r-lg)',
  color: 'var(--ink-3)',
  fontSize: '0.9rem',
  fontFamily: 'var(--font-sans)',
}

export const CausalityPage: React.FC = () => {
  const { storyData } = useAppContext()

  if (!storyData) {
    return (
      <div className="page causality-page">
        <header style={headerStyle}>
          <span style={eyebrowStyle}>分析</span>
          <div style={accentBarStyle} aria-hidden="true" />
          <h2 style={titleStyle}>因果関係ビュー</h2>
        </header>
        <div style={emptyStyle}>
          <p style={{ margin: 0 }}>
            物語データが読み込まれていません。先にシミュレーションページでデータを読み込んでください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page causality-page">
      <header style={headerStyle}>
        <span style={eyebrowStyle}>分析</span>
        <div style={accentBarStyle} aria-hidden="true" />
        <h2 style={titleStyle}>因果関係ビュー</h2>
        <p style={hintStyle}>
          事実・証言の依存グラフ。ノードを選択すると上流・下流が強調されます。
        </p>
      </header>
      <div className="page-content">
        <ErrorBoundary>
          <CausalityView storyData={storyData} />
        </ErrorBoundary>
      </div>
    </div>
  )
}
