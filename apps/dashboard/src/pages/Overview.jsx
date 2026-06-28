import { useMemo, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  Car, BadgeDollarSign, Wrench, BellRing, CheckCircle2, Clock, TrendingUp, CalendarClock,
  Warehouse, Users, Building2, Wallet, Boxes, AlertTriangle, ReceiptText, History,
} from 'lucide-react'
import { formatCurrency, formatNumber, sanitizeText, iso } from '@shared/lib'
import { Badge } from '@shared/ui'
import MetricCard from '../components/MetricCard.jsx'
import AdminOverview from './AdminOverview.jsx'
import Drawer from '../components/Drawer.jsx'
import DetailTable from '../components/DetailTable.jsx'
import TimelineFilter, { defaultRange } from '../components/TimelineFilter.jsx'
import { useDealer } from '../store/DealerStore.jsx'
import {
  branchesForDealership, branchById, salesInRange, monthBuckets, TODAY, fmtDate,
  REPS, usersForDealership, FOLLOWUP_DISPOSITIONS,
} from '../data/dealer.js'

const TODAY_ISO = iso(TODAY)

// which metric domains each role sees on its landing page
const ROLE_DOMAINS = {
  Admin: ['kpi', 'service', 'sales', 'finance', 'parts', 'billing'],
  Sales: ['sales', 'partsSales', 'inventory'],   // sales also sees parts-sales + inventory
  Marketing: ['sales'],
  Cashier: ['sales', 'billing'],
  Finance: ['finance', 'sales', 'billing'],
  Account: ['finance', 'sales', 'billing'],
  Service: ['service'],
  Parts: ['parts'],
  'Customer Care': ['service'],
  Logistic: ['inventory'],
  HR: ['hr'],
}
const PERIOD_OPTS = [{ key: '1m', label: 'This month', m: 1 }, { key: '3m', label: '3 months', m: 3 }, { key: '6m', label: '6 months', m: 6 }, { key: '12m', label: '12 months', m: 12 }]

const statusTone = (s) => ({ requested: 'amber', confirmed: 'blue', in_progress: 'brand', completed: 'green' }[s] || 'gray')
const statusLabel = (s) => ({ requested: 'Requested', confirmed: 'Confirmed', in_progress: 'In service', completed: 'Serviced' }[s] || s)
const dispoTone = (d) => (d === 'Serviced here' ? 'green' : d === 'Customer declined' || d === 'Unreachable' ? 'rose' : 'blue')

