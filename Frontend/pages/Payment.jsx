import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, CreditCard, Download, Landmark, ShieldCheck, Smartphone } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { containers, formatDate, formatInr } from '../data/mockData'
import { useLogisticsCenters } from '../hooks/useLogisticsCenters'
import { calculateBookingPrice } from '../utils/bookingPricing'

const paymentOptions = [
  { label: 'UPI', icon: Smartphone },
  { label: 'Credit/Debit Card', icon: CreditCard },
  { label: 'Net Banking', icon: Landmark },
]

export default function Payment() {
  const [params] = useSearchParams()
  const { centers } = useLogisticsCenters()
  const containerId = params.get('container') || containers[0].id
  const container = centers.find((item) => item.id === containerId) || containers.find((item) => item.id === containerId) || { ...containers[0], id: containerId }
  const space = Number(params.get('space')) || 0
  const pricePerCbm = Number(container.pricePerCbm ?? container.price / container.totalCbm)
  const { subtotal, handlingFee, serviceFee, taxes, taxesAndFees: taxesFees, total } = calculateBookingPrice(space, pricePerCbm)
  const bookingId = params.get('bookingId') || `BK-${Date.now()}`
  const bookingDate = params.get('bookingDate') || container.departure
  const slotStartTime = params.get('slotStartTime') || '09:00'
  const slotEndTime = params.get('slotEndTime') || '13:00'
  const customerVehicleStorageKey = `cargospace-booking-${bookingId}-vehicle`
  const customerVehicleNumber = sessionStorage.getItem(customerVehicleStorageKey) || ''
  const [method, setMethod] = useState('UPI')
  const [paidAt, setPaidAt] = useState(null)
  const [paymentError, setPaymentError] = useState('')
  const [availableCbm, setAvailableCbm] = useState(container.availableCbm)
  const [availabilityLoading, setAvailabilityLoading] = useState(true)
  const [confirmedBooking, setConfirmedBooking] = useState(null)

  useEffect(() => {
    fetch(`/api/containers/availability?containerId=${encodeURIComponent(container.id)}`)
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || ''
        const data = contentType.includes('application/json') ? await response.json() : { success: false }
        if (data.success && data.data) setAvailableCbm(data.data.availableCbm)
      })
      .catch(() => {})
      .finally(() => setAvailabilityLoading(false))
  }, [container.id])

  async function completePayment() {
    const user = JSON.parse(localStorage.getItem('cargospace_user') || 'null')
    if (!user?.user_id) return setPaymentError('Please sign in before completing payment.')
    if (customerVehicleNumber.trim().length < 4 || customerVehicleNumber.trim().length > 20) return setPaymentError('Return to the booking form and enter a valid pickup vehicle number.')
    if (!Number.isInteger(space) || space <= 0) return setPaymentError('Enter a valid whole-number CBM amount before payment.')
    if (availabilityLoading) return setPaymentError('Checking the latest available capacity. Try again in a moment.')
    if (space > availableCbm) return setPaymentError(`Only ${availableCbm} CBM is currently available.`)
    setPaymentError('')
    const paidAtValue = new Date()
    try {
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.user_id },
        body: JSON.stringify({ bookingId, containerId: container.id, space, bookingDate, slotStartTime, slotEndTime, customerVehicleNumber, paymentMethod: method, receiptNumber: `CS-${bookingId}-${paidAtValue.getTime()}` }),
      })
      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.json() : { message: 'Payment could not be confirmed.' }
      if (!response.ok) throw new Error(data.message || 'Payment could not be confirmed.')
      sessionStorage.removeItem(customerVehicleStorageKey)
      setConfirmedBooking(data.booking)
      setPaidAt(new Date(data.booking.payment_date || paidAtValue.toISOString()))
    } catch (error) {
      setPaymentError(error.message || 'Payment could not be confirmed.')
    }
  }

  if (paidAt) {
    return <PaymentSuccess container={container} booking={confirmedBooking} method={method} paidAt={paidAt} />
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><Link to={`/booking?container=${container.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-600"><ArrowLeft size={16} /> Back to booking</Link><h1 className="mt-4 text-2xl font-extrabold text-navy-900">Secure payment</h1><p className="mt-1 text-sm text-slate-500">Choose a payment method for your booking.</p></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-extrabold text-navy-900">Payment method</h2><div className="mt-4 space-y-3">{paymentOptions.map(({ label, icon: Icon }) => <button type="button" key={label} onClick={() => setMethod(label)} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm font-bold transition-colors ${method === label ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-700 hover:border-brand-200'}`}><Icon size={19} />{label}<span className="ml-auto h-4 w-4 rounded-full border-4 border-current" /></button>)}</div><div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500"><p className="flex items-start gap-2 text-xs"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" />Demo payment only. Sensitive payment credentials are not collected or stored.</p></div>{paymentError ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{paymentError}</p> : null}<button type="button" disabled={availabilityLoading || space <= 0 || space > availableCbm} onClick={completePayment} className="mt-5 w-full rounded-xl bg-navy-900 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">Proceed to Payment · {formatInr(total)}</button></section>
        <section className="h-fit rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-extrabold text-navy-900">Booking price summary</h2><dl className="mt-5 space-y-4 text-sm"><Row label="Container ID" value={container.id} /><Row label="Cargo center" value={container.cargoCenterName} /><Row label="Route" value={`${container.origin} → ${container.destination}`} /><Row label="Transport" value={container.mode} /><Row label="Customer pickup vehicle" value={customerVehicleNumber || 'Return to booking and enter this detail'} /><Row label="Available CBM" value={availabilityLoading ? 'Checking live capacity...' : `${availableCbm} CBM`} /><Row label="Required space" value={`${space} CBM`} /><Row label="Price per CBM" value={formatInr(pricePerCbm)} /><Row label="Subtotal" value={formatInr(subtotal)} /><Row label="Handling fee" value={formatInr(handlingFee)} /><Row label="Platform fee" value={formatInr(serviceFee)} /><Row label="Taxes (18%)" value={formatInr(taxes)} /><Row label="Taxes & fees" value={formatInr(taxesFees)} /><Row label="Total Amount to Pay" value={formatInr(total)} /></dl>{space > availableCbm ? <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700" role="alert">Only {availableCbm} CBM is currently available.</p> : null}</section>
      </div>
    </div>
  )
}

