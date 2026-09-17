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

export function useVehicle(id: string, opts?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => api.getVehicle(id),
    refetchInterval: opts?.refetchInterval ?? false,
  })
}
