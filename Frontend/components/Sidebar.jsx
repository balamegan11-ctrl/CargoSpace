import {
  Bell,
  CreditCard,
  Home,
  LayoutDashboard,
  MessageSquare,
  PackageSearch,
  Settings,
  Truck,
  BadgeCheck,
  LogOut,
  X,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import cargoLogo from '../assets/brand-lockup.svg'
import { useStoredUser } from '../hooks/useStoredUser'
import { initialsFromName } from '../utils/initials'
import { clearStoredUser } from '../utils/session'

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/containers', label: 'Find Cargo Space', icon: PackageSearch },
  { to: '/bookings', label: 'My Bookings', icon: BadgeCheck },
  { to: '/shipments', label: 'Shipments', icon: Truck },
  { to: '/chat', label: 'Messages', icon: MessageSquare },
  { to: '/payment', label: 'Payments', icon: CreditCard },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate()
  const user = useStoredUser()
  const name = user?.name || user?.alternate_name || 'CargoSpace Trader'
  const email = user?.email || 'Not signed in'
  const initials = initialsFromName(name)

  function logout() {
    clearStoredUser()
    onClose()
    navigate('/', { replace: true })
  }

  return (
    <>
      {open ? (
        <button type="button" className="fixed inset-0 z-40 bg-navy-950/40 lg:hidden" onClick={onClose} />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-900 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <NavLink to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
            <img
              src={cargoLogo}
              alt="CargoSpace logo"
              className="h-10 w-20 rounded bg-white object-contain p-0.5"
            />
          </NavLink>
          <button type="button" className="lg:hidden" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="group relative m-3"><NavLink to="/settings" onClick={onClose} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-extrabold text-white">{initials}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-white">{name}</span><span className="block truncate text-xs text-slate-400">CargoSpace trader</span></span><Settings size={15} className="ml-auto shrink-0 text-slate-400" /></NavLink><div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-60 translate-y-1 rounded-xl border border-slate-700 bg-white p-4 opacity-0 shadow-xl transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"><p className="text-sm font-extrabold text-navy-900">{name}</p><p className="mt-1 truncate text-xs text-slate-500">{email}</p><p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700">CargoSpace trader</p><button type="button" onClick={logout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"><LogOut size={14} /> Logout</button></div></div>
      </aside>
    </>
  )
}
