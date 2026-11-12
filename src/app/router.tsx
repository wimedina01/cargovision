import { Route, Routes } from 'react-router-dom'
import type { PwaStatus } from '../hooks/usePwaStatus'
import { CameraTest } from '../pages/CameraTest'
import { Diagnostics } from '../pages/Diagnostics'
import { Home } from '../pages/Home'
import { InspectionHistory } from '../pages/InspectionHistory'
import { NewInspection } from '../pages/NewInspection'
import { NotFound } from '../pages/NotFound'
import { Settings } from '../pages/Settings'

export function AppRoutes({ pwaStatus }: { pwaStatus: PwaStatus }) {
  return (
    <Routes>
      <Route path="/" element={<Home pwaStatus={pwaStatus} />} />
      <Route path="/inspection/new" element={<NewInspection />} />
      <Route path="/history" element={<InspectionHistory />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/diagnostics" element={<Diagnostics />} />
      <Route path="/camera-test" element={<CameraTest />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
