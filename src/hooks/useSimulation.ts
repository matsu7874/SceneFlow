import { useState, useEffect, useCallback, useRef } from 'react'
import { StoryData } from '../types/StoryData'
import { generateEventsFromActs } from '../utils/eventGeneration'

interface SimulationState {
  currentTime: number
  personPositions: Map<number, number>
  logEntries: LogEntry[]
}

interface LogEntry {
  time: string
  personId: number
  text: string
}

export const useSimulation = (storyData: StoryData | null): {
  isPlaying: boolean
  speed: number
  currentTime: number
  personPositions: Map<number, number>
  logEntries: LogEntry[]
  maxTime: number
  formatTime: (minutes: number) => string
  togglePlayPause: () => void
  setCurrentTime: (time: number) => void
  changeSpeed: (newSpeed: number) => void
} => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [simulationState, setSimulationState] = useState<SimulationState>({
    currentTime: 0,
    personPositions: new Map(),
    logEntries: [],
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 時間をフォーマット（分単位の値をhh:mm:ss形式に変換）
  const formatTime = (minutes: number): string => {
    const totalSeconds = Math.round(minutes * 60)
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 時刻文字列を分に変換（秒も考慮）
  const timeToMinutes = (timeStr: string): number => {
    const parts = timeStr.split(':').map(Number)
    const hours = parts[0] || 0
    const minutes = parts[1] || 0
    const seconds = parts[2] || 0
    return hours * 60 + minutes + seconds / 60
  }

  // 初期化
  useEffect(() => {
    if (!storyData) return

    // 初期位置を設定
    const initialPositions = new Map<number, number>()
    const initialLogs: LogEntry[] = []

    storyData.initialStates.forEach(state => {
      initialPositions.set(state.personId, state.locationId)

      const person = storyData.persons.find(p => p.id === state.personId)
      const location = storyData.locations.find(l => l.id === state.locationId)

      if (person && location) {
        initialLogs.push({
          time: state.time,
          personId: state.personId,
          text: ` は ${location.name} にいます (初期状態)`,
        })
      }
    })

    setSimulationState({
      currentTime: 0,
      personPositions: initialPositions,
      logEntries: initialLogs,
    })
  }, [storyData])

  // シミュレーションの更新
  const updateSimulation = useCallback((targetTime: number) => {
    if (!storyData) return

    const positions = new Map<number, number>()
    const logs: LogEntry[] = []

    // 初期状態をコピー
    storyData.initialStates.forEach(state => {
      positions.set(state.personId, state.locationId)

      const person = storyData.persons.find(p => p.id === state.personId)
      const location = storyData.locations.find(l => l.id === state.locationId)

      if (person && location) {
        logs.push({
          time: state.time,
          personId: state.personId,
          text: ` は ${location.name} にいます (初期状態)`,
        })
      }
    })

    // イベントを時間順に処理
    const events = generateEventsFromActs(storyData.acts || [])
    const sortedEvents = [...events].sort((a, b) => {
      const timeA = timeToMinutes(a.eventTime)
      const timeB = timeToMinutes(b.eventTime)
      return timeA - timeB
    })

    sortedEvents.forEach(event => {
      const eventTimeMinutes = timeToMinutes(event.eventTime)
      if (eventTimeMinutes > targetTime) return

      const act = storyData.acts.find(a => a.id === event.actId)
      if (!act) return

      // 位置を更新
      positions.set(act.personId, act.locationId)

      // ログエントリを作成
      const person = storyData.persons.find(p => p.id === act.personId)
      const location = storyData.locations.find(l => l.id === act.locationId)

      if (person && location) {
        let logText = ` @ ${location.name}: ${act.description}`

        if (act.interactedPersonId) {
          const interactedPerson = storyData.persons.find(p => p.id === act.interactedPersonId)
          logText += ` (対象: ${interactedPerson?.name || '不明'})`
        }

        if (act.propId) {
          const prop = storyData.props.find(p => p.id === act.propId)
          logText += ` (小道具: ${prop?.name || '不明'})`
        }

        if (act.informationId) {
          const info = storyData.informations.find(i => i.id === act.informationId)
          logText += ` (情報: ${info?.content || '不明'})`
        }

        logs.push({
          time: event.eventTime,
          personId: act.personId,
          text: logText,
        })
      }
    })

    setSimulationState({
      currentTime: targetTime,
      personPositions: positions,
      logEntries: logs,
    })
  }, [storyData])

  // 時間変更
  const setCurrentTime = useCallback((time: number) => {
    updateSimulation(time)
  }, [updateSimulation])

  // 再生/一時停止
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  // 速度変更
  const changeSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed)
  }, [])

  // 最大時間を計算
  const getMaxTime = useCallback((): number => {
    if (!storyData) return 0

    let maxTime = 0
    const events = generateEventsFromActs(storyData.acts || [])
    events.forEach(event => {
      const time = timeToMinutes(event.eventTime)
      if (time > maxTime) maxTime = time
    })

    return maxTime + 60 // 最後のイベントから1時間余裕を持たせる
  }, [storyData])

  // 再生処理
  useEffect(() => {
    if (isPlaying && storyData) {
      intervalRef.current = setInterval(() => {
        setSimulationState(prev => {
          // 速度設定に基づいて時間を進める
          // 1x = 1秒で1秒進む (実時間と同じ)
          // 2x = 1秒で2秒進む (実時間の2倍速)
          // 5x = 1秒で5秒進む (実時間の5倍速)
          // 10x = 1秒で10秒進む (実時間の10倍速)
          const timeIncrement = (speed * 0.1) / 60 // 100msごとに秒単位で進め、分に変換
          const newTime = prev.currentTime + timeIncrement
          const maxTime = getMaxTime()

          if (newTime >= maxTime) {
            setIsPlaying(false)
            return prev
          }

          updateSimulation(newTime)
          return { ...prev, currentTime: newTime }
        })
      }, 100) // 100msごとに更新
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, speed, storyData, updateSimulation, getMaxTime])

  return {
    isPlaying,
    speed,
    currentTime: simulationState.currentTime,
    personPositions: simulationState.personPositions,
    logEntries: simulationState.logEntries,
    maxTime: getMaxTime(),
    formatTime,
    togglePlayPause,
    setCurrentTime,
    changeSpeed,
  }
}