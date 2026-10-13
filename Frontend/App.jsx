import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'
import Home from './pages/Home'
import ProviderDashboard from './pages/ProviderDashboard'
import FindSpace from './pages/FindSpace'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Placeholder from './pages/Placeholder'
import Booking from './pages/Booking'
import Payment from './pages/Payment'
import Bookings from './pages/Bookings'
import Chat from './pages/Chat'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import CargoSpaceAssistant from './components/CargoSpaceAssistant'
import { useStoredUser } from './hooks/useStoredUser'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/provider" element={<ProviderDashboard />} />
        </Route>
        <Route element={<StandaloneRouteLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<RequireTrader><Dashboard /></RequireTrader>} />
          <Route path="/containers" element={<FindSpace />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/payment" element={<RequireTrader><Payment /></RequireTrader>} />
          <Route path="/bookings" element={<RequireTrader><Bookings /></RequireTrader>} />
          <Route path="/shipments" element={<RequireTrader><Placeholder /></RequireTrader>} />
          <Route path="/chat" element={<RequireTrader><Chat /></RequireTrader>} />
          <Route path="/notifications" element={<RequireTrader><Notifications /></RequireTrader>} />
          <Route path="/settings" element={<RequireTrader><Settings /></RequireTrader>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CargoSpaceAssistant />
    </BrowserRouter>
  )
}

function StandaloneRouteLayout() {
  const location = useLocation()
  return <div key={location.pathname} className="page-enter min-h-screen"><Outlet /></div>
}

function RequireTrader({ children }) {
  const user = useStoredUser()
  const location = useLocation()
  if (user?.role === 'provider') return <Navigate to="/provider" replace />
  if (!user?.user_id) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }
  return children
}
