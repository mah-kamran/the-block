import type { SortKey } from '../../api/types'
import styles from './SortSelect.module.css'

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'ending_soon', label: 'Ending soonest' },
  { value: 'newly_listed', label: 'Newly listed' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'year_desc', label: 'Year: newest' },
  { value: 'odometer_asc', label: 'Odometer: lowest' },
]

export function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <label className={styles.wrap}>
      <span className={styles.label}>Sort</span>
      <select className={styles.select} value={value} onChange={(e) => onChange(e.target.value as SortKey)}>
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
