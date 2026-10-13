import { useEffect, useRef, useState } from 'react'

const GOOGLE_MAPS_API_KEY = 'AIzaSyDQChF73U_doSWFp962__rfw0ibpyhE7Bc'
const MAPS_SCRIPT_ID = 'cargo-space-google-maps-script'
const DEFAULT_CENTER = { lat: 22.9734, lng: 78.6569 }

function coordinate(point) {
  if (Array.isArray(point)) {
    return { lat: Number(point[0]), lng: Number(point[1]) }
  }

  if (!point || typeof point !== 'object') {
    return null
  }

  return {
    lat: Number(point.lat),
    lng: Number(point.lng),
  }
}

function normalizePoint(point) {
  const value = coordinate(point)
  if (!value || Number.isNaN(value.lat) || Number.isNaN(value.lng)) {
    return null
  }
  return value
}

function routePoints(route) {
  if (!route) return []
  if (Array.isArray(route)) {
    return route.map(normalizePoint).filter(Boolean)
  }

  if (route.from && route.to) {
    return [normalizePoint(route.from), normalizePoint(route.to)].filter(Boolean)
  }

  return []
}

function markerText(marker) {
  return marker.label || marker.title || marker.id || 'Location'
}

function getMapCenter(markers, livePosition, route) {
  const points = [
    ...markers.map((marker) => normalizePoint(marker)).filter(Boolean),
    ...(livePosition ? [normalizePoint(livePosition)] : []),
    ...routePoints(route),
  ]

  if (!points.length) {
    return DEFAULT_CENTER
  }

  const latitude = points.reduce((sum, point) => sum + point.lat, 0) / points.length
  const longitude = points.reduce((sum, point) => sum + point.lng, 0) / points.length

  return { lat: latitude, lng: longitude }
}

export default function CargoMap({
  markers = [],
  route,
  livePosition,
  onMarkerClick,
  height = '360px',
  className = '',
  interactive = false,
  showLabels = false,
}) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRefs = useRef([])
  const routeRef = useRef(null)
  const liveMarkerRef = useRef(null)
  const liveInfoWindowRef = useRef(null)
  const [activeMarker, setActiveMarker] = useState(null)

  useEffect(() => {
    if (!mapRef.current) return undefined

    const initializeMap = () => {
      if (!window.google?.maps) return

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: getMapCenter(markers, livePosition, route),
          zoom: 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        })
      }

      const currentMap = mapInstanceRef.current
      currentMap.setCenter(getMapCenter(markers, livePosition, route))
    }

    if (window.google?.maps) {
      initializeMap()
      return undefined
    }

    const script = document.getElementById(MAPS_SCRIPT_ID)
    if (script) {
      script.addEventListener('load', initializeMap, { once: true })
      return () => script.removeEventListener('load', initializeMap)
    }

    const mapsScript = document.createElement('script')
    mapsScript.id = MAPS_SCRIPT_ID
    mapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`
    mapsScript.async = true
    mapsScript.defer = true
    mapsScript.onload = initializeMap
    document.head.appendChild(mapsScript)

    return () => {
      mapsScript.onload = null
    }
  }, [markers, livePosition, route])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !window.google?.maps) return undefined

    markerRefs.current.forEach((marker) => marker.setMap(null))
    markerRefs.current = []

    if (routeRef.current) {
      routeRef.current.setMap(null)
      routeRef.current = null
    }

    if (liveMarkerRef.current) {
      liveMarkerRef.current.setMap(null)
      liveMarkerRef.current = null
    }

    if (liveInfoWindowRef.current) {
      liveInfoWindowRef.current.close()
      liveInfoWindowRef.current = null
    }

    const routePath = routePoints(route)
    if (routePath.length > 1) {
      const polyline = new window.google.maps.Polyline({
        path: routePath,
        geodesic: true,
        strokeColor: '#0f766e',
        strokeOpacity: 0.9,
        strokeWeight: 4,
      })
      polyline.setMap(map)
      routeRef.current = polyline
    }

    markers.forEach((marker) => {
      const markerPosition = normalizePoint(marker)
      if (!markerPosition) return

      const newMarker = new window.google.maps.Marker({
        position: markerPosition,
        map,
        title: markerText(marker),
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: marker.variant === 'destination' ? '#14b8a6' : '#0f172a',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })

      if (interactive) {
        newMarker.addListener('click', () => {
          setActiveMarker(marker.id)
          onMarkerClick?.(marker)
        })
      }

      markerRefs.current.push(newMarker)
    })

    if (livePosition) {
      const livePoint = normalizePoint(livePosition)
      if (livePoint) {
        const liveMarker = new window.google.maps.Marker({
          position: livePoint,
          map,
          title: 'Current location',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#dbeafe',
            strokeWeight: 4,
          },
        })

        liveMarker.addListener('click', () => {
          if (liveInfoWindowRef.current) {
            liveInfoWindowRef.current.close()
          }

          liveInfoWindowRef.current = new window.google.maps.InfoWindow({
            content: '<div style="padding:8px 10px;font-size:12px;color:#0f172a"><strong>Your current location</strong></div>',
          })

          liveInfoWindowRef.current.open({
            anchor: liveMarker,
            map,
          })
        })

        liveMarkerRef.current = liveMarker
      }
    }

    if (livePosition) {
      const livePoint = normalizePoint(livePosition)
      if (livePoint) {
        map.setCenter(livePoint)
        map.setZoom(11)
        return undefined
      }
    }

    if (markers.length > 0 || routePath.length > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      ;[...markers.map((marker) => normalizePoint(marker)), ...routePath].filter(Boolean).forEach((point) => {
        bounds.extend(point)
      })

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, 40)
      }
    }

    return undefined
  }, [markers, route, livePosition, interactive, onMarkerClick])

  function selectMarker(marker) {
    if (!interactive) return
    setActiveMarker(marker.id)
    onMarkerClick?.(marker)
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${className}`} style={{ height }}>
      <div ref={mapRef} className="h-full w-full" aria-label="CargoSpace route map" />
      {interactive && activeMarker ? (() => {
        const marker = markers.find((item) => item.id === activeMarker)
        if (!marker) return null

        return (
          <div className="cargo-map-popup">
            <p className="text-sm font-extrabold text-navy-900">{markerText(marker)}</p>
            {marker.provider ? <p className="mt-1 text-xs text-slate-500">{marker.provider}</p> : null}
            {marker.space ? <p className="mt-1 text-xs font-semibold text-slate-600">{marker.space} CBM available</p> : null}
            {marker.price ? <p className="mt-2 text-sm font-extrabold text-brand-700">{marker.price}</p> : null}
          </div>
        )
      })() : null}
      {interactive && !activeMarker && markers.length > 0 ? (
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
          Click a pin
        </div>
      ) : null}
      {showLabels && markers.length > 0 ? (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
          LIVE ROUTE
        </div>
      ) : null}
      <button type="button" className="sr-only" onClick={() => selectMarker(markers[0])} aria-label="Select first map marker">Select map marker</button>
    </div>
  )
}

