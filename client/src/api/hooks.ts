import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { VehicleQuery } from './types'

export const vehicleKeys = {
  all: ['vehicles'] as const,
  list: (query: VehicleQuery) => ['vehicles', 'list', query] as const,
  detail: (id: string) => ['vehicles', 'detail', id] as const,
}

export function useVehicles(query: VehicleQuery) {
  return useQuery({
    queryKey: vehicleKeys.list(query),
    queryFn: () => api.listVehicles(query),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
}

/** Detail view. While the auction is live we poll so outbids surface without a refresh. */
export function useVehicle(id: string, opts?: { livePollMs?: number }) {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => api.getVehicle(id),
    refetchInterval: (query) => {
      const a = query.state.data?.auction
      return opts?.livePollMs && a?.state === 'live' && !a.sold ? opts.livePollMs : false
    },
  })
}
