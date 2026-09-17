import type { Facets, FacetValue } from '../../api/types'
import { capitalize } from '../../lib/format'
import { PriceRange, type PriceBounds } from '../PriceRange/PriceRange'
import styles from './Filters.module.css'

export type FacetKey = Exclude<keyof Facets, 'price'>

interface Props {
  facets: Facets | undefined
  selected: Record<FacetKey, string[]>
  price: PriceBounds
  topTen: boolean
  onToggle: (key: FacetKey, value: string) => void
  onPriceChange: (bounds: PriceBounds) => void
  onTopTenChange: (on: boolean) => void
  onClear: () => void
}

const GROUPS: { key: FacetKey; label: string; format?: (v: string) => string }[] = [
  { key: 'state', label: 'Auction status', format: capitalize },
  { key: 'make', label: 'Make' },
  { key: 'bodyStyle', label: 'Body style', format: capitalize },
  { key: 'province', label: 'Province' },
  { key: 'titleStatus', label: 'Title', format: capitalize },
]

const STATE_ORDER = ['live', 'upcoming', 'ended']

export function Filters({ facets, selected, price, topTen, onToggle, onPriceChange, onTopTenChange, onClear }: Props) {
  const activeCount =
    Object.values(selected).reduce((n, arr) => n + arr.length, 0) +
    (price.min !== undefined || price.max !== undefined ? 1 : 0) +
    (topTen ? 1 : 0)
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Filters</h2>
        {activeCount > 0 && (
          <button type="button" className={styles.clear} onClick={onClear}>
            Clear all ({activeCount})
          </button>
        )}
      </div>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Popular</legend>
        <label className={`${styles.option} ${styles.highlight}`}>
          <input type="checkbox" checked={topTen} onChange={(e) => onTopTenChange(e.target.checked)} />
          <span className={styles.optionLabel}>
            Top 5 most bid
            <span className={styles.hint}>Ranked by bid count within your other filters</span>
          </span>
        </label>
      </fieldset>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Price</legend>
        <PriceRange value={price} bounds={facets?.price} onChange={onPriceChange} />
      </fieldset>
      {GROUPS.map((g) => {
        const values = orderValues(g.key, facets?.[g.key] ?? [], selected[g.key])
        if (values.length === 0) return null
        return (
          <fieldset key={g.key} className={styles.group}>
            <legend className={styles.legend}>{g.label}</legend>
            <ul className={styles.list}>
              {values.map((f) => {
                const checked = selected[g.key].includes(f.value)
                return (
                  <li key={f.value}>
                    <label className={`${styles.option} ${f.count === 0 && !checked ? styles.empty : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => onToggle(g.key, f.value)} />
                      <span className={styles.optionLabel}>{g.format ? g.format(f.value) : f.value}</span>
                      <span className={styles.count}>{f.count}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        )
      })}
    </div>
  )
}

/** Keep selected values visible even when the current result set no longer contains them. */
function orderValues(key: FacetKey, facet: FacetValue[], selected: string[]): FacetValue[] {
  const byValue = new Map(facet.map((f) => [f.value, f]))
  for (const s of selected) if (!byValue.has(s)) byValue.set(s, { value: s, count: 0 })
  const list = [...byValue.values()]
  if (key === 'state') return list.sort((a, b) => STATE_ORDER.indexOf(a.value) - STATE_ORDER.indexOf(b.value))
  if (key === 'make' || key === 'province') return list.sort((a, b) => a.value.localeCompare(b.value))
  return list.sort((a, b) => b.count - a.count)
}
