import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function PublicLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <Navbar />
      <div key={location.pathname} className="page-enter"><Outlet /></div>
      <Footer />
    </div>
  )
}
