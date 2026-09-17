import { useEffect, useState } from 'react'
import styles from './SearchBar.module.css'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/** Debounced search input; keeps local state so typing stays responsive while the URL updates. */
export function SearchBar({ value, onChange, placeholder = 'Search year, make, model, VIN or lot' }: Props) {
  const [draft, setDraft] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)

  // When the URL changes from outside (back button, "clear all"), adopt the new value during render.
  if (value !== syncedValue) {
    setSyncedValue(value)
    setDraft(value)
  }

  useEffect(() => {
    if (draft === value) return
    const id = window.setTimeout(() => onChange(draft), 250)
    return () => window.clearTimeout(id)
  }, [draft, value, onChange])

  return (
    <div className={styles.wrap}>
      <svg className={styles.icon} viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M13.5 13.5 17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        className={styles.input}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label="Search inventory"
        autoComplete="off"
      />
      {draft && (
        <button type="button" className={styles.clear} onClick={() => { setDraft(''); onChange('') }} aria-label="Clear search">
          ×
        </button>
      )}
    </div>
  )
}
