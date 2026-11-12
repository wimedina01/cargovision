import { Route, Routes } from 'react-router-dom'
import type { PwaStatus } from '../hooks/usePwaStatus'
import { About } from '../pages/About'
import { Home } from '../pages/Home'
import { Measure } from '../pages/Measure'
import { NotFound } from '../pages/NotFound'
import { ReadLabel } from '../pages/ReadLabel'

export function AppRoutes({ pwaStatus }: { pwaStatus: PwaStatus }) {
  return (
    <Routes>
      <Route path="/" element={<Home pwaStatus={pwaStatus} />} />
      <Route path="/read" element={<ReadLabel />} />
      <Route path="/measure" element={<Measure />} />
      <Route path="/about" element={<About />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
