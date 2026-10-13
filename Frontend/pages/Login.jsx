import { useState } from 'react'
import { ArrowLeft, Boxes, Eye, EyeOff, LockKeyhole, Mail, LoaderCircle, UserRound } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { saveStoredUser } from '../utils/session'
import authImage from '../assets/pexels-ana-benet-8243354.jpg'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/dashboard'

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accountType, setAccountType] = useState('user')
  const [form, setForm] = useState({ email: '', password: '' })

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json')
        ? await response.json()
        : { message: 'The backend server is not running. Start it with: cd backend && npm start' }

      if (!response.ok) {
        throw new Error(data.message || 'Login failed.')
      }

      if (data.role !== accountType) {
        if (data.role === 'admin') throw new Error('Use Admin sign in for this account.')
        throw new Error(`This account is a ${data.role === 'provider' ? 'space provider' : 'trader'}. Select the matching account type and try again.`)
      }

      saveStoredUser(data.user)
      navigate(accountType === 'provider' ? '/provider' : redirectUrl, { replace: true })
    } catch (submitError) {
      setError(submitError.message || 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to CargoSpace"
      description="Track capacity, compare routes and keep every shipment moving from one calm workspace."
      alternateText="New to CargoSpace?"
      alternateLabel="Create account"
      alternateTo={redirectUrl !== '/dashboard' ? `/register?redirect=${encodeURIComponent(redirectUrl)}` : '/register'}
      image={authImage}
    >
      <div className="mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-navy-900"
        >
          <ArrowLeft size={14} /> Back to Home
        </Link>
      </div>

      <form onSubmit={submit} className="auth-form space-y-4">
        <div className="space-y-2">
          <p id="account-type-label" className="text-xs font-bold text-slate-600">Sign in as</p>
          <div role="group" aria-labelledby="account-type-label" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              aria-pressed={accountType === 'user'}
              disabled={loading}
              onClick={() => { setAccountType('user'); setError('') }}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${accountType === 'user' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'}`}
            >
              <UserRound size={16} /> Trader
            </button>
            <button
              type="button"
              aria-pressed={accountType === 'provider'}
              disabled={loading}
              onClick={() => { setAccountType('provider'); setError('') }}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${accountType === 'provider' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'}`}
            >
              <Boxes size={16} /> Space Provider
            </button>
          </div>
          <p className="text-xs text-slate-500" aria-live="polite">
            {accountType === 'provider' ? 'Sign in to manage listed cargo space, bookings, and customer chats.' : 'Sign in to find cargo space, manage bookings, and track shipments.'}
          </p>
        </div>

        <label className="block text-xs font-bold text-slate-600">
          Email address
          <span className="relative mt-1.5 block">
            <Mail size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
            <input
              required
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-navy-900 outline-none focus:border-brand-500"
            />
          </span>
        </label>

        <label className="block text-xs font-bold text-slate-600">
          Password
          <span className="relative mt-1.5 block">
            <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
            <input
              required
              minLength={6}
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-11 text-sm text-navy-900 outline-none focus:border-brand-500"
            />
            <button
              type="button"
              className="absolute right-3 top-2.5 text-slate-400 hover:text-navy-900"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>

        <div className="flex items-center justify-between gap-3 pt-1">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="text-xs font-bold text-brand-700 transition-colors hover:text-brand-900"
          >
            Forgot password?
          </Link>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="auth-button mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 text-sm font-bold text-white shadow-lg shadow-navy-900/15 transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? <LoaderCircle size={17} className="animate-spin" /> : null}
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="text-center text-xs text-slate-500">
          CargoSpace administrator?{' '}
          <button
            type="button"
            onClick={() => window.open('/admin/login', '_blank')}
            className="font-bold text-brand-700 transition-colors hover:text-brand-900"
          >
            Admin sign in
          </button>
        </p>

        <p className="rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-center text-[11px] font-semibold text-brand-700">
          {accountType === 'provider' ? 'Demo provider: provider@cargospace.com / password' : 'Demo trader: trader@cargospace.com / password'}
        </p>
      </form>
    </AuthShell>
  )
}
