import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from './client'
import type { User } from './types'

export const authKeys = { me: ['auth', 'me'] as const }

/** The signed-in user, or null when anonymous. A 401 is a normal answer here, not an error. */
export function useMe() {
  return useQuery<User | null>({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        return await api.me()
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null
        throw e
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/** Everything that says "you" depends on who is signed in, so identity changes drop the whole cache. */
function useResetIdentity() {
  const qc = useQueryClient()
  return async (user: User | null) => {
    qc.clear()
    qc.setQueryData(authKeys.me, user)
    await qc.invalidateQueries({ queryKey: ['vehicles'] })
  }
}

export function useLogin() {
  const reset = useResetIdentity()
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) => api.login(username, password),
    onSuccess: (user) => reset(user),
  })
}

export function useLogout() {
  const reset = useResetIdentity()
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => reset(null),
  })
}

export function useMyBids(enabled: boolean) {
  return useQuery({ queryKey: ['me', 'bids'], queryFn: api.myBids, enabled, refetchInterval: 15_000 })
}
