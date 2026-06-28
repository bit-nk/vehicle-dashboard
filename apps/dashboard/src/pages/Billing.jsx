import { useMemo, useState } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import { Printer, FileText, Search, Wallet, BadgeDollarSign, Boxes, SlidersHorizontal, X } from 'lucide-react'
import { Badge } from '@shared/ui'
import { formatCurrency } from '@shared/lib'
import { useDealer } from '../store/DealerStore.jsx'
import { branchById, cap, fmtDate } from '../data/dealer.js'
import MetricCard from '../components/MetricCard.jsx'

const ALL_TABS = [{ key: 'service', label: 'Service bills' }, { key: 'parts', label: 'Parts bills' }]
const ORDER_TONE = { paid: 'green', taken: 'blue', requested: 'amber', cancelled: 'gray' }
const TITLE = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)   // proper case for statuses

export default function Billing() {
  const { branch, dealershipId, role } = useOutletContext()
  const { serviceJobs, partsOrders, payPartsOrder, markServiceBillPaid } = useDealer()
  const tabs = role === 'Service' ? ALL_TABS.filter((t) => t.key === 'service')
    : role === 'Parts' ? ALL_TABS.filter((t) => t.key === 'parts')
      : ALL_TABS
  const canService = tabs.some((t) => t.key === 'service')
  const canPartsBill = tabs.some((t) => t.key === 'parts')
  const [tab, setTab] = useState(role === 'Parts' ? 'parts' : 'service')
  const [showFilters, setShowFilters] = useState(false)
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [paid, setPaid] = useState('unpaid')   // home defaults to PENDING (unpaid) bills
  const branchId = branch === 'all' ? undefined : branch
  const canPrint = cap(role, 'printBilling')   // billing roles also settle (mark paid) here

  const inDate = (d) => (!from || d >= from) && (!to || d <= to)
  const matchQ = (s) => !q || s.toLowerCase().includes(q.toLowerCase())
  const svcPaid = (j) => j.billStatus === 'paid'

  // scoped (branch + date) pools used for the KPI totals
  const svcScoped = useMemo(() => serviceJobs.filter((j) => j.status === 'completed' && (!branchId || j.branchId === branchId) && inDate(j.completedOn || j.slotDate)), [serviceJobs, branchId, from, to])
  const partScoped = useMemo(() => partsOrders.filter((o) => o.status !== 'cancelled' && (!branchId || o.branchId === branchId) && inDate(o.createdOn)), [partsOrders, branchId, from, to])

  const serviceBilled = svcScoped.reduce((a, j) => a + (j.totalNpr || 0), 0)
  const serviceUnpaid = svcScoped.filter((j) => !svcPaid(j)).reduce((a, j) => a + (j.totalNpr || 0), 0)
  const paidPartsAmt = partScoped.filter((o) => o.status === 'paid').reduce((a, o) => a + o.totalNpr, 0)
  const unpaidPartsAmt = partScoped.filter((o) => o.status !== 'paid').reduce((a, o) => a + o.totalNpr, 0)
  const unpaidPartsCount = partScoped.filter((o) => o.status !== 'paid').length
  const totalBilled = (canService ? serviceBilled : 0) + (canPartsBill ? paidPartsAmt + unpaidPartsAmt : 0)

  // the visible list applies the paid/unpaid filter + search
  const serviceBills = useMemo(() => svcScoped
    .filter((j) => paid === 'all' || (paid === 'paid' ? svcPaid(j) : !svcPaid(j)))
    .filter((j) => matchQ(`${j.vehicle} ${j.customer} ${j.id} ${j.vin}`))
    .sort((a, b) => (b.completedOn || '').localeCompare(a.completedOn || '')), [svcScoped, paid, q])
  const partsBills = useMemo(() => partScoped
    .filter((o) => paid === 'all' || (paid === 'paid' ? o.status === 'paid' : o.status !== 'paid'))
    .filter((o) => matchQ(`${o.customer} ${o.id}`))
    .sort((a, b) => b.createdOn.localeCompare(a.createdOn)), [partScoped, paid, q])

  const activeFilters = [from, to, q].filter(Boolean).length   // paid has its own visible toggle

  return (
    <div className="space-y-5">
      <div><h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Billing</h1><p className="text-sm text-ink-500">Services performed &amp; parts sold - print bills with your dealership letterhead</p></div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {canService && <MetricCard label="Service Billed" value={formatCurrency(serviceBilled)} icon={Wallet} tone="brand" sub={`${svcScoped.length} jobs`} onClick={() => { setTab('service'); setPaid('all') }} />}
        {canService && <MetricCard label="Service Unpaid" value={formatCurrency(serviceUnpaid)} icon={FileText} tone="amber" sub={`${svcScoped.filter((j) => !svcPaid(j)).length} pending`} onClick={() => { setTab('service'); setPaid('unpaid') }} />}
        {canPartsBill && <MetricCard label="Paid Parts" value={formatCurrency(paidPartsAmt)} icon={BadgeDollarSign} tone="green" sub="received" onClick={() => { setTab('parts'); setPaid('paid') }} />}
        {canPartsBill && <MetricCard label="Unpaid Parts" value={formatCurrency(unpaidPartsAmt)} icon={Boxes} tone="rose" sub={`${unpaidPartsCount} due`} onClick={() => { setTab('parts'); setPaid('unpaid') }} />}
        <MetricCard label="Total Billed" value={formatCurrency(totalBilled)} icon={Wallet} tone="ink" sub="service + parts" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.length > 1 && (
          <div className="flex gap-1 rounded-lg bg-ink-100 p-1">
            {tabs.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${tab === t.key ? 'bg-[var(--surface)] text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}>{t.label}</button>)}
          </div>
        )}
        {/* paid/unpaid quick toggle */}
        <div className="flex gap-1 rounded-lg bg-ink-100 p-1">
          {['unpaid', 'paid', 'all'].map((p) => <button key={p} onClick={() => setPaid(p)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${paid === p ? 'bg-[var(--surface)] text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}>{p === 'all' ? 'All' : p}</button>)}
        </div>
        <button onClick={() => setShowFilters((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${showFilters || activeFilters ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-700 hover:bg-ink-50'}`}>
          <SlidersHorizontal className="h-4 w-4" /> Filter{activeFilters > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] text-white">{activeFilters}</span>}
        </button>
        {activeFilters > 0 && <button onClick={() => { setFrom(''); setTo(''); setQ(''); setPaid('unpaid') }} className="text-sm font-semibold text-brand-600">Reset</button>}
      </div>

      {showFilters && (
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-base font-bold text-ink-900">Filters</h2><button onClick={() => setShowFilters(false)} className="grid h-8 w-8 place-items-center rounded-full text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" /></button></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-600">Search</span>
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Customer, vehicle, no." className="h-9 w-full rounded-lg border border-ink-200 bg-[var(--surface)] pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" /></div></label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-600">From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-full rounded-lg border border-ink-200 bg-[var(--surface)] px-2.5 text-sm outline-none focus:border-brand-500" /></label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-600">To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-full rounded-lg border border-ink-200 bg-[var(--surface)] px-2.5 text-sm outline-none focus:border-brand-500" /></label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-600">Payment status</span>
              <select value={paid} onChange={(e) => setPaid(e.target.value)} className="field-select h-9 w-full rounded-lg border border-ink-200 bg-[var(--surface)] pl-2.5 text-sm outline-none focus:border-brand-500"><option value="unpaid">Unpaid / pending</option><option value="paid">Paid</option><option value="all">All</option></select></label>
          </div>
        </div>
      )}

      {tab === 'service' && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead><tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400"><th className="px-4 py-3 font-semibold">Job</th><th className="py-3 pr-3 font-semibold">Customer</th><th className="py-3 pr-3 font-semibold">Serviced</th><th className="py-3 pr-3 font-semibold">Total</th><th className="py-3 pr-3 font-semibold">Payment</th><th className="py-3 pr-4 text-right font-semibold">Actions</th></tr></thead>
            <tbody>
              {serviceBills.map((j) => (
                <tr key={j.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-4 py-3"><p className="font-semibold text-ink-900">{j.vehicle}</p><p className="text-[11px] text-ink-400">{j.id} · {branchById(j.branchId)?.name}</p></td>
                  <td className="py-3 pr-3 text-ink-700">{j.customer}</td>
                  <td className="py-3 pr-3 text-ink-600">{j.completedOn ? fmtDate(j.completedOn) : '-'}</td>
                  <td className="py-3 pr-3 font-semibold text-ink-900">{formatCurrency(j.totalNpr)}</td>
                  <td className="py-3 pr-3">{svcPaid(j) ? <span><Badge tone="green">Paid</Badge><p className="mt-0.5 text-[11px] text-ink-400">by {j.billPaidByName || '-'}</p></span> : <Badge tone="amber">Pending</Badge>}</td>
                  <td className="py-3 pr-4 text-right">
                    {canPrint && <div className="flex justify-end gap-1.5">
                      {!svcPaid(j) && <button onClick={() => markServiceBillPaid(j.id, 'Cash')} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700">Mark paid</button>}
                      <Link to={`/billing/service/${j.id}`} title="Service report" className="grid h-8 w-8 place-items-center rounded-md border border-ink-200 text-ink-600 hover:bg-ink-50"><FileText className="h-4 w-4" /></Link>
                      <Link to={`/billing/combined/${j.id}`} title="Service + parts bill" className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700"><Printer className="h-3.5 w-3.5" /> Bill</Link>
                    </div>}
                  </td>
                </tr>
              ))}
              {serviceBills.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-ink-400">No {paid === 'all' ? '' : paid + ' '}service bills match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'parts' && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead><tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400"><th className="px-4 py-3 font-semibold">Order</th><th className="py-3 pr-3 font-semibold">Customer</th><th className="py-3 pr-3 font-semibold">Date</th><th className="py-3 pr-3 font-semibold">Status</th><th className="py-3 pr-3 text-right font-semibold">Total</th><th className="py-3 pr-4 text-right font-semibold">Actions</th></tr></thead>
            <tbody>
              {partsBills.map((o) => (
                <tr key={o.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-4 py-3"><p className="font-semibold text-ink-900">{o.id}</p><p className="text-[11px] text-ink-400">{o.lines.reduce((a, l) => a + l.qty, 0)} item(s){o.serviceJobId ? ` · ${o.serviceJobId}` : ''}</p></td>
                  <td className="py-3 pr-3 text-ink-700">{o.customer}</td>
                  <td className="py-3 pr-3 text-ink-600">{fmtDate(o.createdOn)}</td>
                  <td className="py-3 pr-3">{o.status === 'paid' ? <span><Badge tone="green">Paid</Badge><p className="mt-0.5 text-[11px] text-ink-400">by {o.paidByName || '-'}</p></span> : <Badge tone={ORDER_TONE[o.status]}>{TITLE(o.status)}</Badge>}</td>
                  <td className="py-3 pr-3 text-right font-semibold text-ink-900">{formatCurrency(o.totalNpr)}</td>
                  <td className="py-3 pr-4 text-right">
                    {canPrint && <div className="flex justify-end gap-1.5">
                      {o.status !== 'paid' && <button onClick={() => payPartsOrder(o.id, 'Cash')} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700">Mark paid</button>}
                      <Link to={`/billing/parts/${o.id}`} className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-50"><Printer className="h-3.5 w-3.5" /> Print</Link>
                    </div>}
                  </td>
                </tr>
              ))}
              {partsBills.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-ink-400">No {paid === 'all' ? '' : paid + ' '}parts orders match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
