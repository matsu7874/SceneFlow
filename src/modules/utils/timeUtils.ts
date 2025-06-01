export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(totalMinutes: number): string {
  if (totalMinutes < 0) totalMinutes = 0
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const m = Math.floor(totalMinutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}