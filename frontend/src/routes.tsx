import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.tsx'
import Clean from './pages/Clean.tsx'
import Train from './pages/Train.tsx'
import Results from './pages/Results.tsx'
import Learn from './pages/Learn.tsx'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/clean" element={<Clean />} />
      <Route path="/train" element={<Train />} />
      <Route path="/results" element={<Results />} />
      <Route path="/learn" element={<Learn />} />
    </Routes>
  )
}
