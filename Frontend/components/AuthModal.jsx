import { ArrowRight, Lock, UserPlus, X, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AuthModal({ isOpen, onClose, container, redirectUrl }) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const defaultRedirect = redirectUrl || (container ? `/booking?container=${container.id}` : '/containers')

  function handleLogin() {
    onClose?.()
    navigate(`/login?redirect=${encodeURIComponent(defaultRedirect)}`)
  }

  function handleRegister() {
    onClose?.()
    navigate(`/register?redirect=${encodeURIComponent(defaultRedirect)}`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-7">
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Lock size={22} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-navy-900"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
            Authentication Required
          </p>
          <h2 id="auth-modal-title" className="mt-1 text-xl font-extrabold text-navy-900">
            Login required to book cargo space
          </h2>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            {container ? (
              <>
                You need an active CargoSpace account to reserve space in container{' '}
                <strong className="text-navy-900">{container.id}</strong> ({container.origin} → {container.destination}).
              </>
            ) : (
              'Please sign in or register a new trader account to reserve container space and complete your shipment booking.'
            )}
          </p>
        </div>

        {container && (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Logistics Provider:</span>
              <strong className="text-navy-900">{container.provider}</strong>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-slate-600">
              <span>Available Space:</span>
              <strong className="text-brand-700">{container.availableCbm} CBM</strong>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleLogin}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 text-sm font-bold text-white shadow-lg shadow-navy-900/15 transition hover:bg-brand-700"
          >
            Sign in to Existing Account <ArrowRight size={16} />
          </button>
          <button
            type="button"
            onClick={handleRegister}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-navy-900 transition hover:bg-slate-50 hover:border-slate-300"
          >
            <UserPlus size={16} className="text-brand-600" /> New User? Sign Up
          </button>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
          <ShieldCheck size={13} className="text-emerald-600" /> Free instant registration for exporters & traders
        </p>
      </div>
    </div>
  )
}
