import { useEffect, useState } from 'react'
import { CheckCheck, MessageCircle, Send } from 'lucide-react'
import { io } from 'socket.io-client'

const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function AdminChatPanel({ admin }) {
  const [bookings, setBookings] = useState([])
  const [activeBooking, setActiveBooking] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [socket, setSocket] = useState(null)

  async function loadBookings() {
    const response = await fetch('/api/chat/bookings', { headers: { 'x-admin-id': admin.admin_id } })
    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to load support conversations.' }
    if (!response.ok) throw new Error(data.message || 'Unable to load support conversations.')
    setBookings(data.bookings || [])
    return data.bookings || []
  }

  useEffect(() => {
    loadBookings().catch((loadError) => setError(loadError.message))
    const client = io(socketUrl, { auth: { adminId: admin.admin_id } })
    client.on('connect', () => setConnected(true))
    client.on('disconnect', () => setConnected(false))
    client.on('connect_error', () => setError('Chat service is offline.'))
    client.on('new_message', (message) => {
      if (message.booking_id === activeBooking?.booking_id) setMessages((current) => current.some((item) => item.message_id === message.message_id) ? current : [...current, message])
      if (message.sender_role === 'user') loadBookings().catch(() => {})
    })
    setSocket(client)
    return () => client.disconnect()
  }, [admin.admin_id, activeBooking?.booking_id])

  useEffect(() => {
    if (socket && activeBooking) socket.emit('join_booking', activeBooking.booking_id)
  }, [socket, activeBooking])

  async function selectBooking(booking) {
    setActiveBooking(booking)
    setError('')
    try {
      const response = await fetch(`/api/chat/${booking.booking_id}/messages`, { headers: { 'x-admin-id': admin.admin_id } })
      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to load messages.' }
      if (!response.ok) throw new Error(data.message || 'Unable to load messages.')
      setMessages(data.messages || [])
      socket?.emit('join_booking', booking.booking_id)
      await fetch(`/api/chat/${booking.booking_id}/read`, { method: 'POST', headers: { 'x-admin-id': admin.admin_id } })
      await loadBookings()
    } catch (loadError) { setError(loadError.message) }
  }

  function send(event) {
    event.preventDefault()
    if (!activeBooking || !draft.trim()) return
    socket?.emit('send_message', { bookingId: activeBooking.booking_id, message: draft.trim() }, (result) => {
      if (!result.success) setError(result.message)
      else { setDraft(''); setError('') }
    })
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Customer support</p><h2 className="mt-1 text-xl font-extrabold text-navy-900">Live Chat</h2></div><span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500"><i className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-400'}`} />{connected ? 'Online' : 'Offline'}</span></div>{error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p> : null}<div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]"><div className="space-y-2">{bookings.map((booking) => <button type="button" key={booking.booking_id} onClick={() => selectBooking(booking)} className={`w-full rounded-xl border p-3 text-left ${activeBooking?.booking_id === booking.booking_id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-200'}`}><div className="flex items-center justify-between gap-2"><strong className="font-mono text-sm text-navy-900">{booking.booking_id}</strong>{booking.unread_count ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">{booking.unread_count}</span> : null}</div><p className="mt-1 text-xs font-semibold text-slate-600">{booking.user_name || 'Trader'} · {booking.container_id}</p><p className="mt-1 text-[11px] text-slate-400">{booking.route}</p></button>)}{!bookings.length ? <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No paid customer conversations yet.</p> : null}</div><div className="flex min-h-[360px] flex-col rounded-xl border border-slate-100 bg-slate-50/70">{activeBooking ? <><header className="border-b border-slate-100 bg-white p-4"><p className="font-extrabold text-navy-900">{activeBooking.user_name || 'Trader'}</p><p className="mt-1 text-xs text-slate-500">Booking {activeBooking.booking_id} · {activeBooking.container_id}</p></header><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.map((message) => <div key={message.message_id} className={`flex ${message.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${message.sender_role === 'admin' ? 'rounded-br-sm bg-navy-900 text-white' : 'rounded-bl-sm bg-white text-slate-700 shadow-sm'}`}><p>{message.message}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">{new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.timestamp))}{message.sender_role === 'admin' ? <CheckCheck size={12} /> : null}</p></div></div>)}</div><form onSubmit={send} className="flex gap-2 border-t border-slate-100 bg-white p-3"><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Reply to trader..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><button type="submit" className="rounded-xl bg-navy-900 p-3 text-white hover:bg-brand-700" aria-label="Send admin reply"><Send size={17} /></button></form></> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-500"><MessageCircle size={28} className="text-brand-500" /><p className="mt-3 text-sm font-semibold">Select a paid booking to open its conversation.</p></div>}</div></div></section>
}
