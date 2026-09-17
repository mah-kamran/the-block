import type { AuctionInfo, VehicleDetail } from '../api/types'

/** Mirror of the server's increment bands so the panel can validate instantly. The server remains authoritative. */
export function incrementFor(currentBid: number | null): number {
  if (currentBid === null) return 0
  if (currentBid < 10_000) return 250
  if (currentBid < 50_000) return 500
  return 1_000
}

/** Step used for quick-bid buttons; on a fresh auction fall back to the band the starting bid sits in. */
export function quickStep(a: AuctionInfo): number {
  return a.increment || incrementFor(a.startingBid) || 250
}

export type LocalValidation =
  | { ok: true }
  | { ok: false; message: string }

export function validateLocally(a: AuctionInfo, amount: number): LocalValidation {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: 'Enter a bid amount.' }
  if (!Number.isInteger(amount)) return { ok: false, message: 'Whole dollars only.' }
  if (amount < a.minimumBid) return { ok: false, message: `Minimum bid is ${fmt(a.minimumBid)}.` }
  if (a.buyNowPrice !== null && amount >= a.buyNowPrice)
    return { ok: false, message: `That’s at or above Buy Now (${fmt(a.buyNowPrice)}). Use Buy Now instead.` }
  if (a.currentBid !== null && a.increment > 0 && (amount - a.currentBid) % a.increment !== 0)
    return { ok: false, message: `Bids move in steps of ${fmt(a.increment)} from ${fmt(a.currentBid)}.` }
  return { ok: true }
}

export function seedBidCount(v: VehicleDetail): number {
  return v.auction.bidCount - v.recentBids.length
}

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
