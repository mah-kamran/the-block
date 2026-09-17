import { useState } from 'react'
import type { PriceRange as Bounds } from '../../api/types'
import { formatMoney } from '../../lib/format'
import styles from './PriceRange.module.css'

export interface PriceBounds {
  min?: number
  max?: number
}

interface Props {
  value: PriceBounds
  bounds: Bounds | undefined
  onChange: (next: PriceBounds) => void
}

/** Min / max inputs. Commits on blur or Enter so the URL isn't rewritten on every keystroke. */
export function PriceRange({ value, bounds, onChange }: Props) {
  const [minDraft, setMinDraft] = useState(toDraft(value.min))
  const [maxDraft, setMaxDraft] = useState(toDraft(value.max))
  const [synced, setSynced] = useState(value)

  // Adopt external changes (back button, clear all) during render.
  if (value.min !== synced.min || value.max !== synced.max) {
    setSynced(value)
    setMinDraft(toDraft(value.min))
    setMaxDraft(toDraft(value.max))
  }

  const commit = () => {
    let min = parse(minDraft)
    let max = parse(maxDraft)
    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min]
    if (min === value.min && max === value.max) return
    onChange({ min, max })
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
  }

  const placeholderMin = bounds ? formatMoney(bounds.min).replace('$', '') : 'Min'
  const placeholderMax = bounds ? formatMoney(bounds.max).replace('$', '') : 'Max'

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <label className={styles.field}>
          <span className="visually-hidden">Minimum price</span>
          <span className={styles.currency} aria-hidden="true">$</span>
          <input
            className={styles.input}
            inputMode="numeric"
            placeholder={placeholderMin}
            value={minDraft}
            onChange={(e) => setMinDraft(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={commit}
            onKeyDown={onKey}
          />
        </label>
        <span className={styles.dash} aria-hidden="true">–</span>
        <label className={styles.field}>
          <span className="visually-hidden">Maximum price</span>
          <span className={styles.currency} aria-hidden="true">$</span>
          <input
            className={styles.input}
            inputMode="numeric"
            placeholder={placeholderMax}
            value={maxDraft}
            onChange={(e) => setMaxDraft(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={commit}
            onKeyDown={onKey}
          />
        </label>
      </div>
      {(value.min !== undefined || value.max !== undefined) && (
        <button type="button" className={styles.reset} onClick={() => onChange({})}>
          Any price
        </button>
      )}
    </div>
  )
}

const toDraft = (n: number | undefined) => (n === undefined ? '' : String(n))
const parse = (s: string) => (s === '' ? undefined : Number(s))
