import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import transportImage from '../assets/hero-freight.svg'
import cargoLogo from '../assets/brand-lockup.svg'

export default function AuthShell({ eyebrow, title, description, children, alternateText, alternateLabel, alternateTo, image = transportImage }) {
  return (
    <main className="auth-page flex min-h-screen w-full items-center bg-[#f4f7fb] px-4 py-8 sm:px-6 lg:py-10">
      <div className="auth-layout mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(15,35,65,0.12)] lg:h-[640px] lg:flex-row">
      <section className="auth-image-frame relative flex h-40 w-full overflow-hidden bg-navy-950 sm:h-48 lg:h-auto lg:w-[40%]" aria-label="CargoSpace logistics network">
          <img src={image} alt="Cargo ship loaded with containers at a port" className="absolute inset-0 h-full w-full object-cover object-center opacity-55" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 via-brand-600/15 to-brand-500/5" />
          <div className="relative z-10 mt-auto w-full p-5 text-white sm:p-7 lg:p-9">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100"><ShieldCheck size={14} /> Built for modern freight</div>
            <h2 className="max-w-xl text-2xl font-extrabold leading-tight sm:text-3xl">One platform for every mile, mode and shipment.</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold text-blue-50">
              {['Verified capacity', 'Flexible routes', 'Clear pricing'].map((item) => <span key={item} className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1.5 backdrop-blur-sm"><CheckCircle2 size={12} className="text-blue-200" /> {item}</span>)}
            </div>
          </div>
      </section>
        <section className="auth-form-frame flex min-h-0 flex-1 items-center overflow-y-auto bg-white px-6 py-4 sm:px-10 lg:px-14" aria-labelledby="auth-title">
          <div className="mx-auto w-full max-w-lg">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight text-navy-900">
              <img src={cargoLogo} alt="CargoSpace logo" className="h-14 w-28 object-contain" />
            </Link>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600">{eyebrow}</p>
            <h1 id="auth-title" className="mt-2 text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>
            <div className="mt-5">{children}</div>
            <p className="mt-4 text-center text-sm text-slate-500">
              {alternateText}{' '}
              <Link to={alternateTo} className="inline-flex items-center gap-1 font-bold text-brand-700 transition-colors hover:text-brand-900">
                {alternateLabel} <ArrowRight size={14} />
              </Link>
            </p>
          </div>
      </section>
      </div>
    </main>
  )
}
