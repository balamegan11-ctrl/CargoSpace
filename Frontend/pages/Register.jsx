import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  IndianRupee,
  Info,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Plane,
  Route,
  Ship,
  Train,
  Truck,
  UserCheck,
  UserRound,
  LoaderCircle,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { saveStoredUser } from '../utils/session'
import authImage from '../assets/pexels-lammycz-36279695.jpg'

const USER_TYPES = [
  'Trader / Exporter / Importer',
  'Logistics Service Provider (Road / Rail / Ship / Air)',
]

const TRANSPORT_MODES = [
  { label: 'Road', icon: Truck },
  { label: 'Rail', icon: Train },
  { label: 'Ship', icon: Ship },
  { label: 'Air', icon: Plane },
]

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/dashboard'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successNotice, setSuccessNotice] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [providerCoordinates, setProviderCoordinates] = useState(null)
  const [form, setForm] = useState({
    fullName: '',
    alternateName: '',
    phone: '',
    userType: 'Trader / Exporter / Importer',
    company: '',
    email: '',
    location: 'Chennai',
    transportMode: 'Road',
    cargoCenterName: '',
    route: '',
    totalCbm: '500',
    availableCbm: '320',
    pricePerCbm: '500',
    vehicleInfo: '',
    vehicleNumber: '',
    serviceDescription: '',
    password: '',
    confirmPassword: '',
  })

  const isProvider = form.userType.includes('Logistics')

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessNotice('')

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Password and confirmation password do not match.')
      setLoading(false)
      return
    }

    if (isProvider && Number(form.availableCbm) > Number(form.totalCbm)) {
      setError('Available CBM cannot be greater than Total CBM capacity.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName.trim(),
          alternateName: form.alternateName.trim(),
          phone: form.phone.trim(),
          userType: form.userType,
          company: form.company.trim(),
          email: form.email.trim(),
          location: form.location.trim(),
          latitude: isProvider ? providerCoordinates?.lat : undefined,
          longitude: isProvider ? providerCoordinates?.lng : undefined,
          transportMode: isProvider ? form.transportMode : undefined,
          cargoCenterName: isProvider ? form.cargoCenterName.trim() : undefined,
          route: isProvider ? form.route.trim() : undefined,
          totalCbm: isProvider ? Number(form.totalCbm) : undefined,
          availableCbm: isProvider ? Number(form.availableCbm) : undefined,
          pricePerCbm: isProvider ? Number(form.pricePerCbm) : undefined,
          vehicleInfo: isProvider ? form.vehicleInfo.trim() : undefined,
          vehicleNumber: isProvider ? form.vehicleNumber.trim() : undefined,
          serviceDescription: isProvider ? form.serviceDescription.trim() : undefined,
          password: form.password,
          role: isProvider ? 'provider' : 'user',
        }),
      })

      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json')
        ? await response.json()
        : { message: 'The backend server is not running. Start it with: cd backend && npm start' }

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.')
      }

      // Immediately store the newly registered user in session state
      saveStoredUser(data.user)

      // Providers are shown the inspection notice before being sent on
      if (isProvider) {
        setSuccessNotice(data.message)
        setTimeout(() => {
          navigate('/provider', { replace: true })
        }, 1200)
      } else {
        // Traders go straight to their destination
        navigate(redirectUrl, { replace: true })
      }
    } catch (submitError) {
      setError(submitError.message || 'Something went wrong while creating your account.')
    } finally {
      setLoading(false)
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function detectProviderLocation() {
    if (!navigator.geolocation) {
      setError('Location detection is unavailable. Enter the operating city manually.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setProviderCoordinates({ lat: coords.latitude, lng: coords.longitude })
        setError('')
      },
      () => setError('Location access was not granted. You can still enter the operating city manually.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }

  return (
    <AuthShell
      eyebrow="Start shipping smarter"
      title="Create your CargoSpace account"
      description="Join a connected network that helps you find open capacity and move cargo with confidence."
      alternateText="Already have an account?"
      alternateLabel="Sign in"
      alternateTo={redirectUrl !== '/dashboard' ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
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

      <form onSubmit={submit} className="auth-form space-y-3.5">
        <label className="block text-xs font-bold text-slate-600">
          {isProvider ? 'Service Provider Name / Contact Person' : 'Full Name / Contact Person'} <span className="text-rose-500">*</span>
          <span className="relative mt-1.5 block">
            <UserRound size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
            <input
              required
              type="text"
              placeholder="e.g. Rajesh Sharma"
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-navy-900 outline-none focus:border-brand-500"
            />
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-slate-600">
            Email Address <span className="text-rose-500">*</span>
            <span className="relative mt-1.5 block">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
              <input
                required
                type="email"
                placeholder="rajesh@company.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-navy-900 outline-none focus:border-brand-500"
              />
            </span>
          </label>

          <label className="block text-xs font-bold text-slate-600">
            Phone Number <span className="text-rose-500">*</span>
            <span className="relative mt-1.5 block">
              <Phone size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
              <input
                required
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-navy-900 outline-none focus:border-brand-500"
              />
            </span>
          </label>
        </div>

        <label className="block text-xs font-bold text-slate-600">
          Account / User Type <span className="text-rose-500">*</span>
          <span className="relative mt-1.5 block">
            <UserCheck size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
            <select
              value={form.userType}
              onChange={(e) => updateField('userType', e.target.value)}
              className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm font-medium text-navy-900 outline-none focus:border-brand-500"
            >
              {USER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </span>
          <span className="mt-1 block text-[10px] text-slate-400">
            Traders/exporters register instantly. Logistics providers can list space availability.
            {isProvider
              ? 'Logistics Service Providers apply for listing space and undergo Admin inspection review.'
              : 'Traders, exporters, and importers self-register instantly with zero inspection wait.'}
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-slate-600">
            Organisation / Company Name <span className="text-rose-500">*</span>
            <span className="relative mt-1.5 block">
              <Building2 size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
              <input
                required
                type="text"
                placeholder={isProvider ? 'e.g. Express Roadways Logistics' : 'e.g. Sharma Export House'}
                value={form.company}
                onChange={(e) => updateField('company', e.target.value)}
                className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-navy-900 outline-none focus:border-brand-500"
              />
            </span>
          </label>

          <label className="block text-xs font-bold text-slate-600">
            Alternate Name (Optional)
            <span className="relative mt-1.5 block">
              <UserRound size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Preferred short name"
                value={form.alternateName}
                onChange={(e) => updateField('alternateName', e.target.value)}
                className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-navy-900 outline-none focus:border-brand-500"
              />
            </span>
          </label>
        </div>

        <label className="block text-xs font-bold text-slate-600">
          Operating City / Location {isProvider ? <span className="text-rose-500">*</span> : null}
          <span className="relative mt-1.5 block">
            <MapPin size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
            <input
              required={isProvider}
              type="text"
              placeholder="e.g. Chennai, Mumbai, Delhi"
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
              className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-navy-900 outline-none focus:border-brand-500"
            />
          </span>
          {isProvider ? <span className="mt-2 flex flex-wrap items-center gap-3"><button type="button" onClick={detectProviderLocation} className="text-xs font-bold text-brand-700 hover:text-brand-900">Detect exact cargo-center location</button>{providerCoordinates ? <span className="text-[10px] font-semibold text-emerald-700">GPS: {providerCoordinates.lat.toFixed(5)}, {providerCoordinates.lng.toFixed(5)}</span> : null}</span> : null}
        </label>

        {/* LOGISTICS SERVICE PROVIDER DEDICATED FIELDS */}
        {isProvider && (
          <div className="space-y-3.5 rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-800">
              <Info size={15} className="text-brand-600" />
              <span>Logistics Provider Inspection & Capacity Data</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Transport Mode <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TRANSPORT_MODES.map((mode) => {
                  const Icon = mode.icon
                  const active = form.transportMode === mode.label
                  return (
                    <button
                      key={mode.label}
                      type="button"
                      onClick={() => updateField('transportMode', mode.label)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                        active
                          ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={16} />
                      {mode.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600">
                Cargo Center Name <span className="text-rose-500">*</span>
                <span className="relative mt-1.5 block">
                  <Building2 size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                  <input
                    required={isProvider}
                    type="text"
                    placeholder="e.g. Chennai Cargo Logistics Hub"
                    value={form.cargoCenterName}
                    onChange={(e) => updateField('cargoCenterName', e.target.value)}
                    className="auth-input w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-navy-900 outline-none focus:border-brand-500"
                  />
                </span>
              </label>

              <label className="block text-xs font-bold text-slate-600">
                Primary Route <span className="text-rose-500">*</span>
                <span className="relative mt-1.5 block">
                  <Route size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                  <input
                    required={isProvider}
                    type="text"
                    placeholder="e.g. Chennai → Mumbai"
                    value={form.route}
                    onChange={(e) => updateField('route', e.target.value)}
                    className="auth-input w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-navy-900 outline-none focus:border-brand-500"
                  />
                </span>
              </label>
            </div>

            <div className="grid gap-3 grid-cols-3">
              <label className="block text-xs font-bold text-slate-600">
                Total CBM <span className="text-rose-500">*</span>
                <span className="relative mt-1.5 block">
                  <Boxes size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                  <input
                    required={isProvider}
                    type="number"
                    min="1"
                    placeholder="500"
                    value={form.totalCbm}
                    onChange={(e) => updateField('totalCbm', e.target.value)}
                    className="auth-input w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-2 text-sm text-navy-900 outline-none focus:border-brand-500"
                  />
                </span>
              </label>

              <label className="block text-xs font-bold text-slate-600">
                Available CBM <span className="text-rose-500">*</span>
                <span className="relative mt-1.5 block">
                  <Boxes size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                  <input
                    required={isProvider}
                    type="number"
                    min="0"
                    placeholder="320"
                    value={form.availableCbm}
                    onChange={(e) => updateField('availableCbm', e.target.value)}
                    className="auth-input w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-2 text-sm text-navy-900 outline-none focus:border-brand-500"
                  />
                </span>
              </label>

              <label className="block text-xs font-bold text-slate-600">
                Price / CBM (₹) <span className="text-rose-500">*</span>
                <span className="relative mt-1.5 block">
                  <IndianRupee size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
                  <input
                    required={isProvider}
                    type="number"
                    min="1"
                    placeholder="500"
                    value={form.pricePerCbm}
                    onChange={(e) => updateField('pricePerCbm', e.target.value)}
                    className="auth-input w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-2 text-sm text-navy-900 outline-none focus:border-brand-500"
                  />
                </span>
              </label>
            </div>

            <label className="block text-xs font-bold text-slate-600">
              Vehicle / Container Registration Number (where applicable)
              <input
                type="text"
                placeholder="e.g. GJ-15-AB-1234"
                value={form.vehicleNumber}
                onChange={(e) => updateField('vehicleNumber', e.target.value)}
                className="auth-input mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy-900 outline-none focus:border-brand-500"
              />
            </label>

            <label className="block text-xs font-bold text-slate-600">
              Vehicle / Container Fleet Information
              <input
                type="text"
                placeholder="e.g. 24 multi-axle 40ft container trucks with live GPS tracking"
                value={form.vehicleInfo}
                onChange={(e) => updateField('vehicleInfo', e.target.value)}
                className="auth-input mt-1.5 w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm text-navy-900 outline-none focus:border-brand-500"
              />
            </label>

            <label className="block text-xs font-bold text-slate-600">
              Service Description / Quality Metrics
              <textarea
                required={isProvider}
                rows={2}
                placeholder="Describe your freight handling capabilities, scheduled departures, and service standards..."
                value={form.serviceDescription}
                onChange={(e) => updateField('serviceDescription', e.target.value)}
                className="auth-input mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-navy-900 outline-none focus:border-brand-500"
              />
            </label>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-slate-600">
            Password <span className="text-rose-500">*</span>
            <span className="relative mt-1.5 block">
              <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
              <input
                required
                minLength={6}
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-10 text-sm text-navy-900 outline-none focus:border-brand-500"
              />
              <button
                type="button"
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-navy-900"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </span>
          </label>

          <label className="block text-xs font-bold text-slate-600">
            Confirm Password <span className="text-rose-500">*</span>
            <span className="relative mt-1.5 block">
              <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
              <input
                required
                minLength={6}
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-navy-900 outline-none focus:border-brand-500"
              />
            </span>
          </label>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
            {error}
          </p>
        ) : null}

        {successNotice ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 size={16} className="text-emerald-600" />
            {successNotice}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="auth-button mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 text-sm font-bold text-white shadow-lg shadow-navy-900/15 transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowRight size={17} />}
          {loading
            ? 'Creating account...'
            : isProvider
              ? 'Submit Provider Application'
              : 'Create CargoSpace Account'}
        </button>
      </form>
    </AuthShell>
  )
}
