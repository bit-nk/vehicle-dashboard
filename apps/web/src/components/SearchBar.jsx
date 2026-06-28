import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Hash, ScanLine, Car } from 'lucide-react'
import { facets, vehicles } from '@shared/data'
import { normalizeVin, isValidVin, sanitizePlate } from '@shared/lib'

const TABS = [
  { key: 'vin', label: 'VIN', icon: Hash, placeholder: 'Enter 17-digit VIN' },
  { key: 'plate', label: 'License Plate', icon: ScanLine, placeholder: 'Plate number' },
  { key: 'mm', label: 'Make & Model', icon: Car, placeholder: '' },
]

// Reusable hero search. `variant="report"` defaults to VIN and routes to reports;
// otherwise the Make & Model tab routes into listings.
export default function SearchBar({ variant = 'home' }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState(variant === 'report' ? 'vin' : 'mm')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [plateState, setPlateState] = useState('Bagmati')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')

  const models = make ? [...new Set(vehicles.filter((v) => v.make === make).map((v) => v.model))].sort() : []

  function submit(e) {
    e.preventDefault()
    setError('')
    if (tab === 'vin') {
      const vin = normalizeVin(text)
      if (!vin) return setError('Enter a VIN to search.')
      if (!isValidVin(vin)) return setError('That doesn’t look like a valid 17-character VIN.')
      navigate(`/report/${encodeURIComponent(vin)}`)
    } else if (tab === 'plate') {
      const plate = sanitizePlate(text)
      if (!plate) return setError('Enter a license plate number.')
      // Demo: plate lookup resolves to the first vehicle's report.
      navigate(`/report/${vehicles[0].vin}?plate=${encodeURIComponent(plate)}&state=${plateState}`)
    } else {
      const params = new URLSearchParams()
      if (make) params.set('make', make)
      if (model) params.set('model', model)
      navigate(`/listings?${params.toString()}`)
    }
  }

  const active = TABS.find((t) => t.key === tab)

  return (
    <div className="w-full">
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const on = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
                on ? 'bg-white text-brand-700 shadow-sm' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      <form onSubmit={submit} className="rounded-b-xl rounded-tr-xl bg-white p-3 shadow-xl sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          {tab === 'mm' ? (
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={make}
                onChange={(e) => { setMake(e.target.value); setModel('') }}
                className="h-12 rounded-lg border border-ink-200 field-select bg-white pl-3 text-ink-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              >
                <option value="">Any Make</option>
                {facets.makes.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!make}
                className="h-12 rounded-lg border border-ink-200 field-select bg-white pl-3 text-ink-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-ink-50 disabled:text-ink-400"
              >
                <option value="">{make ? 'Any Model' : 'Select make first'}</option>
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          ) : (
            <div className="flex flex-1 gap-3">
              {tab === 'plate' && (
                <select
                  value={plateState}
                  onChange={(e) => setPlateState(e.target.value)}
                  className="h-12 w-40 rounded-lg border border-ink-200 field-select bg-white pl-3 text-ink-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                >
                  {['Bagmati', 'Gandaki', 'Lumbini', 'Koshi', 'Madhesh', 'Karnali', 'Sudurpashchim'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={active.placeholder}
                  className="h-12 w-full rounded-lg border border-ink-200 bg-white pl-10 pr-3 text-ink-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-600 px-7 font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Search className="h-5 w-5" />
            {tab === 'mm' ? 'Browse' : 'Search'}
          </button>
        </div>
        {error && (
          <p className="mt-2 px-1 text-xs font-semibold text-rose-600" role="alert">{error}</p>
        )}
        {variant === 'report' && tab === 'vin' && (
          <p className="mt-2 px-1 text-xs text-ink-400">
            Try a sample VIN: <button type="button" onClick={() => setText(vehicles[0].vin)} className="font-semibold text-brand-600 hover:underline">{vehicles[0].vin}</button>
          </p>
        )}
      </form>
    </div>
  )
}
