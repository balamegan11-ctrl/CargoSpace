import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Send, Sparkles, X } from 'lucide-react'
import cargoSpaceMascot from '../assets/Gemini_Generated_Image_ezbj3lezbj3lezbj.png'
import { containers as fallbackCenters } from '../data/mockData'
import { useStoredUser } from '../hooks/useStoredUser'
import './CargoSpaceAssistant.css'

const starterQuestions = ['Find space near Chennai', 'How do I book?', 'View my bookings']

function searchPath(from = '', to = '') {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return `/containers${params.size ? `?${params}` : ''}`
}

function createAnswer(question, centers, user) {
  const normalized = question.toLowerCase()
  const locations = [...new Set(centers.flatMap((center) => [center.origin, center.destination, center.locationCity]).filter(Boolean))]
    .sort((first, second) => second.length - first.length)
  const mentionedLocations = locations.filter((location) => normalized.includes(location.toLowerCase()))
  const from = mentionedLocations[0] || ''
  const to = mentionedLocations[1] || ''
  const available = centers.filter((center) => Number(center.availableCbm) > 0)

  if (/\b(hello|hi|hey|good morning|good evening)\b/.test(normalized)) {
    return { text: `Hi${user?.name ? ` ${user.name.split(' ')[0]}` : ''}! I can help you find available cargo space, understand bookings and payments, or connect with your provider. What would you like to do?` }
  }

  if (/\b(book|booking|reserve|payment|pay|checkout)\b/.test(normalized)) {
    return {
      text: user?.role === 'provider'
        ? 'Your provider workspace shows customer bookings, payment details, and chat. Open it to review the latest activity.'
        : 'Choose a route and cargo space, enter your cargo and pickup details, then confirm payment. You can review your booking afterward.',
      actions: user?.role === 'provider'
        ? [{ label: 'Open provider workspace', to: '/provider' }]
        : [{ label: user?.user_id ? 'Find cargo space' : 'Sign in to book', to: user?.user_id ? searchPath(from, to) : `/login?redirect=${encodeURIComponent(searchPath(from, to))}` }],
    }
  }

  if (/\b(my booking|my bookings|track|tracking|receipt|payment status|shipment status)\b/.test(normalized)) {
    return {
      text: user?.role === 'provider'
        ? 'Your customer bookings and payment status are available in the provider workspace.'
        : 'Your bookings page shows booking status, payment records, and receipts.',
      actions: [{ label: user?.role === 'provider' ? 'Open provider workspace' : user?.user_id ? 'View my bookings' : 'Sign in to continue', to: user?.role === 'provider' ? '/provider' : user?.user_id ? '/bookings' : '/login?redirect=%2Fbookings' }],
    }
  }

  if (/\b(provider|list|offer|share|capacity|my space)\b/.test(normalized)) {
    return {
      text: user?.role === 'provider'
        ? 'Open your provider workspace to manage listed capacity, customer bookings, payments, and conversations.'
        : 'Logistics providers can register their company, route, transport mode, and available capacity. Traders can select “Space Provider” on the login screen to open that workspace.',
      actions: [{ label: user?.role === 'provider' ? 'Open provider workspace' : 'Register as a provider', to: user?.role === 'provider' ? '/provider' : '/register' }],
    }
  }

  if (/\b(chat|contact|message|talk to)\b/.test(normalized)) {
    return {
      text: user?.role === 'provider'
        ? 'Open a paid booking in your provider workspace and choose “Chat with customer” to continue the conversation.'
        : 'Customer chat is available for confirmed paid bookings. Open your bookings or chat page to continue.',
      actions: [{ label: user?.role === 'provider' ? 'View customer bookings' : user?.user_id ? 'Open booking chat' : 'Sign in to chat', to: user?.role === 'provider' ? '/provider' : user?.user_id ? '/chat' : '/login?redirect=%2Fchat' }],
    }
  }

  if (/\b(help|what can you do|options|support)\b/.test(normalized)) {
    return { text: 'I can help you search live cargo capacity by route, explain the booking and payment steps, find your bookings, or open the provider workspace. Try a question or choose a shortcut below.' }
  }

  if (/\b(find|search|available|space|route|cargo|near|capacity|cbm)\b/.test(normalized)) {
    const routeMatches = available.filter((center) => {
      const origin = String(center.origin || '').toLowerCase()
      const destination = String(center.destination || '').toLowerCase()
      const cityMatches = (location) => !location || origin.includes(location.toLowerCase()) || destination.includes(location.toLowerCase())
      return cityMatches(from) && cityMatches(to)
    })
    const options = (routeMatches.length ? routeMatches : available).slice(0, 3)
    if (!options.length) {
      return { text: 'I could not find live capacity right now. Try a different city pair or browse all routes.', actions: [{ label: 'Browse all cargo space', to: '/containers' }] }
    }
    const optionsText = options.map((center) => `${center.origin} to ${center.destination}: ${center.availableCbm} CBM available at ₹${Number(center.pricePerCbm || 0).toLocaleString('en-IN')} per CBM`).join('\n')
    return {
      text: `${from && to && !routeMatches.length ? `I didn't find an exact ${from} to ${to} match. Here are some available routes instead:\n` : 'Here are a few available options:\n'}${optionsText}`,
      actions: options.map((center) => ({ label: `View ${center.origin} to ${center.destination}`, to: `/booking?container=${encodeURIComponent(center.id)}` })),
    }
  }

  return {
    text: 'I can help with cargo-space search, routes, bookings, payment status, or provider capacity. For example, ask “Find 4 CBM from Chennai” or “How do I book?”',
    actions: [{ label: 'Find cargo space', to: searchPath(from, to) }],
  }
}

