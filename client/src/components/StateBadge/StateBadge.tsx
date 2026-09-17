import type { AuctionInfo } from '../../api/types'
import { useNow } from '../../lib/useNow'
import { formatDuration } from '../../lib/format'
import styles from './StateBadge.module.css'

interface Props {
  auction: AuctionInfo
  /** Show the countdown next to the state label. */
  withTime?: boolean
  size?: 'sm' | 'md'
}

/** Live / Upcoming / Ended pill, optionally with a ticking countdown. */
export function StateBadge({ auction, withTime = true, size = 'sm' }: Props) {
  const now = useNow(withTime ? 1000 : 60_000)
  const { label, time } = describe(auction, now)
  return (
    <span className={`${styles.badge} ${styles[auction.state]} ${styles[size]}`}>
      {auction.state === 'live' && <span className={styles.dot} aria-hidden="true" />}
      <span>{label}</span>
      {withTime && time && <span className={styles.time}>{time}</span>}
    </span>
  )
}

function describe(a: AuctionInfo, now: number): { label: string; time?: string } {
  if (a.sold) return { label: 'Sold' }
  switch (a.state) {
    case 'live':
      return { label: 'Live', time: `ends in ${formatDuration(new Date(a.endsAt).getTime() - now)}` }
    case 'upcoming':
      return { label: 'Upcoming', time: `starts in ${formatDuration(new Date(a.startsAt).getTime() - now)}` }
    case 'ended':
      return { label: 'Ended' }
  }
}
