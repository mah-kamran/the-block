export type AuctionState = 'upcoming' | 'live' | 'ended'
export type BuyerStatus = 'none' | 'high_bidder' | 'outbid' | 'won'
export type TitleStatus = 'clean' | 'rebuilt' | 'salvage'

export interface AuctionInfo {
  state: AuctionState
  startsAt: string
  endsAt: string
  startingBid: number
  currentBid: number | null
  bidCount: number
  minimumBid: number
  increment: number
  hasReserve: boolean
  reserveMet: boolean
  buyNowPrice: number | null
  sold: boolean
  yourStatus: BuyerStatus
}

export interface VehicleSummary {
  id: string
  lot: string
  title: string
  year: number
  make: string
  model: string
  trim: string
  bodyStyle: string
  odometerKm: number
  titleStatus: TitleStatus
  conditionGrade: number
  city: string
  province: string
  image: string
  auction: AuctionInfo
}

export interface BidView {
  amount: number
  placedAt: string
  isYou: boolean
}

export interface VehicleDetail extends Omit<VehicleSummary, 'image'> {
  vin: string
  exteriorColor: string
  interiorColor: string
  engine: string
  transmission: string
  drivetrain: string
  fuelType: string
  conditionReport: string
  damageNotes: string[]
  sellingDealership: string
  images: string[]
  recentBids: BidView[]
}

export interface FacetValue {
  value: string
  count: number
}

export interface PriceRange {
  min: number
  max: number
}

export interface Facets {
  /** Bounds of current-or-starting price across the matching set, before the price filter. */
  price: PriceRange
  state: FacetValue[]
  make: FacetValue[]
  bodyStyle: FacetValue[]
  province: FacetValue[]
  titleStatus: FacetValue[]
}

export interface PagedVehicles {
  items: VehicleSummary[]
  total: number
  page: number
  pageSize: number
  facets: Facets
}

export type SortKey =
  | 'ending_soon'
  | 'price_asc'
  | 'price_desc'
  | 'year_desc'
  | 'odometer_asc'
  | 'newly_listed'
  | 'most_bids'

export interface VehicleQuery {
  q?: string
  make?: string[]
  bodyStyle?: string[]
  province?: string[]
  state?: string[]
  titleStatus?: string[]
  minPrice?: number
  maxPrice?: number
  /** Keep only the N most-bid vehicles from the filtered set. */
  top?: number
  sort?: SortKey
  page?: number
  pageSize?: number
}

export type BidRejectionReason =
  | 'not_live'
  | 'sold'
  | 'below_minimum'
  | 'not_on_increment'
  | 'exceeds_buy_now'
  | 'already_high_bidder'

export interface BidRejected {
  reason: BidRejectionReason
  message: string
  minimumBid: number
  currentBid: number | null
}

export interface User {
  id: string
  username: string
  displayName: string
}

export interface MyBid {
  vehicle: VehicleSummary
  yourHighestBid: number
  lastBidAt: string
}
