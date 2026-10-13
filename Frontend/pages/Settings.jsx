import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Building2,
  Check,
  CreditCard,
  Mail,
  MapPin,
  Package,
  LockKeyhole,
  LogOut,
  Phone,
  Plus,
  ShieldCheck,
  Smartphone,
  Star,
  Trash2,
  UserRound,
} from 'lucide-react'
import StatsCard from '../components/StatsCard'
import TransportIcon from '../components/TransportIcon'
import { bookings, formatDate, formatInr, shipments, traderProfile, traderStats } from '../data/mockData'
import { clearStoredUser, readStoredUser, saveStoredUser } from '../utils/session'
import { initialsFromName } from '../utils/initials'

const modeLabels = { Road: 'Truck', Rail: 'Train', Sea: 'Ship', Air: 'Airplane' }
const modeOptions = ['Road', 'Rail', 'Sea', 'Air']

function buildProfile(storedUser) {
  if (!storedUser) return traderProfile
  return {
    ...traderProfile,
    name: storedUser.name || traderProfile.name,
    alternateName: storedUser.alternate_name || '',
    businessName: storedUser.company || '',
    email: storedUser.email || traderProfile.email,
    phone: storedUser.phone || '',
    location: storedUser.location || '',
    role: storedUser.user_type || storedUser.role === 'admin' ? 'CargoSpace Administrator' : 'CargoSpace Trader',
    memberSince: String(storedUser.created_at || '').slice(0, 10) || traderProfile.memberSince,
  }
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState(() => buildProfile(readStoredUser()))
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileNotice, setProfileNotice] = useState('')
  const [modes, setModes] = useState(traderProfile.preferredTransportModes)
  const [notifications, setNotifications] = useState({ email: true, sms: true, push: false })
  const [accountDialog, setAccountDialog] = useState(null)
  const [accountForm, setAccountForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', password: '' })
  const [accountError, setAccountError] = useState('')
  const [accountLoading, setAccountLoading] = useState(false)

  const activeBookings = bookings.filter((booking) => booking.status !== 'Completed').length
  const totalCbm = bookings.reduce((sum, booking) => sum + booking.space, 0)
  const totalSpent = bookings.reduce((sum, booking) => sum + booking.amount, 0)

  function updateField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }))
  }

  function toggleMode(mode) {
    setModes((current) => current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode])
  }

  function toggleNotification(type) {
    setNotifications((current) => ({ ...current, [type]: !current[type] }))
  }

  function logout() {
    clearStoredUser()
    navigate('/', { replace: true })
  }

  async function handleProfileAction() {
    if (!editing) {
      setProfileError('')
      setProfileNotice('')
      setEditing(true)
      return
    }

    setProfileError('')
    setProfileNotice('')
    setProfileSaving(true)
    try {
      const storedUser = readStoredUser()
      const response = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': storedUser?.user_id || '' },
        body: JSON.stringify({
          name: profile.name,
          alternateName: profile.alternateName,
          company: profile.businessName,
          phone: profile.phone,
          location: profile.location,
        }),
      })
      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to save your profile.' }
      if (!response.ok) throw new Error(data.message || 'Unable to save your profile.')
      saveStoredUser(data.user)
      setProfile(buildProfile(data.user))
      setEditing(false)
      setProfileNotice(data.message || 'Profile updated successfully.')
    } catch (error) {
      setProfileError(error.message)
    } finally {
      setProfileSaving(false)
    }
  }

  async function submitAccountAction(event) {
    event.preventDefault()
    setAccountError('')
    if (accountDialog === 'password' && accountForm.newPassword !== accountForm.confirmPassword) {
      setAccountError('The new password and confirmation do not match.')
      return
    }
    const user = JSON.parse(localStorage.getItem('cargospace_user') || 'null')
    setAccountLoading(true)
    try {
      const response = await fetch(accountDialog === 'password' ? '/api/account/change-password' : '/api/account', {
        method: accountDialog === 'password' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.user_id || '' },
        body: JSON.stringify(accountDialog === 'password' ? { currentPassword: accountForm.currentPassword, newPassword: accountForm.newPassword } : { password: accountForm.password }),
      })
      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.json() : { message: 'Unable to update your account.' }
      if (!response.ok) throw new Error(data.message || 'Unable to update your account.')
      if (accountDialog === 'delete') logout()
      else {
        setAccountDialog(null)
        setAccountForm({ currentPassword: '', newPassword: '', confirmPassword: '', password: '' })
        window.alert(data.message)
      }
    } catch (error) {
      setAccountError(error.message)
    } finally {
      setAccountLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-navy-900 shadow-sm transition hover:bg-slate-50"
        >
          <UserRound size={14} className="text-brand-600" /> Back to Dashboard
        </button>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Account control</p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your trader profile, booking preferences, and account access.</p>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-xl font-extrabold text-white">{initialsFromName(profile.name)}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold text-navy-900">{profile.name}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700"><ShieldCheck size={13} /> Verified</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-600">{profile.businessName ? <>{profile.businessName} <span className="text-slate-300">·</span> </> : null}{profile.role}</p>
              <p className="mt-2 font-mono text-[11px] text-slate-400">Member since {formatDate(profile.memberSince)}</p>
            </div>
          </div>
          <button type="button" onClick={handleProfileAction} disabled={profileSaving} className="inline-flex items-center justify-center rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:cursor-wait disabled:opacity-70">
            {profileSaving ? 'Saving...' : editing ? 'Save profile' : 'Edit Profile'}
          </button>
        </div>
        <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          {[['name', 'Full name', UserRound], ['alternateName', 'Alternate name', UserRound], ['businessName', 'Company', Building2], ['email', 'Email', Mail], ['phone', 'Phone', Phone], ['location', 'Location', MapPin]].map(([field, label, Icon]) => (
            <label key={field} className="text-xs font-semibold text-slate-500">
              {label}
              {editing ? <input value={profile[field] || ''} onChange={(event) => updateField(field, event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-navy-900 outline-none focus:border-brand-500" /> : <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-navy-900"><Icon size={14} className="text-brand-600" />{profile[field] || 'Not added yet'}</span>}
            </label>
          ))}
        </div>
        {profileError ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{profileError}</p> : null}
        {profileNotice ? <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{profileNotice}</p> : null}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-navy-900">Trader overview</h2><span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Live mock data</span></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatsCard icon={CreditCard} label="Total bookings" value={bookings.length} />
          <StatsCard icon={Bell} label="Active bookings" value={activeBookings} />
          <StatsCard icon={Package} label="CBM shipped" value={`${totalCbm} CBM`} />
          <StatsCard icon={CreditCard} label="Amount spent" value={formatInr(totalSpent)} />
          <StatsCard icon={ShieldCheck} label="Saved providers" value={traderStats.savedProviders} />
          <StatsCard icon={Star} label="On-time delivery" value={traderStats.onTimeDeliveryRate} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card md:p-6">
          <h2 className="font-bold text-navy-900">Preferred transport modes</h2>
          <p className="mt-1 text-sm text-slate-500">Choose the modes you book most often.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {modeOptions.map((mode) => {
              const selected = modes.includes(mode)
              return <button key={mode} type="button" onClick={() => toggleMode(mode)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? 'bg-white text-brand-600' : 'bg-slate-50'}`}><TransportIcon type={mode} /></span><span className="flex-1 text-sm font-bold">{modeLabels[mode]}</span>{selected ? <Check size={16} /> : null}</button>
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card md:p-6">
          <h2 className="font-bold text-navy-900">Notification preferences</h2>
          <p className="mt-1 text-sm text-slate-500">Control how CargoSpace keeps you informed.</p>
          <div className="mt-4 divide-y divide-slate-100">
            {[['email', 'Email notifications', 'Booking confirmations and account updates', Mail], ['sms', 'SMS notifications', 'Urgent shipment and delivery alerts', Smartphone], ['push', 'Push notifications', 'Real-time activity in your browser', Bell]].map(([type, label, description, Icon]) => <div key={type} className="flex items-center gap-3 py-3"><Icon size={18} className="text-brand-600" /><div className="flex-1"><p className="text-sm font-bold text-navy-900">{label}</p><p className="text-xs text-slate-500">{description}</p></div><Toggle checked={notifications[type]} onChange={() => toggleNotification(type)} label={label} /></div>)}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-navy-900">Saved payment methods</h2><p className="mt-1 text-sm text-slate-500">Your mock payment options for faster checkout.</p></div><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-navy-800 hover:bg-slate-50"><Plus size={16} /> Add payment method</button></div>
        <div className="mt-5 grid gap-3 md:grid-cols-2"><div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brand-600"><Smartphone size={19} /></div><div><p className="text-sm font-bold text-navy-900">UPI</p><p className="font-mono text-xs text-slate-500">ananya.mehta@upi</p></div><span className="ml-auto rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Default</span></div><div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-white"><CreditCard size={19} /></div><div><p className="text-sm font-bold text-navy-900">HDFC Bank Visa</p><p className="font-mono text-xs text-slate-500">•••• 4821</p></div></div></div>
      </section>

      <section className="rounded-2xl border border-red-100 bg-red-50/40 p-5 md:p-6"><h2 className="font-bold text-navy-900">Account actions</h2><p className="mt-1 text-sm text-slate-500">Manage access to your CargoSpace account.</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => { setAccountDialog('password'); setAccountError('') }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-navy-800 hover:bg-slate-50"><LockKeyhole size={16} /> Change Password</button><button type="button" onClick={logout} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-navy-800 hover:bg-slate-50"><LogOut size={16} /> Log Out</button><button type="button" onClick={() => { setAccountDialog('delete'); setAccountError('') }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50"><Trash2 size={16} /> Delete Account</button></div></section>
      {accountDialog ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/55 p-4 backdrop-blur-sm"><form onSubmit={submitAccountAction} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><p className={`text-xs font-bold uppercase tracking-[0.18em] ${accountDialog === 'delete' ? 'text-red-600' : 'text-brand-600'}`}>{accountDialog === 'delete' ? 'Permanent action' : 'Account security'}</p><h2 className="mt-1 text-xl font-extrabold text-navy-900">{accountDialog === 'delete' ? 'Delete your account?' : 'Change password'}</h2><p className="mt-2 text-sm text-slate-500">{accountDialog === 'delete' ? 'This permanently removes your account. Booking records are retained without your account details.' : 'Choose a new password with at least 6 characters.'}</p>{accountDialog === 'password' ? <div className="mt-5 space-y-3"><input required type="password" value={accountForm.currentPassword} onChange={(event) => setAccountForm((value) => ({ ...value, currentPassword: event.target.value }))} placeholder="Current password" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input required minLength="6" type="password" value={accountForm.newPassword} onChange={(event) => setAccountForm((value) => ({ ...value, newPassword: event.target.value }))} placeholder="New password" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input required minLength="6" type="password" value={accountForm.confirmPassword} onChange={(event) => setAccountForm((value) => ({ ...value, confirmPassword: event.target.value }))} placeholder="Confirm new password" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></div> : <input required type="password" value={accountForm.password} onChange={(event) => setAccountForm((value) => ({ ...value, password: event.target.value }))} placeholder="Enter your password to confirm" className="mt-5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />}{accountError ? <p className="mt-3 text-xs font-bold text-red-700">{accountError}</p> : null}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setAccountDialog(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button><button disabled={accountLoading} className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 ${accountDialog === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-navy-900 hover:bg-brand-700'}`}>{accountLoading ? 'Saving...' : accountDialog === 'delete' ? 'Delete account' : 'Change password'}</button></div></form></div> : null}
      <span className="sr-only">{shipments.length} shipments tracked. {traderStats.averageProviderRating} average provider rating.</span>
    </div>
  )
}
