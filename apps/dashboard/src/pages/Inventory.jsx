import { useMemo, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { VehiclePhoto } from '@shared/ui'
import { formatCurrency, formatNumber } from '@shared/lib'
import { useDealer } from '../store/DealerStore.jsx'
import { branchById } from '../data/dealer.js'
import StatusPill, { VEHICLE_STATUS } from '../components/StatusPill.jsx'
import RangeSlider from '../components/RangeSlider.jsx'

const STATUS_FILTERS = ['all', 'in_stock', 'in_service', 'reserved', 'sold']
const sel = 'field-select h-10 rounded-lg border border-ink-200 bg-[var(--surface)] pl-3 text-sm outline-none focus:border-brand-500'
const uniq = (arr) => [...new Set(arr.filter(Boolean))]
const ADV_DEFAULT = { make: 'all', yMin: 'all', yMax: 'all', pLo: null, pHi: null, oLo: null, oHi: null, owners: 'all', fuel: 'all', body: 'all', drive: 'all', trans: 'all', cleanTitle: false, noAccidents: false }

function Pills({ label, value, options, onChange }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-ink-600">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {['all', ...options].map((o) => (
          <button key={o} type="button" onClick={() => onChange(o)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${value === o ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}>
            {o === 'all' ? 'Any' : o}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Inventory() {
  const { branch, dealershipId, role } = useOutletContext()
  const navigate = useNavigate()
  const { inventory } = useDealer()
  const showStatus = !['Parts', 'Service'].includes(role)
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [adv, setAdv] = useState(ADV_DEFAULT)
  const branchId = branch === 'all' ? undefined : branch

  const scopedInv = useMemo(() => inventory.filter((v) => !branchId || v.branchId === branchId), [inventory, branchId])
  const makes = useMemo(() => uniq(scopedInv.map((v) => v.make)).sort(), [scopedInv])
  const years = useMemo(() => uniq(scopedInv.map((v) => v.year)).sort((a, b) => b - a), [scopedInv])
  const fuels = useMemo(() => uniq(scopedInv.map((v) => v.fuelType)).sort(), [scopedInv])
  const bodies = useMemo(() => uniq(scopedInv.map((v) => v.bodyStyle)).sort(), [scopedInv])
  const drives = useMemo(() => uniq(scopedInv.map((v) => v.drivetrain)).sort(), [scopedInv])
  const transs = useMemo(() => uniq(scopedInv.map((v) => v.transmission)).sort(), [scopedInv])
  const bounds = useMemo(() => {
    const prices = scopedInv.map((v) => v.price), odos = scopedInv.map((v) => v.mileage)
    return { pMin: Math.min(...prices, 0), pMax: Math.max(...prices, 1000000), oMin: 0, oMax: Math.max(...odos, 100000) }
  }, [scopedInv])

  const pLo = adv.pLo ?? bounds.pMin, pHi = adv.pHi ?? bounds.pMax
  const oLo = adv.oLo ?? bounds.oMin, oHi = adv.oHi ?? bounds.oMax
  const set = (patch) => setAdv((p) => ({ ...p, ...patch }))
  const activeCount = [adv.make !== 'all', adv.yMin !== 'all' || adv.yMax !== 'all', adv.pLo != null || adv.pHi != null, adv.oLo != null || adv.oHi != null, adv.owners !== 'all', adv.fuel !== 'all', adv.body !== 'all', adv.drive !== 'all', adv.trans !== 'all', adv.cleanTitle, adv.noAccidents].filter(Boolean).length

  const rows = useMemo(() => scopedInv.filter((v) => {
    if (status !== 'all' && v.status !== status) return false
    if (q) { const hay = `${v.year} ${v.make} ${v.model} ${v.vin} ${v.stockNo}`.toLowerCase(); if (!hay.includes(q.toLowerCase())) return false }
    if (adv.make !== 'all' && v.make !== adv.make) return false
    if (adv.yMin !== 'all' && v.year < Number(adv.yMin)) return false
    if (adv.yMax !== 'all' && v.year > Number(adv.yMax)) return false
    if (adv.pLo != null && v.price < pLo) return false
    if (adv.pHi != null && v.price > pHi) return false
    if (adv.oLo != null && v.mileage < oLo) return false
    if (adv.oHi != null && v.mileage > oHi) return false
    if (adv.owners === 'single' && (v.owners ?? 1) !== 1) return false
    if (adv.owners === 'multiple' && (v.owners ?? 1) <= 1) return false
    if (adv.fuel !== 'all' && v.fuelType !== adv.fuel) return false
    if (adv.body !== 'all' && v.bodyStyle !== adv.body) return false
    if (adv.drive !== 'all' && v.drivetrain !== adv.drive) return false
    if (adv.trans !== 'all' && v.transmission !== adv.trans) return false
    if (adv.cleanTitle && v.titleBrand && v.titleBrand !== 'Clean') return false
    if (adv.noAccidents && (v.accidents ?? 0) > 0) return false
    return true
  }), [scopedInv, status, q, adv, pLo, pHi, oLo, oHi])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Inventory</h1>
          <p className="text-sm text-ink-500">{rows.length} vehicle{rows.length !== 1 && 's'}{branchId ? ` at ${branchById(branchId)?.name}` : ' across all branches'}</p>
        </div>
        <button onClick={() => navigate('/inventory/new')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Add vehicle
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search make, VIN, stock no" className="h-10 w-64 rounded-lg border border-ink-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
        </div>
        {showStatus && (
          <div className="flex gap-1 rounded-lg bg-ink-100 p-1">
            {STATUS_FILTERS.map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${status === s ? 'bg-[var(--surface)] text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}>
                {s === 'all' ? 'All' : VEHICLE_STATUS[s].label}
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setShowFilters((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${showFilters || activeCount ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-700 hover:bg-ink-50'}`}>
          <SlidersHorizontal className="h-4 w-4" /> Filter{activeCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] text-white">{activeCount}</span>}
        </button>
        {activeCount > 0 && <button onClick={() => setAdv(ADV_DEFAULT)} className="text-sm font-semibold text-brand-600">Reset</button>}
      </div>

      {/* advanced filter panel (Carfax-style) */}
      {showFilters && (
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-base font-bold text-ink-900">Filters</h2><button onClick={() => setShowFilters(false)} className="grid h-8 w-8 place-items-center rounded-full text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" /></button></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-ink-600">Make</span>
              <select value={adv.make} onChange={(e) => set({ make: e.target.value })} className={`${sel} w-full`}><option value="all">All makes</option>{makes.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
            <div><span className="mb-1.5 block text-xs font-semibold text-ink-600">Year range</span>
              <div className="flex items-center gap-2">
                <select value={adv.yMin} onChange={(e) => set({ yMin: e.target.value })} className={`${sel} w-full`}><option value="all">Any</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
                <span className="text-ink-300">-</span>
                <select value={adv.yMax} onChange={(e) => set({ yMax: e.target.value })} className={`${sel} w-full`}><option value="all">Any</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
              </div>
            </div>
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-ink-600">Owners</span>
              <select value={adv.owners} onChange={(e) => set({ owners: e.target.value })} className={`${sel} w-full`}><option value="all">Any</option><option value="single">Single owner</option><option value="multiple">Multiple owners</option></select></label>
            <div><span className="mb-1.5 block text-xs font-semibold text-ink-600">Price range</span>
              <RangeSlider min={bounds.pMin} max={bounds.pMax} step={50000} low={pLo} high={pHi} prefix="Rs." onChange={(lo, hi) => set({ pLo: lo, pHi: hi })} /></div>
            <div className="lg:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-ink-600">Mileage (km)</span>
              <RangeSlider min={bounds.oMin} max={bounds.oMax} step={5000} low={oLo} high={oHi} suffix="km" onChange={(lo, hi) => set({ oLo: lo, oHi: hi })} /></div>
            <Pills label="Fuel" value={adv.fuel} options={fuels} onChange={(v) => set({ fuel: v })} />
            <Pills label="Body style" value={adv.body} options={bodies} onChange={(v) => set({ body: v })} />
            <Pills label="Drivetrain" value={adv.drive} options={drives} onChange={(v) => set({ drive: v })} />
            <Pills label="Transmission" value={adv.trans} options={transs} onChange={(v) => set({ trans: v })} />
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-sm text-ink-600"><input type="checkbox" checked={adv.cleanTitle} onChange={(e) => set({ cleanTitle: e.target.checked })} className="accent-brand-600" /> Clean title only</label>
              <label className="flex items-center gap-2 text-sm text-ink-600"><input type="checkbox" checked={adv.noAccidents} onChange={(e) => set({ noAccidents: e.target.checked })} className="accent-brand-600" /> No accidents reported</label>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <th className="px-4 py-3 font-semibold">Vehicle</th>
              <th className="py-3 pr-3 font-semibold">Stock / VIN</th>
              <th className="py-3 pr-3 font-semibold">Branch</th>
              <th className="py-3 pr-3 font-semibold">Odometer</th>
              {showStatus && <th className="py-3 pr-3 font-semibold">Status</th>}
              <th className="py-3 pr-4 font-semibold text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} onClick={() => navigate(`/inventory/${v.id}`)} className="cursor-pointer border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-16 shrink-0 overflow-hidden rounded-md bg-ink-100"><VehiclePhoto vehicle={v} showCredit={false} /></div>
                    <div><p className="font-semibold text-ink-900">{v.year} {v.make} {v.model}</p><p className="text-xs text-ink-400">{v.exteriorColor} · {v.fuelType}</p></div>
                  </div>
                </td>
                <td className="py-3 pr-3"><p className="text-ink-700">{v.stockNo}</p><p className="font-mono text-[11px] text-ink-400">{v.vin}</p></td>
                <td className="py-3 pr-3 text-ink-600">{branchById(v.branchId)?.name}</td>
                <td className="py-3 pr-3 text-ink-600">{formatNumber(v.mileage)} km</td>
                {showStatus && <td className="py-3 pr-3"><StatusPill status={v.status} /></td>}
                <td className="py-3 pr-4 text-right font-semibold text-ink-900">{formatCurrency(v.price)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={showStatus ? 6 : 5} className="p-8 text-center text-ink-400">No vehicles match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
