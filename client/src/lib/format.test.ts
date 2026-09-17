import { describe, expect, it } from 'vitest'
import { formatDuration, formatKm, formatMoney, shortProvince } from './format'

describe('format', () => {
  it('formats CAD without cents', () => {
    expect(formatMoney(22800)).toBe('$22,800')
  })
  it('formats kilometres', () => {
    expect(formatKm(47731)).toBe('47,731 km')
  })
  it('formats durations by magnitude', () => {
    expect(formatDuration(2 * 86400_000 + 4 * 3600_000)).toBe('2d 4h')
    expect(formatDuration(3 * 3600_000 + 12 * 60_000)).toBe('3h 12m')
    expect(formatDuration(8 * 60_000 + 45_000)).toBe('08:45')
    expect(formatDuration(-5000)).toBe('00:00')
  })
  it('abbreviates provinces it knows', () => {
    expect(shortProvince('British Columbia')).toBe('BC')
    expect(shortProvince('Yukon')).toBe('Yukon')
  })
})
