import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { VehicleDetail } from './types'
import { vehicleKeys } from './hooks'

/** After any bid the detail is authoritative; list caches are invalidated so cards catch up. */
function useSettle(id: string) {
  const qc = useQueryClient()
  return (detail: VehicleDetail) => {
    qc.setQueryData(vehicleKeys.detail(id), detail)
    void qc.invalidateQueries({ queryKey: ['vehicles', 'list'] })
  }
}

export function usePlaceBid(id: string) {
  const settle = useSettle(id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (amount: number) => api.placeBid(id, amount),
    onSuccess: settle,
    // A 409 means our view was stale; refetch so the panel shows the real minimum.
    onError: () => void qc.invalidateQueries({ queryKey: vehicleKeys.detail(id) }),
  })
}

export function useBuyNow(id: string) {
  const settle = useSettle(id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.buyNow(id),
    onSuccess: settle,
    onError: () => void qc.invalidateQueries({ queryKey: vehicleKeys.detail(id) }),
  })
}
