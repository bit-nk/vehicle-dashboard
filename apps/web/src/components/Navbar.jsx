import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X, FileSearch, ChevronRight } from 'lucide-react'
import { Logo } from '@shared/ui'

const links = [
  { to: '/listings', label: 'Used Cars' },
  { to: '/report', label: 'Vehicle History' },
  { to: '/sell', label: 'Sell My Car' },
  { to: '/listings?deal=great', label: 'Great Deals' },
]

// The dealer dashboard is a separate app. In dev it runs on :5174; in production
// (GitHub Pages) it's served at a sub-path, supplied via VITE_DASHBOARD_URL at build.
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5174/'

function navClass({ isActive }) {
  return `text-sm font-semibold transition-colors ${
    isActive ? 'text-brand-700' : 'text-ink-600 hover:text-ink-900'
  }`
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" aria-label="VINsight home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {links.map((l) => (
              <NavLink key={l.label} to={l.to} className={navClass} end={false}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <a href={DASHBOARD_URL} className="text-sm font-semibold text-ink-600 hover:text-ink-900">
            Dealer sign in
          </a>
          <Link
            to="/report"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <FileSearch className="h-4 w-4" />
            Get a Report
          </Link>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-lg p-2 text-ink-700 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-ink-100 bg-white px-4 py-3 md:hidden">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-3 text-base font-semibold text-ink-800 hover:bg-ink-50"
            >
              {l.label}
              <ChevronRight className="h-4 w-4 text-ink-400" />
            </Link>
          ))}
          <Link
            to="/report"
            onClick={() => setOpen(false)}
            className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white"
          >
            <FileSearch className="h-4 w-4" />
            Get a Report
          </Link>
        </nav>
      )}
    </header>
  )
}
