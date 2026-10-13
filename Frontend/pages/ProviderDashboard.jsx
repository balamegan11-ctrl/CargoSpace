import { useEffect, useState } from 'react'
import { ArrowLeft, Boxes, Building2, CreditCard, MapPin, MessageCircle, Plus, Route, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { formatInr } from '../data/mockData'
import { useStoredUser } from '../hooks/useStoredUser'
import { ChatProvider, useChat } from '../components/ChatProvider'
import ChatDrawer from '../components/ChatDrawer'

const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const statusStyles = {
  'Pending Inspection': 'bg-amber-50 text-amber-800',
  'Under Review': 'bg-sky-50 text-sky-800',
  Approved: 'bg-emerald-50 text-emerald-800',
  Rejected: 'bg-rose-50 text-rose-800',
}

export default function ProviderDashboard() {
  return (
    <ChatProvider>
      <ProviderDashboardContent />
      <ChatDrawer />
    </ChatProvider>
  )
}

function ProviderDashboardContent() {
  const user = useStoredUser()
  const { openChat } = useChat()
  const [provider, setProvider] = useState(user)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [savingContainer, setSavingContainer] = useState(false)
  const [containerForm, setContainerForm] = useState({ totalCbm: '', availableCbm: '' })

  useEffect(() => {
    if (!user?.user_id || user.role !== 'provider') return
    const loadProvider = () => fetch('/api/provider/profile', { headers: { 'x-user-id': user.user_id } })
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || ''
        const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to load provider application.' }
        if (!response.ok) throw new Error(data.message || 'Unable to load provider application.')
        setProvider(data.provider)
      })
      .catch((loadError) => setError(loadError.message))
    loadProvider()

    const socket = io(socketUrl)
    socket.on('provider_status_updated', (update) => {
      if (update.userId === user.user_id) setProvider((current) => ({ ...current, approval_status: update.status }))
    })
    const providerContainerId = `CS-PRV-${user.user_id.slice(-6)}`
    socket.on('space_updated', (update) => {
      if (update.containerId !== providerContainerId) return
      setProvider((current) => ({
        ...current,
        totalCbm: update.totalCbm,
        bookedCbm: update.bookedCbm,
        availableCbm: update.availableCbm,
      }))
    })
    const refreshProviderBookings = (booking) => {
      if (booking.container_id === providerContainerId) loadProvider()
    }
    socket.on('booking_created', refreshProviderBookings)
    socket.on('booking_cancelled', refreshProviderBookings)
    socket.on('booking_refunded', refreshProviderBookings)
    return () => socket.disconnect()
  }, [user])

  if (user?.role !== 'provider') {
    return <main className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="text-xl font-extrabold text-navy-900">Provider account required</h1><Link to="/register" className="mt-4 inline-flex rounded-lg bg-navy-900 px-4 py-2 text-sm font-bold text-white">Register as a provider</Link></main>
  }

  const status = provider?.approval_status || 'Pending Inspection'
  const totalCbm = provider?.totalCbm ?? provider?.total_cbm ?? 0
  const bookedCbm = provider?.bookedCbm ?? Math.max(0, totalCbm - (provider?.available_cbm ?? 0))
  const availableCbm = provider?.availableCbm ?? Math.max(0, totalCbm - bookedCbm)
  const utilization = totalCbm ? Math.round((bookedCbm / totalCbm) * 100) : 0

  async function addContainer(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSavingContainer(true)
    try {
      const response = await fetch('/api/provider/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.user_id },
        body: JSON.stringify({
          totalCbm: Number(containerForm.totalCbm),
          availableCbm: Number(containerForm.availableCbm),
        }),
      })
      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to add container capacity.' }
      if (!response.ok) throw new Error(data.message || 'Unable to add container capacity.')
      setProvider((current) => ({ ...current, ...data.provider }))
      setContainerForm({ totalCbm: '', availableCbm: '' })
      setNotice('Container capacity added to your cargo listing.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSavingContainer(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Service provider workspace</p>
          <h1 className="mt-1 text-2xl font-extrabold text-navy-900">{provider?.company || provider?.company_name || 'Provider application'}</h1>
          <p className="mt-1 text-sm text-slate-500">Your provider account is separate from trader booking accounts.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-navy-800 hover:bg-slate-50"><ArrowLeft size={15} /> Home</Link>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${statusStyles[status] || statusStyles['Pending Inspection']}`}><ShieldCheck size={16} />{status}</span>
        </div>
      </header>

      {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      {status !== 'Approved' ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Your listing is not visible to traders until an administrator approves it. CargoSpace will review your registration details and update the status here.</p> : null}
      {provider?.inspection_notes ? <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"><strong>Admin review note:</strong> {provider.inspection_notes}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Organisation capacity">
        <Metric icon={Boxes} label="Total registered" value={`${totalCbm} CBM`} />
        <Metric icon={Boxes} label="Booked" value={`${bookedCbm} CBM`} />
        <Metric icon={Boxes} label="Available" value={`${availableCbm} CBM`} />
        <Metric icon={Boxes} label="Utilization" value={`${utilization}%`} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-navy-900">Registration details</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <Detail icon={Building2} label="Organisation" value={provider?.company || provider?.company_name} />
          <Detail icon={Building2} label="Service provider" value={provider?.name} />
          <Detail icon={Route} label="Transport type" value={provider?.transport_mode} />
          <Detail icon={MapPin} label="Operating city / location" value={provider?.location} />
          <Detail icon={MapPin} label="GPS coordinates" value={Number.isFinite(provider?.latitude) && Number.isFinite(provider?.longitude) ? `${provider.latitude.toFixed(5)}, ${provider.longitude.toFixed(5)}` : 'Not captured'} />
          <Detail icon={Building2} label="Cargo center" value={provider?.cargo_center_name || provider?.cargoCenterName} />
          <Detail icon={Route} label="Route" value={provider?.route} />
          <Detail icon={MapPin} label="Contact" value={[provider?.phone, provider?.email].filter(Boolean).join(' · ')} />
          <Detail icon={Boxes} label="Price per CBM" value={provider?.price_per_cbm ? formatInr(provider.price_per_cbm) : 'Not set'} />
          <Detail icon={Building2} label="Vehicle / container number" value={provider?.vehicle_number || 'Not provided'} />
          <Detail icon={Building2} label="Vehicle / container information" value={provider?.vehicle_info || 'Not provided'} />
          <Detail icon={Building2} label="Service description" value={provider?.service_description || 'Not provided'} />
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="add-container-title">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-brand-50 p-2 text-brand-700"><Boxes size={19} /></div>
          <div>
            <h2 id="add-container-title" className="text-lg font-extrabold text-navy-900">Add container</h2>
            <p className="mt-1 text-sm text-slate-500">Added capacity joins your cargo center listing.</p>
          </div>
        </div>
        <form onSubmit={addContainer} className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-xs font-bold text-slate-600">
            Total CBM
            <input required type="number" min="1" step="1" value={containerForm.totalCbm} onChange={(event) => setContainerForm((current) => ({ ...current, totalCbm: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-navy-900 outline-none focus:border-brand-500" placeholder="e.g. 500" />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            Available CBM
            <input required type="number" min="0" step="1" value={containerForm.availableCbm} onChange={(event) => setContainerForm((current) => ({ ...current, availableCbm: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-navy-900 outline-none focus:border-brand-500" placeholder="e.g. 320" />
          </label>
          <button type="submit" disabled={savingContainer || !containerForm.totalCbm || containerForm.availableCbm === '' || Number(containerForm.availableCbm) > Number(containerForm.totalCbm)} className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">
            <Plus size={16} />{savingContainer ? 'Adding…' : 'Add container'}
          </button>
        </form>
        {notice ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-700">{notice}</p> : null}
      </section>

      <section className="space-y-4" aria-labelledby="provider-bookings-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Customer activity</p>
            <h2 id="provider-bookings-title" className="mt-1 text-lg font-extrabold text-navy-900">Bookings &amp; payments</h2>
          </div>
          <span className="text-sm font-semibold text-slate-500">{provider?.bookings?.length || 0} bookings</span>
        </div>
        {provider?.bookings?.length ? provider.bookings.map((booking) => {
          const canChat = booking.payment_status === 'PAID' && ['Confirmed', 'In Transit'].includes(booking.status) && Boolean(booking.user_id)
          return (
            <article key={booking.booking_id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Booking {booking.booking_id}</p>
                  <h3 className="mt-1 text-base font-extrabold text-navy-900">{booking.customer_name || 'Customer'}</h3>
                  {booking.customer_company ? <p className="mt-0.5 text-sm text-slate-500">{booking.customer_company}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{booking.status}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${booking.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{booking.payment_status}</span>
                </div>
              </div>
              <dl className="grid gap-x-6 gap-y-4 py-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <BookingDetail label="Customer contact" value={[booking.customer_phone, booking.customer_email].filter(Boolean).join(' · ')} />
                <BookingDetail label="Customer pickup vehicle" value={booking.customer_vehicle_number} />
                <BookingDetail label="Route" value={booking.route} />
                <BookingDetail label="Space booked" value={`${booking.space || 0} CBM`} />
                <BookingDetail label="Booking date" value={booking.booking_date ? new Date(booking.booking_date).toLocaleDateString('en-IN') : 'Not provided'} />
                <BookingDetail label="Paid amount" value={booking.amount != null ? formatInr(booking.amount) : 'Not paid'} />
                <BookingDetail label="Subtotal / fees" value={booking.subtotal != null ? `${formatInr(booking.subtotal)} / ${formatInr(booking.taxes_fees || 0)}` : 'Not available'} />
                <BookingDetail label="Payment method" value={booking.payment_method || 'Not paid'} />
                <BookingDetail label="Payment date" value={booking.payment_date ? new Date(booking.payment_date).toLocaleDateString('en-IN') : 'Not paid'} />
                <BookingDetail label="Receipt number" value={booking.receipt_number} />
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><CreditCard size={16} className="text-brand-600" />Payment record</p>
                <button type="button" onClick={() => openChat(booking)} disabled={!canChat} className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                  <MessageCircle size={16} />{canChat ? 'Chat with customer' : 'Chat after successful payment'}
                </button>
              </div>
            </article>
          )
        }) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No customer bookings have been recorded for your space yet.</p>}
      </section>
    </main>
  )
}

function Metric({ icon: Icon, label, value }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><Icon size={18} className="text-brand-600" /><p className="mt-3 text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold text-navy-900">{value}</p></div>
}

function Detail({ icon: Icon, label, value }) {
  return <div className="flex gap-2"><Icon size={16} className="mt-0.5 shrink-0 text-brand-600" /><div><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-0.5 font-bold text-navy-900">{value || 'Not provided'}</dd></div></div>
}

function BookingDetail({ label, value }) {
  return <div><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words font-bold text-navy-900">{value || 'Not provided'}</dd></div>
}