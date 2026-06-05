import type { StoryData } from '../types/StoryData'
import { generateEventsFromActs } from './eventGeneration'

export interface SimulationRange {
  minTime: number
  maxTime: number
}

// "HH:MM" / "HH:MM:SS" を分に変換（秒は小数分に丸めず分換算）。
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)
  const hours = parts[0] || 0
  const minutes = parts[1] || 0
  const seconds = parts[2] || 0
  return hours * 60 + minutes + seconds / 60
}

// シミュレーションのシークバー表示範囲（分）を、物語の実イベント時刻にフィットさせる。
// 0:00 固定だと深夜の1時間劇でも 0〜24 時をカバーしてしまい、本編がバーのごく一部に
// 潰れてシークが困難になる。最初のイベント手前から最後のイベント直後までに絞る。
const RANGE_PADDING_MINUTES = 5

export function computeSimulationRange(storyData: StoryData | null): SimulationRange {
  if (!storyData) return { minTime: 0, maxTime: 0 }
  const events = generateEventsFromActs(storyData.acts || [])
  if (events.length === 0) return { minTime: 0, maxTime: 0 }
  let min = Infinity
  let max = 0
  for (const event of events) {
    const t = timeToMinutes(event.eventTime)
    if (t < min) min = t
    if (t > max) max = t
  }
  return {
    minTime: Math.max(0, min - RANGE_PADDING_MINUTES),
    maxTime: max + RANGE_PADDING_MINUTES,
  }
}
