import type { BidView } from '../../api/types'
import { formatDateTime, formatMoney } from '../../lib/format'
import styles from './BidHistory.module.css'

interface Props {
  bids: BidView[]
  seedCount: number
  seedHigh: number | null
}

/**
 * The dataset seeds a bid count and a high bid without individual records; we show
 * them as one summary row rather than inventing a history.
 */
export function BidHistory({ bids, seedCount, seedHigh }: Props) {
  if (bids.length === 0 && seedCount === 0) {
    return <p className={styles.empty}>No bids yet. Be the first.</p>
  }
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Bid</th>
          <th scope="col">Bidder</th>
          <th scope="col">Time</th>
        </tr>
      </thead>
      <tbody>
        {bids.map((b, i) => (
          <tr key={`${b.placedAt}-${b.amount}`} className={i === 0 ? styles.lead : undefined}>
            <td className={styles.amount}>{formatMoney(b.amount)}</td>
            <td>{b.isYou ? <span className={styles.you}>You</span> : 'Another buyer'}</td>
            <td className={styles.time}>{formatDateTime(b.placedAt)}</td>
          </tr>
        ))}
        {seedCount > 0 && (
          <tr className={styles.seed}>
            <td className={styles.amount}>{seedHigh !== null ? formatMoney(seedHigh) : '—'}</td>
            <td colSpan={2}>
              {seedCount} earlier bid{seedCount === 1 ? '' : 's'} before you arrived
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
