import { BadgeCheck, Calendar, MapPin } from 'lucide-react'
import { formatDate, formatInr, transportImages } from '../data/mockData'
import { TransportChip } from './TransportIcon'

export default function ContainerCard({
  container,
  requiredSpace = 0,
  onViewDetails,
  onBookNow,
  cardRef,
  highlighted = false,
}) {
  return (
    <article ref={cardRef} className={`interactive-card group overflow-hidden rounded-2xl border bg-white shadow-sm ${highlighted ? 'border-brand-500 ring-4 ring-brand-100' : 'border-slate-100'}`}>
      <div className="relative h-44 overflow-hidden bg-slate-100">
        <img
          src={transportImages[container.mode] || container.image}
          alt={`${container.mode === 'Sea' ? 'Ship' : container.mode} freight transport for ${container.provider}`}
          className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/75 via-navy-900/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">Logistics</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <h3 className="text-base font-extrabold text-white">{container.provider}</h3>
            <TransportChip type={container.mode} />
          </div>
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] text-slate-400">{container.id}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {container.verified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700">
                <BadgeCheck size={14} /> Verified provider
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400">Pending review</span>
            )}
          </div>
        </div>

        <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <MapPin size={14} className="text-brand-600" />
          {container.origin}
          <span className="text-slate-400">→</span>
          {container.destination}
        </p>

        <p className="text-xs font-semibold text-slate-500">Cargo center: <span className="text-slate-700">{container.cargoCenterName}</span></p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <Capacity label="Total capacity" value={container.totalCbm} />
          <Capacity label="Booked" value={container.bookedCbm ?? Math.max(0, container.totalCbm - container.availableCbm)} />
        </div>

        <div className="rounded-xl bg-brand-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">Available space</p>
          <p className="mt-1 text-2xl font-extrabold text-navy-900">{container.availableCbm} CBM</p>
          {requiredSpace > 0 ? (
            <p className="mt-1 text-xs font-semibold text-emerald-700">✓ Space Available · {requiredSpace} CBM required</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-sm">
          <p className="inline-flex items-center gap-1.5 text-slate-500">
            <Calendar size={14} />
            {formatDate(container.departure)}
          </p>
          <p className="text-lg font-extrabold text-navy-900">{formatInr(container.pricePerCbm ?? container.price)} <span className="text-xs font-medium text-slate-400">/ CBM</span></p>
        </div>

        <p className={`text-xs font-bold ${container.status === 'Fully Booked' ? 'text-rose-700' : container.status === 'High Demand' ? 'text-amber-700' : 'text-emerald-700'}`}>Status: {container.status || (container.availableCbm > 0 ? 'Available' : 'Fully Booked')}</p>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onViewDetails?.(container)}
            className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-navy-800 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          >
            View Details
          </button>
          <button
            type="button"
            onClick={() => onBookNow?.(container)}
            className="flex-1 rounded-xl bg-navy-900 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 hover:shadow-md"
          >
            Book Now
          </button>
        </div>
      </div>
    </article>
  )
}

function Capacity({ label, value }) {
  return <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-500">{label}<span className="mt-0.5 block font-bold text-navy-900">{value ?? 0} CBM</span></p>
}
