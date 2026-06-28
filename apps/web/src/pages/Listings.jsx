import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X, Frown, Star } from 'lucide-react'
import { vehicles, facets, modelsByMake } from '@shared/data'
import { formatCurrency, dealRating } from '@shared/lib'
import VehicleCard from '../components/VehicleCard.jsx'
import RangeSlider from '../components/RangeSlider.jsx'

const FUEL_OPTIONS = ['EV', 'Petrol', 'Diesel']

const SORTS = {
  relevance: { label: 'Best Match', fn: () => 0 },
  priceAsc: { label: 'Price: Low to High', fn: (a, b) => a.price - b.price },
  priceDesc: { label: 'Price: High to Low', fn: (a, b) => b.price - a.price },
  odometer: { label: 'Lowest Odometer', fn: (a, b) => a.mileage - b.mileage },
  newest: { label: 'Newest Year', fn: (a, b) => b.year - a.year },
  oldest: { label: 'Oldest Year', fn: (a, b) => a.year - b.year },
  safety: { label: 'Top Safety Rating', fn: (a, b) => (b.safety?.overall || 0) - (a.safety?.overall || 0) },
}

const ODO_MAX = Math.ceil(facets.odometerMax / 10000) * 10000

// All filters are read straight from the URL → listings are shareable/bookmarkable.
function readFilters(sp) {
  const list = (k) => (sp.get(k) ? sp.get(k).split(',').filter(Boolean) : [])
  const num = (k, d) => (sp.get(k) != null && sp.get(k) !== '' ? Number(sp.get(k)) : d)
  return {
    make: sp.get('make') || '',
    model: sp.get('model') || '',
    province: sp.get('province') || '',
    bodyStyle: list('bodyStyle'),
    fuelType: list('fuelType'),
    drivetrain: list('drivetrain'),
    transmission: list('transmission'),
    color: list('color'),
    yearMin: num('yearMin', facets.yearRange[0]),
    yearMax: num('yearMax', facets.yearRange[1]),
    priceMin: num('priceMin', facets.priceRange[0]),
    priceMax: num('priceMax', facets.priceRange[1]),
    odoMin: num('odoMin', 0),
    odoMax: num('odoMax', ODO_MAX),
    minSeats: num('minSeats', 0),
    minSafety: num('minSafety', 0),
    noAccidents: sp.get('noAccidents') === '1',
    oneOwner: sp.get('oneOwner') === '1',
    cleanTitle: sp.get('cleanTitle') === '1',
    noRecall: sp.get('noRecall') === '1',
    personalUse: sp.get('personalUse') === '1',
    deal: sp.get('deal') || '',
    sort: sp.get('sort') || 'relevance',
  }
}

function Section({ title, children }) {
  return (
    <div className="border-b border-ink-100 py-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900">{title}</h3>
      {children}
    </div>
  )
}

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
      }`}
    >
      {children}
    </button>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1.5">
      <span className="text-sm text-ink-700">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-ink-200'}`}>
        <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </label>
  )
}

const selectClass =
  'field-select h-10 w-full rounded-lg border border-ink-200 bg-white pl-3 text-sm text-ink-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-ink-50 disabled:text-ink-400'

