import { LogOut, MapPin, Menu, Settings, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import cargoLogo from '../assets/brand-lockup.svg'
import { CITY_COORDINATES } from '../data/mockData'
import { useStoredUser } from '../hooks/useStoredUser'
import { initialsFromName } from '../utils/initials'
import { clearStoredUser } from '../utils/session'

function nearestCity(position) {
  return Object.entries(CITY_COORDINATES).sort(([, first], [, second]) => {
    const firstDistance = Math.hypot(position.lat - first[0], position.lng - first[1])
    const secondDistance = Math.hypot(position.lat - second[0], position.lng - second[1])
    return firstDistance - secondDistance
  })[0]?.[0] || 'Chennai'
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight text-navy-900">
      <img
        src={cargoLogo}
        alt="CargoSpace logo"
        className="h-12 w-24 object-contain"
      />
      <span className="border-l border-slate-200 pl-2 text-[10px] font-semibold leading-4 text-slate-500">
        Find. Book.<br />Ship. Smarter.
      </span>
    </Link>
  )
}

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/containers', label: 'Find Space' },
  { to: '/settings', label: 'Settings' },
  { to: '/#how-it-works', label: 'How It Works', hash: true },
  { to: '/#about', label: 'About', hash: true },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileTimer = useRef(null)
  const [deviceLocation, setDeviceLocation] = useState(() => ({
    status: navigator.geolocation ? 'loading' : 'unsupported',
    latitude: null,
    longitude: null,
    accuracy: null,
    placeName: 'Current location',
  }))
  const location = useLocation()
  const navigate = useNavigate()
  const user = useStoredUser()
  const initials = initialsFromName(user?.name)
  const visibleLinks = user?.role === 'provider'
    ? [{ to: '/', label: 'Home', end: true }, { to: '/provider', label: 'Provider workspace' }]
    : links

  function logout() {
    clearStoredUser()
    setOpen(false)
    navigate('/', { replace: true })
  }

  function showProfileForFiveSeconds() {
    window.clearTimeout(profileTimer.current)
    setProfileOpen(true)
    profileTimer.current = window.setTimeout(() => setProfileOpen(false), 5000)
  }

  useEffect(() => () => window.clearTimeout(profileTimer.current), [])

  useEffect(() => {
    if (location.pathname !== '/') return
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const position = { lat: coords.latitude, lng: coords.longitude }
        const placeName = nearestCity(position)
        setDeviceLocation({ status: 'success', latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, placeName })
      },
      (error) => setDeviceLocation((current) => ({
        ...current,
        status: error.code === error.PERMISSION_DENIED ? 'denied' : 'retrying',
        placeName: error.code === error.PERMISSION_DENIED ? 'Location permission needed' : 'Waiting for location',
      })),
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [location.pathname])

  function isHashActive(link) {
    return link.hash && location.pathname === '/' && location.hash === link.to.slice(1)
  }

  function linkClass(link, active = false) {
    return `group relative inline-flex py-2 transition-colors duration-300 ease-out after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-full after:-translate-x-1/2 after:origin-center after:rounded-full after:bg-brand-600 after:scale-x-0 after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100 ${active ? 'text-brand-600' : 'hover:text-brand-600'}`
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-[0_4px_18px_rgba(11,31,58,0.04)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
          {visibleLinks.map((link) =>
            link.hash ? (
              <a key={link.label} href={link.to} className={linkClass(link, isHashActive(link))}>
                <span className="relative z-10">{link.label}</span>
              </a>
            ) : (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.end}
                className={({ isActive }) => linkClass(link, isActive)}
              >
                <span className="relative z-10">{link.label}</span>
              </NavLink>
            ),
          )}
        </nav>
        <div className="hidden flex-col items-end gap-1 md:flex">
          {user ? <div className="relative" onMouseEnter={showProfileForFiveSeconds}><Link to={user.role === 'provider' ? '/provider' : '/settings'} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-100" aria-label={user.role === 'provider' ? 'Open provider workspace' : 'Open trader profile'}><span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-extrabold text-white">{initials}</span><span className="max-w-28 truncate text-sm font-bold text-navy-900">{user.name}</span></Link>{profileOpen ? <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-extrabold text-white">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-extrabold text-navy-900">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div></div><p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700">{user.role === 'provider' ? 'Logistics service provider' : 'CargoSpace trader'}</p><div className="mt-3 flex gap-2"><Link to={user.role === 'provider' ? '/provider' : '/settings'} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-navy-800 hover:bg-slate-50"><Settings size={13} /> {user.role === 'provider' ? 'Workspace' : 'Profile'}</Link><button type="button" onClick={logout} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-navy-900 px-2 py-2 text-xs font-bold text-white hover:bg-brand-700"><LogOut size={13} /> Logout</button></div></div> : null}</div> : <div className="flex items-center gap-2"><Link to="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-slate-100">Login</Link><Link to="/register" className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-800">Register</Link></div>}
          {location.pathname === '/' ? <DeviceLocationStatus location={deviceLocation} /> : null}
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-navy-800 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open ? (
        <div className="mobile-menu-enter space-y-2 border-t border-slate-100 px-4 py-3 md:hidden">
          {visibleLinks.map((link) =>
            link.hash ? (
              <a
                key={link.label}
                href={link.to}
                className={`group relative inline-flex rounded-lg px-2 py-2 text-sm font-semibold transition-colors after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-full after:-translate-x-1/2 after:origin-center after:rounded-full after:bg-brand-600 after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100 ${isHashActive(link) ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50 hover:text-brand-700'}`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ) : (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `group relative inline-flex rounded-lg px-2 py-2 text-sm font-semibold transition-colors after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-full after:-translate-x-1/2 after:origin-center after:rounded-full after:bg-brand-600 after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100 ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50 hover:text-brand-700'}`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ),
          )}
          {user ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-extrabold text-white">{initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-navy-900">{user.name}</span><span className="block truncate text-xs text-slate-500">{user.email}</span></span></div><button type="button" onClick={logout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 py-2 text-sm font-bold text-white"><LogOut size={15} /> Logout</button></div> : <div className="flex gap-2 pt-2"><Link to="/login" className="flex-1 rounded-xl border border-slate-200 py-2 text-center text-sm font-semibold">Login</Link><Link to="/register" className="flex-1 rounded-xl bg-navy-900 py-2 text-center text-sm font-semibold text-white">Register</Link></div>}
          {location.pathname === '/' ? <DeviceLocationStatus location={deviceLocation} /> : null}
        </div>
      ) : null}
    </header>
  )
}

function DeviceLocationStatus({ location }) {
  let message = 'Fetching device location...'
  if (location.status === 'success') {
    message = `Current place: ${location.placeName || 'Current location'}`
  } else if (location.status === 'denied') {
    message = 'Allow location access to detect your place'
  } else if (location.status === 'unsupported') {
    message = 'Location unavailable'
  }

  return (
    <p className="inline-flex max-w-full items-center gap-1.5 text-[10px] font-semibold text-slate-500" title={location.status === 'success' ? location.placeName : 'Location unavailable'}>
      <MapPin size={12} className={location.status === 'success' ? 'text-teal-600' : 'text-slate-400'} />
      <span className="truncate">{message}</span>
    </p>
  )
}
