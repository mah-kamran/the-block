import { Link, Navigate } from 'react-router-dom'
import { useMe, useMyBids } from '../api/auth'
import type { BuyerStatus, MyBid } from '../api/types'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { VehicleCard } from '../components/VehicleCard/VehicleCard'
import { formatMoney } from '../lib/format'
import styles from './MyBidsPage.module.css'

const GROUPS: { status: BuyerStatus; title: string; hint: string }[] = [
  { status: 'outbid', title: 'Outbid', hint: 'Someone has passed you. Bid again to retake the lead.' },
  { status: 'high_bidder', title: 'Leading', hint: 'You hold the high bid on these live auctions.' },
  { status: 'won', title: 'Won', hint: 'Auctions that closed with you as the winner.' },
  { status: 'none', title: 'Closed', hint: 'Ended auctions you bid on but did not win.' },
]

export function MyBidsPage() {
  const { data: me, isPending: mePending } = useMe()
  const { data, isPending, isError } = useMyBids(!!me)

  if (mePending) return null
  if (!me) return <Navigate to="/login" state={{ from: '/my-bids' }} replace />

  if (isError) return <EmptyState tone="error" title="Couldn’t load your bids" description="Please try again." />
  if (isPending) return <p className={styles.muted}>Loading your bids…</p>
  if (data.length === 0) {
    return (
      <EmptyState
        title="You haven’t bid on anything yet"
        description="Find a live auction and place your first bid."
        action={<Link to="/?state=live" className={styles.link}>Browse live auctions</Link>}
      />
    )
  }

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>My bids</h1>
        <p className={styles.muted}>{data.length} vehicle{data.length === 1 ? '' : 's'} · signed in as {me.displayName}</p>
      </header>
      {GROUPS.map((g) => {
        const items = data.filter((b) => b.vehicle.auction.yourStatus === g.status)
        if (items.length === 0) return null
        return (
          <section key={g.status} className={styles.group} aria-labelledby={`g-${g.status}`}>
            <h2 id={`g-${g.status}`} className={styles.h2}>
              {g.title} <span className={styles.count}>{items.length}</span>
            </h2>
            <p className={styles.muted}>{g.hint}</p>
            <ul className={styles.grid}>
              {items.map((b) => (
                <li key={b.vehicle.id} className={styles.item}>
                  <VehicleCard vehicle={b.vehicle} />
                  <YourLine bid={b} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function YourLine({ bid }: { bid: MyBid }) {
  const a = bid.vehicle.auction
  return (
    <div className={styles.yourLine}>
      <span>Your highest bid <strong>{formatMoney(bid.yourHighestBid)}</strong></span>
      {a.yourStatus === 'outbid' && a.state === 'live' && (
        <span className={styles.need}>Need {formatMoney(a.minimumBid)}</span>
      )}
    </div>
  )
}
