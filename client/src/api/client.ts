import type { BidRejected, MyBid, PagedVehicles, User, VehicleDetail, VehicleQuery } from './types'

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

/** Identity travels in an HttpOnly session cookie; the client never sees or sends a token. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (res.status === 409) {
    throw new BidRejectedError((await res.json()) as BidRejected)
  }
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      /* no JSON body */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
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
  me: () => request<User>('/api/auth/me'),
  login: (username: string, password: string) =>
    request<User>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  myBids: () => request<MyBid[]>('/api/me/bids'),
}
