import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  IndianRupee,
  MapPin,
  Search,
  Shield,
  Sparkles,
} from 'lucide-react'
import { CARGO_TYPES, CITIES, stats } from '../data/mockData'
import { ContainerYard } from '../components/ContainerVisual'

const nearbySpaces = [
  { origin: 'Chennai', destination: 'Bengaluru', mode: 'Road', id: 'CS-1001', available: 18, filled: 65, departure: '05 Sep 2026', price: 450 },
  { origin: 'Chennai', destination: 'Hyderabad', mode: 'Rail', id: 'CS-1002', available: 25, filled: 55, departure: '07 Sep 2026', price: 520 },
  { origin: 'Chennai', destination: 'Mumbai', mode: 'Sea', id: 'CS-1003', available: 32, filled: 48, departure: '10 Sep 2026', price: 380 },
  { origin: 'Bengaluru', destination: 'Delhi', mode: 'Road', id: 'CS-1004', available: 12, filled: 78, departure: '06 Sep 2026', price: 490 },
]

export default function Home() {
  const nav = useNavigate()
  const [q, setQ] = useState({
    from: 'Mumbai',
    to: 'Ahmedabad',
    space: '4',
    cargoType: 'Textiles',
  })
  const [locationInput, setLocationInput] = useState('Chennai')
  const [selectedLocation, setSelectedLocation] = useState('Chennai')

  const nearby = useMemo(
    () => nearbySpaces.filter((space) => space.origin.toLowerCase() === selectedLocation.toLowerCase()),
    [selectedLocation],
  )

  function search(e) {
    e.preventDefault()
    const params = new URLSearchParams({
      from: q.from,
      to: q.to,
      space: q.space,
      cargoType: q.cargoType,
    })
    nav(`/containers?${params.toString()}`)
  }

  return (
    <div>
      <section className="hero-grid relative overflow-hidden text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={14} /> Shared container marketplace
            </p>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">Find. Book. Ship. Smarter.</h1>
            <p className="mt-4 max-w-xl text-blue-100">
              CargoSpace matches leftover cubic metres in nearby containers with exporters who need a lane — road, rail, sea and air.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/containers"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-navy-900 hover:bg-brand-50"
              >
                Find cargo space <ArrowRight size={16} />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-bold hover:bg-white/20"
              >
                Register
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-4 text-sm text-blue-100">
              {['Road', 'Rail', 'Sea', 'Air'].map((mode) => (
                <span key={mode} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                  <TransportIcon type={mode} size={16} />
                  {mode}
                </span>
              ))}
            </div>
          </div>
          <div className="relative hidden lg:block">
            <ContainerYard />
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-12">
          <form onSubmit={search} className="grid gap-3 rounded-2xl bg-white p-4 text-slate-800 shadow-2xl md:grid-cols-5">
            <label className="text-xs font-semibold text-slate-500">
              From
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-navy-900"
                value={q.from}
                onChange={(e) => setQ({ ...q, from: e.target.value })}
              >
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">
              To
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-navy-900"
                value={q.to}
                onChange={(e) => setQ({ ...q, to: e.target.value })}
              >
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Required Space
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="CBM"
                value={q.space}
                onChange={(e) => setQ({ ...q, space: e.target.value })}
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Cargo Type
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-navy-900"
                value={q.cargoType}
                onChange={(e) => setQ({ ...q, cargoType: e.target.value })}
              >
                {CARGO_TYPES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800"
            >
              <Search size={16} /> Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 lg:hidden">
        <ContainerYard />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard icon={Boxes} label="Available containers" value={stats.availableContainers.toLocaleString('en-IN')} />
          <StatsCard icon={Shield} label="Registered traders" value={stats.registeredTraders.toLocaleString('en-IN')} />
          <StatsCard icon={BadgeCheck} label="Logistics providers" value={stats.logisticsProviders.toLocaleString('en-IN')} />
          <StatsCard icon={IndianRupee} label="Successful shipments" value={stats.successfulShipments.toLocaleString('en-IN')} />
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-extrabold text-navy-900">How CargoSpace Works</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Four steps from leftover CBM to a booked lane.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ['01', 'Search', 'Enter origin, destination, cargo type and required CBM.'],
            ['02', 'Compare', 'Filter verified providers by mode, price and leftover space.'],
            ['03', 'Book leftover CBM', 'Reserve unused cubic metres instead of a full container.'],
            ['04', 'Ship', 'Hand cargo to the provider and follow the lane to arrival.'],
          ].map(([n, t, d]) => (
            <article key={n} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-extrabold text-brand-600">{n}</p>
              <h3 className="mt-2 font-bold text-navy-900">{t}</h3>
              <p className="mt-2 text-sm text-slate-500">{d}</p>
            </article>
          ))}
        </div>
      </section>

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
            <input list="mock-locations" value={locationInput} onChange={(event) => setLocationInput(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-navy-900 outline-none focus:border-brand-500" placeholder="Try Chennai or Bengaluru" />
            <datalist id="mock-locations"><option value="Chennai" /><option value="Bengaluru" /><option value="Mumbai" /><option value="Delhi" /></datalist>
          </label>
          <button type="button" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-navy-800 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700" onClick={() => { setLocationInput('Chennai'); setSelectedLocation('Chennai') }}><MapPin size={16} /> Use My Location</button>
          <button type="submit" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"><Search size={16} /> Search</button>
        </form>
        {nearby.length ? <div className="mt-6 grid gap-4 md:grid-cols-2">{nearby.map((space) => <article key={space.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-bold text-navy-900"><MapPin size={15} className="text-brand-600" />{space.origin} <span className="text-slate-400">→</span> {space.destination}</p><p className="mt-2 font-mono text-xs text-slate-400">Container: {space.id}</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"><TransportIcon type={space.mode} size={14} />{space.mode}</span></div><div className="mt-5 flex items-end justify-between"><div><p className="text-lg font-extrabold text-navy-900">{space.available} CBM</p><p className="text-xs text-slate-500">Available capacity</p></div><p className="text-right text-lg font-extrabold text-navy-900">₹{space.price} <span className="text-xs font-medium text-slate-400">/ CBM</span></p></div><div className="mt-4"><div className="mb-1 flex justify-between text-xs text-slate-500"><span>Capacity filled</span><span>{space.filled}%</span></div><div className="capacity-track"><div className="capacity-fill" style={{ width: `${space.filled}%` }} /></div></div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-500">Departure <span className="text-slate-700">{space.departure}</span></p><Link to={`/containers?from=${space.origin}&to=${space.destination}`} className="rounded-xl bg-navy-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700">View Space</Link></div></article>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No mock containers found near {selectedLocation}. Try Chennai or Bengaluru.</div>}
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
