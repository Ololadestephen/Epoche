import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import HoldReceipt from './pages/HoldReceipt'
import Faq from './pages/Faq'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Dashboard />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/t/:id" element={<HoldReceipt />} />
      </Routes>
    </BrowserRouter>
  )
}
