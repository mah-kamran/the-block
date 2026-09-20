import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authKeys, useLogin, useLogout, useMe } from './auth'
import { ApiError, api } from './client'
import type { User } from './types'

vi.mock('./client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./client')>()
  return { ...mod, api: { ...mod.api, me: vi.fn(), login: vi.fn(), logout: vi.fn() } }
})

const mocked = api as unknown as { me: ReturnType<typeof vi.fn>; login: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> }
const alice: User = { id: 'u-alice', username: 'alice', displayName: 'Alice Chen' }

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  return { qc, wrapper }
}

beforeEach(() => {
  mocked.me.mockReset()
  mocked.login.mockReset()
  mocked.logout.mockReset()
})

describe('useMe', () => {
  it('treats 401 as anonymous rather than an error', async () => {
    mocked.me.mockRejectedValue(new ApiError(401, 'Unauthorized'))
    const { result } = renderHook(() => useMe(), setup())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
    expect(result.current.isError).toBe(false)
  })

  it('still reports other failures', async () => {
    mocked.me.mockRejectedValue(new ApiError(500, 'down'))
    const { result } = renderHook(() => useMe(), setup())
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('identity changes', () => {
  it('login drops every cached query and seeds the new user', async () => {
    mocked.login.mockResolvedValue(alice)
    const { qc, wrapper } = setup()
    qc.setQueryData(['vehicles', 'detail', 'v1'], { stale: 'from previous user' })
    qc.setQueryData(['me', 'bids'], [{ stale: true }])
    qc.setQueryData(authKeys.me, null)

    const { result } = renderHook(() => useLogin(), { wrapper })
    await act(() => result.current.mutateAsync({ username: 'alice', password: 'demo123' }))

    expect(mocked.login).toHaveBeenCalledWith('alice', 'demo123')
    expect(qc.getQueryData(['vehicles', 'detail', 'v1'])).toBeUndefined()
    expect(qc.getQueryData(['me', 'bids'])).toBeUndefined()
    expect(qc.getQueryData(authKeys.me)).toEqual(alice)
  })

  it('logout clears the cache and marks the visitor anonymous', async () => {
    mocked.logout.mockResolvedValue(undefined)
    const { qc, wrapper } = setup()
    qc.setQueryData(authKeys.me, alice)
    qc.setQueryData(['me', 'bids'], [{ mine: true }])

    const { result } = renderHook(() => useLogout(), { wrapper })
    await act(() => result.current.mutateAsync())

    expect(qc.getQueryData(['me', 'bids'])).toBeUndefined()
    expect(qc.getQueryData(authKeys.me)).toBeNull()
  })
})
