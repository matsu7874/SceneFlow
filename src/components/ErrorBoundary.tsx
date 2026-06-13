import React, { Component, ErrorInfo, ReactNode } from 'react'
import { STORY_STORAGE_KEY } from '../contexts/storyPersistence'

interface Props {
  children: ReactNode
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  // 壊れた保存データが原因のクラッシュは再読み込みだけではループするため、初期化の退避経路を用意する
  private handleResetData = (): void => {
    if (!window.confirm('保存されている物語データを削除して再読み込みします。よろしいですか？')) {
      return
    }
    try {
      window.localStorage.removeItem(STORY_STORAGE_KEY)
    } catch {
      // localStorage が使えない環境では削除できないが、再読み込み自体は試みる
    }
    window.location.reload()
  }

  public render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo ?? { componentStack: '' })
      }

      return (
        <div
          style={{
            padding: '20px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
          }}
        >
          <h2>エラーが発生しました</h2>
          <p>
            ページの表示中に問題が発生しました。再読み込みで直らない場合は、保存データの初期化を試してください。
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button type="button" onClick={() => window.location.reload()}>
              再読み込み
            </button>
            <button type="button" onClick={this.handleResetData}>
              データを初期化して再読み込み
            </button>
          </div>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>エラー詳細</summary>
            {this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      )
    }

    return this.props.children
  }
}
