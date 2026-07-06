import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import Home from './pages/Home'
import Delivery from './pages/Delivery'
import Customers from './pages/Customers'
import Bills from './pages/Bills'
import Reports from './pages/Reports'
import Rates from './pages/Rates'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/rates" element={<Rates />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
