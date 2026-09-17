import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface Props {
  title: string
  description?: string
  action?: ReactNode
  tone?: 'neutral' | 'error'
}

export function EmptyState({ title, description, action, tone = 'neutral' }: Props) {
  return (
    <div className={`${styles.box} ${tone === 'error' ? styles.error : ''}`} role={tone === 'error' ? 'alert' : undefined}>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.desc}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
