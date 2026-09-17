import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'lg'
  block?: boolean
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', block, loading, className, children, disabled, ...rest }: Props) {
  return (
    <button
      type="button"
      className={[styles.btn, styles[variant], styles[size], block ? styles.block : '', className ?? ''].join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span className={loading ? styles.hiddenLabel : undefined}>{children}</span>
    </button>
  )
}
