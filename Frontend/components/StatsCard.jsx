import { useEffect, useRef, useState } from 'react'

export default function StatsCard({ icon: Icon, label, value, hint, countUp = false }) {
  const numericValue = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  const animateCount = countUp && Number.isFinite(numericValue)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const cardRef = useRef(null)
  const [hasEntered, setHasEntered] = useState(false)
  const [count, setCount] = useState(() => animateCount && !reducedMotion ? 0 : numericValue)

  useEffect(() => {
    if (!animateCount || reducedMotion || hasEntered) return undefined

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasEntered(true)
        observer.disconnect()
      }
    }, { threshold: 0.25 })

    if (cardRef.current) observer.observe(cardRef.current)

    return () => observer.disconnect()
  }, [animateCount, hasEntered, reducedMotion])

  useEffect(() => {
    if (!animateCount || reducedMotion || !hasEntered) return undefined

    let frame = 0
    const startedAt = performance.now()
    const duration = 1400
    const tick = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      setCount(Math.round(numericValue * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frame)
  }, [animateCount, hasEntered, numericValue, reducedMotion])

  const displayValue = animateCount
    ? new Intl.NumberFormat('en-IN').format(count)
    : value

  return (
    <article ref={cardRef} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-extrabold text-navy-900">{displayValue}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon size={18} />
          </span>
        ) : null}
      </div>
    </article>
  )
}
