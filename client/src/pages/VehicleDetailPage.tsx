import { Link, useParams } from 'react-router-dom'
import { useVehicle } from '../api/hooks'

/** Placeholder until step 5 builds the full detail and bidding experience. */
export function VehicleDetailPage() {
  const { id = '' } = useParams()
  const { data, isPending, isError } = useVehicle(id)
  if (isPending) return <p>Loading…</p>
  if (isError || !data) return <p>Vehicle not found. <Link to="/">Back to inventory</Link></p>
  return (
    <div>
      <Link to="/">← Back to inventory</Link>
      <h1>{data.title}</h1>
      <p>Lot {data.lot} · {data.sellingDealership}</p>
    </div>
  )
}