function FilterPanel({ f, set, toggleMulti, reset }) {
  const models = f.make ? modelsByMake[f.make] || [] : facets.models
  return (
    <div>
      <Section title="Make & Model">
        <div className="space-y-2">
          <select value={f.make} onChange={(e) => set({ make: e.target.value, model: '' })} className={selectClass}>
            <option value="">Any Make</option>
            {facets.makes.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select value={f.model} onChange={(e) => set({ model: e.target.value })} className={selectClass}>
            <option value="">{f.make ? 'Any Model' : 'Any Model (all makes)'}</option>
            {models.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
      </Section>

      <Section title="Body Style">
        <div className="flex flex-wrap gap-2">
          {facets.bodyStyles.map((b) => (
            <Pill key={b} active={f.bodyStyle.includes(b)} onClick={() => toggleMulti('bodyStyle', b)}>{b}</Pill>
          ))}
        </div>
      </Section>

      <Section title="Price (Rs.)">
        <RangeSlider
          min={facets.priceRange[0]} max={facets.priceRange[1]} step={50000}
          low={f.priceMin} high={f.priceMax}
          onChange={(lo, hi) => set({ priceMin: lo, priceMax: hi })}
          prefix="Rs."
        />
      </Section>

      <Section title="Year">
        <div className="flex items-center gap-2">
          <select value={f.yearMin} onChange={(e) => set({ yearMin: Number(e.target.value) })} className={selectClass}>
            {Array.from({ length: facets.yearRange[1] - facets.yearRange[0] + 1 }, (_, i) => facets.yearRange[0] + i)
              .map((y) => <option key={y} value={y} disabled={y > f.yearMax}>{y}</option>)}
          </select>
          <span className="text-ink-400">-</span>
          <select value={f.yearMax} onChange={(e) => set({ yearMax: Number(e.target.value) })} className={selectClass}>
            {Array.from({ length: facets.yearRange[1] - facets.yearRange[0] + 1 }, (_, i) => facets.yearRange[0] + i)
              .map((y) => <option key={y} value={y} disabled={y < f.yearMin}>{y}</option>)}
          </select>
        </div>
      </Section>

      <Section title="Odometer (km)">
        <RangeSlider
          min={0} max={ODO_MAX} step={5000}
          low={f.odoMin} high={f.odoMax}
          onChange={(lo, hi) => set({ odoMin: lo, odoMax: hi })}
          suffix="km"
        />
      </Section>

      <Section title="Fuel">
        <div className="flex flex-wrap gap-2">
          {FUEL_OPTIONS.map((b) => (
            <Pill key={b} active={f.fuelType.includes(b)} onClick={() => toggleMulti('fuelType', b)}>{b}</Pill>
          ))}
        </div>
      </Section>

      <Section title="Drivetrain">
        <div className="flex flex-wrap gap-2">
          {facets.drivetrains.map((b) => (
            <Pill key={b} active={f.drivetrain.includes(b)} onClick={() => toggleMulti('drivetrain', b)}>{b}</Pill>
          ))}
        </div>
      </Section>

      <Section title="Transmission">
        <div className="flex flex-wrap gap-2">
          {facets.transmissions.map((b) => (
            <Pill key={b} active={f.transmission.includes(b)} onClick={() => toggleMulti('transmission', b)}>{b}</Pill>
          ))}
        </div>
      </Section>

      <Section title="Seats">
        <div className="flex flex-wrap gap-2">
          <Pill active={!f.minSeats} onClick={() => set({ minSeats: 0 })}>Any</Pill>
          {facets.seatOptions.map((s) => (
            <Pill key={s} active={f.minSeats === s} onClick={() => set({ minSeats: f.minSeats === s ? 0 : s })}>{s}+ seats</Pill>
          ))}
        </div>
      </Section>

      <Section title="Exterior Color">
        <div className="flex flex-wrap gap-2">
          {facets.colors.map((c) => (
            <Pill key={c} active={f.color.includes(c)} onClick={() => toggleMulti('color', c)}>{c}</Pill>
          ))}
        </div>
      </Section>

      <Section title="Location (Province)">
        <select value={f.province} onChange={(e) => set({ province: e.target.value })} className={selectClass}>
          <option value="">Anywhere in Nepal</option>
          {facets.provinces.map((p) => <option key={p}>{p}</option>)}
        </select>
      </Section>

      <Section title="Min Safety Rating">
        <div className="flex flex-wrap gap-2">
          {[0, 3, 4, 5].map((n) => (
            <Pill key={n} active={f.minSafety === n} onClick={() => set({ minSafety: n })}>
              {n === 0 ? 'Any' : <span className="inline-flex items-center gap-0.5">{n}+ <Star className="h-3 w-3 fill-current" /></span>}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Deal Rating">
        <select value={f.deal} onChange={(e) => set({ deal: e.target.value })} className={selectClass}>
          <option value="">Any price</option>
          <option value="great">Great deals only</option>
          <option value="good">Good deals or better</option>
        </select>
      </Section>

      <Section title="History">
        <Toggle label="No accidents reported" checked={f.noAccidents} onChange={(e) => set({ noAccidents: e.target.checked ? '1' : '' })} />
        <Toggle label="Single owner" checked={f.oneOwner} onChange={(e) => set({ oneOwner: e.target.checked ? '1' : '' })} />
        <Toggle label="Clean title only" checked={f.cleanTitle} onChange={(e) => set({ cleanTitle: e.target.checked ? '1' : '' })} />
        <Toggle label="No open recalls" checked={f.noRecall} onChange={(e) => set({ noRecall: e.target.checked ? '1' : '' })} />
        <Toggle label="Personal use only" checked={f.personalUse} onChange={(e) => set({ personalUse: e.target.checked ? '1' : '' })} />
      </Section>

      <button onClick={reset} className="mt-4 w-full rounded-lg border border-ink-200 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50">
        Reset all filters
      </button>
    </div>
  )
}

export default function Listings() {
  const [sp, setSp] = useSearchParams()
  const [drawer, setDrawer] = useState(false)
  const f = readFilters(sp)

  // Defaults that should drop out of the URL when unchanged (keeps URL + chips clean).
  const DEFAULTS = {
    yearMin: facets.yearRange[0], yearMax: facets.yearRange[1],
    priceMin: facets.priceRange[0], priceMax: facets.priceRange[1],
    odoMin: 0, odoMax: ODO_MAX, minSeats: 0, minSafety: 0, sort: 'relevance',
  }

  const set = (patch) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) {
      const isDefault = k in DEFAULTS && Number(v) === Number(DEFAULTS[k])
      if (v === '' || v == null || isDefault || (k === 'sort' && v === 'relevance')) next.delete(k)
      else next.set(k, String(v))
    }
    setSp(next, { replace: true })
  }

  const toggleMulti = (key, val) => {
    const cur = f[key]
    const nextArr = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]
    set({ [key]: nextArr.join(',') })
  }

  const reset = () => setSp({}, { replace: true })

  const results = useMemo(() => {
    const list = vehicles.filter((v) => {
      if (f.make && v.make !== f.make) return false
      if (f.model && v.model !== f.model) return false
      if (f.province && v.location.province !== f.province) return false
      if (f.bodyStyle.length && !f.bodyStyle.includes(v.bodyStyle)) return false
      if (f.fuelType.length && !f.fuelType.includes(v.fuelType)) return false
      if (f.drivetrain.length && !f.drivetrain.includes(v.drivetrain)) return false
      if (f.transmission.length && !f.transmission.includes(v.transmissionType)) return false
      if (f.color.length && !f.color.includes(v.exteriorColor)) return false
      if (v.year < f.yearMin || v.year > f.yearMax) return false
      if (v.price < f.priceMin || v.price > f.priceMax) return false
      if (v.mileage < f.odoMin || v.mileage > f.odoMax) return false
      if (f.minSeats && (v.seats || 0) < f.minSeats) return false
      if (f.minSafety && (!v.safety?.overall || v.safety.overall < f.minSafety)) return false
      if (f.noAccidents && !v.badges.noAccidents) return false
      if (f.oneOwner && !v.badges.oneOwner) return false
      if (f.cleanTitle && !v.badges.cleanTitle) return false
      if (f.noRecall && v.openRecall) return false
      if (f.personalUse && !v.badges.personalUse) return false
      // dealRating is only computed when the deal filter is active (avoids work per row)
      if (f.deal) {
        const tone = dealRating(v.price, v.marketValue)?.tone
        if (f.deal === 'great' && tone !== 'great') return false
        if (f.deal === 'good' && !['great', 'good'].includes(tone)) return false
      }
      return true
    })
    return [...list].sort((SORTS[f.sort] || SORTS.relevance).fn)
  }, [sp]) // eslint-disable-line react-hooks/exhaustive-deps

  // Removable chips for every active, non-default filter.
  const chips = []
  const addChip = (label, clear) => chips.push({ label, clear })
  if (f.make) addChip(f.make, () => set({ make: '', model: '' }))
  if (f.model) addChip(f.model, () => set({ model: '' }))
  f.bodyStyle.forEach((b) => addChip(b, () => toggleMulti('bodyStyle', b)))
  f.fuelType.forEach((b) => addChip(b, () => toggleMulti('fuelType', b)))
  f.drivetrain.forEach((b) => addChip(b, () => toggleMulti('drivetrain', b)))
  f.transmission.forEach((b) => addChip(b, () => toggleMulti('transmission', b)))
  f.color.forEach((c) => addChip(c, () => toggleMulti('color', c)))
  if (f.province) addChip(f.province, () => set({ province: '' }))
  if (f.minSeats) addChip(`${f.minSeats}+ seats`, () => set({ minSeats: 0 }))
  if (f.minSafety) addChip(`${f.minSafety}★+ safety`, () => set({ minSafety: 0 }))
  if (f.yearMin !== DEFAULTS.yearMin || f.yearMax !== DEFAULTS.yearMax)
    addChip(`${f.yearMin}-${f.yearMax}`, () => set({ yearMin: '', yearMax: '' }))
  if (f.priceMin !== DEFAULTS.priceMin || f.priceMax !== DEFAULTS.priceMax)
    addChip(`${formatCurrency(f.priceMin)}-${formatCurrency(f.priceMax)}`, () => set({ priceMin: '', priceMax: '' }))
  if (f.odoMin !== DEFAULTS.odoMin || f.odoMax !== DEFAULTS.odoMax)
    addChip(`${f.odoMin.toLocaleString()}-${f.odoMax.toLocaleString()} km`, () => set({ odoMin: '', odoMax: '' }))
  if (f.deal) addChip(f.deal === 'great' ? 'Great deals' : 'Good deals+', () => set({ deal: '' }))
  if (f.noAccidents) addChip('No accidents', () => set({ noAccidents: '' }))
  if (f.oneOwner) addChip('1-owner', () => set({ oneOwner: '' }))
  if (f.cleanTitle) addChip('Clean title', () => set({ cleanTitle: '' }))
  if (f.noRecall) addChip('No open recalls', () => set({ noRecall: '' }))
  if (f.personalUse) addChip('Personal use', () => set({ personalUse: '' }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Used Cars for Sale</h1>
        <p className="mt-1 text-ink-500">{results.length} vehicle{results.length !== 1 && 's'} match your search</p>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto card p-5">
            <FilterPanel f={f} set={set} toggleMulti={toggleMulti} reset={reset} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => setDrawer(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters{chips.length ? ` (${chips.length})` : ''}
            </button>
            <div className="ml-auto flex items-center gap-2">
              <label className="hidden text-sm text-ink-500 sm:block">Sort by</label>
              <select
                value={f.sort}
                onChange={(e) => set({ sort: e.target.value })}
                className="field-select h-10 rounded-lg border border-ink-200 bg-white pl-3 text-sm font-medium text-ink-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              >
                {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map((c, i) => (
                <button
                  key={i}
                  onClick={c.clear}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-100"
                >
                  {c.label} <X className="h-3 w-3" />
                </button>
              ))}
              <button onClick={reset} className="px-2 text-xs font-semibold text-ink-500 hover:text-ink-800 hover:underline">Clear all</button>
            </div>
          )}

          {results.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <Frown className="h-10 w-10 text-ink-300" />
              <p className="mt-3 font-display text-lg font-bold text-ink-900">No matches</p>
              <p className="mt-1 max-w-xs text-sm text-ink-500">Try widening your price, year, or odometer range, or clearing some filters.</p>
              <button onClick={reset} className="mt-4 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">Reset filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
            </div>
          )}
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink-900">Filters</h2>
              <button onClick={() => setDrawer(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterPanel f={f} set={set} toggleMulti={toggleMulti} reset={reset} />
            <button onClick={() => setDrawer(false)} className="mt-4 w-full rounded-full bg-brand-600 py-3 text-sm font-semibold text-white">
              Show {results.length} results
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