export default function Overview() {
  const { branch, dealershipId, role } = useOutletContext()
  const { sales, inventory, serviceJobs, followups, partsInventory, partsOrders, recordFollowupDisposition } = useDealer()
  const [range, setRange] = useState(defaultRange)
  const [periods, setPeriods] = useState({}) // per-card period overrides
  const [detail, setDetail] = useState(null)
  const navigate = useNavigate()
  const branchId = branch === 'all' ? undefined : branch

  const inv = useMemo(() => inventory.filter((v) => !branchId || v.branchId === branchId), [inventory, branchId])
  const jobs = useMemo(() => serviceJobs.filter((j) => !branchId || j.branchId === branchId), [serviceJobs, branchId])
  const rangeSales = useMemo(() => salesInRange(sales, range.from, range.to, branchId), [sales, range, branchId])
  const pendingFollowups = followups.filter((f) => f.status === 'pending' && (!branchId || f.branchId === branchId))
  const doneFollowups = followups.filter((f) => f.status === 'done' && (!branchId || f.branchId === branchId))

  const domains = ROLE_DOMAINS[role] || ['kpi']
  const showSalesChart = domains.some((d) => ['sales', 'finance', 'kpi'].includes(d))

  // ---- per-card period helpers (each time-based card can be filtered on its own) ----
  const periodOf = (k) => periods[k] || '1m'
  const rangeFor = (k) => {
    const m = (PERIOD_OPTS.find((o) => o.key === periodOf(k)) || PERIOD_OPTS[0]).m
    return { from: iso(new Date(TODAY.getFullYear(), TODAY.getMonth() - (m - 1), 1)), to: TODAY_ISO }
  }
  const makePeriod = (k) => ({ value: periodOf(k), options: PERIOD_OPTS.map((o) => ({ key: o.key, label: o.label })), onChange: (v) => setPeriods((p) => ({ ...p, [k]: v })) })

  const unitsSales = useMemo(() => { const r = rangeFor('units'); return salesInRange(sales, r.from, r.to, branchId) }, [sales, branchId, periods])
  const revSales = useMemo(() => { const r = rangeFor('rev'); return salesInRange(sales, r.from, r.to, branchId) }, [sales, branchId, periods])
  const revenuePeriod = revSales.reduce((a, s) => a + s.priceNpr, 0)

  // ---- detail column sets ----
  const jobCols = [
    { label: 'Vehicle', render: (j) => j.vehicle },
    { label: 'Customer', render: (j) => j.customer },
    { label: 'Schedule', render: (j) => `${fmtDate(j.slotDate)} · ${j.slotTime}` },
    { label: 'Status', render: (j) => <Badge tone={statusTone(j.status)}>{statusLabel(j.status)}</Badge> },
  ]
  const saleCols = [
    { label: 'Date', render: (s) => fmtDate(s.soldOn) },
    { label: 'Vehicle', render: (s) => `${s.year} ${s.make} ${s.model}` },
    { label: 'Branch', render: (s) => branchById(s.branchId)?.name },
    { label: 'Price', render: (s) => formatCurrency(s.priceNpr), align: 'right' },
  ]
  const invCols = [
    { label: 'Vehicle', render: (v) => `${v.year} ${v.make} ${v.model}` },
    { label: 'Stock', render: (v) => v.stockNo },
    { label: 'Branch', render: (v) => branchById(v.branchId)?.name },
    { label: 'Price', render: (v) => formatCurrency(v.price), align: 'right' },
  ]
  const fupCols = [
    { label: 'Customer', render: (f) => f.customer },
    { label: 'Vehicle', render: (f) => f.vehicle },
    { label: 'Reason', render: (f) => f.reason },
    { label: 'Due', render: (f) => fmtDate(f.dueOn) },
  ]
  const dispoCols = [
    { label: 'Customer', render: (f) => f.customer },
    { label: 'Vehicle', render: (f) => f.vehicle },
    { label: 'Disposition', render: (f) => <Badge tone={dispoTone(f.disposition)}>{f.disposition || '-'}</Badge> },
    { label: 'Date', render: (f) => (f.dispositionOn ? fmtDate(f.dispositionOn) : '-') },
    { label: 'Note', render: (f) => f.note || '-' },
  ]

  const open = (title, columns, rows) => () => setDetail({ title, columns, rows })

  const salesSpark = useMemo(() => {
    const buckets = monthBuckets(iso(new Date(TODAY.getFullYear(), TODAY.getMonth() - 5, 1)), TODAY_ISO)
    return buckets.map((b) => salesInRange(sales, `${b.key}-01`, `${b.key}-31`, branchId).length)
  }, [sales, branchId])

  const scheduledToday = jobs.filter((j) => j.slotDate === TODAY_ISO && ['confirmed', 'in_progress'].includes(j.status))
  const inService = jobs.filter((j) => j.status === 'in_progress')
  const awaiting = jobs.filter((j) => j.status === 'confirmed' || j.status === 'requested')
  const completedJobs = jobs.filter((j) => j.status === 'completed')

  const soldInv = inv.filter((v) => v.status === 'sold')
  const inventoryValue = inv.filter((v) => v.status === 'in_stock').reduce((a, v) => a + (v.landedCostNpr || 0), 0)
  const grossMargin = soldInv.reduce((a, v) => a + ((v.price || 0) - (v.landedCostNpr || 0)), 0)

  const branchPerf = branchesForDealership(dealershipId).filter((b) => !branchId || b.id === branchId).map((b) => {
    const units = salesInRange(sales, range.from, range.to, b.id).length
    const target = b.monthlyTarget * Math.max(1, monthBuckets(range.from, range.to).length)
    return { ...b, units, target, fulfilled: units >= target }
  })
  const onTarget = branchPerf.filter((b) => b.fulfilled).length

  const reps = REPS.filter((r) => branchesForDealership(dealershipId).some((b) => b.id === r.branchId))
  const staff = usersForDealership(dealershipId)

  // parts / billing aggregates
  const partsScoped = partsInventory.filter((p) => !branchId || p.branchId === branchId)
  const partsUnits = partsScoped.reduce((a, p) => a + p.qtyOnHand, 0)
  const lowStock = partsScoped.filter((p) => p.qtyOnHand <= p.reorderLevel)
  const ordersScoped = partsOrders.filter((o) => !branchId || o.branchId === branchId)
  const openParts = ordersScoped.filter((o) => o.status !== 'paid' && o.status !== 'cancelled')
  const partsBilled = ordersScoped.filter((o) => o.status === 'paid').reduce((a, o) => a + o.totalNpr, 0)
  const serviceBilled = completedJobs.reduce((a, j) => a + (j.totalNpr || 0), 0)

  const METRICS = {
    // "Awaiting arrival" + "Vehicles serviced" now live on the Service page; follow-ups
    // belong to Sales. The Service role has no Overview (their Service section covers it).
    service: [
      { key: 'sched', label: 'Scheduled today', value: scheduledToday.length, icon: CalendarClock, tone: 'brand', live: true, sub: 'arriving today', onClick: open('Scheduled today', jobCols, scheduledToday) },
      { key: 'insvc', label: 'In service now', value: inService.length, icon: Wrench, tone: 'amber', sub: 'on the ramp', onClick: open('Cars in service', jobCols, inService) },
    ],
    sales: [
      { key: 'units', label: 'Units sold', value: formatNumber(unitsSales.length), icon: BadgeDollarSign, tone: 'green', spark: salesSpark, period: makePeriod('units'), onClick: open('Units sold', saleCols, unitsSales) },
      { key: 'rev', label: 'Revenue', value: formatCurrency(revenuePeriod), icon: TrendingUp, tone: 'brand', period: makePeriod('rev'), onClick: open('Sales (revenue)', saleCols, revSales) },
      { key: 'tgt', label: 'Branches on target', value: `${onTarget}/${branchPerf.length}`, icon: Building2, tone: 'amber', sub: 'this window', onClick: () => navigate('/sales') },
      { key: 'sfup', label: 'Follow-ups due', value: pendingFollowups.length, icon: BellRing, tone: 'rose', onClick: open('Service follow-ups', fupCols, pendingFollowups) },
    ],
    finance: [
      { key: 'rev2', label: 'Revenue', value: formatCurrency(revenuePeriod), icon: Wallet, tone: 'green', spark: salesSpark, period: makePeriod('rev'), onClick: open('Sales (revenue)', saleCols, revSales) },
      { key: 'invval', label: 'Inventory value', value: formatCurrency(inventoryValue), icon: Warehouse, tone: 'brand', sub: 'landed cost, in stock', onClick: open('In-stock inventory', invCols, inv.filter((v) => v.status === 'in_stock')) },
      { key: 'margin', label: 'Gross margin (sold)', value: formatCurrency(grossMargin), icon: TrendingUp, tone: 'amber', sub: `${soldInv.length} sold units`, onClick: open('Sold units', invCols, soldInv) },
    ],
    inventory: [
      { key: 'stock', label: 'Vehicles in stock', value: inv.filter((v) => v.status === 'in_stock').length, icon: Car, tone: 'brand', onClick: open('In stock', invCols, inv.filter((v) => v.status === 'in_stock')) },
      { key: 'isvc', label: 'In service', value: inv.filter((v) => v.status === 'in_service').length, icon: Wrench, tone: 'amber', onClick: open('In service', invCols, inv.filter((v) => v.status === 'in_service')) },
      { key: 'resv', label: 'Reserved', value: inv.filter((v) => v.status === 'reserved').length, icon: Boxes, tone: 'blue', onClick: open('Reserved', invCols, inv.filter((v) => v.status === 'reserved')) },
      { key: 'total', label: 'Total inventory', value: inv.length, icon: Warehouse, tone: 'ink', onClick: open('All inventory', invCols, inv) },
    ],
    partsSales: [
      { key: 'ps-sold', label: 'Parts sales (paid)', value: formatCurrency(partsBilled), icon: BadgeDollarSign, tone: 'green', sub: 'parts revenue', onClick: () => navigate('/parts') },
      { key: 'ps-open', label: 'Open parts orders', value: formatNumber(openParts.length), icon: Boxes, tone: 'amber', sub: 'awaiting fulfilment', onClick: () => navigate('/parts') },
    ],
    parts: [
      { key: 'p-stock', label: 'Parts SKUs in stock', value: formatNumber(partsScoped.length), icon: Boxes, tone: 'brand', sub: `${formatNumber(partsUnits)} units`, onClick: () => navigate('/parts') },
      { key: 'p-low', label: 'Low stock parts', value: formatNumber(lowStock.length), icon: AlertTriangle, tone: 'rose', sub: 'at/under reorder', onClick: () => navigate('/parts') },
      { key: 'p-ord', label: 'Open parts orders', value: formatNumber(openParts.length), icon: BadgeDollarSign, tone: 'amber', sub: 'requested / taken', onClick: () => navigate('/parts') },
      { key: 'p-active', label: 'Active service jobs', value: inService.length + awaiting.length, icon: Wrench, tone: 'blue', sub: 'may need parts', onClick: () => navigate('/parts') },
    ],
    billing: [
      { key: 'b-svc', label: 'Service billed', value: formatCurrency(serviceBilled), icon: Wallet, tone: 'brand', sub: `${completedJobs.length} jobs`, onClick: () => navigate('/billing') },
      { key: 'b-parts', label: 'Parts billed', value: formatCurrency(partsBilled), icon: BadgeDollarSign, tone: 'green', sub: 'paid orders', onClick: () => navigate('/billing') },
      { key: 'b-unpaid', label: 'Unpaid parts', value: formatNumber(openParts.length), icon: ReceiptText, tone: 'rose', sub: 'awaiting payment', onClick: () => navigate('/billing') },
    ],
    hr: [
      { key: 'reps', label: 'Sales reps', value: reps.length, icon: Users, tone: 'brand', onClick: open('Sales reps', [{ label: 'Name', render: (r) => r.name }, { label: 'Branch', render: (r) => branchById(r.branchId)?.name }], reps) },
      { key: 'branches', label: 'Branches', value: branchesForDealership(dealershipId).length, icon: Building2, tone: 'blue', onClick: open('Branches', [{ label: 'Branch', render: (b) => b.name }, { label: 'City', render: (b) => `${b.city}, ${b.province}` }, { label: 'Target/mo', render: (b) => b.monthlyTarget }], branchesForDealership(dealershipId)) },
      { key: 'staff', label: 'Staff accounts', value: staff.length, icon: Users, tone: 'amber', onClick: open('Staff accounts', [{ label: 'Role', render: (u) => u.role }, { label: 'Email', render: (u) => u.email }], staff) },
    ],
    kpi: [
      { key: 'k-stock', label: 'Vehicles in stock', value: inv.filter((v) => v.status === 'in_stock').length, icon: Car, tone: 'brand', sub: `${inv.length} total`, onClick: open('In stock', invCols, inv.filter((v) => v.status === 'in_stock')) },
      { key: 'k-sold', label: 'Units sold', value: formatNumber(unitsSales.length), icon: BadgeDollarSign, tone: 'green', spark: salesSpark, period: makePeriod('units'), sub: formatCurrency(revenuePeriod), onClick: open('Units sold', saleCols, unitsSales) },
      { key: 'k-svc', label: 'Active service', value: inService.length + awaiting.length, icon: Wrench, tone: 'amber', live: true, sub: 'in service / awaiting', onClick: open('Active service jobs', jobCols, [...inService, ...awaiting]) },
      { key: 'k-fup', label: 'Follow-ups due', value: pendingFollowups.length, icon: BellRing, tone: 'rose', sub: `${pendingFollowups.filter((f) => f.dueOn < TODAY_ISO).length} overdue`, onClick: open('Service follow-ups', fupCols, pendingFollowups) },
    ],
  }

  // de-dupe across domains by label (e.g. Admin's kpi + service + sales all carry
  // "Follow-ups due" / "Revenue") - first domain in the list wins.
  const seen = new Set()
  const metrics = domains.flatMap((d) => METRICS[d] || []).filter((m) => {
    if (seen.has(m.label)) return false
    seen.add(m.label)
    return true
  })

  const chartData = useMemo(() => {
    const buckets = monthBuckets(range.from, range.to)
    const counts = Object.fromEntries(buckets.map((b) => [b.key, 0]))
    for (const s of rangeSales) { const k = s.soldOn.slice(0, 7); if (k in counts) counts[k]++ }
    return buckets.map((b) => ({ label: b.label, units: counts[b.key] }))
  }, [rangeSales, range])

  // Follow-ups are a Sales responsibility (not Service). Admin sees them on AdminOverview.
  const showFollowupTable = domains.some((d) => ['sales', 'kpi'].includes(d))

  // Admin gets the dedicated "Dealership Performance Dashboard" layout (reference image 1).
  if (role === 'Admin') return <AdminOverview />

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">{role} overview</h1>
          <p className="text-sm text-ink-500">{branch === 'all' ? 'All branches' : branchById(branch)?.name} · as of {fmtDate(TODAY_ISO)}</p>
        </div>
        {showSalesChart && <TimelineFilter value={range} onChange={setRange} />}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ key, ...m }) => <MetricCard key={key} {...m} />)}
      </div>

      {showSalesChart && (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-600" />
            <h2 className="font-display text-base font-bold text-ink-900">Vehicles sold over time</h2>
            <span className="ml-auto text-sm font-semibold text-ink-500">{rangeSales.length} units</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 6, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#818ea6' }} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: '#818ea6' }} width={32} />
                <Tooltip cursor={{ fill: 'rgba(13,148,136,0.08)' }} contentStyle={{ borderRadius: 12, border: '1px solid #eceef2', fontSize: 13 }} />
                <Bar dataKey="units" radius={[6, 6, 0, 0]} fill="var(--color-brand-600)" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {showFollowupTable && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-4">
            <BellRing className="h-4 w-4 text-rose-500" />
            <h2 className="font-display text-base font-bold text-ink-900">Service follow-ups required</h2>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-600">{pendingFollowups.length} pending</span>
            <button onClick={open('Follow-up dispositions', dispoCols, doneFollowups)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50">
              <History className="h-3.5 w-3.5" /> Disposition history ({doneFollowups.length})
            </button>
          </div>
          {pendingFollowups.length === 0 ? (
            <p className="flex items-center gap-2 p-6 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-5 w-5" /> All follow-ups handled.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-2 font-semibold">Customer</th><th className="py-2 pr-3 font-semibold">Vehicle</th>
                  <th className="py-2 pr-3 font-semibold">Reason</th><th className="py-2 pr-3 font-semibold">Due</th>
                  <th className="py-2 pr-3 font-semibold">Branch</th><th className="py-2 font-semibold">Disposition</th>
                </tr></thead>
                <tbody>
                  {pendingFollowups.map((f) => <FollowupRow key={f.id} f={f} onRecord={recordFollowupDisposition} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail?.title} subtitle={detail ? `${detail.rows.length} record${detail.rows.length !== 1 ? 's' : ''}` : ''}>
        {detail && <div className="py-2"><DetailTable columns={detail.columns} rows={detail.rows} /></div>}
      </Drawer>
    </div>
  )
}

// Follow-up row: pick a DISPOSITION (why no service is being booked / what happened),
// optionally add a note, then Record. No more mislabelled "Serviced" that just drops the row.
function FollowupRow({ f, onRecord }) {
  const [disposition, setDisposition] = useState('')
  const [note, setNote] = useState(f.note || '')
  const overdue = f.dueOn < TODAY_ISO
  return (
    <tr className="border-t border-ink-100 align-top">
      <td className="py-3 pl-5 pr-3"><p className="font-semibold text-ink-900">{f.customer}</p><p className="text-xs text-ink-400">{f.phone}</p></td>
      <td className="py-3 pr-3"><p className="text-ink-700">{f.vehicle}</p><p className="font-mono text-[11px] text-ink-400">{f.vin}</p></td>
      <td className="py-3 pr-3 text-ink-600">{f.reason}</td>
      <td className="py-3 pr-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${overdue ? 'bg-rose-50 text-rose-600' : 'bg-ink-100 text-ink-600'}`}><Clock className="h-3 w-3" /> {fmtDate(f.dueOn)}</span></td>
      <td className="py-3 pr-3">{branchById(f.branchId)?.name}</td>
      <td className="py-3 pr-5">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <select value={disposition} onChange={(e) => setDisposition(e.target.value)} className="field-select h-8 w-44 rounded-lg border border-ink-200 bg-[var(--surface)] pl-2 text-xs outline-none focus:border-brand-500">
            <option value="">Set disposition…</option>
            {FOLLOWUP_DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-8 w-40 rounded-lg border border-ink-200 px-2 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
          <button disabled={!disposition} onClick={() => onRecord(f.id, { disposition, note: sanitizeText(note, 200) })} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">Record</button>
        </div>
      </td>
    </tr>
  )
}
