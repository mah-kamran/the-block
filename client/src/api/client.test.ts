import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, BidRejectedError, api } from './client'
import type { BidRejected } from './types'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => fetchMock.mockReset())

describe('api client', () => {
  it('sends JSON with the session cookie and parses the body', async () => {
    fetchMock.mockResolvedValue(json({ id: 'u-alice' }))
    await expect(api.me()).resolves.toEqual({ id: 'u-alice' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/me')
    expect(init).toMatchObject({ credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } })
  })

  it('turns a 409 into BidRejectedError carrying the server rejection', async () => {
    const rejection: BidRejected = { reason: 'below_minimum', message: 'Minimum bid is $23,300.', minimumBid: 23300, currentBid: 22800 }
    fetchMock.mockResolvedValue(json(rejection, 409))
    const err = await api.placeBid('v1', 100).catch((e) => e)
    expect(err).toBeInstanceOf(BidRejectedError)
    expect(err.status).toBe(409)
    expect(err.message).toBe(rejection.message)
    expect(err.rejection).toEqual(rejection)
  })

  it('surfaces the server message for other failures, with the status', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Invalid username or password.' }, 401))
    const err = await api.login('alice', 'wrong').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).not.toBeInstanceOf(BidRejectedError)
    expect(err.status).toBe(401)
    expect(err.message).toBe('Invalid username or password.')
  })

  it('falls back to status text when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500, statusText: 'Internal Server Error' }))
    await expect(api.myBids()).rejects.toMatchObject({ status: 500, message: '500 Internal Server Error' })
  })

  it('builds the inventory query string: repeats arrays, drops blanks', async () => {
    fetchMock.mockResolvedValue(json({ items: [] }))
    await api.listVehicles({ q: '', make: ['Ford', 'Subaru'], state: [], minPrice: 10000, maxPrice: undefined, sort: 'most_bids', page: 2 })
    const url = String(fetchMock.mock.calls[0][0])
    const params = new URLSearchParams(url.slice(url.indexOf('?') + 1))
    expect(params.getAll('make')).toEqual(['Ford', 'Subaru'])
    expect(params.get('minPrice')).toBe('10000')
    expect(params.get('sort')).toBe('most_bids')
    expect(params.get('page')).toBe('2')
    expect(params.has('q')).toBe(false)
    expect(params.has('state')).toBe(false)
    expect(params.has('maxPrice')).toBe(false)
  })
})
