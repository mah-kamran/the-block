import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { InventoryPage } from './pages/InventoryPage'
import { VehicleDetailPage } from './pages/VehicleDetailPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<InventoryPage />} />
        <Route path="vehicles/:id" element={<VehicleDetailPage />} />
      </Route>
    </Routes>
  )
}
