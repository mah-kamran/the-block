import styles from './Pagination.module.css'

interface Props {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <nav className={styles.nav} aria-label="Pagination">
      <span className={styles.range}>{from}–{to} of {total}</span>
      <div className={styles.buttons}>
        <button type="button" className={styles.btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <span className={styles.page}>Page {page} of {pages}</span>
        <button type="button" className={styles.btn} disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  )
}
