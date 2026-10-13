import TransportIcon from './TransportIcon'

const PALETTE = {
  Road: { body: '#c45c26', door: '#8f3a12', accent: '#f59e0b' },
  Rail: { body: '#1a3a66', door: '#0b1f3a', accent: '#60a5fa' },
  Sea: { body: '#0e7490', door: '#155e75', accent: '#67e8f9' },
  Air: { body: '#64748b', door: '#334155', accent: '#93c5fd' },
}

export default function ContainerVisual({ container, compact = false }) {
  const tone = PALETTE[container.mode] || PALETTE.Road
  const fill = Math.round((container.availableCbm / container.totalCbm) * 100)

  return (
    <div className={`relative overflow-hidden ${compact ? 'h-36' : 'h-44'} yard-floor`}>
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-navy-900/20 to-transparent" />
      <div className="absolute left-3 top-3 z-10">
        <span className="rounded-md bg-white/90 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide text-navy-900 shadow-sm">
          {container.id}
        </span>
      </div>
      <div className="absolute right-3 top-3 z-10 text-navy-800">
        <TransportIcon type={container.mode} size={18} />
      </div>

      <div className={`absolute ${compact ? 'left-8 top-10' : 'left-10 top-12'} float-slow`}>
        <div
          className="relative h-20 w-44 rounded-sm shadow-xl"
          style={{ background: tone.body }}
        >
          <div className="container-rib absolute inset-0 opacity-40" />
          <div className="absolute inset-y-0 right-0 w-10 border-l border-black/20" style={{ background: tone.door }} />
          <div className="absolute left-2 top-1 h-1.5 w-1.5 rounded-[1px] bg-black/30" />
          <div className="absolute right-12 top-1 h-1.5 w-1.5 rounded-[1px] bg-black/30" />
          <div className="absolute bottom-2 left-3 right-14">
            <div className="h-1.5 overflow-hidden rounded-full bg-black/25">
              <div className="h-full rounded-full" style={{ width: `${fill}%`, background: tone.accent }} />
            </div>
          </div>
          <p className="absolute bottom-6 left-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/80">
            CargoSpace
          </p>
        </div>
        <div
          className="absolute -right-8 top-6 h-16 w-28 rounded-sm opacity-80 shadow-lg"
          style={{ background: tone.door }}
        >
          <div className="container-rib absolute inset-0 opacity-30" />
        </div>
      </div>
    </div>
  )
}

export function ContainerYard() {
  const stack = [
    { mode: 'Sea', id: 'CS-YARD-01', availableCbm: 20, totalCbm: 67 },
    { mode: 'Road', id: 'CS-YARD-02', availableCbm: 9, totalCbm: 33 },
    { mode: 'Rail', id: 'CS-YARD-03', availableCbm: 14, totalCbm: 67 },
    { mode: 'Air', id: 'CS-YARD-04', availableCbm: 3, totalCbm: 12 },
    { mode: 'Road', id: 'CS-YARD-05', availableCbm: 11, totalCbm: 33 },
    { mode: 'Sea', id: 'CS-YARD-06', availableCbm: 18, totalCbm: 67 },
  ]

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="yard-floor relative min-h-[320px] p-6 md:min-h-[380px]">
        <div className="lane-pulse pointer-events-none absolute inset-x-0 top-16 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stack.map((c) => (
            <div key={c.id} className="rounded-2xl border border-white/60 bg-white/40 p-2 shadow-sm backdrop-blur-sm">
              <ContainerVisual container={c} compact />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
