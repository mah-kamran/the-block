import { useEffect, useState } from 'react'

export default function App() {
  const [status, setStatus] = useState('…')
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setStatus(d.status))
      .catch(() => setStatus('api unreachable'))
  }, [])
  return <h1>The Block — api: {status}</h1>
}
