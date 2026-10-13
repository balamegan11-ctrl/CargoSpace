import { useState } from 'react'
import { ArrowLeft, CheckCircle2, CreditCard, Landmark, Smartphone } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { containers, formatInr } from '../data/mockData'

export default function Payment() {
  const [params] = useSearchParams()
  const container = containers.find((item) => item.id === params.get('container')) || containers[0]
  const amount = Number(params.get('amount')) || 0
  const bookingId = 'BK-4424'
  const [method, setMethod] = useState('UPI')
  const [paid, setPaid] = useState(false)
  const options = [{ label: 'UPI', icon: Smartphone }, { label: 'Credit/Debit Card', icon: CreditCard }, { label: 'Net Banking', icon: Landmark }]

  if (paid) return <div className="mx-auto max-w-xl rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-sm"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={34} /></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Payment Successful</p><h1 className="mt-2 text-2xl font-extrabold text-navy-900">Booking Confirmed</h1><div className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-left text-sm"><span className="text-slate-500">Booking ID</span><strong>{bookingId}</strong><span className="text-slate-500">Amount paid</span><strong>{formatInr(amount)}</strong></div><Link to="/bookings" className="mt-6 inline-flex rounded-xl bg-navy-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700">View Booking</Link></div>

  return <div className="mx-auto max-w-4xl space-y-6"><div><Link to={`/booking?container=${container.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-600"><ArrowLeft size={16} /> Back to booking</Link><h1 className="mt-4 text-2xl font-extrabold text-navy-900">Secure payment</h1><p className="mt-1 text-sm text-slate-500">Choose a payment method for your booking.</p></div><div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]"><section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-extrabold text-navy-900">Payment options</h2><div className="mt-4 space-y-3">{options.map(({ label, icon: Icon }) => <button type="button" key={label} onClick={() => setMethod(label)} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm font-bold transition-colors ${method === label ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-700 hover:border-brand-200'}`}><Icon size={19} />{label}<span className="ml-auto h-4 w-4 rounded-full border-4 border-current" /></button>)}</div><div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Selected method: <strong className="text-slate-700">{method}</strong><p className="mt-1 text-xs">This is a frontend booking flow and no payment is processed.</p></div><button type="button" onClick={() => setPaid(true)} className="mt-5 w-full rounded-xl bg-navy-900 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700">Pay Now</button></section><section className="h-fit rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-extrabold text-navy-900">Booking summary</h2><dl className="mt-5 space-y-4 text-sm"><Row label="Booking ID" value={bookingId} /><Row label="Container ID" value={container.id} /><Row label="Route" value={`${container.origin} → ${container.destination}`} /><Row label="Logistics provider" value={container.provider} /></dl><div className="mt-5 flex justify-between border-t border-slate-100 pt-4"><span className="font-bold">Amount</span><strong className="text-xl text-navy-900">{formatInr(amount)}</strong></div></section></div></div>
}
function Row({ label, value }) { return <div><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-bold text-navy-900">{value}</dd></div> }

