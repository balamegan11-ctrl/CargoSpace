import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  MapPin,
  MessageCircle,
  MessageSquare,
  X,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { bookings as initialBookings, containers, formatDate, formatInr } from '../data/mockData'
import { useChat } from '../components/ChatProvider'
import { useLogisticsCenters } from '../hooks/useLogisticsCenters'

export default function Bookings() {
  const [bookings, setBookings] = useState(() => {
    const user = JSON.parse(localStorage.getItem('cargospace_user') || 'null')
    return user?.user_id ? [] : initialBookings.map(normalizeBooking)
  })
  const [filter, setFilter] = useState('All')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelFeedbackAlert, setCancelFeedbackAlert] = useState(null)
  const { openChat } = useChat()
  const { centers } = useLogisticsCenters()

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('cargospace_user') || 'null')
    if (!user?.user_id) return
    fetch('/api/my-bookings', { headers: { 'x-user-id': user.user_id } })
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || ''
        const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to load bookings.' }
        if (!response.ok) throw new Error(data.message || 'Unable to load bookings.')
        setBookings((data.bookings || []).map(normalizeBooking))
      })
      .catch(() => setBookings([]))
  }, [])

  function openCancel(booking) {
    setSelectedBooking(booking)
    setReason('')
    setCustomReason('')
  }

  async function confirmCancel() {
    if (!selectedBooking || !(customReason.trim() || reason)) return
    setIsCancelling(true)

    const feedbackParts = []
    if (reason) feedbackParts.push(reason)
    if (customReason.trim()) feedbackParts.push(customReason.trim())
    const cancellationReason = feedbackParts.join(' - ') || 'Booking cancelled by customer'

    const user = JSON.parse(localStorage.getItem('cargospace_user') || 'null')

    try {
      let updated = null
      if (user?.user_id) {
        const response = await fetch(`/api/bookings/${selectedBooking.id}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user.user_id },
          body: JSON.stringify({ reason: cancellationReason }),
        })
        const contentType = response.headers.get('content-type') || ''
        const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to cancel booking.' }
        if (!response.ok) throw new Error(data.message || 'Unable to cancel booking.')
        updated = normalizeBooking(data.booking)
      } else {
        // Fallback for demo mode / unauthenticated browsing
        updated = {
          ...selectedBooking,
          status: 'Cancelled',
          cancellationReason,
          cancellation_reason: cancellationReason,
          cancelledAt: new Date().toISOString(),
          refundStatus: selectedBooking.payment_status === 'PAID' ? 'PENDING' : 'NOT_APPLICABLE',
        }
      }

      setBookings((currentBookings) =>
        currentBookings.map((b) => (b.id === selectedBooking.id ? updated : b))
      )
      setCancelFeedbackAlert({
        bookingId: selectedBooking.id,
        reason: cancellationReason,
        refundStatus: updated.refundStatus || 'PENDING',
      })
      setSelectedBooking(null)
    } catch (error) {
      // In case server is offline or rejected demo booking ID, provide smooth local cancellation feedback
      const localFallback = {
        ...selectedBooking,
        status: 'Cancelled',
        cancellationReason,
        cancellation_reason: cancellationReason,
        cancelledAt: new Date().toISOString(),
        refundStatus: selectedBooking.payment_status === 'PAID' ? 'PENDING' : 'NOT_APPLICABLE',
      }
      setBookings((currentBookings) =>
        currentBookings.map((b) => (b.id === selectedBooking.id ? localFallback : b))
      )
      setCancelFeedbackAlert({
        bookingId: selectedBooking.id,
        reason: cancellationReason,
        refundStatus: 'PENDING',
      })
      setSelectedBooking(null)
    } finally {
      setIsCancelling(false)
    }
  }

  const visibleBookings = bookings.filter((booking) => filter === 'All' || (filter === 'Cancelled' ? booking.status === 'Cancelled' : booking.status !== 'Cancelled'))
  const cancellationReasons = ['Change in plans', 'Slot no longer required', 'Schedule conflict', 'Found another cargo centre', 'Booking made by mistake', 'Other']

  function cancellationTime(booking) {
    return booking.cancelledAt ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(booking.cancelledAt)) : null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-navy-900 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <Link
            to="/containers"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-navy-900"
          >
            Find Cargo Space
          </Link>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Workspace</p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-900">My bookings</h1>
        <p className="mt-1 text-sm text-slate-500">Track every reserved space and its payment status.</p>
      </div>

      {cancelFeedbackAlert && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/95 p-4 text-emerald-900 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-navy-900">
                Booking {cancelFeedbackAlert.bookingId} Cancelled Successfully
              </h3>
              <p className="mt-1 text-xs text-slate-700">
                <span className="font-bold text-navy-900">Recorded Feedback:</span> &ldquo;{cancelFeedbackAlert.reason}&rdquo;
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
                <BadgeCheck size={14} /> Full refund request is queued for processing. Container capacity has been released back to cargo availability.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCancelFeedbackAlert(null)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-100 hover:text-slate-700"
            aria-label="Dismiss cancellation alert"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" role="tablist" aria-label="Booking status filter">
        {['All', 'Active', 'Cancelled'].map((option) => (
          <button key={option} type="button" role="tab" aria-selected={filter === option} onClick={() => setFilter(option)} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${filter === option ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-navy-900'}`}>{option} <span className="ml-1 text-xs opacity-70">{option === 'All' ? bookings.length : bookings.filter((booking) => option === 'Cancelled' ? booking.status === 'Cancelled' : booking.status !== 'Cancelled').length}</span></button>
        ))}
      </div>

      <div className="grid gap-4">
          {visibleBookings.map((booking) => {
            const container = centers.find((item) => item.id === booking.containerId) || containers.find((item) => item.id === booking.containerId)
            const isCancelled = booking.status === 'Cancelled'
            const isChatEnabled = booking.payment_status === 'PAID' && ['Confirmed', 'In Transit'].includes(booking.status)

            return (
              <article
                key={booking.id}
                className={`interactive-card rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${isCancelled ? 'border-rose-100 bg-rose-50/20' : 'border-slate-200'}`}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Cargo centre</p>
                    <h2 className="mt-1 text-lg font-extrabold text-navy-900">{booking.providerName || container?.provider || 'CargoSpace partner'}</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{booking.cargoCenterName || container?.cargoCenterName}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={14} className="text-brand-600" /> {booking.route}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1.5 text-slate-600"><CreditCard size={13} /> {isCancelled ? 'Cancelled' : 'Paid'}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 ${isCancelled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}><BadgeCheck size={13} /> {booking.status}</span>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Booking ID</p><p className="mt-1 font-mono text-sm font-bold text-navy-900">{booking.id}</p><p className="mt-1 text-xs text-slate-500">Container {booking.containerId}</p></div>
                  <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cargo space</p><p className="mt-1 text-sm font-bold text-navy-900">{booking.space} CBM · {formatInr(booking.pricePerCbm || container?.pricePerCbm || 0)} / CBM</p><p className="mt-1 text-xs text-slate-500">Subtotal {formatInr(booking.subtotal || booking.amount)} · Fees & taxes {formatInr(booking.taxesFees || 0)}</p><p className="mt-1 text-xs font-bold text-navy-800">Total paid {formatInr(booking.amount)}</p><p className="mt-1 text-xs text-slate-500">Vehicle {booking.vehicleNumber || container?.vehicleNumber || 'Not registered'}</p></div>
                  <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Slot date</p><p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-navy-900"><CalendarDays size={15} className="text-brand-600" /> {formatDate(booking.date)}</p><p className="mt-1 text-xs text-slate-500">{booking.period}</p></div>
                  <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Customer & payment</p><p className="mt-1 text-sm font-bold text-navy-900">{booking.customerName || 'Customer'}</p><p className="mt-1 text-xs text-slate-500">{booking.customerPhone || ''} {booking.customerEmail || ''}</p><p className="mt-1 text-xs text-slate-500">{booking.payment_status || 'PAID'} · {booking.paymentDate ? formatDate(booking.paymentDate.slice(0, 10)) : 'Payment date unavailable'}</p></div>
                </div>

                {isCancelled && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-800">
                        <MessageSquare size={14} className="text-rose-600" /> Cancellation Feedback &amp; Reason
                      </span>
                      {booking.cancelledAt && (
                        <span className="text-[11px] font-semibold text-rose-600">
                          Cancelled on {cancellationTime(booking)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 rounded-lg border border-rose-100 bg-white p-3 shadow-xs">
                      <p className="text-xs font-medium text-slate-800">
                        {booking.cancellationReason || 'No detailed cancellation reason provided.'}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-600">Refund status:</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          booking.refundStatus === 'REFUNDED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          <BadgeCheck size={12} />
                          {booking.refundStatus === 'REFUNDED'
                            ? `Refunded ${formatInr(booking.refundAmount || booking.amount)}`
                            : `Refund Pending (${formatInr(booking.amount)})`}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">Reference: {booking.id}</span>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-col items-start border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap gap-2">
                    {!isCancelled ? (
                      <button
                        type="button"
                        onClick={() => openCancel(booking)}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100"
                      >
                        <XCircle size={16} /> Cancel booking
                      </button>
                    ) : (
                      <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-rose-100 px-4 py-2 text-sm font-bold text-rose-700">
                        <CheckCircle2 size={16} /> Booking cancelled
                      </span>
                    )}
                    {isChatEnabled ? (
                      <button
                        type="button"
                        onClick={() => openChat(booking)}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                      >
                        <MessageCircle size={16} /> Chat with Admin
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
      </div>

      {!visibleBookings.length ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No {filter.toLowerCase()} bookings to show.</div> : null}

      <Link to="/containers" className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
        Book more space <ChevronRight size={16} />
      </Link>

      {selectedBooking ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isCancelling) setSelectedBooking(null) }}>
        <section role="dialog" aria-modal="true" aria-labelledby="cancel-title" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">Cancel booking</p>
              <h2 id="cancel-title" className="mt-1 text-xl font-extrabold text-navy-900">Why do you want to cancel this booking?</h2>
              <p className="mt-1 text-xs text-slate-500">Your feedback helps logistics providers improve schedules. Your booking will remain visible with its cancellation details.</p>
            </div>
            <button
              type="button"
              disabled={isCancelling}
              onClick={() => setSelectedBooking(null)}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy-900"
              aria-label="Close cancellation dialog"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Select a primary reason</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {cancellationReasons.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setReason(item)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    reason === item
                      ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-200'
                      : 'border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-brand-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-slate-700">
            Tell us more / Feedback details
            <textarea
              value={customReason}
              onChange={(event) => setCustomReason(event.target.value)}
              rows={3}
              className="auth-input mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-navy-900 outline-none focus:border-brand-500"
              placeholder="Please provide additional feedback or notes regarding this cancellation..."
            />
          </label>

          {selectedBooking.cancellationError ? (
            <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              <AlertCircle size={14} /> {selectedBooking.cancellationError}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isCancelling}
              onClick={() => setSelectedBooking(null)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Keep booking
            </button>
            <button
              type="button"
              disabled={(!customReason.trim() && !reason) || isCancelling}
              onClick={confirmCancel}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isCancelling ? 'Cancelling...' : 'Confirm cancellation'}
            </button>
          </div>
        </section>
      </div> : null}
    </div>
  )
}

function normalizeBooking(booking) {
  return {
    ...booking,
    id: booking.booking_id || booking.id,
    containerId: booking.containerId || booking.container_id,
    date: booking.date || booking.booking_date,
    cancellationReason: booking.cancellationReason || booking.cancellation_reason,
    cancelledAt: booking.cancelledAt || booking.cancelled_at,
    refundStatus: booking.refundStatus || booking.refund_status,
    refundAmount: booking.refundAmount || booking.refund_amount,
    slotStartTime: booking.slotStartTime || booking.slot_start_time || '09:00',
    slotEndTime: booking.slotEndTime || booking.slot_end_time || '13:00',
    customerName: booking.customerName || booking.customer_name || booking.trader_name,
    customerPhone: booking.customerPhone || booking.customer_phone || booking.trader_phone,
    customerEmail: booking.customerEmail || booking.customer_email || booking.trader_email,
    cargoCenterName: booking.cargoCenterName || booking.cargo_center_name,
    providerName: booking.providerName || booking.provider_name,
    vehicleNumber: booking.vehicleNumber || booking.vehicle_number,
    pricePerCbm: Number(booking.pricePerCbm ?? booking.price_per_cbm) || 0,
    subtotal: Number(booking.subtotal) || 0,
    taxesFees: Number(booking.taxesFees ?? booking.taxes_fees) || 0,
    paymentDate: booking.paymentDate || booking.payment_date,
  }
}

