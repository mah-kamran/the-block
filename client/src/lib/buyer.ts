const KEY = 'the-block.buyer-id'

/** No accounts in this prototype: a stable anonymous id per browser stands in for the buyer. */
export function getBuyerId(): string {
  try {
    const existing = localStorage.getItem(KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    return 'anonymous'
  }
}
