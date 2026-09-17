import { Link } from 'react-router-dom'
import type { VehicleSummary } from '../../api/types'
import { capitalize, formatKm, formatMoney, shortProvince } from '../../lib/format'
import { StateBadge } from '../StateBadge/StateBadge'
import styles from './VehicleCard.module.css'

export function VehicleCard({ vehicle: v }: { vehicle: VehicleSummary }) {
  const a = v.auction
  const hasBids = a.currentBid !== null
  return (
    <Link to={`/vehicles/${v.id}`} className={styles.card}>
      <div className={styles.media}>
        <img src={v.image} alt="" loading="lazy" width={800} height={600} />
        <div className={styles.badges}>
          <StateBadge auction={a} />
          {a.yourStatus !== 'none' && <YourStatus status={a.yourStatus} />}
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.lot}>Lot {v.lot}</span>
          <span aria-hidden="true">·</span>
          <span>{formatKm(v.odometerKm)}</span>
          <span aria-hidden="true">·</span>
          <span>{v.city}, {shortProvince(v.province)}</span>
        </div>
        <h3 className={styles.title}>{v.title}</h3>
        {v.titleStatus !== 'clean' && (
          <span className={styles.titleWarning}>{capitalize(v.titleStatus)} title</span>
        )}
        <div className={styles.priceRow}>
          <div>
            <div className={styles.priceLabel}>{hasBids ? 'Current bid' : 'Starting bid'}</div>
            <div className={styles.price}>{formatMoney(a.currentBid ?? a.startingBid)}</div>
          </div>
          <div className={styles.priceAside}>
            <span>{a.bidCount === 0 ? 'No bids yet' : `${a.bidCount} bid${a.bidCount === 1 ? '' : 's'}`}</span>
            <span className={a.hasReserve ? (a.reserveMet ? styles.reserveMet : styles.reserveNot) : styles.noReserve}>
              {a.hasReserve ? (a.reserveMet ? 'Reserve met' : 'Reserve not met') : 'No reserve'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function YourStatus({ status }: { status: VehicleSummary['auction']['yourStatus'] }) {
  const label = { high_bidder: 'You lead', outbid: 'Outbid', won: 'You won', none: '' }[status]
  return <span className={`${styles.you} ${styles[status]}`}>{label}</span>
}
