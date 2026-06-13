import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../../src/components/ErrorBoundary'
import { STORY_STORAGE_KEY } from '../../src/contexts/storyPersistence'
import React from 'react'

const Bomb: React.FC = () => {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React が componentDidCatch のエラーを console.error に出すため抑制する
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('子がエラーを投げなければそのまま描画する', () => {
    render(
      <ErrorBoundary>
        <p>正常なコンテンツ</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('正常なコンテンツ')).toBeInTheDocument()
  })

  it('子がエラーを投げたらフォールバックUIを表示する', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'データを初期化して再読み込み' })).toBeInTheDocument()
  })

  it('カスタム fallback が指定されていればそれを使う', () => {
    render(
      <ErrorBoundary fallback={error => <p>カスタム: {error.message}</p>}>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.getByText('カスタム: boom')).toBeInTheDocument()
  })

  it('「データを初期化して再読み込み」で保存データを削除して再読み込みする', () => {
    window.localStorage.setItem(STORY_STORAGE_KEY, '{"persons":[]}')
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'データを初期化して再読み込み' }))

    expect(window.localStorage.getItem(STORY_STORAGE_KEY)).toBeNull()
    expect(reload).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('確認ダイアログでキャンセルしたら保存データを削除しない', () => {
    window.localStorage.setItem(STORY_STORAGE_KEY, '{"persons":[]}')
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'データを初期化して再読み込み' }))

    expect(window.localStorage.getItem(STORY_STORAGE_KEY)).toBe('{"persons":[]}')
    expect(reload).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
