import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import cargoLogo from '../assets/brand-lockup.svg'
import { ChatProvider } from '../components/ChatProvider'
import ChatDrawer from '../components/ChatDrawer'
import { useStoredUser } from '../hooks/useStoredUser'

export default function DashboardLayout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const user = useStoredUser()

  if (user?.role === 'provider') return <Navigate to="/provider" replace />

  return (
    <ChatProvider>
    <div className="flex min-h-screen bg-[#f4f7fb]">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src={cargoLogo} alt="CargoSpace logo" className="h-9 w-[72px] object-contain" />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <div key={location.pathname} className="page-enter"><Outlet /></div>
        </main>
      </div>
      <ChatDrawer />
    </div>
    </ChatProvider>
  )
}
