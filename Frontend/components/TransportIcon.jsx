import { Plane, Ship, TrainFront, Truck } from 'lucide-react'

const MAP = {
  Road: Truck,
  Rail: TrainFront,
  Ship,
  Sea: Ship,
  Air: Plane,
}

const TONE = {
  Road: 'bg-orange-50 text-orange-700',
  Rail: 'bg-indigo-50 text-indigo-700',
  Ship: 'bg-cyan-50 text-cyan-800',
  Sea: 'bg-cyan-50 text-cyan-800',
  Air: 'bg-slate-100 text-slate-700',
}

export default function TransportIcon({ type, size = 18, className = '' }) {
  const Icon = MAP[type] || Truck
  return <Icon size={size} className={className} aria-hidden />
}

export function TransportChip({ type }) {
  const Icon = MAP[type] || Truck
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE[type] || TONE.Road}`}>
      <Icon size={13} />
      {type}
    </span>
  )
}
