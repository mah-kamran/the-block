const cad = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
})

const integer = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 })

export function formatMoney(amount: number): string {
  return cad.format(amount)
}

export function formatKm(km: number): string {
  return `${integer.format(km)} km`
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** "2d 4h", "3h 12m", "08:45" (under an hour). */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const PROVINCE_ABBR: Record<string, string> = {
  Ontario: 'ON',
  Quebec: 'QC',
  'British Columbia': 'BC',
  Alberta: 'AB',
  Manitoba: 'MB',
  Saskatchewan: 'SK',
  'Nova Scotia': 'NS',
  'New Brunswick': 'NB',
}

export function shortProvince(province: string): string {
  return PROVINCE_ABBR[province] ?? province
}
