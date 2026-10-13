import { useEffect, useRef, useState } from 'react'
import { CheckCheck, MessageCircle, Send, X } from 'lucide-react'
import { useChat } from './ChatProvider'
import { useStoredUser } from '../hooks/useStoredUser'

export default function ChatDrawer() {
  const user = useStoredUser()
  const isProvider = user?.role === 'provider'
  const { bookings, activeBooking, messages, isOpen, setIsOpen, openChat, selectBooking, sendMessage, unreadCount, error, connected } = useChat()
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState('')
  const [sendStatus, setSendStatus] = useState('')
  const messageEnd = useRef(null)

  useEffect(() => { messageEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  if (!user?.user_id || !['user', 'provider'].includes(user.role)) return null

  async function submit(event) {
    event.preventDefault()
    const cleanDraft = draft.trim()
    if (!cleanDraft) return setSendError('Write a message before sending.')
    const result = await sendMessage(cleanDraft)
    if (!result?.success) return setSendError(result?.message || 'Message could not be sent.')
    setDraft('')
    setSendError('')
    setSendStatus(result.queued ? 'Message saved. It will appear when the recipient reconnects.' : '')
  }

  return <>
    {!isOpen ? <button type="button" onClick={() => openChat()} className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-navy-900 px-4 py-3 text-sm font-bold text-white shadow-xl transition hover:bg-brand-700" aria-label={isProvider ? 'Open customer chat' : 'Open CargoSpace chat'}><MessageCircle size={19} /> Chat {unreadCount ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] text-white">{unreadCount}</span> : null}</button> : null}
    {isOpen ? <aside className="chat-drawer-enter fixed bottom-4 right-4 z-50 flex h-[min(680px,calc(100vh-6rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(11,31,58,0.2)] sm:bottom-6 sm:right-6" aria-label={isProvider ? 'Customer chat' : 'CargoSpace support chat'}>
      <header className="flex shrink-0 items-center justify-between gap-3 bg-navy-900 p-4 text-white"><div><p className="text-sm font-extrabold">{isProvider ? 'Customer conversations' : 'CargoSpace Support'}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-blue-100"><i className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-300'}`} />{connected ? 'Online' : 'Reconnecting...'}</p></div><button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-2 text-blue-100 hover:bg-white/10" aria-label="Close chat"><X size={18} /></button></header>
      <div className="shrink-0 border-b border-slate-100 bg-white p-3"><label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Paid booking</label><select value={activeBooking?.booking_id || ''} onChange={(event) => selectBooking(bookings.find((booking) => booking.booking_id === event.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-navy-900" disabled={!bookings.length}><option value="">{bookings.length ? 'Select a booking' : 'No paid bookings yet'}</option>{bookings.map((booking) => <option key={booking.booking_id} value={booking.booking_id}>{booking.booking_id} · {isProvider ? booking.user_name || booking.container_id : booking.container_id}</option>)}</select></div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">{error ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{error}</p> : null}{activeBooking ? <p className="text-center text-[11px] font-bold text-slate-400">Booking {activeBooking.booking_id}</p> : <div className="py-12 text-center text-sm text-slate-500">Chat unlocks after a successful payment.</div>}{messages.map((message) => { const isOwnMessage = message.sender_id === user.user_id; return <div key={message.message_id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-sm ${isOwnMessage ? 'rounded-br-sm bg-navy-900 text-white' : 'rounded-bl-sm bg-white text-slate-700 shadow-sm'}`}><p>{message.message}</p><p className={`mt-1 flex items-center gap-1 text-[10px] ${isOwnMessage ? 'text-slate-300' : 'text-slate-400'}`}>{new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.timestamp))}{isOwnMessage ? <CheckCheck size={12} /> : null}</p></div></div>})}<div ref={messageEnd} /></div>
      <form onSubmit={submit} className="shrink-0 border-t border-slate-100 bg-white p-3"><div className="flex items-center gap-2"><input value={draft} onChange={(event) => { setDraft(event.target.value); setSendStatus('') }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) submit(event) }} placeholder={activeBooking ? (isProvider ? 'Write to customer...' : 'Write to support...') : 'Select a paid booking'} disabled={!activeBooking} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 disabled:bg-slate-50" /><button type="submit" disabled={!activeBooking} className="rounded-xl bg-navy-900 p-3 text-white hover:bg-brand-700 disabled:opacity-50" aria-label="Send message"><Send size={17} /></button></div>{sendError ? <p className="mt-2 text-xs font-semibold text-rose-600">{sendError}</p> : null}{sendStatus ? <p className="mt-2 text-xs font-semibold text-emerald-700">{sendStatus}</p> : null}</form>
    </aside> : null}
  </>
}
