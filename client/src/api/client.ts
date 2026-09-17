import { getBuyerId } from '../lib/buyer'
import type { BidRejected, PagedVehicles, VehicleDetail, VehicleQuery } from './types'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export class BidRejectedError extends ApiError {
  rejection: BidRejected
  constructor(rejection: BidRejected) {
    super(409, rejection.message)
    this.rejection = rejection
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Buyer-Id': getBuyerId(),
      ...init?.headers,
    },
  })
  if (res.status === 409) {
    throw new BidRejectedError((await res.json()) as BidRejected)
  }
  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

function toSearchParams(query: VehicleQuery): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '' || value === null) continue
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v))
    else params.set(key, String(value))
  }
  return params.toString()
}

export const api = {
  listVehicles: (query: VehicleQuery) => request<PagedVehicles>(`/api/vehicles?${toSearchParams(query)}`),
  getVehicle: (id: string) => request<VehicleDetail>(`/api/vehicles/${id}`),
  placeBid: (id: string, amount: number) =>
    request<VehicleDetail>(`/api/vehicles/${id}/bids`, { method: 'POST', body: JSON.stringify({ amount }) }),
  buyNow: (id: string) => request<VehicleDetail>(`/api/vehicles/${id}/buy-now`, { method: 'POST' }),
}
