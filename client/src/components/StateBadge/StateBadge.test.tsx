import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuctionInfo } from '../../api/types'
import { StateBadge } from './StateBadge'

const NOW = new Date('2026-09-19T12:00:00Z')
const HOUR = 3600_000

const base: AuctionInfo = {
  state: 'live',
  startsAt: new Date(NOW.getTime() - 24 * HOUR).toISOString(),
  endsAt: new Date(NOW.getTime() + 3 * HOUR + 12 * 60_000).toISOString(),
  startingBid: 14500, currentBid: 22800, bidCount: 16, minimumBid: 23300, increment: 500,
  hasReserve: true, reserveMet: false, buyNowPrice: null, sold: false, yourStatus: 'none',
}

beforeEach(() => vi.useFakeTimers({ now: NOW }))
afterEach(() => vi.useRealTimers())

describe('StateBadge', () => {
  it('shows a live countdown to the end', () => {
    render(<StateBadge auction={base} />)
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByText('ends in 3h 12m')).toBeInTheDocument()
  })

  it('counts down to the start for upcoming lots', () => {
    render(<StateBadge auction={{ ...base, state: 'upcoming', startsAt: new Date(NOW.getTime() + 2 * 24 * HOUR + 4 * HOUR).toISOString() }} />)
    expect(screen.getByText('Upcoming')).toBeInTheDocument()
    expect(screen.getByText('starts in 2d 4h')).toBeInTheDocument()
  })

  it('shows Sold over any state and Ended with no timer', () => {
    const { rerender } = render(<StateBadge auction={{ ...base, sold: true }} />)
    expect(screen.getByText('Sold')).toBeInTheDocument()
    expect(screen.queryByText(/ends in/)).not.toBeInTheDocument()

    rerender(<StateBadge auction={{ ...base, state: 'ended' }} />)
    expect(screen.getByText('Ended')).toBeInTheDocument()
    expect(screen.queryByText(/in /)).not.toBeInTheDocument()
  })
})
