import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, MapPin, X } from 'lucide-react'
import ContainerCard from '../components/ContainerCard'
import { TransportChip } from '../components/TransportIcon'
import CargoMap from '../components/Map'
import AuthModal from '../components/AuthModal'
import { useLogisticsCenters } from '../hooks/useLogisticsCenters'
import {
  TRANSPORT_TYPES,
  formatDate,
  formatInr,
} from '../data/mockData'
import { readStoredUser } from '../utils/session'

export default function FindSpace() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { centers: containerList, loading } = useLogisticsCenters()
  const [authModalContainer, setAuthModalContainer] = useState(null)
  const [authRedirectUrl, setAuthRedirectUrl] = useState('/containers')

  const [filters, setFilters] = useState({
    from: params.get('from') || '',
    to: params.get('to') || '',
    mode: '',
    maxPrice: '',
    requiredSpace: params.get('requiredSpace') || params.get('space') || '',
    weight: params.get('weight') || '',
    date: params.get('date') || '',
    cargoType: params.get('cargoType') || '',
  })
  const [active, setActive] = useState(null)
  const [view, setView] = useState('list')
  const [highlightedId, setHighlightedId] = useState(null)
  const cardRefs = useRef({})

  const listed = useMemo(() => {
    return containerList.filter((c) => {
      const originMatches = [c.origin, c.locationCity, c.cargoCenterName, c.nearbyLocation]
        .some((place) => place?.toLowerCase().includes(filters.from.toLowerCase()))
      if (filters.from && !originMatches) return false
      if (filters.to && !c.destination.toLowerCase().includes(filters.to.toLowerCase())) return false
      if (filters.mode && c.mode !== filters.mode) return false
      if (filters.cargoType && c.cargoType !== filters.cargoType) return false
      if (filters.date && c.departure < filters.date) return false
      if (filters.maxPrice && (c.pricePerCbm ?? c.price) > Number(filters.maxPrice)) return false
      if (filters.requiredSpace && c.availableCbm < Number(filters.requiredSpace)) return false
      return true
    })
  }, [containerList, filters])

  const mapMarkers = useMemo(() => listed.flatMap((container) => [
    {
      id: `${container.id}-origin`,
      containerId: container.id,
      lat: container.originCoordinates[0],
      lng: container.originCoordinates[1],
      label: container.origin,
      variant: 'origin',
      provider: container.provider,
      price: formatInr(container.pricePerCbm ?? container.price),
    },
    {
      id: `${container.id}-destination`,
      containerId: container.id,
      lat: container.destinationCoordinates[0],
      lng: container.destinationCoordinates[1],
      label: container.destination,
      variant: 'destination',
      provider: container.provider,
      price: formatInr(container.pricePerCbm ?? container.price),
    },
    ...(container.locationCoordinates ? [{
      id: `${container.id}-center`,
      containerId: container.id,
      lat: container.locationCoordinates[0],
      lng: container.locationCoordinates[1],
      label: `${container.cargoCenterName} · ${container.locationCity || container.origin}`,
      variant: 'destination',
      provider: container.provider,
      price: formatInr(container.pricePerCbm ?? container.price),
    }] : []),
  ]), [listed])

  function selectMapMarker(marker) {
    setHighlightedId(marker.containerId)
    cardRefs.current[marker.containerId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function handleBookNow(container) {
    const bookingParams = new URLSearchParams({ container: container.id })
    if (filters.requiredSpace) bookingParams.set('space', filters.requiredSpace)
    const bookingUrl = `/booking?${bookingParams.toString()}`
    const user = readStoredUser()
    if (!user?.user_id) {
      setAuthModalContainer(container)
      setAuthRedirectUrl(bookingUrl)
      return
    }
    navigate(bookingUrl)
  }

  const spaceHighlights = [
    { label: 'Road freight', value: '48 lanes', note: 'Last-mile and regional delivery', accent: 'brand' },
    { label: 'Sea freight', value: '16 vessels', note: 'Port-to-port cargo capacity', accent: 'blue' },
    { label: 'Air cargo', value: '9 flights', note: 'Urgent and time-sensitive loads', accent: 'violet' },
    { label: 'Rail cargo', value: '12 routes', note: 'Bulk and long-haul movement', accent: 'emerald' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {spaceHighlights.map((item) => (
          <div key={item.label} className={`rounded-2xl border bg-white p-4 shadow-sm ${item.accent === 'brand' ? 'border-brand-100 bg-brand-50/70' : item.accent === 'blue' ? 'border-blue-100 bg-blue-50/80' : item.accent === 'violet' ? 'border-violet-100 bg-violet-50/80' : 'border-emerald-100 bg-emerald-50/80'}`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
            <div className="mt-3 flex items-end justify-between gap-2">
              <p className="text-2xl font-extrabold text-navy-900">{item.value}</p>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-brand-700">Live</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{item.note}</p>
          </div>
        ))}
      </div>

      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-navy-900 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={14} /> Back to Home
        </Link>
        <span className="text-xs font-semibold text-slate-400">
          Showing {listed.length} container{listed.length === 1 ? '' : 's'} available
        </span>
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-900">Find cargo space</h1>
            <p className="text-sm text-slate-500">
              Browse available capacity by route, cargo type, required CBM, or transportation mode.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Container view">
            {['list', 'map'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={`rounded-lg px-3 py-2 text-xs font-bold capitalize transition ${
                  view === option ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {option === 'list' ? 'List View' : 'Map View'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid items-end gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-500">
          From
          <div className="relative mt-0.5">
            <MapPin size={15} className="pointer-events-none absolute left-3 top-3 text-brand-600" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm"
              placeholder="Any origin"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </div>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-500">
          To
          <div className="relative mt-0.5">
            <MapPin size={15} className="pointer-events-none absolute left-3 top-3 text-brand-600" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm"
              placeholder="Any destination"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </div>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-500">
          Cargo Type
          <select
            className="mt-0.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
            value={filters.cargoType}
            onChange={(e) => setFilters({ ...filters, cargoType: e.target.value })}
          >
            <option value="">All cargo types</option>
            {['Electronics', 'Textiles', 'Machinery', 'Food Products', 'General Cargo', 'Pharma', 'Auto Parts'].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-500">
          Required Space (CBM)
          <div className="relative mt-0.5">
            <input
              type="number"
              min="0"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 pr-12 text-sm"
              placeholder="e.g. 8"
              value={filters.requiredSpace}
              onChange={(e) => setFilters({ ...filters, requiredSpace: e.target.value })}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">m³</span>
          </div>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-500">
          Cargo Weight (kg)
          <input
            type="number"
            min="0"
            className="mt-0.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="e.g. 750"
            value={filters.weight}
            onChange={(e) => setFilters({ ...filters, weight: e.target.value })}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-500">
          Date
          <input
            type="date"
            className="mt-0.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-navy-900"
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-500">
          Transport mode
          <select
            className="mt-0.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
            value={filters.mode}
            onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
          >
            <option value="">All modes (Road, Rail, Sea, Air)</option>
            {TRANSPORT_TYPES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-500">
          Price (max INR)
          <input
            className="mt-0.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="e.g. 25000"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          />
        </label>
      </div>

      {view === 'map' && listed.length > 0 ? (
        <>
          <section className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-card lg:grid-cols-[1.25fr_0.75fr] lg:p-5">
            <CargoMap markers={mapMarkers} onMarkerClick={selectMapMarker} interactive height="520px" />
            <div className="flex max-h-[520px] flex-col justify-center rounded-xl bg-slate-50 p-5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">Route board</p>
              <h2 className="mt-2 text-xl font-extrabold text-navy-900">{listed.length} lanes on the map</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Select any navy pin to jump to its matching container card below.
              </p>
              <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 overflow-y-auto">
                {listed.map((container) => (
                  <button
                    key={container.id}
                    type="button"
                    onClick={() => {
                      setHighlightedId(container.id)
                      cardRefs.current[container.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                      highlightedId === container.id ? 'bg-brand-100' : 'hover:bg-white'
                    }`}
                  >
                    <span>
                      <span className="block font-mono text-[10px] text-slate-400">{container.id}</span>
                      <span className="text-sm font-bold text-navy-900">
                        {container.origin} <span className="text-slate-400">→</span> {container.destination}
                      </span>
                    </span>
                    <span className="text-xs font-bold text-brand-700">{formatInr(container.pricePerCbm ?? container.price)} / CBM</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {listed.map((c) => (
              <ContainerCard
                key={c.id}
                container={c}
                cardRef={(node) => { cardRefs.current[c.id] = node }}
                highlighted={highlightedId === c.id}
                requiredSpace={Number(filters.requiredSpace) || 0}
                onViewDetails={setActive}
                onBookNow={handleBookNow}
              />
            ))}
          </div>
        </>
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-500">Loading available cargo space...</div>
      ) : listed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
          No containers match these filters. Clear a field to see leftover space again.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listed.map((c) => (
            <ContainerCard
              key={c.id}
              container={c}
              cardRef={(node) => { cardRefs.current[c.id] = node }}
              highlighted={highlightedId === c.id}
              requiredSpace={Number(filters.requiredSpace) || 0}
              onViewDetails={setActive}
              onBookNow={handleBookNow}
            />
          ))}
        </div>
      )}

      {active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-slate-400">{active.id}</p>
                <h3 className="text-xl font-extrabold text-navy-900">{active.provider}</h3>
              </div>
              <button type="button" onClick={() => setActive(null)} className="rounded-lg p-1 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <TransportChip type={active.mode} />
              {active.verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                  <BadgeCheck size={13} /> Verified provider
                </span>
              ) : null}
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Origin</dt><dd className="font-semibold">{active.origin}</dd></div>
              <div><dt className="text-slate-500">Destination</dt><dd className="font-semibold">{active.destination}</dd></div>
              <div><dt className="text-slate-500">Available</dt><dd className="font-semibold">{active.availableCbm} CBM</dd></div>
              <div><dt className="text-slate-500">Total capacity</dt><dd className="font-semibold">{active.totalCbm} CBM</dd></div>
              <div><dt className="text-slate-500">Departure</dt><dd className="font-semibold">{formatDate(active.departure)}</dd></div>
              <div><dt className="text-slate-500">Price per CBM</dt><dd className="font-semibold">{formatInr(active.pricePerCbm ?? active.price)}</dd></div>
              <div><dt className="text-slate-500">Cargo type</dt><dd className="font-semibold">{active.cargoType}</dd></div>
            </dl>
            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-navy-900 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
              onClick={() => {
                setActive(null)
                handleBookNow(active)
              }}
            >
              Book Now
            </button>
          </div>
        </div>
      ) : null}

      {/* Auth required modal */}
      <AuthModal
        isOpen={Boolean(authModalContainer)}
        onClose={() => setAuthModalContainer(null)}
        container={authModalContainer}
        redirectUrl={authRedirectUrl}
      />
    </div>
  )
}
