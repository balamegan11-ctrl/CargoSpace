import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'

const ChatContext = createContext(null)
const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function ChatProvider({ children }) {
  const user = JSON.parse(localStorage.getItem('cargospace_user') || 'null')
  const [bookings, setBookings] = useState([])
  const [activeBooking, setActiveBooking] = useState(null)
  const [messages, setMessages] = useState([])
  const [socket, setSocket] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)

  async function loadBookings() {
    if (!user?.user_id) return
    try {
      const response = await fetch('/api/chat/bookings', { headers: { 'x-user-id': user.user_id } })
      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to load paid bookings.' }
      if (!response.ok) throw new Error(data.message || 'Unable to load paid bookings.')
      setBookings(data.bookings || [])
      setError('')
    } catch (loadError) {
      setError(loadError.message || 'Chat service is unavailable.')
    }
  }

  useEffect(() => {
    if (!user?.user_id) return undefined
    loadBookings()
    const client = io(socketUrl, { auth: { userId: user.user_id }, reconnection: true })
    client.on('connect', () => { setConnected(true); setError('') })
    client.on('disconnect', () => setConnected(false))
    client.on('connect_error', () => { setConnected(false); setError('Chat service is offline. Try again shortly.') })
    client.on('new_message', (message) => {
      setMessages((current) => current.some((item) => item.message_id === message.message_id) ? current : [...current, message])
      if (message.sender_id !== user.user_id) loadBookings()
    })
    client.on('booking_created', loadBookings)
    client.on('booking_cancelled', loadBookings)
    client.on('booking_refunded', loadBookings)
    setSocket(client)
    return () => client.disconnect()
  }, [user?.user_id])

  useEffect(() => {
    if (socket && activeBooking) socket.emit('join_booking', activeBooking.booking_id)
  }, [socket, activeBooking])

  async function openChat(booking = null) {
    setIsOpen(true)
    setError('')
    if (!bookings.length) await loadBookings()
    const selected = booking || bookings[0]
    if (!selected) return
    setActiveBooking(selected)
    try {
      const response = await fetch(`/api/chat/${selected.booking_id}/messages`, { headers: { 'x-user-id': user.user_id } })
      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to load conversation.' }
      if (!response.ok) throw new Error(data.message || 'Unable to load conversation.')
      setMessages(data.messages || [])
      socket?.emit('join_booking', selected.booking_id)
      await loadBookings()
    } catch (loadError) {
      setError(loadError.message || 'Unable to open conversation.')
    }
  }

  function selectBooking(booking) {
    openChat(booking)
  }

  function sendMessage(message) {
    return new Promise((resolve) => {
      if (!activeBooking) return resolve({ success: false, message: 'Select a paid booking first.' })
      if (socket?.connected) {
        socket.emit('send_message', { bookingId: activeBooking.booking_id, message }, resolve)
        return
      }
      fetch(`/api/chat/${activeBooking.booking_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.user_id },
        body: JSON.stringify({ message }),
      }).then(async (response) => {
        const contentType = response.headers.get('content-type') || ''
        const data = contentType.includes('application/json') ? await response.json() : { message: 'Message could not be saved.' }
        if (!response.ok) return resolve({ success: false, message: data.message || 'Message could not be saved.' })
        setMessages((current) => current.some((item) => item.message_id === data.message.message_id) ? current : [...current, data.message])
        resolve({ success: true, message: data.message, queued: true })
      }).catch(() => resolve({ success: false, message: 'Unable to reach CargoSpace. Try again shortly.' }))
    })
  }

  const unreadCount = useMemo(() => bookings.reduce((total, booking) => total + Number(booking.unread_count || 0), 0), [bookings])
  const value = { bookings, activeBooking, messages, isOpen, setIsOpen, openChat, selectBooking, sendMessage, unreadCount, error, connected }
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) throw new Error('useChat must be used inside ChatProvider')
  return context
}