export default function CargoSpaceAssistant() {
  const navigate = useNavigate()
  const user = useStoredUser()
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [centers, setCenters] = useState(fallbackCenters)
  const [messages, setMessages] = useState(() => [{ id: 'welcome', role: 'assistant', text: 'Welcome to CargoSpace. Ask me about cargo routes, available space, bookings, or provider tools.' }])
  const messagesEndRef = useRef(null)
  const responseTimerRef = useRef(null)
  const closeTimerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    let active = true
    fetch('/api/logistics-centers')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load cargo capacity.')))
      .then((data) => { if (active && Array.isArray(data.centers)) setCenters(data.centers) })
      .catch(() => {})
    return () => { active = false }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy, open])

  useEffect(() => () => {
    window.clearTimeout(responseTimerRef.current)
    window.clearTimeout(closeTimerRef.current)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeAssistant()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  function sendMessage(value = draft) {
    const question = value.trim()
    if (!question || busy) return
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: question }])
    setDraft('')
    setBusy(true)
    responseTimerRef.current = window.setTimeout(() => {
      const answer = createAnswer(question, centers, user)
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', ...answer }])
      setBusy(false)
    }, 360)
  }

  function followAction(path) {
    closeAssistant()
    navigate(path)
  }

  function closeAssistant() {
    setClosing(true)
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, 180)
  }

  function openAssistant() {
    window.clearTimeout(closeTimerRef.current)
    setClosing(false)
    setOpen(true)
  }

  return createPortal(
    <div className="cargospace-assistant">
      {open ? (
        <section className={`cargospace-assistant__panel${closing ? ' cargospace-assistant__panel--closing' : ' chat-drawer-enter'}`} aria-label="CargoSpace AI assistant">
          <header className="cargospace-assistant__header">
            <span className="cargospace-assistant__avatar"><img src={cargoSpaceMascot} alt="CargoSpace mascot" className="cargospace-assistant__mascot" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">CargoSpace Assistant</p>
              <p className="mt-0.5 text-xs text-blue-100">Routes, bookings, and provider help</p>
            </div>
            <button type="button" onClick={closeAssistant} className="cargospace-assistant__icon-button" aria-label="Close assistant"><X size={18} /></button>
          </header>

          <div className="cargospace-assistant__messages" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`cargospace-assistant__message cargospace-assistant__message--${message.role}`}>
                <p className="whitespace-pre-line">{message.text}</p>
                {message.actions?.length ? <div className="mt-3 flex flex-wrap gap-2">{message.actions.map((action) => <button type="button" key={`${message.id}-${action.label}`} onClick={() => followAction(action.to)} className="cargospace-assistant__action">{action.label}<ArrowRight size={13} /></button>)}</div> : null}
              </div>
            ))}
            {messages.length === 1 && !busy ? <div className="cargospace-assistant__suggestions">{starterQuestions.map((question) => <button type="button" key={question} onClick={() => sendMessage(question)}>{question}</button>)}</div> : null}
            {busy ? <div className="cargospace-assistant__typing" role="status"><span /><span /><span /><span className="sr-only">CargoSpace assistant is thinking</span></div> : null}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={(event) => { event.preventDefault(); sendMessage() }} className="cargospace-assistant__composer">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} placeholder="Ask about routes or bookings..." aria-label="Message the CargoSpace assistant" disabled={busy} />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Send message"><Send size={17} /></button>
          </form>
          <p className="cargospace-assistant__note"><Sparkles size={12} /> CargoSpace logistics assistant</p>
        </section>
      ) : null}
      <button type="button" onClick={openAssistant} className="cargospace-assistant__launcher" aria-label="Open CargoSpace AI assistant" aria-expanded={open}>
        <img src={cargoSpaceMascot} alt="CargoSpace mascot" className="cargospace-assistant__launcher-image" />
        <span>Ask CargoSpace</span>
      </button>
    </div>,
    document.body,
  )
}