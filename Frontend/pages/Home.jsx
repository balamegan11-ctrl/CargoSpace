import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CreditCard,
  IndianRupee,
  MapPin,
  Search,
  Shield,
  Sparkles,
  Truck,
} from 'lucide-react'
import { CARGO_TYPES, CITIES, CITY_COORDINATES, stats } from '../data/mockData'
import { ContainerYard } from '../components/ContainerVisual'
import CargoMap from '../components/Map'
import StatsCard from '../components/StatsCard'
import TransportIcon from '../components/TransportIcon'
import { useLogisticsCenters } from '../hooks/useLogisticsCenters'
import heroPortImage from '../assets/cargo_container_bg_1877x797.jpg'

const CargoSpaceIntro = lazy(() => import('../components/CargoSpaceIntro'))

function distanceInKm(first, second) {
  const earthRadius = 6371
  const latitudeDelta = (second.lat - first.lat) * Math.PI / 180
  const longitudeDelta = (second.lng - first.lng) * Math.PI / 180
  const latitudeOne = first.lat * Math.PI / 180
  const latitudeTwo = second.lat * Math.PI / 180
  const haversine = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeOne) * Math.cos(latitudeTwo) * Math.sin(longitudeDelta / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function nearestCity(position) {
  return Object.entries(CITY_COORDINATES).sort(([, first], [, second]) => {
    const firstDistance = distanceInKm(position, { lat: first[0], lng: first[1] })
    const secondDistance = distanceInKm(position, { lat: second[0], lng: second[1] })
    return firstDistance - secondDistance
  })[0]?.[0] || 'Mumbai'
}

function applyLocationFallback(setLocationState, setLocationMessage, setLocationInput, setSelectedLocation, setQ, setLivePosition) {
  const fallbackCity = 'Chennai'
  setLocationState('fallback')
  setLocationMessage('Location access is unavailable in this browser. Showing Chennai by default — choose a city manually if needed.')
  setLocationInput(fallbackCity)
  setSelectedLocation(fallbackCity)
  setQ((current) => ({ ...current, from: fallbackCity }))
  setLivePosition(null)
}

export default function Home() {
  const nav = useNavigate()
  const [q, setQ] = useState({
    from: 'Mumbai',
    to: 'Ahmedabad',
    space: '4',
    cargoType: 'Textiles',
    weight: '',
    date: '',
  })
  const [locationInput, setLocationInput] = useState('Chennai')
  const [selectedLocation, setSelectedLocation] = useState('Chennai')
  const [locationState, setLocationState] = useState(() => (navigator.geolocation ? 'idle' : 'error'))
  const [locationMessage, setLocationMessage] = useState(() => (navigator.geolocation ? '' : 'Location unavailable'))
  const [livePosition, setLivePosition] = useState(null)
  const locationSearchRef = useRef(null)
  const placesAutocompleteRef = useRef(null)
  const { centers: logisticsCenters } = useLogisticsCenters()

  useEffect(() => {
    if (!locationSearchRef.current || !window.google?.maps?.places) return undefined

    if (!placesAutocompleteRef.current) {
      placesAutocompleteRef.current = new window.google.maps.places.Autocomplete(locationSearchRef.current, {
        types: ['geocode'],
        fields: ['formatted_address', 'geometry', 'name', 'address_components'],
      })

      placesAutocompleteRef.current.addListener('place_changed', () => {
        const place = placesAutocompleteRef.current.getPlace()
        if (!place?.geometry?.location) return

        const coordinates = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        }
        const nearest = nearestCity(coordinates)

        setLivePosition(coordinates)
        setQ((current) => ({ ...current, from: nearest }))
        setLocationInput(place.formatted_address || nearest)
        setSelectedLocation(nearest)
        setLocationState('success')
        setLocationMessage(`Current place: ${nearest}`)
      })
    }

    return undefined
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      applyLocationFallback(setLocationState, setLocationMessage, setLocationInput, setSelectedLocation, setQ, setLivePosition)
      return undefined
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const position = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }
        const nearest = nearestCity(position)
        setLivePosition(position)
        setQ((current) => ({ ...current, from: nearest }))
        setLocationInput(nearest)
        setSelectedLocation(nearest)
        setLocationState('success')
        setLocationMessage(`Current place: ${nearest}`)
      },
      () => {
        applyLocationFallback(setLocationState, setLocationMessage, setLocationInput, setSelectedLocation, setQ, setLivePosition)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const nearby = useMemo(
    () => logisticsCenters.filter((space) => [space.origin, space.destination, space.locationCity, space.cargoCenterName, space.nearbyLocation]
      .some((place) => place?.toLowerCase().includes(selectedLocation.toLowerCase()))),
    [logisticsCenters, selectedLocation],
  )

  function search(e) {
    e.preventDefault()
    const params = new URLSearchParams({
      from: q.from,
      to: q.to,
      requiredSpace: q.space,
      cargoType: q.cargoType,
      weight: q.weight,
      date: q.date,
    })
    nav(`/containers?${params.toString()}`)
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      applyLocationFallback(setLocationState, setLocationMessage, setLocationInput, setSelectedLocation, setQ, setLivePosition)
      return
    }

    setLocationState('loading')
    setLocationMessage('Detecting your nearest mock city...')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }
        const nearest = nearestCity(position)
        setLivePosition(position)
        setQ((current) => ({ ...current, from: nearest }))
        setLocationInput(nearest)
        setSelectedLocation(nearest)
        setLocationState('success')
        setLocationMessage(`Current place: ${nearest}`)
      },
      () => {
        applyLocationFallback(setLocationState, setLocationMessage, setLocationInput, setSelectedLocation, setQ, setLivePosition)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  }

  const nearbyContainers = useMemo(() => {
    if (!livePosition) return []
    const matches = logisticsCenters
      .map((container) => {
        const origin = { lat: container.originCoordinates[0], lng: container.originCoordinates[1] }
        const destination = { lat: container.destinationCoordinates[0], lng: container.destinationCoordinates[1] }
        return { container, distance: Math.min(distanceInKm(livePosition, origin), distanceInKm(livePosition, destination)) }
      })
      .filter(({ distance }) => distance <= 450)
      .sort((first, second) => first.distance - second.distance)
    return matches.length ? matches : logisticsCenters.map((container) => ({ container, distance: 0 })).slice(0, 3)
  }, [livePosition, logisticsCenters])

  const nearbyMapMarkers = nearbyContainers.flatMap(({ container }) => [
    { id: `${container.id}-origin`, lat: container.originCoordinates[0], lng: container.originCoordinates[1], label: `${container.origin} · ${container.provider}`, variant: 'origin', provider: container.provider, space: container.availableCbm, price: `₹${(container.pricePerCbm ?? container.price).toLocaleString('en-IN')}` },
    { id: `${container.id}-destination`, lat: container.destinationCoordinates[0], lng: container.destinationCoordinates[1], label: `${container.destination} · ${container.provider}`, variant: 'destination', provider: container.provider, space: container.availableCbm, price: `₹${(container.pricePerCbm ?? container.price).toLocaleString('en-IN')}` },
    ...(container.locationCoordinates ? [{ id: `${container.id}-center`, lat: container.locationCoordinates[0], lng: container.locationCoordinates[1], label: `${container.cargoCenterName} · ${container.locationCity || container.origin}`, variant: 'destination', provider: container.provider, space: container.availableCbm, price: `₹${(container.pricePerCbm ?? container.price).toLocaleString('en-IN')}` }] : []),
  ])

  return (
    <div className="home-enter">
      <Suspense fallback={null}><CargoSpaceIntro /></Suspense>
      <section className="hero-grid relative overflow-hidden text-white">
        <img src={heroPortImage} alt="" aria-hidden="true" className="hero-background-image" />
        <div className="hero-background-fade" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center px-4 py-16 lg:py-24">
          <div className="hero-copy max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={14} /> Smart Cargo Space Marketplace
            </p>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">CargoSpace</h1>
            <p className="mt-3 text-xl font-semibold text-white sm:text-2xl">Find. Book. Ship. Smarter.</p>
            <p className="mt-4 max-w-xl text-blue-100">
              Find available space in partially filled containers, compare logistics options, and book the space you need for your shipment.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-200/20 bg-blue-100/10 px-3 py-2 text-sm font-semibold text-blue-50">
              <Sparkles size={14} className="text-blue-200" />
              Ship more efficiently. Pay only for the space you need.
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/containers"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-navy-900 hover:bg-brand-50"
              >
                Find Cargo Space <ArrowRight size={16} />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-bold hover:bg-white/20"
              >
                List Your Space
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-4 text-sm text-blue-100">
              {['Road', 'Rail', 'Ship', 'Air'].map((mode) => (
                <span key={mode} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                  <TransportIcon type={mode} size={16} />
                  {mode}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 lg:hidden">
        <ContainerYard />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8" aria-labelledby="gujarat-corridor-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Mumbai to Ahmedabad corridor</p>
            <h2 id="gujarat-corridor-heading" className="mt-1 text-2xl font-extrabold text-navy-900">Three additional cargo centers</h2>
          </div>
          <Link to="/containers?from=Vapi" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-900">View corridor capacity <ArrowRight size={15} /></Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">{logisticsCenters.filter((center) => ['CS-VAP-5101', 'CS-SUR-5102', 'CS-VAD-5103'].includes(center.id)).map((center) => <article key={center.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="font-mono text-[11px] text-slate-400">{center.id} · {center.mode}</p>
          <h3 className="mt-1 font-extrabold text-navy-900">{center.cargoCenterName}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-600">{center.provider} · {center.locationCity} · near {center.nearbyLocation}</p>
          <p className="mt-2 text-sm font-bold text-slate-700">{center.origin} → {center.destination}</p>
          <div className="mt-3 flex items-end justify-between gap-2"><p className="text-sm font-extrabold text-navy-900">{center.availableCbm} CBM available<span className="mt-0.5 block text-[11px] font-medium text-slate-500">{center.bookedCbm} booked / {center.totalCbm} total</span></p><p className="text-right text-sm font-extrabold text-navy-900">₹{center.pricePerCbm}<span className="block text-[10px] font-medium text-slate-500">per CBM</span></p></div>
          <Link to={`/containers?from=${encodeURIComponent(center.origin)}&to=${encodeURIComponent(center.destination)}`} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-900">View center <ArrowRight size={13} /></Link>
        </article>)}</div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard icon={Boxes} label="Available containers" value={stats.availableContainers} countUp />
          <StatsCard icon={Shield} label="Registered traders" value={stats.registeredTraders} countUp />
          <StatsCard icon={BadgeCheck} label="Logistics providers" value={stats.logisticsProviders} countUp />
          <StatsCard icon={IndianRupee} label="Successful shipments" value={stats.successfulShipments} countUp />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8" aria-labelledby="network-map-heading">
        <div className="grid gap-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-card lg:grid-cols-[1.4fr_0.6fr] lg:p-6">
          <CargoMap
            markers={nearbyMapMarkers}
            livePosition={livePosition}
            interactive
            showLabels
            height="360px"
          />
          <div className="flex flex-col justify-center">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">Mock cargo network</p>
            <h2 id="network-map-heading" className="mt-2 text-2xl font-extrabold text-navy-900">Find capacity across every lane</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Showing {nearbyContainers.length || 0} mock spaces nearest to your live device position. Select a named place marker to see its provider, available CBM, and price.</p>
            <Link to="/containers" className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700">Explore the map <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-extrabold text-navy-900">How CargoSpace Works</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Four steps from leftover CBM to a booked lane.</p>
        <div className="relative mt-8 grid gap-4 md:grid-cols-4">
          <div className="pointer-events-none absolute left-[12%] right-[12%] top-8 hidden h-px bg-brand-100 md:block" />
          {[
            ['01', 'Search Available Space', 'Enter your origin, destination and required space to find suitable cargo space nearby.', Search],
            ['02', 'Compare Options', 'Compare routes, available space, prices, dates and logistics providers.', Boxes],
            ['03', 'Book & Pay', 'Select the required space, confirm your booking and pay securely online.', CreditCard],
            ['04', 'Ship with Confidence', 'Connect with the logistics provider and move your cargo through the selected route.', Truck],
          ].map(([n, t, d, Icon]) => (
            <article key={n} className="group relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 p-3 text-brand-700 transition-transform duration-300 group-hover:scale-105">
                <Icon size={28} />
              </div>
              <p className="text-xs font-extrabold text-brand-600">{n}</p>
              <h3 className="mt-2 font-bold text-navy-900">{t}</h3>
              <p className="mt-2 text-sm text-slate-500">{d}</p>
            </article>
          ))}
        </div>
      </section>

        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
                Find cargo space near you
              </p>
              <p className="text-sm font-medium text-slate-500">
                Search available capacity in partially filled containers by city or cargo center
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Popular Hubs:</span>
              {['Mumbai', 'Delhi', 'Chennai', 'Bengaluru', 'Mundra', 'Kolkata'].map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setQ((prev) => ({ ...prev, from: city }))
                    setLocationInput(city)
                    setSelectedLocation(city)
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-navy-800 transition hover:border-brand-300 hover:bg-brand-50"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={search} className="grid items-end gap-3.5 rounded-2xl border border-slate-100 bg-white p-5 text-slate-800 shadow-card md:grid-cols-2 xl:grid-cols-6">
            <label className="text-xs font-bold text-slate-600">
              Enter city, location or cargo center
              <div className="relative mt-1.5">
                <MapPin size={16} className="pointer-events-none absolute left-3 top-3 text-brand-600" />
                <input
                  list="cargo-origin-locations"
                  className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-medium text-navy-900 outline-none focus:border-brand-500"
                  placeholder="Enter city, location or cargo center"
                  value={q.from}
                  onChange={(e) => setQ({ ...q, from: e.target.value })}
                />
                <datalist id="cargo-origin-locations">
                  {CITIES.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-800"
                  disabled={locationState === 'loading'}
                >
                  <MapPin size={12} /> {locationState === 'loading' ? 'Detecting city...' : 'Detect nearby city'}
                </button>
              </div>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Destination City
              <div className="relative mt-1.5">
                <MapPin size={16} className="pointer-events-none absolute left-3 top-3 text-brand-600" />
                <input
                  list="cargo-dest-locations"
                  className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-medium text-navy-900 outline-none focus:border-brand-500"
                  placeholder="Enter destination city"
                  value={q.to}
                  onChange={(e) => setQ({ ...q, to: e.target.value })}
                />
                <datalist id="cargo-dest-locations">
                  {CITIES.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Required Space (CBM)
              <div className="relative mt-1.5">
                <input
                  type="number"
                  min="1"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 pr-14 text-sm font-medium text-navy-900 outline-none focus:border-brand-500"
                  placeholder="e.g. 4"
                  value={q.space}
                  onChange={(e) => setQ({ ...q, space: e.target.value })}
                />
                <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-bold text-slate-400">m³</span>
              </div>
              <span className="mt-1 block text-[10px] font-normal text-slate-400">Cubic metres required.</span>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Cargo Type
              <select
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-navy-900 outline-none focus:border-brand-500"
                value={q.cargoType}
                onChange={(e) => setQ({ ...q, cargoType: e.target.value })}
              >
                {CARGO_TYPES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Cargo Weight (kg)
              <input
                type="number"
                min="0"
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-navy-900 outline-none focus:border-brand-500"
                placeholder="e.g. 750"
                value={q.weight}
                onChange={(e) => setQ({ ...q, weight: e.target.value })}
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Departure Date
              <input
                type="date"
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-navy-900 outline-none focus:border-brand-500"
                value={q.date}
                onChange={(e) => setQ({ ...q, date: e.target.value })}
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 text-sm font-bold text-white shadow-lg shadow-navy-900/10 transition hover:bg-brand-700 md:col-span-2 xl:col-span-6"
            >
              <Search size={17} /> Search Available Cargo Space
            </button>
          </form>
          {locationMessage ? (
            <p className={`mt-3 text-xs font-semibold ${locationState === 'error' ? 'text-amber-600' : 'text-brand-700'}`} role="status">
              {locationMessage}
            </p>
          ) : null}
        </div>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="nearby-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Local capacity finder</p>
            <h2 id="nearby-heading" className="mt-1 text-2xl font-extrabold text-navy-900">Available Space Near You</h2>
            <p className="mt-2 text-sm text-slate-500">Discover partially filled cargo containers available near your location.</p>
          </div>
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700"><MapPin size={14} /> Showing available cargo space near {selectedLocation}</p>
        </div>
        <form
          className="mt-6 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto_auto]"
          onSubmit={(event) => { event.preventDefault(); setSelectedLocation(locationInput.trim() || 'Chennai') }}
        >
          <label className="text-xs font-semibold text-slate-500">Location
            <input
              ref={locationSearchRef}
              list="mock-locations"
              value={locationInput}
              onChange={(event) => setLocationInput(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-navy-900 outline-none focus:border-brand-500"
              placeholder="Try Chennai or Bengaluru"
            />
            <datalist id="mock-locations">{CITIES.map((city) => <option key={city} value={city} />)}</datalist>
          </label>
          <button type="button" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-navy-800 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700" onClick={useMyLocation} disabled={locationState === 'loading'}><MapPin size={16} /> {locationState === 'loading' ? 'Detecting...' : 'Use My Location'}</button>
          <button type="submit" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"><Search size={16} /> Search</button>
        </form>
        {nearby.length ? <div className="mt-6 grid gap-4 md:grid-cols-2">{nearby.map((space) => <article key={space.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-bold text-navy-900"><MapPin size={15} className="text-brand-600" />{space.origin} <span className="text-slate-400">→</span> {space.destination}</p><p className="mt-2 font-mono text-xs text-slate-400">Container: {space.id}</p><p className="mt-1 text-xs font-semibold text-slate-600">{space.cargoCenterName} · near {space.nearbyLocation || space.locationCity || space.origin}</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"><TransportIcon type={space.mode} size={14} />{space.mode}</span></div><div className="mt-5 flex items-end justify-between"><div><p className="text-lg font-extrabold text-navy-900">{space.availableCbm} CBM Available</p><p className="text-xs text-slate-500">{space.totalCbm} CBM total · {space.bookedCbm} booked</p></div><p className="text-right text-lg font-extrabold text-navy-900">₹{space.pricePerCbm} <span className="text-xs font-medium text-slate-400">/ CBM</span></p></div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-500">Departure <span className="text-slate-700">{space.departure}</span></p><Link to={`/containers?from=${space.origin}&to=${space.destination}`} className="rounded-xl bg-navy-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700">View Space</Link></div></article>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No cargo centers found near {selectedLocation}. Try another city or cargo center.</div>}
        <Link to="/containers" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-navy-800 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">View All Available Space <ArrowRight size={16} /></Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-extrabold text-navy-900">Why leftover space</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ['Lower cost per CBM', 'Pay only for unused capacity on a moving lane, not a dedicated box.'],
            ['Faster fill for providers', 'Providers list empty return legs and residual space in one place.'],
            ['Four modes, one search', 'Road, rail, sea and air inventory sits in the same professional console.'],
          ].map(([t, d]) => (
            <article key={t} className="rounded-2xl bg-navy-900 p-6 text-white shadow-sm">
              <h3 className="font-bold">{t}</h3>
              <p className="mt-2 text-sm text-blue-100">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <h2 className="text-2xl font-extrabold text-navy-900">About CargoSpace</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">CargoSpace is a smart digital logistics platform that connects traders with logistics service providers who have available space in partially filled cargo containers. Our platform helps exporters and importers discover nearby cargo space, compare transportation options, book space online, and communicate directly with logistics providers.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ['SMART SPACE MATCHING', 'Find suitable available cargo space based on location, destination, cargo type and required capacity.'],
              ['LOW-COST SHIPPING', 'Use unused container capacity to help traders optimize transportation costs and improve container utilization.'],
              ['CONNECTED LOGISTICS', 'Connect traders with verified road, rail, sea and air logistics service providers through one platform.'],
            ].map(([title, body]) => <article key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-5"><h3 className="text-sm font-extrabold tracking-wide text-navy-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{body}</p></article>)}
          </div>
          <Link to="/containers" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700">Explore Available Space <ArrowRight size={16} /></Link>
        </div>
      </section>
    </div>
  )
}
