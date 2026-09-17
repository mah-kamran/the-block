import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useVehicle } from '../api/hooks'
import { useBuyNow, usePlaceBid } from '../api/mutations'
import type { VehicleDetail } from '../api/types'
import { BidHistory } from '../components/BidHistory/BidHistory'
import { BidPanel } from '../components/BidPanel/BidPanel'
import { Button } from '../components/Button/Button'
import { ConditionCard } from '../components/ConditionCard/ConditionCard'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { Gallery } from '../components/Gallery/Gallery'
import { SpecList } from '../components/SpecList/SpecList'
import { StateBadge } from '../components/StateBadge/StateBadge'
import { seedBidCount } from '../lib/bidding'
import { capitalize, formatKm, formatMoney } from '../lib/format'
import styles from './VehicleDetailPage.module.css'

const LIVE_POLL_MS = 10_000

export function VehicleDetailPage() {
  const { id = '' } = useParams()
  const { data, isPending, isError } = useVehicle(id, { livePollMs: LIVE_POLL_MS })

  if (isPending) return <DetailSkeleton />
  if (isError || !data) {
    return (
      <EmptyState
        title="Vehicle not found"
        description="It may have been removed, or the link is wrong."
        action={<Link to="/" className={styles.backLink}>Back to inventory</Link>}
      />
    )
  }
  return <Detail vehicle={data} />
}

function Detail({ vehicle: v }: { vehicle: VehicleDetail }) {
  const placeBid = usePlaceBid(v.id)
  const buyNow = useBuyNow(v.id)
  const [sheetOpen, setSheetOpen] = useState(false)
  const a = v.auction

  const specs = [
    { label: 'Odometer', value: formatKm(v.odometerKm) },
    { label: 'Engine', value: v.engine },
    { label: 'Transmission', value: capitalize(v.transmission) },
    { label: 'Drivetrain', value: v.drivetrain },
    { label: 'Fuel', value: capitalize(v.fuelType) },
    { label: 'Body style', value: capitalize(v.bodyStyle) },
    { label: 'Exterior', value: v.exteriorColor },
    { label: 'Interior', value: v.interiorColor },
    { label: 'VIN', value: v.vin },
  ]

  const panel = (
    <BidPanel
      vehicle={v}
      onPlaceBid={(amount) => placeBid.mutateAsync(amount).catch(() => undefined)}
      onBuyNow={() => buyNow.mutateAsync().catch(() => undefined)}
      placing={placeBid.isPending}
      buying={buyNow.isPending}
      error={placeBid.error ?? buyNow.error}
    />
  )

  return (
    <article className={styles.page}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link to="/">Inventory</Link>
        <span aria-hidden="true">/</span>
        <span>Lot {v.lot}</span>
      </nav>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{v.title}</h1>
          <p className={styles.subtitle}>
            Lot <span className={styles.mono}>{v.lot}</span> · {v.city}, {v.province} · Sold by {v.sellingDealership}
          </p>
        </div>
        <div className={styles.headerBadge}><StateBadge auction={a} size="md" /></div>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          <Gallery images={v.images} alt={v.title} />

          <section className={styles.section} aria-labelledby="specs">
            <h2 id="specs" className={styles.h2}>Specifications</h2>
            <SpecList items={specs} />
          </section>

          <section className={styles.section} aria-labelledby="condition">
            <h2 id="condition" className={styles.h2}>Condition</h2>
            <ConditionCard grade={v.conditionGrade} report={v.conditionReport} damageNotes={v.damageNotes} titleStatus={v.titleStatus} />
          </section>

          <section className={styles.section} aria-labelledby="dealer">
            <h2 id="dealer" className={styles.h2}>Selling dealership</h2>
            <p className={styles.dealer}>{v.sellingDealership}</p>
            <p className={styles.muted}>{v.city}, {v.province}</p>
          </section>

          <section className={styles.section} aria-labelledby="history">
            <h2 id="history" className={styles.h2}>Bid history</h2>
            <BidHistory bids={v.recentBids} seedCount={seedBidCount(v)} seedHigh={v.recentBids.length === 0 ? a.currentBid : null} />
          </section>
        </div>

        <aside className={`${styles.aside} ${sheetOpen ? styles.asideOpen : ''}`}>
          <div className={styles.sheetHandle}>
            <button type="button" className={styles.sheetClose} onClick={() => setSheetOpen(false)} aria-label="Close bidding panel">×</button>
          </div>
          {panel}
        </aside>
        {sheetOpen && <button type="button" className={styles.scrim} aria-label="Close bidding panel" onClick={() => setSheetOpen(false)} />}
      </div>

      {/* Mobile-only summary bar; opens the bidding sheet. */}
      <div className={styles.bar}>
        <div>
          <div className={styles.barLabel}>{a.currentBid !== null ? 'Current bid' : 'Starting bid'}</div>
          <div className={styles.barPrice}>{formatMoney(a.currentBid ?? a.startingBid)}</div>
        </div>
        <Button size="lg" onClick={() => setSheetOpen(true)}>
          {a.state === 'live' && !a.sold ? 'Place bid' : 'View auction'}
        </Button>
      </div>
    </article>
  )
}

function DetailSkeleton() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading vehicle">
      <div className={`${styles.skel} ${styles.skelCrumb}`} />
      <div className={`${styles.skel} ${styles.skelTitle}`} />
      <div className={styles.layout}>
        <div className={`${styles.skel} ${styles.skelGallery}`} />
        <div className={`${styles.skel} ${styles.skelPanel}`} />
      </div>
    </div>
  )
}
