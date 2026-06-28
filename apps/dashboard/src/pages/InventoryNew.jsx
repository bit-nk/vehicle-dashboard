import { useState } from 'react'
import { useNavigate, useOutletContext, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react'
import { normalizeVin, sanitizeText, iso } from '@shared/lib'
import { facets, modelsByMake, catalogYears, lookupSpecs, getVehicleByVin } from '@shared/data'
import { useDealer } from '../store/DealerStore.jsx'
import { branchesForDealership, TODAY } from '../data/dealer.js'
import { VEHICLE_STATUS, STATUS_KEYS } from '../components/StatusPill.jsx'

const input = 'h-10 w-full rounded-lg border border-ink-200 bg-[var(--surface)] px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
const selectClass = `field-select ${input}`
const small = 'h-9 w-full rounded-lg border border-ink-200 bg-[var(--surface)] px-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
const SEVERITIES = ['Minor Damage', 'Moderate Damage', 'Severe Damage', 'Totaled']
const IMPACTS = ['Front', 'Rear', 'Left side', 'Right side', 'Roof', 'Undercarriage']
const SVC_TYPES = ['Maintenance', 'Repair', 'Inspection']

function Section({ title, hint, children }) {
  return (
    <div className="card p-5">
      <h2 className="font-display text-base font-bold text-ink-900">{title}</h2>
      {hint && <p className="mb-3 mt-0.5 text-xs text-ink-400">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </div>
  )
}

export default function InventoryNew() {
  const navigate = useNavigate()
  const { dealershipId } = useOutletContext()
  const { addVehicle } = useDealer()
  const branches = branchesForDealership(dealershipId)
  const [f, setF] = useState({ vin: '', make: '', model: '', year: '', engine: '', transmission: '', drivetrain: '', fuelType: '', bodyStyle: '', seats: '', odometer: '', price: '', status: 'in_stock', branchId: branches[0]?.id || '', exteriorColor: '', interiorColor: '', owners: 1, photoUrl: '' })
  const [svcRows, setSvcRows] = useState([])
  const [accRows, setAccRows] = useState([])
  const [msg, setMsg] = useState('')
  const upd = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const models = f.make ? modelsByMake[f.make] || [] : []
  const years = f.make && f.model ? catalogYears(f.make, f.model) : []

  function applySpecs(make, model, year) {
    const s = lookupSpecs(make, model, year)
    setF((p) => ({ ...p, make, model, year: year ? String(year) : '', ...(s ? { engine: s.engine, transmission: s.transmission, drivetrain: s.drivetrain, fuelType: s.fuelType, bodyStyle: s.bodyStyle, seats: String(s.seats ?? '') } : {}) }))
  }
  function lookupVin() {
    const v = getVehicleByVin(normalizeVin(f.vin))
    if (v) { setMsg(`Found ${v.year} ${v.make} ${v.model} in records - details pre-filled.`); setF((p) => ({ ...p, make: v.make, model: v.model, year: String(v.year), engine: v.engine, transmission: v.transmission, drivetrain: v.drivetrain, fuelType: v.fuelType, bodyStyle: v.bodyStyle, seats: String(v.seats ?? ''), exteriorColor: v.exteriorColor, interiorColor: v.interiorColor || '', odometer: String(v.mileage) })) }
    else setMsg('VIN not on record - enter the details below.')
  }

  const addSvc = () => setSvcRows((r) => [...r, { date: '', mileage: '', items: '', type: 'Maintenance', provider: '', cost: '' }])
  const setSvc = (i, k, val) => setSvcRows((r) => r.map((x, idx) => (idx === i ? { ...x, [k]: val } : x)))
  const delSvc = (i) => setSvcRows((r) => r.filter((_, idx) => idx !== i))
  const addAcc = () => setAccRows((r) => [...r, { date: '', severity: 'Minor Damage', impact: 'Front', desc: '' }])
  const setAcc = (i, k, val) => setAccRows((r) => r.map((x, idx) => (idx === i ? { ...x, [k]: val } : x)))
  const delAcc = (i) => setAccRows((r) => r.filter((_, idx) => idx !== i))

  function submit(e) {
    e.preventDefault()
    if (!f.make || !f.model || !f.year || !f.price) { setMsg('Make, model, year and price are required (everything else is optional).'); return }
    const id = `add-${Date.now()}`
    const owners = Math.max(1, Number(f.owners) || 1)
    const serviceRecords = svcRows.filter((r) => r.date || r.items).map((r) => ({
      date: r.date, mileage: Number(r.mileage) || 0, odometer: Number(r.mileage) || 0,
      items: (r.items || '').split(',').map((s) => s.trim()).filter(Boolean), type: r.type || 'Maintenance',
      provider: sanitizeText(r.provider, 60), labourCost: 0, partsCost: 0, totalCost: Number(r.cost) || 0,
    }))
    const accidentRecords = accRows.filter((r) => r.date || r.desc).map((r) => ({
      date: r.date, severity: r.severity, pointOfImpact: r.impact, damageLocation: r.impact,
      desc: sanitizeText(r.desc, 240), source: 'Manual entry',
    }))
    const ownership = Array.from({ length: owners }, (_, i) => ({ idx: i + 1, type: 'Personal', province: '', durationYears: 1 }))
    const price = Number(f.price)
    addVehicle({
      id, vin: normalizeVin(f.vin) || `PENDING-${String(Date.now()).slice(-8)}`, stockNo: `STK-${String(Date.now()).slice(-4)}`,
      year: Number(f.year), make: f.make, model: f.model, trim: '', bodyStyle: f.bodyStyle || 'Sedan',
      engine: sanitizeText(f.engine, 60), transmission: sanitizeText(f.transmission, 40), drivetrain: sanitizeText(f.drivetrain, 20),
      fuelType: sanitizeText(f.fuelType, 20) || 'Petrol', seats: Number(f.seats) || 5,
      exteriorColor: sanitizeText(f.exteriorColor, 40) || 'Unspecified', interiorColor: sanitizeText(f.interiorColor, 40), colorHex: '#5d6066',
      mileage: Number(f.odometer) || 0, price, marketValue: price, landedCostNpr: Math.round(price * 0.82),
      status: f.status, branchId: f.branchId, source: 'Manual entry', arrivedOn: iso(TODAY), titleBrand: 'Clean', use: 'Personal',
      owners, accidents: accidentRecords.length, serviceCount: serviceRecords.length, recallCount: 0,
      badges: { cleanTitle: true, oneOwner: owners === 1, noAccidents: accidentRecords.length === 0, serviceRecords: serviceRecords.length > 0, personalUse: true },
      history: { serviceRecords, accidentRecords, ownership, recalls: [], titleRecords: [], odometer: [] },
      photo: f.photoUrl ? { thumbUrl: f.photoUrl, fullUrl: f.photoUrl, sourceUrl: f.photoUrl, author: '', license: '', licenseUrl: '' } : null,
    })
    navigate(`/inventory/${id}`)
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => navigate('/inventory')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" /> Inventory</button>
        <button type="submit" className="btn bg-brand-600 text-white hover:bg-brand-700"><Check className="h-4 w-4" /> Add to inventory</button>
      </div>

      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Add a vehicle</h1>
        <p className="text-sm text-ink-500">Only make, model, year &amp; price are required - service history, accidents and a photo are optional.</p>
      </div>

      <Section title="Identity & specs">
        <div className="flex gap-2">
          <input value={f.vin} onChange={upd('vin')} placeholder="VIN (optional - look up to auto-fill)" className={`${input} uppercase`} maxLength={17} />
          <button type="button" onClick={lookupVin} className="shrink-0 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">Look up</button>
        </div>
        {msg && <p className="mt-2 text-xs font-medium text-ink-500">{msg}</p>}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select value={f.make} onChange={(e) => applySpecs(e.target.value, '', '')} className={selectClass}><option value="">Make *</option>{facets.makes.map((m) => <option key={m}>{m}</option>)}</select>
          <select value={f.model} onChange={(e) => applySpecs(f.make, e.target.value, '')} disabled={!f.make} className={selectClass}><option value="">Model *</option>{models.map((m) => <option key={m}>{m}</option>)}</select>
          <select value={f.year} onChange={(e) => applySpecs(f.make, f.model, e.target.value)} disabled={!f.model} className={selectClass}><option value="">Year *</option>{years.map((y) => <option key={y}>{y}</option>)}</select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <input value={f.engine} onChange={upd('engine')} placeholder="Engine" className={input} />
          <input value={f.transmission} onChange={upd('transmission')} placeholder="Transmission" className={input} />
          <input value={f.drivetrain} onChange={upd('drivetrain')} placeholder="Drivetrain" className={input} />
          <input value={f.fuelType} onChange={upd('fuelType')} placeholder="Fuel" className={input} />
          <input value={f.bodyStyle} onChange={upd('bodyStyle')} placeholder="Body style" className={input} />
          <input type="number" value={f.seats} onChange={upd('seats')} placeholder="Seats" className={input} />
          <input value={f.exteriorColor} onChange={upd('exteriorColor')} placeholder="Exterior color" className={input} />
          <input value={f.interiorColor} onChange={upd('interiorColor')} placeholder="Interior color" className={input} />
          <input type="number" value={f.odometer} onChange={upd('odometer')} placeholder="Odometer (km)" className={input} />
        </div>
      </Section>

      <Section title="Commercial">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input type="number" value={f.price} onChange={upd('price')} placeholder="Price (Rs.) *" className={input} />
          <select value={f.status} onChange={upd('status')} className={selectClass}>{STATUS_KEYS.map((k) => <option key={k} value={k}>{VEHICLE_STATUS[k].label}</option>)}</select>
          <select value={f.branchId} onChange={upd('branchId')} className={selectClass}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <input type="number" min={1} value={f.owners} onChange={upd('owners')} placeholder="Previous owners" className={input} />
        </div>
      </Section>

      <Section title="Previous service records" hint="Optional - add any known prior servicing.">
        <div className="space-y-2">
          {svcRows.map((r, i) => (
            <div key={i} className="grid grid-cols-2 items-center gap-2 rounded-lg border border-ink-100 p-2 sm:grid-cols-12">
              <input type="date" value={r.date} onChange={(e) => setSvc(i, 'date', e.target.value)} className={`${small} sm:col-span-3`} />
              <input type="number" value={r.mileage} onChange={(e) => setSvc(i, 'mileage', e.target.value)} placeholder="km" className={`${small} sm:col-span-2`} />
              <input value={r.items} onChange={(e) => setSvc(i, 'items', e.target.value)} placeholder="Items (comma-separated)" className={`${small} sm:col-span-3`} />
              <select value={r.type} onChange={(e) => setSvc(i, 'type', e.target.value)} className={`field-select ${small} sm:col-span-2`}>{SVC_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              <input type="number" value={r.cost} onChange={(e) => setSvc(i, 'cost', e.target.value)} placeholder="Cost" className={`${small} sm:col-span-1`} />
              <button type="button" onClick={() => delSvc(i)} className="grid h-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 sm:col-span-1"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addSvc} className="btn-sm mt-2 border border-ink-200 text-ink-700 hover:bg-ink-50"><Plus className="h-4 w-4" /> Add service record</button>
      </Section>

      <Section title="Accident / damage records" hint="Optional - declare any known accidents.">
        <div className="space-y-2">
          {accRows.map((r, i) => (
            <div key={i} className="grid grid-cols-2 items-center gap-2 rounded-lg border border-ink-100 p-2 sm:grid-cols-12">
              <input type="date" value={r.date} onChange={(e) => setAcc(i, 'date', e.target.value)} className={`${small} sm:col-span-3`} />
              <select value={r.severity} onChange={(e) => setAcc(i, 'severity', e.target.value)} className={`field-select ${small} sm:col-span-3`}>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select>
              <select value={r.impact} onChange={(e) => setAcc(i, 'impact', e.target.value)} className={`field-select ${small} sm:col-span-2`}>{IMPACTS.map((s) => <option key={s}>{s}</option>)}</select>
              <input value={r.desc} onChange={(e) => setAcc(i, 'desc', e.target.value)} placeholder="Description" className={`${small} sm:col-span-3`} />
              <button type="button" onClick={() => delAcc(i)} className="grid h-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 sm:col-span-1"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addAcc} className="btn-sm mt-2 border border-ink-200 text-ink-700 hover:bg-ink-50"><Plus className="h-4 w-4" /> Add accident record</button>
      </Section>

      <Section title="Photo" hint="Optional - paste an image URL for the listing.">
        <input value={f.photoUrl} onChange={upd('photoUrl')} placeholder="https://… image URL" className={input} />
        {f.photoUrl && <img src={f.photoUrl} alt="" className="mt-3 max-h-40 rounded-lg border border-ink-100 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />}
      </Section>

      <div className="flex justify-end gap-2 pb-4">
        <Link to="/inventory" className="btn border border-ink-200 text-ink-600 hover:bg-ink-50">Cancel</Link>
        <button type="submit" className="btn bg-brand-600 text-white hover:bg-brand-700"><Check className="h-4 w-4" /> Add to inventory</button>
      </div>
    </form>
  )
}
