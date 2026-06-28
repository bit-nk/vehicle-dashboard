import { Link } from 'react-router-dom'
import { Building2, ListTree, PlusSquare, ArrowRight } from 'lucide-react'
import { useAdmin } from '../../store/AdminStore.jsx'

export default function AdminHome() {
  const admin = useAdmin()
  const dealerships = Object.values(admin.onboarding)
  const active = dealerships.filter((d) => (d.status || 'active') === 'active').length

  const cards = [
    { to: '/admin/dealerships', icon: Building2, label: 'Dealerships', value: `${dealerships.length}`, sub: `${active} active`, tone: 'bg-sky-50 text-sky-600' },
    { to: '/admin/catalog', icon: ListTree, label: 'Catalogs & packages', value: 'Service · Parts', sub: 'edit per dealership', tone: 'bg-brand-50 text-brand-600' },
    { to: '/admin/add-item', icon: PlusSquare, label: 'Add new item', value: 'Parts · Services · Users', sub: 'for any dealership', tone: 'bg-violet-50 text-violet-600' },
  ]
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Platform admin</h1>
        <p className="text-sm text-ink-500">Onboard dealerships, manage catalogs &amp; packages, and add items for any dealership. Change-request approvals are now handled by each dealership's own Admin.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-ink-500">{c.label}</p>
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${c.tone}`}><c.icon className="h-4.5 w-4.5" /></span>
            </div>
            <p className="mt-2 font-display text-xl font-extrabold text-ink-900">{c.value}</p>
            <p className="mt-1 flex items-center justify-between text-xs text-ink-400">{c.sub}<ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" /></p>
          </Link>
        ))}
      </div>
    </div>
  )
}
