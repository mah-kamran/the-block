import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useLogout, useMe } from '../../api/auth'
import styles from './Layout.module.css'

export function Layout() {
  const { data: me } = useMe()
  const logout = useLogout()
  const location = useLocation()
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/" className={styles.brand} aria-label="The Block home">
            <span className={styles.mark} aria-hidden="true" />
            The Block
          </Link>
          <nav className={styles.nav} aria-label="Primary">
            <NavLink to="/" end className={({ isActive }) => (isActive ? styles.active : undefined)}>Inventory</NavLink>
            {me && <NavLink to="/my-bids" className={({ isActive }) => (isActive ? styles.active : undefined)}>My bids</NavLink>}
            {me ? (
              <span className={styles.user}>
                <span className={styles.userName}>{me.displayName}</span>
                <button type="button" className={styles.signOut} onClick={() => logout.mutate()} disabled={logout.isPending}>
                  Sign out
                </button>
              </span>
            ) : (
              <Link to="/login" state={{ from: location.pathname + location.search }} className={styles.signIn}>
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
