import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Mail, Phone, RefreshCw, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Identifier input, 2: OTP verification, 3: New Password, 4: Success
  const [type, setType] = useState('email') // 'email' | 'phone'
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [demoOtp, setDemoOtp] = useState('')
  const [maskedIdentifier, setMaskedIdentifier] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [verifiedToken, setVerifiedToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // Step 1: Request OTP
  async function handleRequestOtp(event) {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, identifier }),
      })

      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json')
        ? await response.json()
        : { message: 'Backend server is unreachable. Please start backend on port 5000.' }

      if (!response.ok) {
        throw new Error(data.message || 'Unable to find an account with these details.')
      }

      setResetToken(data.resetToken)
      setDemoOtp(data.demoOtp || '')
      setMaskedIdentifier(data.maskedIdentifier || identifier)
      setSuccessMessage(data.message)
      setStep(2)
      setResendCooldown(60)

      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError(err.message || 'Unable to request password reset code.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(event) {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, otp }),
      })

      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.json() : { message: 'Invalid verification code.' }
      if (!response.ok) {
        throw new Error(data.message || 'Invalid verification code.')
      }

      setVerifiedToken(data.verifiedToken)
      setSuccessMessage(data.message)
      setStep(3)
    } catch (err) {
      setError(err.message || 'OTP verification failed.')
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Reset Password
  async function handleResetPassword(event) {
    event.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedToken,
          newPassword,
          confirmPassword,
        }),
      })

      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json') ? await response.json() : { message: 'Password reset failed.' }
      if (!response.ok) {
        throw new Error(data.message || 'Password reset failed.')
      }

      setSuccessMessage(data.message)
      setStep(4)
    } catch (err) {
      setError(err.message || 'Unable to reset password.')
    } finally {
      setLoading(false)
    }
  }

  function useDemoOtp() {
    if (demoOtp) {
      setOtp(demoOtp)
      setError('')
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      description="Verify your registered email address or phone number to regain access to your CargoSpace workspace."
      alternateText="Remember your credentials?"
      alternateLabel="Sign in"
      alternateTo="/login"
    >
      <div className="space-y-4">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-navy-900"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
            Step {step} of 4
          </span>
        </div>

        {/* STEP 1: Identification */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600">Verification method</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setType('email'); setError(''); setIdentifier('') }}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition ${
                    type === 'email'
                      ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Mail size={15} /> Registered Email
                </button>
                <button
                  type="button"
                  onClick={() => { setType('phone'); setError(''); setIdentifier('') }}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition ${
                    type === 'phone'
                      ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Phone size={15} /> Registered Phone
                </button>
              </div>
            </div>

            {type === 'email' ? (
              <label className="block text-xs font-bold text-slate-600">
                Registered Email Address
                <span className="relative mt-1.5 block">
                  <Mail size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                  <input
                    required
                    type="email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. trader@cargospace.com"
                    className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-navy-900 outline-none focus:border-brand-500"
                  />
                </span>
                <span className="mt-1 block text-[11px] font-normal text-slate-400">
                  We'll send a 6-digit verification code to this address.
                </span>
              </label>
            ) : (
              <label className="block text-xs font-bold text-slate-600">
                Registered Phone Number
                <span className="relative mt-1.5 block">
                  <Phone size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                  <input
                    required
                    type="tel"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. +91 98765 43210 or 9876543210"
                    className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-navy-900 outline-none focus:border-brand-500"
                  />
                </span>
                <span className="mt-1 block text-[11px] font-normal text-slate-400">
                  Enter the mobile number associated with your CargoSpace account.
                </span>
              </label>
            )}

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 text-sm font-bold text-white shadow-lg shadow-navy-900/15 transition hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? 'Verifying account...' : 'Send verification code'} <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* STEP 2: Enter OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-slate-600">
              <p className="font-semibold text-navy-900">Verification code sent</p>
              <p className="mt-1">Verify the registered {type === 'email' ? 'email' : 'phone'} ending in {maskedIdentifier}.</p>
              {successMessage ? <p className="mt-2 font-semibold text-blue-800">{successMessage}</p> : null}
            </div>

            {/* DEMO MODE HELPER BANNER */}
            {demoOtp && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
                <div>
                  <span className="inline-flex items-center gap-1 font-bold text-amber-800">
                    <Sparkles size={13} className="text-amber-600" /> [DEMO MODE]
                  </span>
                  <p className="mt-0.5 text-slate-600">
                    Verification code: <strong className="font-mono text-sm text-navy-900">{demoOtp}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={useDemoOtp}
                  className="rounded-lg bg-white px-2.5 py-1.5 font-bold text-amber-900 shadow-sm border border-amber-200 hover:bg-amber-100"
                >
                  Auto-fill
                </button>
              </div>
            )}

            <label className="block text-xs font-bold text-slate-600">
              6-Digit Verification Code (OTP)
              <span className="relative mt-1.5 block">
                <KeyRound size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                <input
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 font-mono text-lg font-bold tracking-widest text-navy-900 outline-none focus:border-brand-500"
                />
              </span>
            </label>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(''); setError('') }}
                className="font-bold text-slate-500 hover:text-navy-900"
              >
                Change {type}
              </button>
              <button
                type="button"
                disabled={resendCooldown > 0 || loading}
                onClick={handleRequestOtp}
                className="inline-flex items-center gap-1 font-bold text-brand-700 hover:text-brand-900 disabled:opacity-40"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>

            <button
              type="submit"
              disabled={otp.length !== 6 || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 text-sm font-bold text-white shadow-lg shadow-navy-900/15 transition hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? 'Verifying OTP...' : 'Verify code'} <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* STEP 3: Create New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-800">
              ✓ Identity verified. Choose a strong new password for your account.
            </div>

            <label className="block text-xs font-bold text-slate-600">
              New Password
              <span className="relative mt-1.5 block">
                <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                <input
                  required
                  minLength={6}
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter at least 6 characters"
                  className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-11 text-sm text-navy-900 outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-navy-900"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>

            <label className="block text-xs font-bold text-slate-600">
              Confirm New Password
              <span className="relative mt-1.5 block">
                <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                <input
                  required
                  minLength={6}
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="auth-input w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-11 text-sm text-navy-900 outline-none focus:border-brand-500"
                />
              </span>
            </label>

            {/* Validation indicators */}
            <div className="space-y-1 text-xs text-slate-500">
              <p className={newPassword.length >= 6 ? 'font-semibold text-emerald-600' : ''}>
                {newPassword.length >= 6 ? '✓' : '•'} Minimum 6 characters
              </p>
              <p className={newPassword && confirmPassword && newPassword === confirmPassword ? 'font-semibold text-emerald-600' : ''}>
                {newPassword && confirmPassword && newPassword === confirmPassword ? '✓' : '•'} Passwords match
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 text-sm font-bold text-white shadow-lg shadow-navy-900/15 transition hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? 'Updating password...' : 'Set new password'} <CheckCircle2 size={16} />
            </button>
          </form>
        )}

        {/* STEP 4: Success */}
        {step === 4 && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-navy-900">Password Reset Complete</h2>
              <p className="mt-2 text-sm text-slate-500">
                Your CargoSpace account password has been updated successfully. You can now sign in with your new credentials.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              Proceed to Sign In <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </AuthShell>
  )
}