function PaymentSuccess({ container, booking, method, paidAt }) {
  const amount = booking.amount
  const subtotal = booking.subtotal
  const taxesFees = booking.taxes_fees
  const bookingId = booking.booking_id
  const space = booking.space
  const bookingDate = booking.booking_date
  const slotStartTime = booking.slot_start_time
  const slotEndTime = booking.slot_end_time
  const receipt = { bookingId, amount, subtotal, taxesFees, method: booking.payment_method || method, paidAt, container, bookingDate, slotStartTime, slotEndTime, space, receiptNumber: booking.receipt_number, customerName: booking.customer_name, customerPhone: booking.customer_phone, customerEmail: booking.customer_email }
  useEffect(() => {
    function isSensitiveTarget(target) {
      return target instanceof Element && Boolean(target.closest('[data-sensitive-payment]'))
    }

    function blockSensitiveCopy(event) {
      if (isSensitiveTarget(event.target)) event.preventDefault()
    }

    function blockSensitiveContextMenu(event) {
      if (isSensitiveTarget(event.target)) event.preventDefault()
    }

    function blockSensitiveKeyboardCopy(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && isSensitiveTarget(event.target)) {
        event.preventDefault()
      }
    }

    document.addEventListener('copy', blockSensitiveCopy)
    document.addEventListener('contextmenu', blockSensitiveContextMenu)
    document.addEventListener('keydown', blockSensitiveKeyboardCopy)

    return () => {
      document.removeEventListener('copy', blockSensitiveCopy)
      document.removeEventListener('contextmenu', blockSensitiveContextMenu)
      document.removeEventListener('keydown', blockSensitiveKeyboardCopy)
    }
  }, [])

  return <div className="mx-auto max-w-2xl space-y-5"><section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={34} /></div><p className="mt-5 text-center text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Payment Successful</p><h1 className="mt-2 text-center text-2xl font-extrabold text-navy-900">Booking Confirmed</h1><p className="mt-2 text-center text-sm text-slate-500">Your cargo space is reserved. A privacy-safe receipt is ready to download.</p><div data-sensitive-payment className="mt-7 grid select-none gap-4 rounded-xl bg-slate-50 p-5 text-sm sm:grid-cols-2"><Detail label="Booking ID" value={bookingId} /><Detail label="Cargo centre" value={container.provider} /><Detail label="Slot" value={`${container.origin} → ${container.destination}`} /><Detail label="Slot date" value={formatDate(bookingDate)} /><Detail label="Slot start time" value={formatClockTime(slotStartTime)} /><Detail label="Slot end time" value={formatClockTime(slotEndTime)} /><Detail label="Space reserved" value={`${space} CBM`} /><Detail label="Payment amount" value={formatInr(amount)} /><Detail label="Payment date" value={formatDateTime(paidAt)} /><Detail label="Payment method" value={method} /><Detail label="Payment status" value="PAID" /></div><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"><button type="button" onClick={() => downloadReceipt(receipt)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"><Download size={17} /> Download Payment Receipt</button><Link to="/bookings" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-navy-900 transition-colors hover:bg-slate-50">View Booking</Link></div></section><p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />No card number, CVV, password, or other sensitive payment credentials are included in the confirmation or receipt.</p></div>
}

