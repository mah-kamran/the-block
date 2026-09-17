import { useState } from 'react'
import type { VehicleDetail } from '../../api/types'
import { BidRejectedError } from '../../api/client'
import { formatDateTime, formatDuration, formatMoney } from '../../lib/format'
import { quickStep, validateLocally } from '../../lib/bidding'
import { useNow } from '../../lib/useNow'
import { Button } from '../Button/Button'
import { StateBadge } from '../StateBadge/StateBadge'
import styles from './BidPanel.module.css'

interface Props {
  vehicle: VehicleDetail
  onPlaceBid: (amount: number) => Promise<unknown>
  onBuyNow: () => Promise<unknown>
  placing: boolean
  buying: boolean
  error: unknown
}

type Step = { kind: 'edit' } | { kind: 'confirm'; amount: number } | { kind: 'confirmBuyNow' }

export function BidPanel({ vehicle: v, onPlaceBid, onBuyNow, placing, buying, error }: Props) {
  const a = v.auction
  const now = useNow()
  const [step, setStep] = useState<Step>({ kind: 'edit' })
  const [draft, setDraft] = useState<string>('')

  // The input defaults to the live minimum; once the user types we keep their draft until a bid lands.
  const amount = draft === '' ? a.minimumBid : Number(draft.replace(/[^0-9]/g, ''))
  const local = validateLocally(a, amount)
  const stepSize = quickStep(a)
  const serverMessage = error instanceof BidRejectedError ? error.rejection.message : error ? 'Something went wrong. Please try again.' : null

  const submit = async (value: number) => {
    try {
      await onPlaceBid(value)
      setDraft('')
    } finally {
      setStep({ kind: 'edit' })
    }
  }

  const buy = async () => {
    try {
      await onBuyNow()
    } finally {
      setStep({ kind: 'edit' })
    }
  }

  const canBid = a.state === 'live' && !a.sold

  return (
    <section className={styles.panel} aria-label="Bidding">
      <div className={styles.head}>
        <StateBadge auction={a} size="md" />
        {canBid && (
          <span className={styles.endsAt}>Ends {formatDateTime(a.endsAt)}</span>
        )}
      </div>

      <div className={styles.priceBlock}>
        <div className={styles.priceLabel}>
          {a.sold ? 'Sold for' : a.state === 'ended' ? 'Final bid' : a.currentBid !== null ? 'Current bid' : 'Starting bid'}
        </div>
        <div className={styles.price}>{formatMoney(a.currentBid ?? a.startingBid)}</div>
        <div className={styles.priceMeta}>
          <span>{a.bidCount === 0 ? 'No bids yet' : `${a.bidCount} bid${a.bidCount === 1 ? '' : 's'}`}</span>
          <span aria-hidden="true">·</span>
          <span className={a.hasReserve ? (a.reserveMet ? styles.met : styles.notMet) : styles.noReserve}>
            {a.hasReserve ? (a.reserveMet ? 'Reserve met' : 'Reserve not met') : 'No reserve'}
          </span>
        </div>
      </div>

      <YourStatus vehicle={v} />

      {a.state === 'upcoming' && (
        <div className={styles.notice}>
          Bidding opens in <strong>{formatDuration(new Date(a.startsAt).getTime() - now)}</strong>
          <div className={styles.noticeSub}>{formatDateTime(a.startsAt)}</div>
        </div>
      )}

      {a.state === 'ended' && !a.sold && (
        <div className={styles.notice}>
          This auction has ended.
          {a.hasReserve && !a.reserveMet && <div className={styles.noticeSub}>Reserve was not met.</div>}
        </div>
      )}

      {canBid && step.kind === 'edit' && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            if (local.ok) setStep({ kind: 'confirm', amount })
          }}
        >
          <label className={styles.label} htmlFor="bid-amount">Your bid</label>
          <div className={styles.inputWrap}>
            <span className={styles.currency}>$</span>
            <input
              id="bid-amount"
              className={`${styles.input} ${!local.ok && draft !== '' ? styles.inputInvalid : ''}`}
              inputMode="numeric"
              autoComplete="off"
              value={draft === '' ? a.minimumBid.toLocaleString('en-CA') : draft}
              onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
              onFocus={(e) => e.currentTarget.select()}
              aria-describedby="bid-help"
              aria-invalid={!local.ok && draft !== ''}
            />
          </div>
          <div className={styles.quick}>
            {[0, 1, 2].map((n) => {
              const value = a.minimumBid + n * stepSize
              return (
                <button
                  key={n}
                  type="button"
                  className={`${styles.chip} ${amount === value ? styles.chipActive : ''}`}
                  onClick={() => setDraft(String(value))}
                >
                  {formatMoney(value)}
                </button>
              )
            })}
          </div>
          <p id="bid-help" className={`${styles.help} ${!local.ok && draft !== '' ? styles.helpError : ''}`}>
            {!local.ok && draft !== ''
              ? local.message
              : `Minimum ${formatMoney(a.minimumBid)}${a.increment ? ` · steps of ${formatMoney(a.increment)}` : ''}`}
          </p>
          {serverMessage && <p className={styles.serverError} role="alert">{serverMessage}</p>}
          <Button type="submit" size="lg" block disabled={!local.ok}>
            Review bid
          </Button>
          {a.buyNowPrice !== null && (
            <Button variant="secondary" size="lg" block onClick={() => setStep({ kind: 'confirmBuyNow' })}>
              Buy now for {formatMoney(a.buyNowPrice)}
            </Button>
          )}
        </form>
      )}

      {canBid && step.kind === 'confirm' && (
        <div className={styles.confirm} role="dialog" aria-labelledby="confirm-title">
          <h3 id="confirm-title" className={styles.confirmTitle}>Place a bid of {formatMoney(step.amount)}?</h3>
          <p className={styles.confirmText}>
            Lot {v.lot} · {v.title}. Bids are binding once placed.
          </p>
          <div className={styles.confirmActions}>
            <Button variant="secondary" size="lg" onClick={() => setStep({ kind: 'edit' })} disabled={placing}>
              Edit
            </Button>
            <Button size="lg" onClick={() => submit(step.amount)} loading={placing}>
              Confirm bid
            </Button>
          </div>
        </div>
      )}

      {canBid && step.kind === 'confirmBuyNow' && a.buyNowPrice !== null && (
        <div className={styles.confirm} role="dialog" aria-labelledby="buy-title">
          <h3 id="buy-title" className={styles.confirmTitle}>Buy now for {formatMoney(a.buyNowPrice)}?</h3>
          <p className={styles.confirmText}>This ends the auction immediately and you take the vehicle at this price.</p>
          <div className={styles.confirmActions}>
            <Button variant="secondary" size="lg" onClick={() => setStep({ kind: 'edit' })} disabled={buying}>
              Cancel
            </Button>
            <Button size="lg" onClick={buy} loading={buying}>
              Confirm purchase
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function YourStatus({ vehicle: v }: { vehicle: VehicleDetail }) {
  const a = v.auction
  switch (a.yourStatus) {
    case 'high_bidder':
      return <div className={`${styles.status} ${styles.statusGood}`}>You’re the high bidder at {formatMoney(a.currentBid ?? 0)}.</div>
    case 'outbid':
      return (
        <div className={`${styles.status} ${styles.statusBad}`}>
          You’ve been outbid. Bid {formatMoney(a.minimumBid)} or more to retake the lead.
        </div>
      )
    case 'won':
      return <div className={`${styles.status} ${styles.statusGood}`}>You won this vehicle at {formatMoney(a.currentBid ?? 0)}.</div>
    default:
      return null
  }
}
