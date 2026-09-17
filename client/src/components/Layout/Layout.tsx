import { Link, Outlet } from 'react-router-dom'
import styles from './Layout.module.css'

export function Layout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/" className={styles.brand} aria-label="The Block home">
            <span className={styles.mark} aria-hidden="true" />
            The Block
          </Link>
          <nav className={styles.nav} aria-label="Primary">
            <Link to="/">Inventory</Link>
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
