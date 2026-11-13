import { Navigate, Route, Routes } from 'react-router-dom'
import { Measure } from '../pages/Measure'
import { ReadLabel } from '../pages/ReadLabel'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/read" element={<ReadLabel />} />
      <Route path="/measure" element={<Measure />} />
      <Route path="*" element={<Navigate to="/read" replace />} />
    </Routes>
  )
}
