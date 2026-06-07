import { useCallback } from 'react'
import { useAppContext } from '../contexts/AppContext'
import { useVisualFeedback } from '../contexts/VisualFeedbackContext'
import { normalizeStoryData } from '../utils/normalizeStoryData'
import { SAMPLES } from '../data/samples'

/**
 * サンプル物語データを読み込む共通フック。
 * オンボーディング・空状態など、どの画面からでも同じ手順でサンプルを投入できる。
 * 読み込み時に normalizeStoryData を通して参照整合性を整える。
 */
export function useLoadSample(): (sampleId: string) => void {
  const { setStoryData } = useAppContext()
  const { showNotification } = useVisualFeedback()

  return useCallback(
    (sampleId: string) => {
      const sample = SAMPLES.find(s => s.id === sampleId)
      if (!sample) {
        showNotification('サンプルが見つかりませんでした', { type: 'error' })
        return
      }
      setStoryData(normalizeStoryData(sample.data))
      showNotification(`${sample.label}のサンプルを読み込みました`, { type: 'success' })
    },
    [setStoryData, showNotification],
  )
}
