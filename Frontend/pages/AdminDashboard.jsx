import { useEffect, useState } from 'react'
import { Building2, Home, LogOut, ReceiptText, RotateCcw, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import AdminChatPanel from '../components/AdminChatPanel'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [admin] = useState(() => JSON.parse(localStorage.getItem('cargospace_admin') || 'null'))
  const [bookings, setBookings] = useState([])
  const [centers, setCenters] = useState([])
  const [centerError, setCenterError] = useState('')
  const [providers, setProviders] = useState([])
  const [providerError, setProviderError] = useState('')
  const [providerNotes, setProviderNotes] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!admin) {
      navigate('/admin/login', { replace: true })
      return
    }

    const loadBookings = () => fetch('/api/bookings', { headers: { 'x-admin-id': admin.admin_id } })
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || ''
        const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to load bookings.' }
        if (!response.ok) throw new Error(data.message || 'Unable to load bookings.')
        setBookings(data.bookings || [])
      })
      .catch((loadError) => setError(loadError.message))
    loadBookings()

    const loadProviders = () => fetch('/api/admin/providers', { headers: { 'x-admin-id': admin.admin_id } })
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || ''
        const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to load provider applications.' }
        if (!response.ok) throw new Error(data.message || 'Unable to load provider applications.')
        setProviders(data.providers || [])
      })
      .catch((loadError) => setProviderError(loadError.message))
    loadProviders()

    const loadCenters = () => fetch('/api/admin/logistics-centers', { headers: { 'x-admin-id': admin.admin_id } })
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || ''
        const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to load cargo centers.' }
        if (!response.ok) throw new Error(data.message || 'Unable to load cargo centers.')
        setCenters(data.centers || [])
      })
      .catch((loadError) => setCenterError(loadError.message))
    loadCenters()

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { auth: { adminId: admin.admin_id } })
    socket.on('booking_created', () => { loadBookings(); loadProviders(); loadCenters() })
    socket.on('booking_cancelled', () => { loadBookings(); loadProviders(); loadCenters() })
    socket.on('space_updated', loadCenters)
    socket.on('booking_refunded', loadBookings)
    socket.on('provider_application_submitted', loadProviders)
    socket.on('provider_status_updated', loadProviders)
    return () => socket.disconnect()
  }, [admin, navigate])

  function logout() {
    localStorage.removeItem('cargospace_admin')
    navigate('/admin/login', { replace: true })
  }

  async function refund(bookingId) {
    setError('')
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/refund`, { method: 'POST', headers: { 'x-admin-id': admin.admin_id } })
      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to issue refund.' }
      if (!response.ok) throw new Error(data.message || 'Unable to issue refund.')
      setBookings((current) => current.map((booking) => booking.booking_id === bookingId ? data.booking : booking))
    } catch (refundError) {
      setError(refundError.message)
    }
  }

  async function updateProviderStatus(provider, status) {
    setProviderError('')
    try {
      const response = await fetch(`/api/admin/providers/${provider.user_id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': admin.admin_id },
        body: JSON.stringify({ status, inspectionNotes: providerNotes[provider.user_id] || '' }),
      })
      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to update provider status.' }
      if (!response.ok) throw new Error(data.message || 'Unable to update provider status.')
      setProviders((current) => current.map((item) => item.user_id === provider.user_id
        ? { ...item, approval_status: data.provider.approval_status, inspection_notes: data.provider.inspection_notes }
        : item))
    } catch (statusError) {
      setProviderError(statusError.message)
    }
  }

  if (!admin) return null

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-navy-900 p-5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Admin control room</p>
              <h1 className="mt-1 text-xl font-extrabold">Booking records & Service Provider Hub</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold hover:bg-white/10"
            >
              <Home size={14} /> Return to Home
            </Link>
            <p className="text-right text-xs text-blue-100">
              <strong className="block text-sm text-white">{admin.name}</strong>
              {admin.admin_id}
            </p>
            <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold hover:bg-white/10">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Live inventory</p><h2 className="mt-1 text-xl font-extrabold text-navy-900">Cargo centers & containers</h2></div>
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">{centers.length} centers</span>
          </div>
          {centerError ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{centerError}</p> : null}
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{centers.map((center) => <article key={center.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[11px] text-slate-400">{center.id}</p><h3 className="mt-1 font-extrabold text-navy-900">{center.cargoCenterName}</h3><p className="mt-1 text-xs font-semibold text-slate-600">{center.provider} · {center.mode}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">{center.status}</span></div>
            <p className="mt-3 text-sm font-semibold text-slate-700">{center.locationCity || center.origin} · near {center.nearbyLocation || center.locationCity || center.origin}</p>
            <p className="mt-1 text-xs text-slate-500">{center.origin} → {center.destination}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs"><CapacityValue label="Total" value={center.totalCbm} /><CapacityValue label="Booked" value={center.bookedCbm} /><CapacityValue label="Available" value={center.availableCbm} /></div>
            <p className="mt-3 text-xs font-bold text-navy-800">₹{Number(center.pricePerCbm || 0).toLocaleString('en-IN')} / CBM · {center.activeBookingsCount || 0} bookings</p>
            <p className="mt-1 text-xs text-slate-500">{center.providerPhone || 'Phone not listed'} · {center.providerEmail || 'Email not listed'}</p>
            {center.vehicleNumber ? <p className="mt-1 text-xs text-slate-500">Vehicle {center.vehicleNumber}</p> : null}
            {center.locationCoordinates?.length === 2 ? <p className="mt-1 text-[10px] text-slate-400">Center GPS {center.locationCoordinates.map((part) => Number(part).toFixed(5)).join(', ')}</p> : null}
          </article>)}</div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Registration review</p><h2 className="mt-1 text-xl font-extrabold text-navy-900">Logistics providers</h2></div>
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">{providers.length} applications</span>
          </div>
          {providerError ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{providerError}</p> : null}
          {providers.length ? <div className="mt-5 space-y-4">{providers.map((provider) => <article key={provider.user_id} className="rounded-xl border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-mono text-xs text-slate-400">{provider.user_id}</p><h3 className="mt-1 flex items-center gap-2 text-lg font-extrabold text-navy-900"><Building2 size={18} className="text-brand-600" />{provider.company || 'Organisation not provided'}</h3><p className="mt-1 text-sm font-semibold text-slate-600">{provider.name} · {provider.transport_mode}</p></div>
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${provider.approval_status === 'Approved' ? 'bg-emerald-50 text-emerald-800' : provider.approval_status === 'Rejected' ? 'bg-rose-50 text-rose-800' : provider.approval_status === 'Under Review' ? 'bg-sky-50 text-sky-800' : 'bg-amber-50 text-amber-800'}`}>{provider.approval_status}</span>
            </div>
            <dl className="mt-4 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <ReviewDetail label="Alternate name" value={provider.alternate_name} />
              <ReviewDetail label="Location" value={provider.location} />
              <ReviewDetail label="GPS coordinates" value={Number.isFinite(provider.latitude) && Number.isFinite(provider.longitude) ? `${provider.latitude.toFixed(5)}, ${provider.longitude.toFixed(5)}` : 'Not captured'} />
              <ReviewDetail label="Contact" value={[provider.phone, provider.email].filter(Boolean).join(' · ')} />
              <ReviewDetail label="Cargo center" value={provider.cargo_center_name} />
              <ReviewDetail label="Route" value={provider.route} />
              <ReviewDetail label="Capacity" value={`${provider.totalCbm} total · ${provider.bookedCbm} booked · ${provider.availableCbm} CBM available`} />
              <ReviewDetail label="Price per CBM" value={`₹${Number(provider.price_per_cbm || 0).toLocaleString('en-IN')}`} />
              <ReviewDetail label="Vehicle / container number" value={provider.vehicle_number} />
              <ReviewDetail label="Vehicle / container" value={provider.vehicle_info} />
              <ReviewDetail label="Service description" value={provider.service_description} />
              <ReviewDetail label="Registered" value={provider.created_at ? new Date(provider.created_at).toLocaleString('en-IN') : 'Unknown'} />
            </dl>
            <label className="mt-4 block text-xs font-bold text-slate-600">Inspection notes<textarea rows={2} value={providerNotes[provider.user_id] ?? provider.inspection_notes ?? ''} onChange={(event) => setProviderNotes((current) => ({ ...current, [provider.user_id]: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-sm font-medium text-navy-900 outline-none focus:border-brand-500" placeholder="Add review notes for this provider" /></label>
            <div className="mt-3 flex flex-wrap gap-2">{['Pending Inspection', 'Under Review', 'Approved', 'Rejected'].map((status) => <button key={status} type="button" disabled={provider.approval_status === status} onClick={() => updateProviderStatus(provider, status)} className={`rounded-lg px-3 py-2 text-xs font-bold transition disabled:cursor-default disabled:opacity-40 ${status === 'Approved' ? 'bg-emerald-700 text-white hover:bg-emerald-800' : status === 'Rejected' ? 'bg-rose-700 text-white hover:bg-rose-800' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{status}</button>)}</div>
            <section className="mt-4 border-t border-slate-100 pt-4" aria-label={`${provider.company} bookings`}>
              <h4 className="text-sm font-extrabold text-navy-900">Bookings <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{provider.bookingCount || 0}</span></h4>
              {provider.bookings?.length ? <div className="mt-3 space-y-2">{provider.bookings.map((booking) => <div key={booking.booking_id} className="grid gap-2 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                <div><p className="font-mono font-bold text-brand-700">{booking.booking_id}</p><p className="mt-1 font-bold text-navy-900">{booking.trader_name || 'Name unavailable'}{booking.trader_company ? ` · ${booking.trader_company}` : ''}</p><p className="mt-1 text-slate-600">{booking.trader_phone || 'Phone unavailable'} · {booking.trader_email || 'Email unavailable'}</p></div>
                <div><p className="font-semibold text-slate-700">{booking.route}</p><p className="mt-1 text-slate-500">{booking.space} CBM · {booking.status}</p></div>
                <div><p className="font-semibold text-slate-700">Vehicle {provider.vehicle_number || 'not registered'}</p><p className="mt-1 text-slate-500">{provider.phone} · {provider.email}</p></div>
              </div>)}</div> : <p className="mt-2 text-xs text-slate-500">No bookings have been recorded for this provider.</p>}
            </section>
          </article>)}</div> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No provider registrations are available for review.</p>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Payments and reservations</p><h2 className="mt-1 text-xl font-extrabold text-navy-900">All bookings</h2></div><span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">{bookings.length} records</span></div>
          {error ? <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Booking ID</th><th className="px-3 py-3">Route</th><th className="px-3 py-3">Container</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Cancellation reason</th><th className="px-3 py-3">Receipt</th></tr></thead><tbody>{bookings.map((booking) => <tr key={booking.booking_id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-4 font-mono font-bold text-navy-900">{booking.booking_id}</td><td className="px-3 py-4 font-semibold text-slate-700">{booking.route}</td><td className="px-3 py-4 text-slate-500">{booking.container_id}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${booking.status === 'Cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{booking.status}</span></td><td className="px-3 py-4 font-bold text-navy-900">₹{booking.amount.toLocaleString('en-IN')}</td><td className="max-w-[220px] px-3 py-4 text-xs font-semibold text-slate-600">{booking.cancellation_reason || '—'}{booking.cancelled_at ? <span className="mt-1 block text-[10px] font-normal text-slate-400">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(booking.cancelled_at))}</span> : null}</td><td className="px-3 py-4"><span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-brand-700"><ReceiptText size={14} />{booking.receipt_number || `CS-${booking.booking_id}`}</span><span className="mt-1 block text-[10px] text-slate-400">Booking ID: {booking.booking_id}</span></td></tr>)}</tbody></table></div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">{bookings.map((booking) => <article key={`${booking.booking_id}-details`} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-mono font-bold text-brand-700">{booking.booking_id}</h3><span className="text-xs font-bold text-slate-500">{booking.provider_booking_count} provider bookings</span></div><p className="mt-2 font-bold text-navy-900">{booking.trader_name || 'Booking person unavailable'}{booking.trader_company ? ` · ${booking.trader_company}` : ''}</p><p className="mt-1 text-xs text-slate-600">{booking.trader_phone || 'Phone unavailable'} · {booking.trader_email || 'Email unavailable'}</p><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><p><span className="font-semibold text-slate-500">Provider:</span> <span className="font-bold text-slate-800">{booking.provider_name}</span></p><p><span className="font-semibold text-slate-500">Cargo center:</span> <span className="font-bold text-slate-800">{booking.cargo_center_name || booking.location_city}</span></p><p><span className="font-semibold text-slate-500">Provider contact:</span> <span className="font-bold text-slate-800">{booking.provider_phone || 'Phone unavailable'} · {booking.provider_email || 'Email unavailable'}</span></p><p><span className="font-semibold text-slate-500">Vehicle:</span> <span className="font-bold text-slate-800">{booking.vehicle_number || 'Not registered'}</span></p></div></article>)}</div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Cancellation refunds</p><h2 className="mt-1 text-xl font-extrabold text-navy-900">Refund queue</h2><p className="mt-1 text-sm text-slate-500">Issue a full refund for each cancelled paid booking.</p></div>
          <div className="mt-5 space-y-3">{bookings.filter((booking) => booking.status === 'Cancelled' && booking.payment_status === 'PAID').map((booking) => <div key={booking.booking_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><p className="font-mono text-sm font-bold text-navy-900">{booking.booking_id}</p><p className="mt-1 text-xs text-slate-500">{booking.route} · ₹{booking.amount.toLocaleString('en-IN')}</p></div>{booking.refund_status === 'REFUNDED' ? <span className="text-sm font-bold text-emerald-700">Refunded ₹{booking.refund_amount?.toLocaleString('en-IN')}</span> : <button type="button" onClick={() => refund(booking.booking_id)} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700"><RotateCcw size={16} /> Issue refund</button>}</div>)}{!bookings.some((booking) => booking.status === 'Cancelled' && booking.payment_status === 'PAID') ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">There are no cancelled paid bookings awaiting a refund.</p> : null}</div>
        </section>
        <AdminChatPanel admin={admin} />
      </div>
    </main>
  )
}

function ReviewDetail({ label, value }) {
  return <div><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-0.5 font-bold text-slate-800">{value || 'Not provided'}</dd></div>
}

function CapacityValue({ label, value }) {
  return <div className="rounded-lg bg-slate-50 px-2 py-2"><p className="text-slate-500">{label}</p><p className="mt-0.5 font-bold text-navy-900">{value ?? 0} CBM</p></div>
}
