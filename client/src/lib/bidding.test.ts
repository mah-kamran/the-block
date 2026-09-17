import { describe, expect, it } from 'vitest'
import type { AuctionInfo } from '../api/types'
import { incrementFor, quickStep, validateLocally } from './bidding'

const base: AuctionInfo = {
  state: 'live',
  startsAt: '',
  endsAt: '',
  startingBid: 14500,
  currentBid: 22800,
  bidCount: 16,
  minimumBid: 23300,
  increment: 500,
  hasReserve: true,
  reserveMet: false,
  buyNowPrice: null,
  sold: false,
  yourStatus: 'none',
}

describe('bidding helpers', () => {
  it('mirrors the server increment bands', () => {
    expect(incrementFor(null)).toBe(0)
    expect(incrementFor(9999)).toBe(250)
    expect(incrementFor(10000)).toBe(500)
    expect(incrementFor(50000)).toBe(1000)
  })

  it('uses the starting bid band for quick steps on a fresh auction', () => {
    expect(quickStep({ ...base, currentBid: null, increment: 0, startingBid: 8000 })).toBe(250)
    expect(quickStep(base)).toBe(500)
  })

  it('accepts the minimum and whole increments above it', () => {
    expect(validateLocally(base, 23300)).toEqual({ ok: true })
    expect(validateLocally(base, 24800)).toEqual({ ok: true })
  })

  it('rejects below minimum, off increment, and at buy now', () => {
    expect(validateLocally(base, 23000)).toMatchObject({ ok: false, message: expect.stringContaining('Minimum') })
    expect(validateLocally(base, 23400)).toMatchObject({ ok: false, message: expect.stringContaining('steps') })
    expect(validateLocally({ ...base, buyNowPrice: 25000 }, 25000)).toMatchObject({ ok: false, message: expect.stringContaining('Buy Now') })
  })
})
