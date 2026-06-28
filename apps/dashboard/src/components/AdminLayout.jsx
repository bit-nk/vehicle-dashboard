import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { LayoutDashboard, Building2, ListTree, PlusSquare, LogOut, Shield } from 'lucide-react'
import { getAdminSession, signOut } from '../lib/auth.js'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/dealerships', label: 'Dealerships', icon: Building2 },
  { to: '/admin/catalog', label: 'Catalog', icon: ListTree },
  { to: '/admin/add-item', label: 'Add Item', icon: PlusSquare },
]

// Minimal, neutral (non-dealership-branded) platform admin shell.
export default function AdminLayout() {
  const admin = getAdminSession()
  const navigate = useNavigate()
  const linkCls = ({ isActive }) => `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-500 hover:bg-ink-50'}`
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-[var(--surface)]">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-6">
          <Link to="/admin" className="flex items-center gap-2 font-display text-lg font-extrabold text-ink-900" aria-label="Admin home">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 text-white"><Shield className="h-4 w-4" /></span> VINsight Admin
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}><n.icon className="h-4 w-4" /> {n.label}</NavLink>)}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-ink-500 sm:block">{admin?.email}</span>
            <button onClick={() => { signOut(true); navigate('/signin') }} className="btn border border-ink-200 text-rose-600 hover:bg-rose-50"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-ink-100 px-4 py-2 md:hidden">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-500'}`}><n.icon className="h-4 w-4" /> {n.label}</NavLink>)}
        </nav>
      </header>
      <main className="mx-auto max-w-[1200px] px-6 py-6"><Outlet /></main>
    </div>
  )
}
