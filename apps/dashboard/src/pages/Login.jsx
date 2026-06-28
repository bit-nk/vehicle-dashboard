import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Lock, ArrowRight, ShieldCheck, Globe, Shield } from 'lucide-react'
import { Logo } from '@shared/ui'
import { isValidEmail } from '@shared/lib'
import { signIn } from '../lib/auth.js'
import { activeDealerships, dealershipById, findUser, usersForDealership, findAdminUser, PLATFORM_ADMINS } from '../data/dealer.js'

const PUBLIC_SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:5173/'

// Two-mode sign-in: "Dealership" (tenant-scoped account) or "Admin" (platform admin -> /admin).
// Mock only - real auth + tenant isolation is server-enforced (docs/TODO.md).
export default function Login() {
  const navigate = useNavigate()
  const dealerships = activeDealerships()
  const [mode, setMode] = useState('dealer')
  const [dealershipId, setDealershipId] = useState(dealerships[0]?.id || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const dealership = dealershipById(dealershipId)
  const demoAccounts = usersForDealership(dealershipId)

  function submit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) return setError('Enter your email and password.')
    if (!isValidEmail(email)) return setError('Enter a valid email address.')
    if (mode === 'admin') {
      const admin = findAdminUser(email)
      if (!admin) return setError('That email is not a platform-admin account.')
      signIn({ email: admin.email, name: admin.name }, true)
      return navigate('/admin')
    }
    const user = findUser(dealershipId, email)
    if (!user) return setError(`That account isn't registered to ${dealership?.name}. Pick the right dealership, or use a demo account below.`)
    signIn({ dealershipId: user.dealershipId, dealershipName: dealershipById(user.dealershipId)?.name, email: user.email, name: user.name, role: user.role })
    navigate('/')
  }

  const switchMode = (m) => { setMode(m); setError(''); setEmail(''); setPassword('') }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="auth-mesh relative hidden flex-col justify-between p-12 lg:flex">
        <Logo tone="light" />
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-white">{mode === 'admin' ? <>Platform<br />Admin</> : <>Dealer<br />Dashboard</>}</h1>
          <p className="mt-4 max-w-sm text-brand-100/80">
            {mode === 'admin'
              ? 'Onboard dealerships, manage service & parts catalogs, and approve change requests.'
              : 'Manage your inventory, end-to-end servicing, and branch sales - all in one place. Each dealership sees only its own data.'}
          </p>
          <ul className="mt-8 space-y-3 text-sm text-brand-100/90">
            {(mode === 'admin'
              ? ['Onboard new dealerships (logo + branding)', 'Edit service & parts catalogs', 'Approve record / sale changes']
              : ['Tenant-isolated per dealership', 'Role-based access (Admin, Sales, Finance, HR…)', 'Service records flow to vehicle history']).map((t) => (
              <li key={t} className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-300" /> {t}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-brand-100/50">Demo environment - all data is simulated.</p>
      </div>

      <div className="flex items-center justify-center bg-[var(--surface)] px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between">
            <div className="lg:hidden"><Logo /></div>
            <a href={PUBLIC_SITE_URL} className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
              <Globe className="h-4 w-4" /> Public site
            </a>
          </div>

          {/* mode toggle */}
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1">
            <button type="button" onClick={() => switchMode('dealer')} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === 'dealer' ? 'bg-[var(--surface)] text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}>
              <Building2 className="mr-1.5 inline h-4 w-4" /> Dealership
            </button>
            <button type="button" onClick={() => switchMode('admin')} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === 'admin' ? 'bg-[var(--surface)] text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}>
              <Shield className="mr-1.5 inline h-4 w-4" /> Admin
            </button>
          </div>

          <h2 className="mt-5 font-display text-2xl font-extrabold text-ink-900">{mode === 'admin' ? 'Platform admin sign in' : 'Sign in to your dealership'}</h2>
          <p className="mt-1 text-sm text-ink-500">{mode === 'admin' ? 'For the VINsight platform team.' : 'Select your dealership and enter your credentials.'}</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'dealer' && (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-600">Dealership</span>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <select value={dealershipId} onChange={(e) => { setDealershipId(e.target.value); setError('') }}
                    className="field-select h-11 w-full rounded-lg border border-ink-200 bg-[var(--surface)] pl-9 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200">
                    {dealerships.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-600">{mode === 'admin' ? 'Admin email' : 'Work email'}</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={mode === 'admin' ? 'admin@vinsight.app' : `name@${dealershipId}.example.com`}
                className="h-11 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-600">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="h-11 w-full rounded-lg border border-ink-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
              </div>
            </label>
            {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 font-semibold text-white transition hover:bg-brand-700">
              Sign in <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {mode === 'dealer' ? (
            <div className="mt-5 rounded-xl border border-ink-100 bg-ink-50/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Demo accounts · {dealership?.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {demoAccounts.map((u) => (
                  <button key={u.email} type="button" onClick={() => { setEmail(u.email); setPassword('demo1234'); setError('') }}
                    className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-ink-600 ring-1 ring-inset ring-ink-200 hover:ring-brand-300">
                    {u.role}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ink-400">Any password works in the demo.</p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-ink-100 bg-ink-50/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Demo admin</p>
              <button type="button" onClick={() => { setEmail(PLATFORM_ADMINS[0].email); setPassword('demo1234'); setError('') }}
                className="mt-2 rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-ink-600 ring-1 ring-inset ring-ink-200 hover:ring-brand-300">
                {PLATFORM_ADMINS[0].email}
              </button>
              <p className="mt-2 text-[11px] text-ink-400">Any password works in the demo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
