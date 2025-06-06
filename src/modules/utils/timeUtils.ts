export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0

  // HH:MM:SS形式
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
    const [h, m, s] = timeStr.split(':').map(Number)
    return h * 60 + m + s / 60
  }

  // HH:MM形式
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  return 0
}

export function minutesToTime(totalMinutes: number): string {
  if (totalMinutes < 0) totalMinutes = 0
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const m = Math.floor(totalMinutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}