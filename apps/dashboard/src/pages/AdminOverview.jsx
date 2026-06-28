import { useMemo, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Car, Wrench, Boxes, PackageCheck, Banknote, Users, TrendingUp, ClipboardCheck, GraduationCap, ArrowRight } from 'lucide-react'
import { formatCurrency, formatNumber, formatNprShort, iso, parseLocal, addDays, hash, rng } from '@shared/lib'
import { Badge } from '@shared/ui'
import MetricCard from '../components/MetricCard.jsx'
import Drawer from '../components/Drawer.jsx'
import DetailTable from '../components/DetailTable.jsx'
import TimelineFilter, { defaultRange } from '../components/TimelineFilter.jsx'
import { useDealer } from '../store/DealerStore.jsx'
import { branchById, salesInRange, monthBuckets, TODAY, fmtDate, usersForDealership } from '../data/dealer.js'

const TODAY_ISO = iso(TODAY)
const DONUT = ['var(--color-brand-600)', '#10b981', '#64748b'] // Cash, Bank Loan, Lease

// "Dealership Performance Dashboard" - the Admin overview (reference image 1).
export default function AdminOverview() {
  const { branch, dealershipId } = useOutletContext()
  const navigate = useNavigate()
  const { salesAll, serviceJobs, partsInventory, partsOrders, followups, changeRequests } = useDealer()
  const [range, setRange] = useState(defaultRange)
  const [detail, setDetail] = useState(null)
  const branchId = branch === 'all' ? undefined : branch
  const open = (title, columns, rows) => () => setDetail({ title, columns, rows })

  const rangeSales = useMemo(() => salesInRange(salesAll, range.from, range.to, branchId), [salesAll, range, branchId])
  const jobs = useMemo(() => serviceJobs.filter((j) => !branchId || j.branchId === branchId), [serviceJobs, branchId])
  const orders = partsOrders.filter((o) => !branchId || o.branchId === branchId)
  const stock = partsInventory.filter((p) => !branchId || p.branchId === branchId)

  const carRevenue = rangeSales.reduce((a, s) => a + (s.priceNpr || 0), 0)
  const completed = jobs.filter((j) => j.status === 'completed')
  const serviceRevenue = completed.reduce((a, j) => a + (j.totalNpr || 0), 0)
  const partsItems = orders.reduce((a, o) => a + o.lines.reduce((x, l) => x + l.qty, 0), 0)
  const partsRevenue = orders.filter((o) => o.status === 'paid').reduce((a, o) => a + o.totalNpr, 0)
  const stockUnits = stock.reduce((a, p) => a + p.qtyOnHand, 0)
  const availability = stock.length ? Math.round((stock.filter((p) => p.qtyOnHand > p.reorderLevel).length / stock.length) * 1000) / 10 : 0
  const loanSales = rangeSales.filter((s) => s.financeType === 'loan')
  const totalLoans = loanSales.reduce((a, s) => a + (s.loanAmountNpr || s.priceNpr || 0), 0)
  const staff = usersForDealership(dealershipId)
  const pendingApprovals = (changeRequests || []).filter((c) => c.status === 'pending')
  const roleCount = new Set(staff.map((u) => u.role)).size

  // Real period-over-period trend for Car Sales: this window vs the immediately preceding equal-length window.
  const prior = useMemo(() => {
    const from = parseLocal(range.from), to = parseLocal(range.to)
    const days = Math.round((to - from) / 86400000) + 1
    return { from: iso(addDays(from, -days)), to: iso(addDays(from, -1)) }
  }, [range])
  const priorSalesCount = useMemo(() => salesInRange(salesAll, prior.from, prior.to, branchId).length, [salesAll, prior, branchId])
  const carTrend = priorSalesCount > 0 ? Math.round(((rangeSales.length - priorSalesCount) / priorSalesCount) * 100) : null

  // HR snapshot derived deterministically from the staff roster (varies per dealership).
  const hr = useMemo(() => {
    const r = rng(hash('hr' + dealershipId))
    const high = 55 + Math.floor(r() * 20), low = 5 + Math.floor(r() * 10)
    return {
      dist: [{ label: 'High', value: high, color: 'var(--color-brand-600)' }, { label: 'Medium', value: 100 - high - low, color: '#f59e0b' }, { label: 'Low', value: low, color: '#94a3b8' }],
      openRoles: Math.floor(r() * 4),
      satisfaction: high + Math.round((100 - high) * 0.4),
    }
  }, [dealershipId])

  // revenue trend (sales vs service) per month in range
  const revenueTrend = useMemo(() => {
    const buckets = monthBuckets(range.from, range.to)
    const sales = {}, svc = {}
    for (const s of rangeSales) { const k = s.soldOn.slice(0, 7); sales[k] = (sales[k] || 0) + (s.priceNpr || 0) }
    for (const j of completed) { const d = j.completedOn || j.slotDate; const k = (d || '').slice(0, 7); svc[k] = (svc[k] || 0) + (j.totalNpr || 0) }
    return buckets.map((b) => ({ label: b.label, Sales: Math.round((sales[b.key] || 0) / 1000), Service: Math.round((svc[b.key] || 0) / 1000) }))
  }, [rangeSales, completed, range])

  // top selling models
  const topModels = useMemo(() => {
    const m = {}
    for (const s of rangeSales) { const k = `${s.make || ''} ${s.model || ''}`.trim() || 'Unknown'; m[k] = (m[k] || 0) + 1 }
    return Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6)
  }, [rangeSales])

  // financing donut
  const financing = useMemo(() => {
    const c = { Cash: 0, 'Bank Loan': 0, Lease: 0 }
    for (const s of rangeSales) { const t = s.financeType === 'loan' ? 'Bank Loan' : s.financeType === 'lease' ? 'Lease' : 'Cash'; c[t]++ }
    return Object.entries(c).map(([name, value]) => ({ name, value }))
  }, [rangeSales])

  // upcoming servicing appointments
  const upcoming = jobs.filter((j) => j.status === 'confirmed' || j.status === 'requested')
    .sort((a, b) => (a.slotDate === b.slotDate ? a.slotTime.localeCompare(b.slotTime) : a.slotDate.localeCompare(b.slotDate))).slice(0, 6)

  const saleCols = [
    { label: 'Date', render: (s) => fmtDate(s.soldOn) },
    { label: 'Vehicle', render: (s) => `${s.year} ${s.make} ${s.model}` },
    { label: 'Buyer', render: (s) => s.buyerName || '-' },
    { label: 'Price', render: (s) => formatCurrency(s.priceNpr), align: 'right' },
  ]
  const jobCols = [
    { label: 'Vehicle', render: (j) => j.vehicle }, { label: 'Customer', render: (j) => j.customer },
    { label: 'Total', render: (j) => formatCurrency(j.totalNpr), align: 'right' },
  ]
  const orderCols = [
    { label: 'Order', render: (o) => o.id }, { label: 'Customer', render: (o) => o.customer },
    { label: 'Status', render: (o) => <Badge tone={o.status === 'paid' ? 'green' : 'amber'}>{o.status}</Badge> },
    { label: 'Total', render: (o) => formatCurrency(o.totalNpr), align: 'right' },
  ]

  const KPIS = [
    { key: 'car', label: 'Car Sales', value: formatNumber(rangeSales.length), sub: `Units sold · ${formatCurrency(carRevenue)}`, ...(carTrend != null ? { trend: carTrend } : {}), icon: Car, tone: 'brand', spark: revenueTrend.map((d) => d.Sales), onClick: open('Vehicle sales', saleCols, rangeSales) },
    { key: 'svc', label: 'Servicing', value: formatNumber(completed.length), sub: `Serviced · ${formatCurrency(serviceRevenue)}`, icon: Wrench, tone: 'green', spark: revenueTrend.map((d) => d.Service), onClick: open('Completed services', jobCols, completed) },
    { key: 'parts', label: 'Parts Sold', value: formatNumber(partsItems), sub: `Items · ${formatCurrency(partsRevenue)}`, icon: Boxes, tone: 'blue', onClick: open('Parts orders', orderCols, orders) },
    { key: 'avail', label: 'Available Parts', value: formatNumber(stockUnits), sub: `${availability}% availability`, icon: PackageCheck, tone: 'amber', onClick: () => navigate('/parts') },
    { key: 'fin', label: 'Finance', value: formatCurrency(totalLoans), sub: `${loanSales.length} loan-financed`, icon: Banknote, tone: 'brand', onClick: open('Loan-financed sales', saleCols, loanSales) },
    { key: 'hr', label: 'HR', value: formatNumber(staff.length), sub: `${roleCount} role${roleCount !== 1 ? 's' : ''} · ${hr.satisfaction}% satisfaction`, icon: Users, tone: 'ink', onClick: open('Staff accounts', [{ label: 'Name', render: (u) => u.name }, { label: 'Role', render: (u) => u.role }, { label: 'Email', render: (u) => u.email }], staff) },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Dealership Performance Dashboard</h1>
          <p className="text-sm text-ink-500">{branch === 'all' ? 'All branches' : branchById(branch)?.name} · as of {fmtDate(TODAY_ISO)}</p>
        </div>
        <TimelineFilter value={range} onChange={setRange} />
      </div>

      {/* 6 department KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {KPIS.map(({ key, ...m }) => <MetricCard key={key} {...m} />)}
      </div>

      {pendingApprovals.length > 0 && (
        <button onClick={() => navigate('/approvals')}
          className="card flex w-full items-center gap-3 border-l-4 border-l-amber-400 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><ClipboardCheck className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-bold text-ink-900">Requires Approval</p>
            <p className="text-sm text-ink-500">{pendingApprovals.length} change request{pendingApprovals.length !== 1 ? 's' : ''} waiting - service edits, paid-order edits &amp; new-part requests.</p>
          </div>
          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{pendingApprovals.length} pending</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-ink-400" />
        </button>
      )}

      {/* revenue trend + top models */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-600" />
            <h2 className="font-display text-base font-bold text-ink-900">Monthly Sales &amp; Service Revenue Trend</h2>
            <div className="ml-auto flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-brand-600)' }} /> Sales</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Service</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 8, right: 8, left: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gSvc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.4} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={60} tickFormatter={(v) => formatNprShort(v * 1000)} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #334155', background: '#0f1729', fontSize: 13, color: '#e2e8f0' }} formatter={(v) => `Rs. ${formatNprShort(v * 1000)}`} />
                <Area type="monotone" dataKey="Sales" stroke="var(--color-brand-500)" strokeWidth={2.5} fill="url(#gSales)" isAnimationActive={false} />
                <Area type="monotone" dataKey="Service" stroke="#10b981" strokeWidth={2.5} fill="url(#gSvc)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-display text-base font-bold text-ink-900">Top Selling Car Models</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topModels} margin={{ top: 12, right: 8, left: 6, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} angle={-15} textAnchor="end" height={40} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={32} />
                <Tooltip cursor={{ fill: 'rgba(100,116,139,0.12)' }} contentStyle={{ borderRadius: 12, border: '1px solid #334155', background: '#0f1729', fontSize: 13, color: '#e2e8f0' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--color-brand-600)" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* financing donut + upcoming appointments + HR */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="card p-5">
          <h2 className="mb-2 font-display text-base font-bold text-ink-900">Sales by Financing Type</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={financing} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2} isAnimationActive={false}>
                  {financing.map((e, i) => <Cell key={e.name} fill={DONUT[i % DONUT.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #334155', background: '#0f1729', fontSize: 13, color: '#e2e8f0' }} itemStyle={{ color: '#e2e8f0' }} labelStyle={{ color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap justify-center gap-3 text-xs text-ink-500">
            {financing.map((e, i) => <span key={e.name} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: DONUT[i % DONUT.length] }} /> {e.name}</span>)}
          </div>
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <div className="border-b border-ink-100 px-5 py-4"><h2 className="font-display text-base font-bold text-ink-900">Upcoming Servicing Appointments</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wide text-ink-400">
                <th className="px-5 py-2 font-semibold">Customer</th><th className="py-2 pr-3 font-semibold">Vehicle</th>
                <th className="py-2 pr-3 font-semibold">Date</th><th className="py-2 pr-3 font-semibold">Service</th><th className="py-2 pr-5 font-semibold">Branch</th>
              </tr></thead>
              <tbody>
                {upcoming.map((j) => (
                  <tr key={j.id} onClick={() => navigate(`/service/${j.id}`)} className="cursor-pointer border-t border-ink-100 hover:bg-ink-50/60">
                    <td className="px-5 py-2.5 font-medium text-ink-800">{j.customer}</td>
                    <td className="py-2.5 pr-3 text-ink-600">{j.vehicle}</td>
                    <td className="py-2.5 pr-3 text-ink-600">{fmtDate(j.slotDate)} · {j.slotTime}</td>
                    <td className="py-2.5 pr-3 text-ink-600">{j.requestedServices?.[0] || '-'}</td>
                    <td className="py-2.5 pr-5 text-ink-600">{branchById(j.branchId)?.name}</td>
                  </tr>
                ))}
                {upcoming.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-ink-400">No upcoming appointments.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-display text-base font-bold text-ink-900">HR Overview</h2>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Employee performance</p>
          <div className="mt-2 flex h-2.5 overflow-hidden rounded-full">
            {hr.dist.map((h) => <span key={h.label} style={{ width: `${h.value}%`, background: h.color }} />)}
          </div>
          <div className="mt-2 space-y-1 text-sm">
            {hr.dist.map((h) => <div key={h.label} className="flex items-center justify-between"><span className="inline-flex items-center gap-1.5 text-ink-600"><span className="h-2 w-2 rounded-full" style={{ background: h.color }} /> {h.label}</span><span className="font-semibold text-ink-800">{h.value}%</span></div>)}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-sm">
            <span className="text-ink-500">Open roles</span><span className="font-semibold text-ink-800">{hr.openRoles}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-brand-600"><GraduationCap className="h-4 w-4" /> Upcoming training scheduled</div>
        </div>
      </div>

      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail?.title} subtitle={detail ? `${detail.rows.length} record${detail.rows.length !== 1 ? 's' : ''}` : ''}>
        {detail && <div className="py-2"><DetailTable columns={detail.columns} rows={detail.rows} /></div>}
      </Drawer>
    </div>
  )
}
