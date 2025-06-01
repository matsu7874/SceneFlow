import { describe, it, expect } from 'vitest'
import { timeToMinutes, minutesToTime } from '../../src/modules/utils/timeUtils'

describe('timeUtils', () => {
  describe('timeToMinutes', () => {
    it('should convert valid time string to minutes', () => {
      expect(timeToMinutes('00:00')).toBe(0)
      expect(timeToMinutes('01:00')).toBe(60)
      expect(timeToMinutes('09:15')).toBe(555)
      expect(timeToMinutes('23:59')).toBe(1439)
    })

    it('should return 0 for invalid time strings', () => {
      expect(timeToMinutes('')).toBe(0)
      expect(timeToMinutes('invalid')).toBe(0)
      expect(timeToMinutes('12')).toBe(0)
      expect(timeToMinutes('12:5')).toBe(0) // Missing leading zero
    })

    it('should calculate minutes even for invalid hour/minute values', () => {
      expect(timeToMinutes('25:00')).toBe(1500) // 25 * 60
      expect(timeToMinutes('12:60')).toBe(780) // 12 * 60 + 60
    })

    it('should handle edge cases', () => {
      expect(timeToMinutes('00:00')).toBe(0)
      expect(timeToMinutes('24:00')).toBe(1440) // 24 hours is technically parseable
      expect(timeToMinutes(null as any)).toBe(0)
      expect(timeToMinutes(undefined as any)).toBe(0)
    })
  })

  describe('minutesToTime', () => {
    it('should convert minutes to time string', () => {
      expect(minutesToTime(0)).toBe('00:00')
      expect(minutesToTime(60)).toBe('01:00')
      expect(minutesToTime(555)).toBe('09:15')
      expect(minutesToTime(1439)).toBe('23:59')
    })

    it('should handle negative values', () => {
      expect(minutesToTime(-1)).toBe('00:00')
      expect(minutesToTime(-60)).toBe('00:00')
    })

    it('should handle large values', () => {
      expect(minutesToTime(1440)).toBe('24:00') // 24 hours
      expect(minutesToTime(1500)).toBe('25:00') // More than 24 hours
    })

    it('should pad single digits with zeros', () => {
      expect(minutesToTime(5)).toBe('00:05')
      expect(minutesToTime(65)).toBe('01:05')
    })
  })

  describe('round trip conversion', () => {
    it('should convert back and forth correctly', () => {
      const times = ['00:00', '09:30', '12:45', '23:59']
      times.forEach(time => {
        const minutes = timeToMinutes(time)
        const convertedBack = minutesToTime(minutes)
        expect(convertedBack).toBe(time)
      })
    })
  })
})