function Detail({ label, value }) { return <div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 font-bold text-navy-900">{value}</p></div> }
function Row({ label, value }) { return <div><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-bold text-navy-900">{value}</dd></div> }
function formatDateTime(date) { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date) }
function formatClockTime(time) { const [hour, minute] = time.split(':').map(Number); return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(2000, 0, 1, hour, minute)) }

function downloadReceipt({ bookingId, amount, subtotal, taxesFees, method, paidAt, container, bookingDate, slotStartTime, slotEndTime, space, receiptNumber, customerName, customerPhone, customerEmail }) {
  const pdf = createInvoicePdf({ bookingId, amount, subtotal, taxesFees, method, paidAt, container, bookingDate, slotStartTime, slotEndTime, space, receiptNumber, customerName, customerPhone, customerEmail })
  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `CargoSpace_Payment_Receipt_${bookingId}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}

function createInvoicePdf({ bookingId, amount, subtotal, taxesFees, method, paidAt, container, bookingDate, slotStartTime, slotEndTime, space, receiptNumber, customerName, customerPhone, customerEmail }) {
  const money = (value) => `INR ${value.toLocaleString('en-IN')}`
  const paymentDate = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(paidAt)
  const paymentTime = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).format(paidAt)
  const commands = []
  const text = (value, x, y, size = 9, font = 'F1', color = '0.12 0.18 0.27') => {
    commands.push(`${color} rg`, 'BT', `/${font} ${size} Tf`, `${x} ${y} Td`, `(${escapePdf(String(value))}) Tj`, 'ET')
  }
  const line = (x1, y1, x2, y2, color = '0.82 0.86 0.91', width = 0.7) => commands.push(`${color} RG`, `${width} w`, `${x1} ${y1} m ${x2} ${y2} l S`)
  const box = (x, y, width, height, color = '0.82 0.86 0.91') => commands.push(`${color} RG`, '0.7 w', `${x} ${y} ${width} ${height} re S`)
  const fill = (x, y, width, height, color = '0.95 0.97 1') => commands.push(`${color} rg`, `${x} ${y} ${width} ${height} re f`)
  const label = (value, x, y) => text(value.toUpperCase(), x, y, 7, 'F2', '0.18 0.39 0.78')
  const value = (labelText, valueText, x, y) => { label(labelText, x, y); text(valueText, x, y - 15, 9, 'F2') }

  fill(36, 748, 523, 58, '0.04 0.12 0.23')
  text('CS', 53, 775, 18, 'F2', '1 1 1')
  text('CargoSpace', 88, 780, 18, 'F2', '1 1 1')
  text('Transport & Logistics Booking Platform', 88, 764, 8, 'F1', '0.78 0.86 0.96')
  text('PAYMENT RECEIPT', 399, 780, 12, 'F2', '1 1 1')
  text('PAID', 493, 759, 9, 'F2', '0.52 0.92 0.68')

  line(36, 736, 559, 736)
  value('Receipt No', receiptNumber, 50, 718)
  value('Booking ID', bookingId, 50, 680)
  value('Payment Date', paymentDate, 315, 718)
  value('Payment Time', paymentTime, 315, 680)
  line(36, 650, 559, 650)

  label('Bill to', 50, 630)
  text(`Customer name: ${customerName || 'Not provided'}`, 50, 612, 9)
  text(`Email: ${customerEmail || 'Not provided'}`, 50, 596, 9)
  text(`Phone: ${customerPhone || 'Not provided'}`, 50, 580, 9)
  label('Shipment / booking to', 315, 630)
  text(container.provider, 315, 612, 9, 'F2')
  text(`Route: ${container.origin} to ${container.destination}`, 315, 596, 9)
  text(`Slot date: ${formatDate(bookingDate)}`, 315, 580, 9)
  text(`Slot time: ${formatClockTime(slotStartTime)} - ${formatClockTime(slotEndTime)}`, 315, 564, 9)
  line(36, 540, 559, 540)

  fill(36, 515, 523, 25, '0.04 0.12 0.23')
  text('DESCRIPTION', 50, 524, 8, 'F2', '1 1 1')
  text('QTY', 332, 524, 8, 'F2', '1 1 1')
  text('UNIT PRICE', 390, 524, 8, 'F2', '1 1 1')
  text('TOTAL', 493, 524, 8, 'F2', '1 1 1')
  box(36, 475, 523, 65)
  line(36, 515, 559, 515)
  line(315, 475, 315, 540)
  line(370, 475, 370, 540)
  line(480, 475, 480, 540)
  text('Cargo slot booking', 50, 492, 9, 'F2')
  text(`${container.origin} - ${container.destination}`, 50, 479, 8, 'F1', '0.35 0.40 0.48')
  text(String(space), 337, 492, 9)
  text(money(subtotal), 390, 492, 9)
  text(money(subtotal), 493, 492, 9, 'F2')

  value('Subtotal', money(subtotal), 390, 444)
  value('Taxes & fees', money(taxesFees), 390, 420)
  value('Total paid', money(amount), 390, 396)
  line(36, 380, 559, 380)
  label('Payment information', 50, 358)
  text(`Payment method: ${method}`, 50, 338, 9)
  text('Transaction / reference ID: Not provided', 50, 322, 9)
  text('Payment status: PAID', 50, 306, 9, 'F2', '0.08 0.48 0.25')
  line(36, 270, 559, 270)
  text('PAYMENT SUCCESSFUL', 205, 235, 13, 'F2', '0.08 0.48 0.25')
  text('Thank you for using CargoSpace.', 194, 208, 10, 'F2')
  text('Your cargo slot booking has been confirmed.', 168, 191, 9, 'F1', '0.35 0.40 0.48')
  text('CargoSpace | Transport & Logistics Booking Platform', 174, 60, 8, 'F1', '0.40 0.45 0.53')

  const content = commands.join('\n')
  const objects = [`<< /Type /Catalog /Pages 2 0 R >>`, `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return pdf
}

function escapePdf(value) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
