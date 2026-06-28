import { useState } from 'react'
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Search, LogOut, ChevronDown, Building2, ShieldAlert, Globe } from 'lucide-react'
import { getSession, signOut } from '../lib/auth.js'
import { branchesForDealership, can, landingFor, accentVars } from '../data/dealer.js'
import Sidebar from './Sidebar.jsx'
import NotificationBell from './NotificationBell.jsx'

const PUBLIC_SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:5173/'

// Search placeholder reflects the section you're in (parts search ≠ vehicle search).
const SEARCH_PLACEHOLDER = {
  inventory: 'Search make, VIN, stock no…',
  service: 'Search vehicle, customer, job no…',
  parts: 'Search parts, SKU, OEM…',
  sales: 'Search vehicle, buyer, invoice…',
  billing: 'Search customer, invoice no…',
  'add-item': 'Search items…',
  settings: 'Search settings…',
}

function NoAccess({ role }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-500"><ShieldAlert className="h-7 w-7" /></span>
      <h2 className="mt-4 font-display text-xl font-bold text-ink-900">No access to this section</h2>
      <p className="mt-1 text-sm text-ink-500">Your role (<span className="font-semibold">{role}</span>) doesn't have permission to view this page. Contact your dealership admin.</p>
    </div>
  )
}

export default function DashboardLayout() {
  const session = getSession()
  const navigate = useNavigate()
  const loc = useLocation()
  const [menu, setMenu] = useState(false)
  const [branch, setBranch] = useState('all')

  const role = session?.role || 'Admin'
  const myBranches = branchesForDealership(session?.dealershipId)
  const branchOptions = [{ id: 'all', name: 'All Branches' }, ...myBranches]
  const allowed = can(role, loc.pathname)
  const searchPlaceholder = SEARCH_PLACEHOLDER[loc.pathname.split('/')[1]] || 'Search the dashboard…'

  // Roles without Overview (Parts, Service) land on their own section instead of a denied '/'.
  if (loc.pathname === '/' && !allowed) return <Navigate to={landingFor(role)} replace />

  return (
    <div id="dealer-shell" className="flex min-h-screen" style={accentVars(session?.dealershipId)}>
      <Sidebar role={role} session={session} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-100 bg-[var(--surface)] px-4 backdrop-blur sm:px-6">
          {/* Compact branch filter (replaces the old full-width pill bar) */}
          <label className="relative flex shrink-0 items-center" title="Filter by branch">
            <Building2 className="pointer-events-none absolute left-2.5 h-4 w-4 text-brand-600" />
            <select value={branch} onChange={(e) => setBranch(e.target.value)}
              className="field-select h-9 rounded-lg border border-ink-200 bg-[var(--surface)] pl-8 pr-7 text-sm font-semibold text-ink-700 outline-none focus:border-brand-500">
              {branchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>

          <div className="relative hidden max-w-xs flex-1 lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input placeholder={searchPlaceholder} className="h-9 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:bg-[var(--surface)] focus:ring-2 focus:ring-brand-200" />
          </div>

          <div className="ml-auto"><NotificationBell role={role} /></div>

          <a href={PUBLIC_SITE_URL} className="btn border border-ink-200 text-ink-600 hover:bg-ink-50" title="Open the public VINsight site">
            <Globe className="h-4 w-4" /> <span className="hidden sm:inline">Public site</span>
          </a>

          <div className="relative">
            <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-ink-50">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{(session?.name || 'D').slice(0, 1).toUpperCase()}</span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-semibold leading-tight text-ink-900">{session?.role}</span>
                <span className="block text-[11px] leading-tight text-ink-400">{session?.dealershipName}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-ink-400" />
            </button>
            {menu && (
              <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-ink-100 bg-[var(--surface)] py-1 shadow-lg" onMouseLeave={() => setMenu(false)}>
                <div className="border-b border-ink-100 px-4 py-3">
                  <p className="text-sm font-semibold text-ink-900">{session?.dealershipName}</p>
                  <p className="truncate text-xs text-ink-400">{session?.email}</p>
                  <p className="mt-1 inline-block rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-600">{session?.role}</p>
                </div>
                <button onClick={() => { signOut(); navigate('/signin') }} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">
          {allowed ? <Outlet context={{ branch, setBranch, dealershipId: session?.dealershipId, role }} /> : <NoAccess role={role} />}
        </main>
      </div>
    </div>
  )
}
