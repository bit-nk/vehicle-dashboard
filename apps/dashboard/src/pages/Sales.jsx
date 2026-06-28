import { useMemo, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { BadgeDollarSign, Car, CarFront, TrendingUp, Trophy, Mail, Target, ArrowLeft } from 'lucide-react'
import { formatCurrency, formatNumber } from '@shared/lib'
import MetricCard from '../components/MetricCard.jsx'
import TimelineFilter, { defaultRange } from '../components/TimelineFilter.jsx'
import { useDealer } from '../store/DealerStore.jsx'
import { REPS, branchById, branchesForDealership, salesInRange, monthBuckets, fmtDate, SALE_SEGMENTS, LEAD_SOURCES } from '../data/dealer.js'
import { chartTip as tip, chartGrid as grid, chartAxis as axis } from '../lib/chart.js'

const SEG_COLORS = { Sedan: 'var(--color-brand-600)', SUV: '#10b981', Truck: '#f59e0b', EV: '#64748b' }
const pill = (on) => `rounded-md px-3 py-1.5 text-sm font-semibold transition ${on ? 'bg-[var(--surface)] text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`
const repName = (id) => REPS.find((r) => r.id === id)?.name || '-'
const repEmail = (name) => `${String(name || 'advisor').toLowerCase().replace(/[^a-z]+/g, '.')}@dealer.example.com`

export default function Sales() {
  const { branch, dealershipId } = useOutletContext()
  const navigate = useNavigate()
  const { salesAll, inventory, createSale, repTargets, setRepTarget } = useDealer()
  const [range, setRange] = useState(defaultRange)
  const [make, setMake] = useState('all')
  const [year, setYear] = useState('all')
  const [tab, setTab] = useState('cars')          // cars | sales | team
  const [cond, setCond] = useState('all')          // new | used | all  (Sales tab filter)
  const [selectedRep, setSelectedRep] = useState(null)
  const branchId = branch === 'all' ? undefined : branch

  const months = Math.max(1, monthBuckets(range.from, range.to).length)
  const rangeSales = useMemo(() => salesInRange(salesAll, range.from, range.to, branchId), [salesAll, range, branchId])
  const makes = useMemo(() => [...new Set(rangeSales.map((s) => s.make))].sort(), [rangeSales])
  const years = useMemo(() => [...new Set(rangeSales.map((s) => s.year))].sort((a, b) => b - a), [rangeSales])
  const sales = useMemo(() => rangeSales.filter((s) => (make === 'all' || s.make === make) && (year === 'all' || String(s.year) === String(year))), [rangeSales, make, year])

  const revenue = sales.reduce((a, s) => a + (s.priceNpr || 0), 0)
  const newSales = sales.filter((s) => s.condition === 'new')
  const usedSales = sales.filter((s) => s.condition !== 'new')
  const pct = (n) => (sales.length ? Math.round((n / sales.length) * 100) : 0)

  // jump to the Sales list tab with a condition filter (replaces the old side drawer)
  const goList = (c) => () => { setCond(c); setTab('sales') }

  const trend = useMemo(() => {
    const buckets = monthBuckets(range.from, range.to)
    const nw = {}, us = {}
    for (const s of sales) { const k = s.soldOn.slice(0, 7); if (s.condition === 'new') nw[k] = (nw[k] || 0) + 1; else us[k] = (us[k] || 0) + 1 }
    return buckets.map((b) => ({ label: b.label, New: nw[b.key] || 0, Used: us[b.key] || 0 }))
  }, [sales, range])

  const topModels = useMemo(() => {
    const m = {}
    for (const s of sales) { const k = `${s.make} ${s.model}`; m[k] = (m[k] || 0) + 1 }
    return Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6)
  }, [sales])

  const segments = useMemo(() => SALE_SEGMENTS.map((seg) => ({ name: seg, value: sales.filter((s) => (s.segment || 'Sedan') === seg).length })).filter((x) => x.value), [sales])

  const leadSource = useMemo(() => LEAD_SOURCES.map((src) => ({
    name: src.replace(' Campaign', ''),
    New: sales.filter((s) => s.leadSource === src && s.condition === 'new').length,
    Used: sales.filter((s) => s.leadSource === src && s.condition !== 'new').length,
  })), [sales])

  // Sales-team performance - this dealership's advisors, vehicle sales ONLY (no parts).
  const team = useMemo(() => {
    const myBranchIds = new Set(branchesForDealership(dealershipId).filter((b) => !branchId || b.id === branchId).map((b) => b.id))
    const byRep = {}
    for (const s of sales) { const r = byRep[s.repId] ||= { units: 0, rev: 0 }; r.units++; r.rev += s.priceNpr || 0 }
    return REPS.filter((r) => myBranchIds.has(r.branchId)).map((r) => {
      const d = byRep[r.id] || { units: 0, rev: 0 }
      const defTarget = (branchById(r.branchId)?.monthlyTarget || 6) * months
      const t = repTargets[r.id]
      const targetType = t?.type === 'revenue' ? 'revenue' : 'units'
      const targetVal = (t?.value != null && t.value !== '') ? Number(t.value) : defTarget
      const metBase = targetType === 'revenue' ? d.rev : d.units
      return {
        ...r, units: d.units, rev: d.rev, branch: branchById(r.branchId)?.name,
        conv: 55 + (d.units * 7) % 45,   // illustrative conversion %, no real lead data in the demo
        targetType, targetVal, custom: !!t, metPct: targetVal ? Math.round((metBase / targetVal) * 100) : 0,
      }
    }).sort((a, b) => b.units - a.units)
  }, [sales, months, dealershipId, branchId, repTargets])

  const repLive = selectedRep ? (team.find((r) => r.id === selectedRep.id) || selectedRep) : null
  const targetLabel = (r) => (r.targetType === 'revenue' ? formatCurrency(r.targetVal) : `${r.targetVal} cars`)

  const listSales = cond === 'new' ? newSales : cond === 'used' ? usedSales : sales
  const repSales = selectedRep ? sales.filter((s) => s.repId === selectedRep.id) : []

  function emailProgress(r) {
    const subject = encodeURIComponent('Your sales target progress')
    const goal = r.targetType === 'revenue' ? `${formatCurrency(r.rev)} of a ${formatCurrency(r.targetVal)} revenue target` : `${r.units} of ${r.targetVal} cars`
    const body = encodeURIComponent(`Hi ${r.name},\n\nThis ${months}-month period you have reached ${goal} (${r.metPct}% of target). Total revenue: ${formatCurrency(r.rev)}.\n\nKeep it up!`)
    try { window.open(`mailto:${repEmail(r.name)}?subject=${subject}&body=${body}`, '_blank') } catch { /* ignore */ }
  }

  const SUBNAV = [{ key: 'cars', label: 'Car Sales' }, { key: 'sales', label: 'Sales' }, { key: 'team', label: 'Sales Team' }]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Sales Performance Overview</h1>
          <p className="text-sm text-ink-500">{branch === 'all' ? 'All branches' : branchById(branch)?.name} · {months}-month window</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={make} onChange={(e) => setMake(e.target.value)} className="field-select h-9 rounded-lg border border-ink-200 bg-[var(--surface)] pl-3 text-sm outline-none focus:border-brand-500"><option value="all">All makes</option>{makes.map((m) => <option key={m} value={m}>{m}</option>)}</select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="field-select h-9 rounded-lg border border-ink-200 bg-[var(--surface)] pl-3 text-sm outline-none focus:border-brand-500"><option value="all">All years</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          <TimelineFilter value={range} onChange={setRange} />
        </div>
      </div>

      {/* top sub-nav */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-ink-100 p-1">
        {SUBNAV.map((t) => <button key={t.key} onClick={() => { setTab(t.key); setSelectedRep(null) }} className={pill(tab === t.key)}>{t.label}</button>)}
      </div>

      {/* ===================== CAR SALES (dashboard) ===================== */}
      {tab === 'cars' && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricCard label="Total Sales Revenue" value={formatCurrency(revenue)} sub={`${months}-month window`} icon={BadgeDollarSign} tone="brand" spark={trend.map((t) => t.New + t.Used)} onClick={goList('all')} />
            <MetricCard label="New Vehicles Sold" value={formatNumber(newSales.length)} sub={`${pct(newSales.length)}% of total`} icon={Car} tone="green" onClick={goList('new')} />
            <MetricCard label="Used Vehicles Sold" value={formatNumber(usedSales.length)} sub={`${pct(usedSales.length)}% of total`} icon={CarFront} tone="blue" onClick={goList('used')} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand-600" />
                <h2 className="font-display text-base font-bold text-ink-900">Monthly Sales Trend: New vs. Used Vehicles</h2>
                <div className="ml-auto flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> New</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-brand-600)' }} /> Used</span>
                </div>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sNew" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.4} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                      <linearGradient id="sUsed" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid {...grid} vertical={false} />
                    <XAxis dataKey="label" {...axis} />
                    <YAxis {...axis} allowDecimals={false} width={36} />
                    <Tooltip contentStyle={tip} />
                    <Area type="monotone" dataKey="New" stroke="#10b981" strokeWidth={2.5} fill="url(#sNew)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="Used" stroke="var(--color-brand-500)" strokeWidth={2.5} fill="url(#sUsed)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card p-5">
              <h2 className="mb-3 font-display text-base font-bold text-ink-900">Top Selling Vehicle Models</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topModels} margin={{ top: 12, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid {...grid} vertical={false} />
                    <XAxis dataKey="name" {...axis} tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} angle={-15} textAnchor="end" height={42} />
                    <YAxis {...axis} allowDecimals={false} width={32} />
                    <Tooltip cursor={{ fill: 'rgba(100,116,139,0.12)' }} contentStyle={tip} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--color-brand-600)" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="mb-2 font-display text-base font-bold text-ink-900">Sales by Model Segment</h2>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={segments} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2} isAnimationActive={false}>{segments.map((e) => <Cell key={e.name} fill={SEG_COLORS[e.name]} />)}</Pie><Tooltip contentStyle={tip} itemStyle={{ color: '#e2e8f0' }} labelStyle={{ color: '#e2e8f0' }} /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex flex-wrap justify-center gap-3 text-xs text-ink-500">{segments.map((e) => <span key={e.name} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: SEG_COLORS[e.name] }} /> {e.name}</span>)}</div>
            </div>
            <div className="card p-5">
              <h2 className="mb-3 font-display text-base font-bold text-ink-900">Sales by Lead Source</h2>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadSource} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid {...grid} vertical={false} />
                    <XAxis dataKey="name" {...axis} tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} />
                    <YAxis {...axis} allowDecimals={false} width={28} />
                    <Tooltip cursor={{ fill: 'rgba(100,116,139,0.12)' }} contentStyle={tip} />
                    <Bar dataKey="New" stackId="a" fill="#10b981" isAnimationActive={false} />
                    <Bar dataKey="Used" stackId="a" fill="var(--color-brand-600)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex justify-center gap-3 text-xs text-ink-500"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> New</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-brand-600)' }} /> Used</span></div>
            </div>
          </div>
        </>
      )}

      {/* ===================== SALES (filterable list, replaces popup) ===================== */}
      {tab === 'sales' && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-5 py-4">
            <h2 className="font-display text-base font-bold text-ink-900">Vehicles sold <span className="text-sm font-normal text-ink-400">· {listSales.length}</span></h2>
            <label className="flex items-center gap-1.5 text-xs text-ink-500">Show
              <select value={cond} onChange={(e) => setCond(e.target.value)} className="field-select h-9 rounded-lg border border-ink-200 bg-[var(--surface)] pl-2 pr-7 text-sm outline-none focus:border-brand-500">
                <option value="all">All vehicles</option>
                <option value="new">New only</option>
                <option value="used">Used only</option>
              </select>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wide text-ink-400">
                <th className="px-5 py-2 font-semibold">Date</th><th className="py-2 pr-3 font-semibold">Vehicle</th><th className="py-2 pr-3 font-semibold">Condition</th>
                <th className="py-2 pr-3 font-semibold">Buyer</th><th className="py-2 pr-3 font-semibold">Salesperson</th><th className="py-2 pr-3 font-semibold">Branch</th><th className="py-2 pr-5 text-right font-semibold">Price</th>
              </tr></thead>
              <tbody>
                {listSales.map((s) => (
                  <tr key={s.id} onClick={() => navigate(`/sales/${s.id}`)} className="cursor-pointer border-t border-ink-100 hover:bg-ink-50/60">
                    <td className="px-5 py-2.5 text-ink-600">{fmtDate(s.soldOn)}</td>
                    <td className="py-2.5 pr-3 font-medium text-ink-800">{s.year} {s.make} {s.model}</td>
                    <td className="py-2.5 pr-3">{s.condition === 'new' ? <span className="text-emerald-600">New</span> : <span className="text-ink-500">Used</span>}</td>
                    <td className="py-2.5 pr-3 text-ink-600">{s.buyerName || '-'}</td>
                    <td className="py-2.5 pr-3 text-ink-600">{repName(s.repId)}</td>
                    <td className="py-2.5 pr-3 text-ink-600">{branchById(s.branchId)?.name}</td>
                    <td className="py-2.5 pr-5 text-right font-semibold text-ink-900">{formatCurrency(s.priceNpr)}</td>
                  </tr>
                ))}
                {listSales.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-ink-400">No vehicle sales match.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== SALES TEAM ===================== */}
      {tab === 'team' && !selectedRep && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-4"><Trophy className="h-4 w-4 text-amber-500" /><h2 className="font-display text-base font-bold text-ink-900">Sales Team Performance</h2><span className="text-xs text-ink-400">vehicle sales only · {months}-month window</span></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wide text-ink-400">
                <th className="px-5 py-2 font-semibold">Advisor</th><th className="py-2 pr-3 font-semibold">Units</th><th className="py-2 pr-3 font-semibold">Revenue</th>
                <th className="py-2 pr-3 font-semibold">Conv. (est.)</th><th className="py-2 pr-3 font-semibold">Target</th><th className="py-2 pr-3 font-semibold">Met</th><th className="py-2 pr-5 text-right font-semibold">Progress email</th>
              </tr></thead>
              <tbody>
                {team.map((r, i) => (
                  <tr key={r.id} onClick={() => setSelectedRep(r)} className="cursor-pointer border-t border-ink-100 hover:bg-ink-50/60">
                    <td className="px-5 py-2.5"><span className="mr-2 text-xs font-bold text-ink-400">{i + 1}</span><span className="font-semibold text-ink-800">{r.name}</span><span className="ml-1 text-xs text-ink-400">· {r.branch}</span></td>
                    <td className="py-2.5 pr-3 text-ink-700">{r.units}</td>
                    <td className="py-2.5 pr-3 font-semibold text-ink-900">{formatCurrency(r.rev)}</td>
                    <td className="py-2.5 pr-3 text-ink-600">{r.conv}%</td>
                    <td className="py-2.5 pr-3 text-ink-600">{targetLabel(r)}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, r.metPct)}%` }} /></div>
                        <span className={`text-xs font-semibold ${r.metPct >= 100 ? 'text-emerald-600' : 'text-ink-500'}`}>{r.metPct}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => emailProgress(r)} className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-50"><Mail className="h-3.5 w-3.5" /> Email</button>
                    </td>
                  </tr>
                ))}
                {team.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-ink-400">No sales advisors in this window.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales Team -> a specific advisor's profile: targets, add a sale, sold items */}
      {tab === 'team' && repLive && (
        <div className="space-y-4">
          <button onClick={() => setSelectedRep(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" /> Back to team</button>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Advisor" value={repLive.name} sub={repLive.branch} icon={Trophy} tone="amber" />
            <MetricCard label="Units sold" value={formatNumber(repLive.units)} sub={`${months}-month window`} icon={Car} tone="brand" />
            <MetricCard label="Revenue" value={formatCurrency(repLive.rev)} icon={BadgeDollarSign} tone="green" />
            <MetricCard label="Target met" value={`${repLive.metPct}%`} sub={repLive.targetType === 'revenue' ? `${formatCurrency(repLive.rev)} / ${formatCurrency(repLive.targetVal)}` : `${repLive.units}/${repLive.targetVal} cars`} icon={Target} tone="blue" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TargetEditor rep={repLive} onSave={(t) => setRepTarget(repLive.id, t)} />
            <AddRepSale rep={repLive} inventory={inventory} onAdd={createSale} />
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-5 py-4">
              <h2 className="font-display text-base font-bold text-ink-900">{repLive.name}'s sold vehicles</h2>
              <button onClick={() => emailProgress(repLive)} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-semibold text-ink-700 hover:bg-ink-50"><Mail className="h-4 w-4" /> Email progress</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wide text-ink-400"><th className="px-5 py-2 font-semibold">Date</th><th className="py-2 pr-3 font-semibold">Vehicle</th><th className="py-2 pr-3 font-semibold">Condition</th><th className="py-2 pr-3 font-semibold">Buyer</th><th className="py-2 pr-5 text-right font-semibold">Price</th></tr></thead>
                <tbody>
                  {repSales.map((s) => (
                    <tr key={s.id} onClick={() => navigate(`/sales/${s.id}`)} className="cursor-pointer border-t border-ink-100 hover:bg-ink-50/60">
                      <td className="px-5 py-2.5 text-ink-600">{fmtDate(s.soldOn)}</td>
                      <td className="py-2.5 pr-3 font-medium text-ink-800">{s.year} {s.make} {s.model}</td>
                      <td className="py-2.5 pr-3">{s.condition === 'new' ? <span className="text-emerald-600">New</span> : <span className="text-ink-500">Used</span>}</td>
                      <td className="py-2.5 pr-3 text-ink-600">{s.buyerName || '-'}</td>
                      <td className="py-2.5 pr-5 text-right font-semibold text-ink-900">{formatCurrency(s.priceNpr)}</td>
                    </tr>
                  ))}
                  {repSales.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-ink-400">No sales by this advisor in this window.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const fld = 'h-9 rounded-lg border border-ink-200 bg-[var(--surface)] px-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'

// Set a rep's target (cars sold OR revenue); the team's "met %" recomputes from it.
function TargetEditor({ rep, onSave }) {
  const [type, setType] = useState(rep.targetType || 'units')
  const [value, setValue] = useState(rep.custom ? String(rep.targetVal) : '')
  const [saved, setSaved] = useState(false)
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-brand-600" /><h3 className="font-display text-base font-bold text-ink-900">Set target</h3></div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] font-medium text-ink-400">Target type
          <select value={type} onChange={(e) => { setType(e.target.value); setSaved(false) }} className={`field-select mt-0.5 block w-40 ${fld}`}><option value="units">Cars sold</option><option value="revenue">Revenue (Rs.)</option></select></label>
        <label className="text-[11px] font-medium text-ink-400">{type === 'revenue' ? 'Target revenue (Rs.)' : 'Target cars'}
          <input type="number" value={value} onChange={(e) => { setValue(e.target.value); setSaved(false) }} placeholder={type === 'revenue' ? 'e.g. 50000000' : 'e.g. 30'} className={`mt-0.5 block w-40 ${fld}`} /></label>
        <button onClick={() => { onSave({ type, value: Number(value) || 0 }); setSaved(true) }} disabled={!value} className="btn-sm bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">{saved ? 'Saved' : 'Save target'}</button>
      </div>
      <p className="mt-2 text-xs text-ink-400">Current: {rep.targetType === 'revenue' ? formatCurrency(rep.targetVal) : `${rep.targetVal} cars`} · {rep.metPct}% met{rep.custom ? '' : ' (default)'}</p>
    </div>
  )
}

// Record a sale for this rep (edits their units sold): pick an available vehicle, price prefills + editable.
function AddRepSale({ rep, inventory, onAdd }) {
  // scope to the rep's branch so the recorded sale is attributed there and shows in their numbers
  const available = inventory.filter((v) => v.status !== 'sold' && v.branchId === rep.branchId)
  const [vehId, setVehId] = useState('')
  const [price, setPrice] = useState('')
  const [msg, setMsg] = useState('')
  const veh = available.find((v) => v.id === vehId)
  const pick = (id) => { setVehId(id); const v = available.find((x) => x.id === id); setPrice(v ? String(v.price) : ''); setMsg('') }
  function add() {
    if (!veh) { setMsg('Pick a vehicle.'); return }
    onAdd({ vehicleId: veh.id, repId: rep.id, priceNpr: Number(price) || veh.price, buyer: { name: '' } })
    setVehId(''); setPrice(''); setMsg('Sale recorded - units updated.')
  }
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2"><Car className="h-4 w-4 text-brand-600" /><h3 className="font-display text-base font-bold text-ink-900">Add a car this advisor sold</h3></div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] font-medium text-ink-400">Vehicle
          <select value={vehId} onChange={(e) => pick(e.target.value)} className={`field-select mt-0.5 block w-64 ${fld}`}>
            <option value="">Select a vehicle…</option>
            {available.map((v) => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} · {v.stockNo}</option>)}
          </select></label>
        <label className="text-[11px] font-medium text-ink-400">Sale price (Rs.)
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="price" className={`mt-0.5 block w-36 ${fld}`} /></label>
        <button onClick={add} disabled={!veh} className="btn-sm bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">Record sale</button>
      </div>
      {veh && <p className="mt-2 text-xs text-ink-400">Listed price {formatCurrency(veh.price)} - edit above if it sold for a different amount.</p>}
      {msg && <p className="mt-1 text-xs font-semibold text-brand-600">{msg}</p>}
    </div>
  )
}
