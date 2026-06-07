import React, { useState } from 'react'
import { StoryData, createEmptyStoryData } from '../types/StoryData'
import { validateStoryData } from '../utils/validation'
import { normalizeStoryData } from '../utils/normalizeStoryData'
import { useVisualFeedback } from '../contexts/VisualFeedbackContext'
import { SAMPLES } from '../data/samples'
import './JsonDataInput.css'

interface JsonDataInputProps {
  onDataLoad: (data: StoryData) => void
  currentData?: StoryData | null
}

export const JsonDataInput: React.FC<JsonDataInputProps> = ({ onDataLoad, currentData }) => {
  // 画面上で入力されている内容（currentData = storyData）をそのまま表示する。
  // 何も入力されていない場合は空の物語データを示す。
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(currentData ?? createEmptyStoryData(), null, 2),
  )
  const [error, setError] = useState<string | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(true)
  const { showNotification } = useVisualFeedback()

  // 各ページでの編集（イベント入力・エンティティ編集など）に追従してJSON表示を更新する
  React.useEffect(() => {
    setJsonText(JSON.stringify(currentData ?? createEmptyStoryData(), null, 2))
  }, [currentData, JSON.stringify(currentData)])

  const handleLoadData = (): void => {
    try {
      const data = JSON.parse(jsonText) as StoryData
      const validationResult = validateStoryData(data)

      if (validationResult.isValid) {
        setError(null)
        onDataLoad(normalizeStoryData(data))
        showNotification('データが正常にロードされました', { type: 'success' })
      } else {
        setError(validationResult.errors.join('\n'))
        showNotification('データの検証に失敗しました', { type: 'error' })
      }
    } catch (e) {
      setError(`JSONの解析に失敗しました: ${e instanceof Error ? e.message : 'Unknown error'}`)
      showNotification('JSONの解析に失敗しました', { type: 'error' })
    }
  }

  return (
    <div className="json-data-input">
      <details open={isDetailsOpen} onToggle={e => setIsDetailsOpen(e.currentTarget.open)}>
        <summary>
          <h2>物語データ (JSON)</h2>
        </summary>
        <div className="input-content">
          <textarea
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            placeholder="ここにJSON形式の物語データを入力してください..."
          />
          <div className="json-data-input-actions">
            <button onClick={handleLoadData}>物語データをロード</button>
            {SAMPLES.map(sample => (
              <button
                key={sample.id}
                type="button"
                className="sample-button"
                title={sample.description}
                onClick={() => setJsonText(JSON.stringify(sample.data, null, 2))}
              >
                {sample.label}のサンプルを入力
              </button>
            ))}
          </div>
          {error && <div className="error-output">{error}</div>}
        </div>
      </details>
    </div>
  )
}
