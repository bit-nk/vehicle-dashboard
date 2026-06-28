import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Car, Wrench, Boxes, TrendingUp, ReceiptText, PlusSquare, ClipboardCheck, Settings, PanelLeft, PanelLeftClose } from 'lucide-react'
import { can } from '../data/dealer.js'
import DealerBrand from './DealerBrand.jsx'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/inventory', label: 'Inventory', icon: Car },
  { to: '/service', label: 'Service', icon: Wrench },
  { to: '/parts', label: 'Parts', icon: Boxes },
  { to: '/sales', label: 'Sales', icon: TrendingUp },
  { to: '/billing', label: 'Billing', icon: ReceiptText },
  { to: '/add-item', label: 'Add New Item', icon: PlusSquare }, // Admin-only via can()
  { to: '/approvals', label: 'Approvals', icon: ClipboardCheck }, // Admin-only via can()
  { to: '/settings', label: 'Settings', icon: Settings },
]

// Collapsible left navigation. Collapse state persists in localStorage.
export default function Sidebar({ role, session }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('vinsight:nav:collapsed') === '1')
  const nav = NAV.filter((n) => can(role, n.to))
  const toggle = () => { const v = !collapsed; setCollapsed(v); localStorage.setItem('vinsight:nav:collapsed', v ? '1' : '0') }
  return (
    <aside className={`sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-ink-100 bg-[var(--surface)] transition-[width] duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
      <div className="flex h-16 items-center px-3">
        <DealerBrand session={session} compact={collapsed} />
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} title={collapsed ? n.label : undefined}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'} ${collapsed ? 'justify-center' : ''}`}>
            <n.icon className="h-5 w-5 shrink-0" /> {!collapsed && <span className="truncate">{n.label}</span>}
          </NavLink>
        ))}
      </nav>
      <button onClick={toggle} className="m-2 grid h-9 place-items-center rounded-lg text-ink-400 hover:bg-ink-50" title={collapsed ? 'Expand' : 'Collapse'}>
        {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </aside>
  )
}
