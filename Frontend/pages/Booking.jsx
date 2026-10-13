import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Calendar,
  ChevronRight,
  Home,
  Lock,
  MapPin,
  ShieldCheck,
  Truck,
  UserPlus,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import CargoMap from '../components/Map'
import AuthModal from '../components/AuthModal'
import { TransportChip } from '../components/TransportIcon'
import { containers, formatDate, formatInr } from '../data/mockData'
import { useStoredUser } from '../hooks/useStoredUser'
import { useLogisticsCenters } from '../hooks/useLogisticsCenters'
import { calculateBookingPrice } from '../utils/bookingPricing'

const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function Booking() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const user = useStoredUser()
  const { centers } = useLogisticsCenters()

  const containerId = params.get('container') || containers[0].id
  const container = centers.find((item) => item.id === containerId) || containers.find((item) => item.id === containerId) || { ...containers[0], id: containerId }

  // Real-time capacity state
  const [liveSpace, setLiveSpace] = useState({
    totalCbm: container.totalCbm,
    bookedCbm: container.totalCbm - container.availableCbm,
    availableCbm: container.availableCbm,
    cargoCenterName: container.cargoCenterName,
    locationCity: container.locationCity || container.origin,
    locationCoordinates: container.locationCoordinates || container.originCoordinates,
    origin: container.origin,
    destination: container.destination,
    recentBookedCbm: 0,
    lastUpdated: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'Live Capacity Available',
  })
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Booking Form state populated from logged-in user
  const [form, setForm] = useState(() => ({
    traderName: user?.name || user?.alternate_name || '',
    companyName: user?.company || '',
    cargoType: container.cargoType || 'Textiles',
    requiredSpace: params.get('space') || '4',
    weight: '850',
    packages: '12',
    customerVehicleNumber: '',
    bookingDate: params.get('bookingDate') || container.departure,
    slotStartTime: params.get('slotStartTime') || '09:00',
    slotEndTime: params.get('slotEndTime') || '13:00',
    instructions: '',
  }))

  // Real-time Socket.IO and initial fetch
  useEffect(() => {
    fetch(`/api/containers/availability?containerId=${container.id}`)
      .then(async (res) => {
        const contentType = res.headers.get('content-type') || ''
        const data = contentType.includes('application/json') ? await res.json() : { success: false }
        if (data.success && data.data) {
          setLiveSpace({
            totalCbm: data.data.totalCbm,
            bookedCbm: data.data.bookedCbm,
            availableCbm: data.data.availableCbm,
            cargoCenterName: data.data.cargoCenterName,
            locationCity: data.data.locationCity || data.data.origin,
            locationCoordinates: data.data.locationCoordinates || data.data.originCoordinates,
            origin: data.data.origin,
            destination: data.data.destination,
            recentBookedCbm: data.data.recentBookedCbm || 0,
            lastUpdated: new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(data.data.lastUpdated)),
            status: data.data.status || 'Live Stream Active',
          })
        }
      })
      .catch(() => {})

    const socket = io(socketUrl)
    socket.on('space_updated', (update) => {
      if (update?.containerId === container.id) {
        setLiveSpace({
          totalCbm: update.totalCbm,
          bookedCbm: update.bookedCbm,
          availableCbm: update.availableCbm,
          cargoCenterName: update.cargoCenterName,
          locationCity: update.locationCity || update.origin,
          locationCoordinates: update.locationCoordinates || update.originCoordinates,
          origin: update.origin,
          destination: update.destination,
          recentBookedCbm: update.recentBookedCbm || 0,
          lastUpdated: new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(update.lastUpdated)),
          status: update.status || 'Updated via Live Stream',
        })
      }
    })

    return () => socket.disconnect()
  }, [container.id])

  const space = Number(form.requiredSpace) || 0
  const pricePerCbm = Number(container.pricePerCbm ?? container.price / container.totalCbm)
  const { subtotal, handlingFee, serviceFee, taxes, taxesAndFees, total } = calculateBookingPrice(space, pricePerCbm)
  const spaceError = space > liveSpace.availableCbm
    ? `Only ${liveSpace.availableCbm} CBM is currently available.`
    : ''

  const remainingAfterBooking = Math.max(0, liveSpace.availableCbm - space)
  const utilization = liveSpace.totalCbm ? Math.round((liveSpace.bookedCbm / liveSpace.totalCbm) * 100) : 0

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  const currentBookingUrl = `/booking?${new URLSearchParams({
    container: container.id,
    space: String(form.requiredSpace),
    bookingDate: form.bookingDate,
    slotStartTime: form.slotStartTime,
    slotEndTime: form.slotEndTime,
  }).toString()}`

  const paymentQuery = useMemo(
    () =>
      new URLSearchParams({
        container: container.id,
        bookingId: `BK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        amount: String(total),
        subtotal: String(subtotal),
        taxes: String(taxes),
        handlingFee: String(handlingFee),
        serviceFee: String(serviceFee),
        taxesAndFees: String(taxesAndFees),
        pricePerCbm: String(pricePerCbm),
        total: String(total),
        space: String(space),
        bookingDate: form.bookingDate,
        slotStartTime: form.slotStartTime,
        slotEndTime: form.slotEndTime,
      }),
    [container.id, form.bookingDate, form.slotEndTime, form.slotStartTime, handlingFee, pricePerCbm, serviceFee, space, subtotal, taxes, taxesAndFees, total]
  )

  function submit(event) {
    event.preventDefault()

    if (!Number.isFinite(space) || space <= 0) return
    if (space > liveSpace.availableCbm) return

    // Enforce authentication requirement
    if (!user?.user_id) {
      setAuthModalOpen(true)
      return
    }

    if (form.slotEndTime <= form.slotStartTime) {
      event.currentTarget.querySelector('[name="slotEndTime"]')?.setCustomValidity('End time must be after start time.')
      event.currentTarget.reportValidity()
      return
    }

    const nextBookingId = paymentQuery.get('bookingId')
    sessionStorage.setItem(`cargospace-booking-${nextBookingId}-vehicle`, form.customerVehicleNumber.trim())
    navigate(`/payment?${paymentQuery.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/containers"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-navy-900 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={14} /> Back to Cargo Spaces
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-navy-900"
          >
            <Home size={14} /> Home
          </Link>
        </div>
        <p className="text-xs font-semibold text-slate-400">
          Booking Reference: Container <span className="font-mono font-bold text-navy-900">{container.id}</span>
        </p>
      </div>

      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Reserve cargo space</p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-900">Container details & booking</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review lane capacity, inspect live real-time space metrics, and reserve your required volume.
        </p>
      </div>

      {/* Unauthenticated Alert Banner */}
      {!user?.user_id && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-navy-900">Login required to book cargo space</h3>
              <p className="mt-0.5 text-xs text-slate-600">
                You can review container information publicly. To confirm a booking and proceed to payment, please sign in or register.
              </p>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">
            <Link
              to={`/login?redirect=${encodeURIComponent(currentBookingUrl)}`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 sm:flex-initial"
            >
              Sign In
            </Link>
            <Link
              to={`/register?redirect=${encodeURIComponent(currentBookingUrl)}`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-navy-900 shadow-sm hover:bg-slate-50 sm:flex-initial"
            >
              <UserPlus size={14} className="text-brand-600" /> New User? Sign Up
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          {/* SECTION 1: AVAILABLE BOOKING SLOT */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-brand-600" />
                <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-navy-900">
                  AVAILABLE BOOKING SLOT
                </h2>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${liveSpace.availableCbm > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                <BadgeCheck size={13} /> {liveSpace.availableCbm > 0 ? 'Available' : 'Fully Booked'}
              </span>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold text-slate-400">Container ID: {container.id}</p>
                  <h3 className="mt-1 text-xl font-extrabold text-navy-900">{container.provider}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <MapPin size={15} className="text-brand-600" /> {container.origin} → {container.destination}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <TransportChip type={container.mode} />
                  {container.verified && (
                    <span className="text-[11px] font-semibold text-brand-700">Verified Logistics Partner</span>
                  )}
                </div>
              </div>

              {/* Slot Attribute Matrix */}
              <div className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Route</p>
                  <p className="mt-1 text-sm font-bold text-navy-900">{container.origin} → {container.destination}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Transport Mode</p>
                  <p className="mt-1 text-sm font-bold text-navy-900">{container.mode}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Departure</p>
                  <p className="mt-1 text-sm font-bold text-navy-900">{formatDate(container.departure)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Container Rate</p>
                  <p className="mt-1 text-sm font-extrabold text-navy-900">{formatInr(pricePerCbm)} / CBM</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-5 text-center">
                <Metric label="Total Capacity" value={`${liveSpace.totalCbm} CBM`} />
                <Metric label="Booked Capacity" value={`${liveSpace.bookedCbm} CBM`} />
                <Metric
                  label="Available Space"
                  value={`${liveSpace.availableCbm} CBM`}
                  highlight
                />
              </div>
            </div>
          </section>

          {/* SECTION 2: REAL-TIME SPACE MONITOR (Placed directly BELOW booking slot) */}
          <section className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-white via-blue-50/20 to-brand-50/30 p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                </span>
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-navy-900">
                    REAL-TIME SPACE MONITOR
                  </h2>
                  <p className="text-[11px] text-slate-500">Live capacity telemetry updated via Socket stream</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-100/70 px-3 py-1 text-xs font-bold text-brand-800">
                  <Activity size={13} className="text-brand-600" /> {liveSpace.status}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Available Space</p>
                <p className="mt-1 text-2xl font-extrabold text-navy-900">{liveSpace.availableCbm} <span className="text-sm font-semibold text-slate-400">CBM</span></p>
                <div className="capacity-track mt-2 h-2">
                  <div
                    className="capacity-fill h-full bg-emerald-500"
                    style={{ width: `${Math.round((liveSpace.availableCbm / liveSpace.totalCbm) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recently Booked Space</p>
                <p className="mt-1 text-2xl font-extrabold text-navy-900">{liveSpace.recentBookedCbm} <span className="text-sm font-semibold text-slate-400">CBM</span></p>
                <p className="mt-2 text-[10px] font-semibold text-slate-500">Paid reservations</p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Utilization</p>
                <p className="mt-1 text-2xl font-extrabold text-navy-900">{utilization}%</p>
                <p className="mt-2 text-[10px] font-semibold text-slate-500">{liveSpace.bookedCbm} of {liveSpace.totalCbm} CBM booked</p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Remaining CBM</p>
                <p className="mt-1 text-2xl font-extrabold text-brand-700">{remainingAfterBooking} <span className="text-sm font-semibold text-slate-400">CBM</span></p>
                <p className="mt-2 text-[10px] font-semibold text-slate-500">After requested {space} CBM</p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Last Updated</p>
                <p className="mt-1 text-lg font-extrabold text-navy-900">{liveSpace.lastUpdated}</p>
                <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active Sync
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cargo Center Location</p>
                <p className="mt-1 text-sm font-extrabold text-navy-900">{liveSpace.cargoCenterName || container.cargoCenterName}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">{liveSpace.locationCity || container.origin} · {liveSpace.origin || container.origin} to {liveSpace.destination || container.destination}</p>
                {liveSpace.locationCoordinates?.length === 2 ? <p className="mt-1 text-[10px] font-medium text-slate-500">GPS {liveSpace.locationCoordinates[0].toFixed(5)}, {liveSpace.locationCoordinates[1].toFixed(5)}</p> : null}
              </div>
            </div>
          </section>

          {/* Lane preview map */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">Lane preview</p>
                <h2 className="mt-1 text-lg font-extrabold text-navy-900">
                  Route from {container.origin} to {container.destination}
                </h2>
              </div>
              <p className="font-mono text-xs text-slate-400">{container.id}</p>
            </div>
            <div className="mt-4">
              <CargoMap
                markers={[
                  { id: `${container.id}-origin`, lat: container.originCoordinates[0], lng: container.originCoordinates[1], label: container.origin, variant: 'origin' },
                  { id: `${container.id}-destination`, lat: container.destinationCoordinates[0], lng: container.destinationCoordinates[1], label: container.destination, variant: 'destination' },
                  ...(container.locationCoordinates ? [{ id: `${container.id}-center`, lat: container.locationCoordinates[0], lng: container.locationCoordinates[1], label: `${container.cargoCenterName} · ${container.locationCity || container.origin}`, variant: 'destination' }] : []),
                ]}
                route={{
                  from: { lat: container.originCoordinates[0], lng: container.originCoordinates[1] },
                  to: { lat: container.destinationCoordinates[0], lng: container.destinationCoordinates[1] },
                }}
                height="240px"
              />
            </div>
          </section>

          {/* Booking form */}
          <form id="booking-form" onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-extrabold text-navy-900">Booking details</h2>
            <p className="mt-1 text-xs text-slate-500">Provide cargo specifications and required space for this booking.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Trader Name"
                value={user?.name || user?.alternate_name || form.traderName}
                readOnly={Boolean(user?.user_id)}
                placeholder="Sign in to load your name"
                required
              />
              <Field
                label="Company Name"
                value={user?.company || form.companyName}
                readOnly={Boolean(user?.user_id)}
                placeholder="Sign in to load your organisation"
                required
              />
              <Field
                label="Cargo Type"
                value={form.cargoType}
                onChange={update('cargoType')}
                placeholder="e.g. Textiles, Electronics"
                required
              />
              <Field
                label="Required Space (CBM)"
                type="number"
                min="1"
                step="1"
                value={form.requiredSpace}
                onChange={update('requiredSpace')}
                required
              />
              {spaceError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 sm:col-span-2" role="alert">{spaceError}</p> : null}
              <Field
                label="Weight (kg)"
                type="number"
                value={form.weight}
                onChange={update('weight')}
                placeholder="e.g. 850"
                required
              />
              <Field
                label="Number of packages"
                type="number"
                value={form.packages}
                onChange={update('packages')}
                placeholder="e.g. 12"
                required
              />
              <div className="sm:col-span-2">
                <Field
                  label="Customer pickup vehicle number"
                  value={form.customerVehicleNumber}
                  onChange={update('customerVehicleNumber')}
                  placeholder="e.g. TN 01 AB 1234"
                  minLength="4"
                  maxLength="20"
                  autoComplete="off"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">Enter the vehicle registration for the vehicle arriving to collect your cargo.</p>
              </div>
              <label className="text-xs font-semibold text-slate-500">
                Booking Date
                <span className="relative mt-1 block">
                  <Calendar size={16} className="pointer-events-none absolute left-3 top-3 text-brand-600" />
                  <input
                    name="bookingDate"
                    type="date"
                    value={form.bookingDate}
                    onChange={update('bookingDate')}
                    required
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-brand-500"
                  />
                </span>
              </label>
              <label className="text-xs font-semibold text-slate-500">
                Slot Arrival Window
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <input
                    name="slotStartTime"
                    type="time"
                    value={form.slotStartTime}
                    onChange={update('slotStartTime')}
                    required
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm text-slate-700 outline-none focus:border-brand-500"
                  />
                  <input
                    name="slotEndTime"
                    type="time"
                    value={form.slotEndTime}
                    onChange={(event) => {
                      event.currentTarget.setCustomValidity('')
                      update('slotEndTime')(event)
                    }}
                    required
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm text-slate-700 outline-none focus:border-brand-500"
                  />
                </div>
              </label>
              <label className="text-xs font-semibold text-slate-500 sm:col-span-2">
                Special Instructions (Optional)
                <textarea
                  className="mt-1 min-h-20 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-500"
                  value={form.instructions}
                  onChange={update('instructions')}
                  placeholder="Fragile handling, gate-in requirements, or specific pickup notes"
                />
              </label>
            </div>
          </form>
        </div>

        {/* Right aside price summary */}
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:sticky xl:top-6">
          <h2 className="text-lg font-extrabold text-navy-900">Price summary</h2>
          <p className="mt-1 text-xs text-slate-500">Transparent pricing calculated for {space} CBM.</p>

          <div className="mt-5 space-y-3 text-sm">
            <Summary label="Required space" value={`${space} CBM`} formatted />
            <Summary label="Price per CBM" value={formatInr(pricePerCbm)} />
            <Summary label="Subtotal" value={subtotal} />
            <Summary label="Handling & gate-in fee" value={handlingFee} />
            <Summary label="CargoSpace platform fee" value={serviceFee} />
            <Summary label="Taxes (18%)" value={taxes} />
            <Summary label="Total taxes & fees" value={taxesAndFees} />
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <div>
              <span className="font-extrabold text-navy-900">Total Amount to Pay</span>
              <span className="block text-[11px] text-slate-400">All inclusive</span>
            </div>
            <span className="text-2xl font-extrabold text-navy-900">{formatInr(total)}</span>
          </div>

          <button
            form="booking-form"
            type="submit"
            disabled={space <= 0 || Boolean(spaceError)}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3.5 text-sm font-bold text-white shadow-lg shadow-navy-900/15 transition hover:bg-brand-700 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {user?.user_id ? (
              <>Proceed to Payment · {formatInr(total)} <ChevronRight size={17} /></>
            ) : (
              <>Sign in to Book Space <Lock size={15} /></>
            )}
          </button>

          <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-slate-400">
            <ShieldCheck size={13} className="text-emerald-600" /> 100% secure logistics booking
          </p>
        </aside>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        container={container}
        redirectUrl={currentBookingUrl}
      />
    </div>
  )
}

function Metric({ label, value, highlight = false }) {
  return (
    <div>
      <p className={`text-lg font-extrabold ${highlight ? 'text-brand-600' : 'text-navy-900'}`}>{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{label}</p>
    </div>
  )
}

function Field({ label, type = 'text', ...props }) {
  return (
    <label className="text-xs font-semibold text-slate-500">
      {label}
      <input
        type={type}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500"
        {...props}
      />
    </label>
  )
}

function Summary({ label, value, formatted = false }) {
  return (
    <div className="flex justify-between text-slate-500">
      <span>{label}</span>
      <span className="font-semibold text-slate-700">{formatted ? value : formatInr(value)}</span>
    </div>
  )
}
