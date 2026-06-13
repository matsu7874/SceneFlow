import { useCallback } from 'react'
import { useAppContext } from '../contexts/AppContext'
import { useVisualFeedback } from '../contexts/VisualFeedbackContext'
import { SAMPLES } from '../data/samples'

/**
 * サンプル物語データを読み込む共通フック。
 * オンボーディング・空状態など、どの画面からでも同じ手順でサンプルを投入できる。
 * 参照整合性の正規化は setStoryData 内で一元的に行われる。
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
      setStoryData(sample.data)
      showNotification(`${sample.label}のサンプルを読み込みました`, { type: 'success' })
    },
    [setStoryData, showNotification],
  )
}
