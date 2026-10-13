import { Link, useLocation } from 'react-router-dom'

const COPY = {
  '/bookings': {
    title: 'My Bookings',
    body: 'Confirmed leftover-space reservations will appear here in later parts. PART 1 uses mock rows on the dashboard.',
  },
  '/shipments': {
    title: 'Shipments',
    body: 'Lane tracking, ETAs and gate events will live here. Open the dashboard for the current mock status list.',
  },
  '/messages': {
    title: 'Messages',
    body: 'Provider chat is not wired in PART 1. This screen keeps the sidebar complete.',
  },
  '/payments': {
    title: 'Payments',
    body: 'No payment integration in PART 1. Cost figures on the dashboard are static mock savings.',
  },
  '/notifications': {
    title: 'Notifications',
    body: 'Departure reminders and listing alerts will appear here in a later build.',
  },
  '/settings': {
    title: 'Settings',
    body: 'Profile and preference screens are out of scope for this frontend-only slice.',
  },
}

export default function Placeholder() {
  const { pathname } = useLocation()
  const page = COPY[pathname] || { title: 'CargoSpace', body: 'This section is a PART 1 placeholder.' }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold text-navy-900">{page.title}</h1>
      <p className="mt-3 max-w-xl text-slate-500">{page.body}</p>
      <Link to="/dashboard" className="mt-6 inline-flex rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white">
        Back to dashboard
      </Link>
    </div>
  )
}
