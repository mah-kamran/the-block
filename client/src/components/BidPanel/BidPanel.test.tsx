import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { VehicleDetail } from '../../api/types'
import { BidPanel } from './BidPanel'

const vehicle: VehicleDetail = {
  id: 'v1', lot: 'A-0043', vin: 'VIN', title: '2023 Ford Bronco Big Bend', year: 2023, make: 'Ford', model: 'Bronco', trim: 'Big Bend',
  bodyStyle: 'SUV', odometerKm: 47731, titleStatus: 'clean', conditionGrade: 3.8, city: 'Toronto', province: 'Ontario',
  exteriorColor: '', interiorColor: '', engine: '', transmission: '', drivetrain: '', fuelType: '', conditionReport: '',
  damageNotes: [], sellingDealership: 'King City Auto', images: [], recentBids: [],
  auction: {
    state: 'live', startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 3600_000).toISOString(),
    startingBid: 14500, currentBid: 22800, bidCount: 16, minimumBid: 23300, increment: 500,
    hasReserve: true, reserveMet: false, buyNowPrice: null, sold: false, yourStatus: 'none',
  },
}

function setup(overrides: Partial<VehicleDetail['auction']> = {}) {
  const onPlaceBid = vi.fn().mockResolvedValue(undefined)
  const onBuyNow = vi.fn().mockResolvedValue(undefined)
  render(
    <BidPanel
      vehicle={{ ...vehicle, auction: { ...vehicle.auction, ...overrides } }}
      onPlaceBid={onPlaceBid}
      onBuyNow={onBuyNow}
      placing={false}
      buying={false}
      error={null}
    />,
  )
  return { onPlaceBid, onBuyNow }
}

describe('BidPanel', () => {
  it('defaults to the minimum bid and confirms before placing', async () => {
    const user = userEvent.setup()
    const { onPlaceBid } = setup()
    expect(screen.getByLabelText('Your bid')).toHaveValue('23,300')
    await user.click(screen.getByRole('button', { name: 'Review bid' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Place a bid of $23,300?')
    await user.click(screen.getByRole('button', { name: 'Confirm bid' }))
    expect(onPlaceBid).toHaveBeenCalledWith(23300)
  })

  it('blocks review when the amount is invalid and explains why', async () => {
    const user = userEvent.setup()
    setup()
    const input = screen.getByLabelText('Your bid')
    await user.clear(input)
    await user.type(input, '23400')
    expect(screen.getByText(/steps of \$500/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review bid' })).toBeDisabled()
  })

  it('hides the form when the auction is not live', () => {
    setup({ state: 'upcoming' })
    expect(screen.queryByRole('button', { name: 'Review bid' })).not.toBeInTheDocument()
    expect(screen.getByText(/Bidding opens in/)).toBeInTheDocument()
  })

  it('shows the outbid message with the amount needed to retake the lead', () => {
    setup({ yourStatus: 'outbid' })
    expect(screen.getByText(/outbid/i)).toHaveTextContent('$23,300')
  })
})
