import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useLogin, useMe } from '../api/auth'
import { Button } from '../components/Button/Button'
import styles from './LoginPage.module.css'

const DEMO = [
  { username: 'alice', name: 'Alice Chen' },
  { username: 'bob', name: 'Bob Tremblay' },
  { username: 'carol', name: 'Carol Singh' },
]

export function LoginPage() {
  const { data: me } = useMe()
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  if (me) return <Navigate to={from} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login.mutateAsync({ username, password })
      navigate(from, { replace: true })
    } catch {
      /* error rendered below */
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={submit}>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.sub}>Bidding needs an account so your bids follow you, not the browser.</p>

        <label className={styles.field}>
          <span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </label>
        <label className={styles.field}>
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>

        {login.isError && (
          <p className={styles.error} role="alert">
            {login.error instanceof Error ? login.error.message : 'Sign-in failed.'}
          </p>
        )}

        <Button type="submit" size="lg" block loading={login.isPending}>Sign in</Button>

        <div className={styles.demo}>
          <p className={styles.demoTitle}>Demo accounts · password <code>demo123</code></p>
          <div className={styles.demoRow}>
            {DEMO.map((d) => (
              <button
                key={d.username}
                type="button"
                className={styles.demoChip}
                onClick={() => { setUsername(d.username); setPassword('demo123') }}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  )
}
