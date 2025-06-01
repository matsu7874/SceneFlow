import { useState, useEffect, useCallback, useRef } from 'react'
import { StoryData, Event, Act, Person } from '../types/StoryData'

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

export const useSimulation = (storyData: StoryData | null) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [simulationState, setSimulationState] = useState<SimulationState>({
    currentTime: 0,
    personPositions: new Map(),
    logEntries: []
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 時間をフォーマット
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // 時刻文字列を分に変換
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
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
          text: ` は ${location.name} にいます (初期状態)`
        })
      }
    })

    setSimulationState({
      currentTime: 0,
      personPositions: initialPositions,
      logEntries: initialLogs
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
          text: ` は ${location.name} にいます (初期状態)`
        })
      }
    })

    // イベントを時間順に処理
    const sortedEvents = [...storyData.events].sort((a, b) => {
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
          text: logText
        })
      }
    })

    setSimulationState({
      currentTime: targetTime,
      personPositions: positions,
      logEntries: logs
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
    storyData.events.forEach(event => {
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
          const newTime = prev.currentTime + speed
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
    changeSpeed
  }
}