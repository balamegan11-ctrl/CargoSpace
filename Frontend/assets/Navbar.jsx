import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight text-navy-900">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-[11px] text-white shadow-sm">
        CS
      </span>
      <span>
        CargoSpace
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
          Find. Book. Ship.
        </span>
      </span>
    </Link>
  )
}

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/containers', label: 'Find Space' },
  { to: '/#how-it-works', label: 'How It Works', hash: true },
  { to: '/#about', label: 'About', hash: true },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  function isHashActive(link) {
    return link.hash && location.pathname === '/' && location.hash === link.to.slice(1)
  }

  function linkClass(link, active = false) {
    return `group relative py-2 transition-all duration-300 ease-out after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-center after:rounded-full after:bg-brand-600 after:transition-transform after:duration-300 after:ease-out ${active ? 'text-brand-600 after:scale-x-100' : 'hover:-translate-y-0.5 hover:text-brand-600 after:scale-x-0 group-hover:after:scale-x-100'}`
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
          {links.map((link) =>
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
        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/login"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-slate-100"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-800"
          >
            Register
          </Link>
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
        <div className="space-y-2 border-t border-slate-100 px-4 py-3 md:hidden">
          {links.map((link) =>
            link.hash ? (
              <a
                key={link.label}
                href={link.to}
                className={`group relative block rounded-lg px-2 py-2 text-sm font-semibold transition-colors after:absolute after:bottom-0 after:left-2 after:h-0.5 after:w-[calc(100%-1rem)] after:origin-left after:rounded-full after:bg-brand-600 after:transition-transform after:duration-300 ${isHashActive(link) ? 'bg-brand-50 text-brand-700 after:scale-x-100' : 'text-slate-700 after:scale-x-0 hover:bg-slate-50 hover:text-brand-700 group-hover:after:scale-x-100'}`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ) : (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `group relative block rounded-lg px-2 py-2 text-sm font-semibold transition-colors after:absolute after:bottom-0 after:left-2 after:h-0.5 after:w-[calc(100%-1rem)] after:origin-left after:rounded-full after:bg-brand-600 after:transition-transform after:duration-300 ${isActive ? 'bg-brand-50 text-brand-700 after:scale-x-100' : 'text-slate-700 after:scale-x-0 hover:bg-slate-50 hover:text-brand-700 group-hover:after:scale-x-100'}`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ),
          )}
          <div className="flex gap-2 pt-2">
            <Link to="/login" className="flex-1 rounded-xl border border-slate-200 py-2 text-center text-sm font-semibold">
              Login
            </Link>
            <Link to="/register" className="flex-1 rounded-xl bg-navy-900 py-2 text-center text-sm font-semibold text-white">
              Register
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
