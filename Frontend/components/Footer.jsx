import { Link } from 'react-router-dom'
import cargoLogo from '../assets/brand-lockup.svg'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-navy-950 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-extrabold text-white">
            <img src={cargoLogo} alt="CargoSpace" className="h-14 w-28 rounded bg-white object-contain p-1" />
          </Link>
          <p className="mt-2 text-sm text-slate-400">Find. Book. Ship. Smarter.</p>
          <p className="mt-3 text-xs text-slate-500">
            A frontend marketplace demo for leftover container space across road, rail, sea and air.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform</p>
          <div className="mt-3 space-y-2 text-sm">
            <Link to="/containers" className="block transition-colors hover:text-white">Find Space</Link>
            <Link to="/dashboard" className="block transition-colors hover:text-white">Dashboard</Link>
            <a href="/#how-it-works" className="block transition-colors hover:text-white">How It Works</a>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Account</p>
          <div className="mt-3 space-y-2 text-sm">
            <Link to="/login" className="block transition-colors hover:text-white">Login</Link>
            <Link to="/register" className="block transition-colors hover:text-white">Register</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 CargoSpace. All rights reserved.</p>
          <p>Find. Book. Ship. Smarter.</p>
        </div>
      </div>
    </footer>
  )
}
