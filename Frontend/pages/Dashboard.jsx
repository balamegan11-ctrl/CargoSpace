import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boxes, IndianRupee, Package, Search, Truck } from 'lucide-react'
import ContainerCard from '../components/ContainerCard'
import StatsCard from '../components/StatsCard'
import { CARGO_TYPES, CITIES, bookings, formatInr, shipments, stats } from '../data/mockData'
import TransportIcon from '../components/TransportIcon'
import { useStoredUser } from '../hooks/useStoredUser'
import { useLogisticsCenters } from '../hooks/useLogisticsCenters'

export default function Dashboard() {
  const nav = useNavigate()
  const user = useStoredUser()
  const { centers } = useLogisticsCenters()
  const [q, setQ] = useState({ from: 'Mumbai', to: 'Ahmedabad', space: '4', cargoType: 'Textiles' })
  const preview = useMemo(() => centers.slice(0, 3), [centers])

  const displayName = user?.name || user?.alternate_name || 'Trader'
  const workspace = user?.company || 'Your workspace'
  const city = user?.location || 'Mumbai'

  function search(e) {
    e.preventDefault()
    const params = new URLSearchParams(q)
    nav(`/containers?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">Welcome back, {displayName}</h1>
        <p className="text-sm text-slate-500">{workspace} · leftover CBM near {city}</p>
      </div>

      <form onSubmit={search} className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-5">
        <label className="text-xs font-semibold text-slate-500">
          From
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={q.from} onChange={(e) => setQ({ ...q, from: e.target.value })}>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">
          To
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={q.to} onChange={(e) => setQ({ ...q, to: e.target.value })}>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Required Space
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={q.space} onChange={(e) => setQ({ ...q, space: e.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Cargo Type
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={q.cargoType} onChange={(e) => setQ({ ...q, cargoType: e.target.value })}>
            {CARGO_TYPES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <button type="submit" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 py-2.5 text-sm font-bold text-white hover:bg-navy-800">
          <Search size={16} /> Search cargo space
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard icon={Boxes} label="Available containers" value={centers.length} hint="Live leftover listings" />
        <StatsCard icon={Package} label="My bookings" value={bookings.length} />
        <StatsCard icon={Truck} label="Active shipments" value={shipments.length} />
        <StatsCard icon={IndianRupee} label="Cost saved vs FTL" value={formatInr(stats.leftoverCbmSaved)} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-navy-900">Available container preview</h2>
          <button type="button" className="text-sm font-semibold text-brand-700" onClick={() => nav('/containers')}>
            View all
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {preview.map((c) => (
            <ContainerCard
              key={c.id}
              container={c}
              onViewDetails={() => nav(`/booking?container=${c.id}`)}
              onBookNow={() => nav(`/booking?container=${c.id}`)}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-navy-900">Recent bookings</h2>
          <div className="mt-4 space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
                <div>
                  <p className="text-sm font-bold text-navy-900">{b.id}</p>
                  <p className="text-xs text-slate-500">{b.route} · {b.space} CBM</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatInr(b.amount)}</p>
                  <p className="text-[11px] font-semibold text-brand-700">{b.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-navy-900">Shipment status</h2>
          <div className="mt-4 space-y-4">
            {shipments.map((s) => (
              <div key={s.id}>
                <div className="flex items-center justify-between text-sm">
                  <p className="inline-flex items-center gap-2 font-semibold text-navy-900">
                    <TransportIcon type={s.mode} size={16} />
                    {s.id}
                  </p>
                  <span className="text-xs font-semibold text-slate-500">{s.status}</span>
                </div>
                <p className="text-xs text-slate-500">{s.route} · ETA {s.eta}</p>
                <div className="capacity-track mt-2">
                  <div className="capacity-fill" style={{ width: `${s.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
