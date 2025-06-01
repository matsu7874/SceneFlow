import React, { useState } from 'react'
import { StoryData } from '../types/StoryData'
import { validateStoryData } from '../utils/validation'
import './JsonDataInput.css'

interface JsonDataInputProps {
  onDataLoad: (data: StoryData) => void
}

const defaultJsonData = {
  persons: [
    { id: 1, name: "アリス", color: "#e6194b" },
    { id: 2, name: "ボブ", color: "#3cb44b" },
    { id: 3, name: "キャロル", color: "#4363d8" }
  ],
  locations: [
    { id: 101, name: "ロビー", connections: [102, 103] },
    { id: 102, name: "書斎", connections: [101] },
    { id: 103, name: "庭園", connections: [101, 104] },
    { id: 104, name: "秘密の部屋", connections: [103] }
  ],
  props: [
    { id: 201, name: "古い鍵" },
    { id: 202, name: "日記帳" }
  ],
  informations: [
    { id: 301, content: "秘密の部屋の存在" },
    { id: 302, content: "鍵の隠し場所" }
  ],
  initialStates: [
    { personId: 1, locationId: 101, time: "09:00" },
    { personId: 2, locationId: 102, time: "09:00" },
    { personId: 3, locationId: 103, time: "09:00" }
  ],
  acts: [
    { id: 1001, personId: 1, locationId: 101, time: "09:05", description: "ロビーを見回す" },
    { id: 1002, personId: 2, locationId: 102, time: "09:10", description: "机の引き出しを調べる", propId: 201, informationId: 302 },
    { id: 1003, personId: 3, locationId: 103, time: "09:15", description: "アリスと庭園で会話する", interactedPersonId: 1 },
    { id: 1004, personId: 1, locationId: 103, time: "09:15", description: "キャロルと庭園で会話する", interactedPersonId: 3, informationId: 301 },
    { id: 1005, personId: 2, locationId: 101, time: "09:20", description: "ロビーでアリスに鍵について尋ねる", interactedPersonId: 1, propId: 201 },
    { id: 1006, personId: 1, locationId: 101, time: "09:20", description: "ボブから鍵について尋ねられる", interactedPersonId: 2, propId: 201 },
    { id: 1007, personId: 1, locationId: 103, time: "09:30", description: "庭園の隠し通路を探す", informationId: 301 },
    { id: 1008, personId: 1, locationId: 104, time: "09:35", description: "秘密の部屋に入る" },
    { id: 1009, personId: 3, locationId: 103, time: "09:16", description: "庭園を散策する" },
    { id: 1010, personId: 2, locationId: 101, time: "09:21", description: "ロビーで考え事をしている" }
  ],
  moves: [],
  stays: [],
  events: [
    { id: 1, triggerType: "時刻", triggerValue: "09:05", eventTime: "09:05", personId: 1, actId: 1001 },
    { id: 2, triggerType: "時刻", triggerValue: "09:10", eventTime: "09:10", personId: 2, actId: 1002 },
    { id: 3, triggerType: "時刻", triggerValue: "09:15", eventTime: "09:15", personId: 3, actId: 1003 },
    { id: 4, triggerType: "時刻", triggerValue: "09:15", eventTime: "09:15", personId: 1, actId: 1004 },
    { id: 5, triggerType: "時刻", triggerValue: "09:20", eventTime: "09:20", personId: 2, actId: 1005 },
    { id: 6, triggerType: "時刻", triggerValue: "09:20", eventTime: "09:20", personId: 1, actId: 1006 },
    { id: 7, triggerType: "行動", triggerValue: "1004", eventTime: "09:30", personId: 1, actId: 1007 },
    { id: 8, triggerType: "行動", triggerValue: "1007", eventTime: "09:35", personId: 1, actId: 1008 },
    { id: 9, triggerType: "時刻", triggerValue: "09:16", eventTime: "09:16", personId: 3, actId: 1009 },
    { id: 10, triggerType: "時刻", triggerValue: "09:21", eventTime: "09:21", personId: 2, actId: 1010 }
  ]
}

export const JsonDataInput: React.FC<JsonDataInputProps> = ({ onDataLoad }) => {
  const [jsonText, setJsonText] = useState(JSON.stringify(defaultJsonData, null, 2))
  const [error, setError] = useState<string | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(true)

  const handleLoadData = () => {
    try {
      const data = JSON.parse(jsonText)
      const validationResult = validateStoryData(data)
      
      if (validationResult.isValid) {
        setError(null)
        onDataLoad(data)
      } else {
        setError(validationResult.errors.join('\n'))
      }
    } catch (e) {
      setError(`JSONパースエラー: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="json-data-input">
      <details open={isDetailsOpen} onToggle={(e) => setIsDetailsOpen(e.currentTarget.open)}>
        <summary>
          <h2>物語データ (JSON)</h2>
        </summary>
        <div className="input-content">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="ここにJSON形式の物語データを入力してください..."
          />
          <button onClick={handleLoadData}>物語データをロード</button>
          {error && (
            <div className="error-output">
              {error}
            </div>
          )}
        </div>
      </details>
    </div>
  )
}