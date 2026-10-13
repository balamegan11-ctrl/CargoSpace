import { useState } from 'react'
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { saveStoredAdmin, saveStoredUser } from '../utils/session'
import providerImage from '../assets/pexels-simon-r-minshall-1673444001-28438281.jpg'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

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
      if (!response.ok) throw new Error(data.message || 'Unable to sign in.')
      if (data.role === 'admin') {
        saveStoredAdmin(data.user)
        navigate('/admin', { replace: true })
      } else if (data.role === 'provider') {
        saveStoredUser(data.user)
        navigate('/provider', { replace: true })
      } else {
        throw new Error('Use the trader / user login for this account.')
      }
    } catch (submitError) {
      setError(submitError.message || 'Unable to sign in as admin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-950 px-4 py-10">
      <img src={providerImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-navy-950/65" />
      <section className="relative w-full max-w-md rounded-2xl border border-white/30 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-white">
            <ShieldCheck size={24} />
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-brand-600">CargoSpace workspace access</p>
        <h1 className="mt-2 text-2xl font-extrabold text-navy-900">Admin or provider sign in</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in to open your administrator or space provider workspace.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-xs font-bold text-slate-600">Email address
            <span className="relative mt-2 block"><Mail size={16} className="absolute left-3 top-3 text-slate-400" /><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="admin@cargospace.com or provider email" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-navy-900" /></span>
          </label>
          <label className="block text-xs font-bold text-slate-600">Password
            <span className="relative mt-2 block"><LockKeyhole size={16} className="absolute left-3 top-3 text-slate-400" /><input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Enter your password" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-navy-900" /></span>
          </label>
          {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p> : null}
          <button disabled={loading} className="w-full rounded-xl bg-navy-900 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60">{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
          <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-900">
            Trader / User Login
          </Link>
          <span className="text-right text-slate-400">Demo: admin@cargospace.com / admin123</span>
        </div>
        <p className="mt-2 text-right text-[11px] text-slate-400">Provider demo: provider@cargospace.com / password</p>
      </section>
    </main>
  )
}
