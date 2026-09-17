import styles from './SpecList.module.css'

export interface Spec {
  label: string
  value: string
}

export function SpecList({ items }: { items: Spec[] }) {
  return (
    <dl className={styles.list}>
      {items.map((s) => (
        <div key={s.label} className={styles.row}>
          <dt className={styles.label}>{s.label}</dt>
          <dd className={styles.value}>{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}
