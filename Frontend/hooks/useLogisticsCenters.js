import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { containers as fallbackContainers } from '../data/mockData'

const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function normalizeCenter(center) {
  const fallback = fallbackContainers.find((container) => container.id === center.id)
  const normalized = {
    ...fallback,
    ...center,
    cargoType: center.cargoType || fallback?.cargoType || 'General Cargo',
    departure: center.departure || fallback?.departure || new Date().toISOString().slice(0, 10),
    image: center.image || fallback?.image || fallbackContainers[0]?.image,
    verified: center.verified ?? fallback?.verified ?? true,
    price: center.price ?? fallback?.price,
    pricePerCbm: center.pricePerCbm ?? fallback?.pricePerCbm,
  }
  normalized.bookedCbm ??= Math.max(0, Number(normalized.totalCbm) - Number(normalized.availableCbm))
  return normalized
}

export function useLogisticsCenters() {
  const [centers, setCenters] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const refreshCenters = () => fetch('/api/logistics-centers')
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load available cargo space.')
        return response.json()
      })
      .then((data) => {
        if (active) setCenters((data.centers || []).map(normalizeCenter))
      })
      .catch(() => {
        if (active) setCenters(fallbackContainers.map(normalizeCenter))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    refreshCenters()

    const socket = io(socketUrl)
    socket.on('space_updated', (update) => {
      if (!update?.containerId) return
      setCenters((current) => current.map((center) => center.id === update.containerId
        ? { ...center, totalCbm: update.totalCbm, bookedCbm: update.bookedCbm, availableCbm: update.availableCbm }
        : center))
    })
    socket.on('provider_status_updated', refreshCenters)

    return () => {
      active = false
      socket.disconnect()
    }
  }, [])

  return { centers, loading }
}