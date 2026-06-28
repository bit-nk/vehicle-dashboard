import { useState } from 'react'
import { Search, CheckCircle2, AlertTriangle, Sparkles, Send, Hash } from 'lucide-react'
import { facets, modelsByMake, catalogYears, lookupSpecs, getVehicleByVin, vehicles } from '@shared/data'
import {
  normalizeVin, isValidVin, isValidEmail, isValidPhone, sanitizeText,
  formatCurrency, formatNumber,
} from '@shared/lib'

const inputClass =
  'h-11 w-full rounded-lg border border-ink-200 px-3 text-sm text-ink-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
const selectClass = `field-select ${inputClass} pl-3 bg-white`

const BLANK = {
  make: '', model: '', year: '', trim: '',
  engine: '', transmission: '', drivetrain: '', fuelType: '', bodyStyle: '', seats: '', kmplCity: '', kmplHwy: '',
  specsAuto: false,
  odometer: '', owners: '1', hadAccidents: 'no', accidentCount: '1', accidentSeverity: 'Minor Damage',
  serviced: 'yes', serviceCount: '', titleBrand: 'Clean', color: '',
  price: '', province: '', city: '', description: '',
  name: '', email: '', phone: '',
}

function Field({ label, children, required }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-600">{label}{required && ' *'}</span>
      {children}
    </label>
  )
}

function Card({ step, title, subtitle, children, tone }) {
  return (
    <section className="card p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${tone === 'auto' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'}`}>{step}</span>
        <div>
          <h2 className="font-display text-base font-bold text-ink-900">{title}</h2>
          {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export default function SellVehicle() {
  const [vin, setVin] = useState('')
  const [lookup, setLookup] = useState(null) // 'found' | 'notfound' | 'invalid' | null
  const [known, setKnown] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [ref, setRef] = useState('')

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const sampleVin = vehicles[0]?.vin

  const models = form.make ? modelsByMake[form.make] || [] : []
  const years = form.make && form.model ? catalogYears(form.make, form.model) : []

  function applySpecs(make, model, year) {
    const s = lookupSpecs(make, model, year)
    setForm((f) => ({
      ...f, make, model, year: year ? String(year) : f.year,
      ...(s
        ? { engine: s.engine, transmission: s.transmission, drivetrain: s.drivetrain, fuelType: s.fuelType, bodyStyle: s.bodyStyle, seats: String(s.seats ?? ''), kmplCity: s.kmplCity ?? '', kmplHwy: s.kmplHwy ?? '', specsAuto: true }
        : { specsAuto: false }),
    }))
  }

  // Reset vehicle/spec/condition fields (keep contact details the seller may have typed).
  const clearAutofill = () => setForm((f) => ({ ...BLANK, name: f.name, email: f.email, phone: f.phone }))

  function doLookup() {
    setError('')
    const clean = normalizeVin(vin)
    if (!isValidVin(clean)) { setLookup('invalid'); setKnown(false); clearAutofill(); return }
    const v = getVehicleByVin(clean)
    if (v) {
      setKnown(true); setLookup('found')
      setForm((f) => ({
        ...f,
        make: v.make, model: v.model, year: String(v.year), trim: v.trim,
        engine: v.engine, transmission: v.transmission, drivetrain: v.drivetrain, fuelType: v.fuelType,
        bodyStyle: v.bodyStyle, seats: String(v.seats ?? ''), kmplCity: v.kmplCity ?? '', kmplHwy: v.kmplHwy ?? '',
        specsAuto: true,
        odometer: String(v.mileage), owners: String(v.owners),
        hadAccidents: v.accidents > 0 ? 'yes' : 'no', accidentCount: String(v.accidents || 1),
        accidentSeverity: v.history.accidentRecords[0]?.severity || 'Minor Damage',
        serviced: v.serviceCount > 0 ? 'yes' : 'no', serviceCount: String(v.serviceCount),
        titleBrand: v.titleBrand, color: v.exteriorColor,
        price: String(v.price), province: v.location.province, city: v.location.city,
      }))
    } else {
      setKnown(false); setLookup('notfound'); clearAutofill()
    }
  }

  function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.make || !form.model || !form.year) return setError('Select your vehicle make, model and year.')
    if (!form.odometer) return setError('Enter the current odometer reading (km).')
    if (!form.price) return setError('Enter your asking price.')
    if (!sanitizeText(form.name)) return setError('Enter your name.')
    if (!isValidEmail(form.email)) return setError('Enter a valid email address.')
    if (form.phone && !isValidPhone(form.phone)) return setError('Enter a valid phone number.')
    setRef(`VS-${String(Date.now()).slice(-6)}`)
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-extrabold text-ink-900">Vehicle submitted</h1>
        <p className="mt-2 text-ink-500">
          Thanks! Your {form.year} {form.make} {form.model} has been submitted for review. Reference{' '}
          <span className="font-mono font-semibold text-ink-700">{ref}</span>. Our team will verify the details and list it, and contact you at {form.email}.
        </p>
        <div className="card mt-6 p-5 text-left text-sm">
          <div className="flex items-center justify-between"><span className="text-ink-500">Vehicle</span><span className="font-semibold">{form.year} {form.make} {form.model} {form.trim}</span></div>
          <div className="mt-2 flex items-center justify-between"><span className="text-ink-500">Odometer</span><span className="font-semibold">{formatNumber(Number(form.odometer))} km</span></div>
          <div className="mt-2 flex items-center justify-between"><span className="text-ink-500">Asking price</span><span className="font-semibold">{formatCurrency(Number(form.price))}</span></div>
          <div className="mt-2 flex items-center justify-between"><span className="text-ink-500">Accidents</span><span className="font-semibold">{form.hadAccidents === 'yes' ? `${form.accidentCount} (${form.accidentSeverity})` : 'None reported'}</span></div>
        </div>
        <button onClick={() => { setSubmitted(false); setForm(BLANK); setVin(''); setLookup(null); setKnown(false) }}
          className="mt-6 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          Submit another vehicle
        </button>
      </div>
    )
  }

  return (
    <>
      <section className="hero-mesh">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Sell your car</h1>
          <p className="mx-auto mt-3 max-w-xl text-brand-100/80">
            Enter your VIN and we'll pull what we already know. We auto-fill the specs - you just add the condition and your price.
          </p>
        </div>
      </section>

      <form onSubmit={submit} className="mx-auto -mt-8 max-w-3xl space-y-5 px-4 pb-16 sm:px-6">
        {/* 1. VIN lookup */}
        <Card step="1" title="Find your vehicle" subtitle="We'll pull the details on record if we recognise the VIN.">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Hash className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
              <input
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="Enter 17-character VIN (optional)"
                className={`${inputClass} pl-10 uppercase`}
                maxLength={17}
              />
            </div>
            <button type="button" onClick={doLookup} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 text-sm font-semibold text-white hover:bg-brand-700">
              <Search className="h-4 w-4" /> Look up
            </button>
          </div>
          {sampleVin && (
            <p className="mt-2 text-xs text-ink-400">Try a VIN on record: <button type="button" onClick={() => setVin(sampleVin)} className="font-semibold text-brand-600 hover:underline">{sampleVin}</button></p>
          )}
          {lookup === 'found' && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Found in our records - we've pre-filled the {form.year} {form.make} {form.model}. Review and edit anything below, then add your price.</span>
            </div>
          )}
          {lookup === 'notfound' && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>This VIN isn't on record yet. Select your make and model below - we'll auto-fill the specs, and you fill in the condition and history.</span>
            </div>
          )}
          {lookup === 'invalid' && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>That doesn't look like a valid 17-character VIN. You can still continue by selecting your vehicle below.</span>
            </div>
          )}
        </Card>

        {/* 2. Vehicle */}
        <Card step="2" title="Your vehicle" subtitle="Pick the make, model and year.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Make" required>
              <select value={form.make} onChange={(e) => applySpecs(e.target.value, '', '')} className={selectClass}>
                <option value="">Select make</option>
                {facets.makes.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Model" required>
              <select value={form.model} onChange={(e) => applySpecs(form.make, e.target.value, '')} disabled={!form.make} className={selectClass}>
                <option value="">{form.make ? 'Select model' : 'Select make first'}</option>
                {models.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Year" required>
              <select value={form.year} onChange={(e) => applySpecs(form.make, form.model, e.target.value)} disabled={!form.model} className={selectClass}>
                <option value="">{form.model ? 'Select year' : 'Select model first'}</option>
                {years.map((y) => <option key={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Trim (optional)">
              <input value={form.trim} onChange={upd('trim')} placeholder="e.g. XLE Premium" className={inputClass} />
            </Field>
          </div>
        </Card>

        {/* 3. Specs (auto-filled) */}
        <Card step={<Sparkles className="h-4 w-4" />} tone="auto" title="Specifications"
          subtitle={form.specsAuto ? 'Auto-filled from our vehicle database - edit if needed.' : 'Select your make and model above to auto-fill these.'}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Engine"><input value={form.engine} onChange={upd('engine')} className={inputClass} placeholder="-" /></Field>
            <Field label="Transmission"><input value={form.transmission} onChange={upd('transmission')} className={inputClass} placeholder="-" /></Field>
            <Field label="Drivetrain"><input value={form.drivetrain} onChange={upd('drivetrain')} className={inputClass} placeholder="-" /></Field>
            <Field label="Fuel type"><input value={form.fuelType} onChange={upd('fuelType')} className={inputClass} placeholder="-" /></Field>
            <Field label="Body style"><input value={form.bodyStyle} onChange={upd('bodyStyle')} className={inputClass} placeholder="-" /></Field>
            <Field label="Seats"><input value={form.seats} onChange={upd('seats')} className={inputClass} placeholder="-" /></Field>
          </div>
          {form.specsAuto && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" /> Specs pulled from our database
            </p>
          )}
        </Card>

        {/* 4. Condition & history */}
        <Card step="3" title="Condition & history"
          subtitle={known ? 'Pulled from records - confirm or update.' : 'Tell buyers about the car\'s history.'}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Current odometer (km)" required>
              <input type="number" value={form.odometer} onChange={upd('odometer')} placeholder="e.g. 45000" className={inputClass} />
            </Field>
            <Field label="Number of owners">
              <input type="number" min="1" value={form.owners} onChange={upd('owners')} className={inputClass} />
            </Field>
            <Field label="Has it been in any accidents?">
              <select value={form.hadAccidents} onChange={upd('hadAccidents')} className={selectClass}>
                <option value="no">No accidents</option>
                <option value="yes">Yes, reported accident(s)</option>
              </select>
            </Field>
            {form.hadAccidents === 'yes' ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="How many?"><input type="number" min="1" value={form.accidentCount} onChange={upd('accidentCount')} className={inputClass} /></Field>
                <Field label="Worst damage">
                  <select value={form.accidentSeverity} onChange={upd('accidentSeverity')} className={selectClass}>
                    {['Minor Damage', 'Moderate Damage', 'Severe Damage', 'Totaled'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
            ) : <div className="hidden sm:block" />}
            <Field label="Regularly serviced?">
              <select value={form.serviced} onChange={upd('serviced')} className={selectClass}>
                <option value="yes">Yes, has service records</option>
                <option value="no">No / unknown</option>
              </select>
            </Field>
            <Field label="Approx. service records">
              <input type="number" min="0" value={form.serviceCount} onChange={upd('serviceCount')} placeholder="e.g. 5" className={inputClass} disabled={form.serviced === 'no'} />
            </Field>
            <Field label="Title status">
              <select value={form.titleBrand} onChange={upd('titleBrand')} className={selectClass}>
                {['Clean', 'Rebuilt', 'Written-off', 'Reconditioned'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Exterior color">
              <input value={form.color} onChange={upd('color')} placeholder="e.g. Pearl White" className={inputClass} />
            </Field>
          </div>
        </Card>

        {/* 5. Listing */}
        <Card step="4" title="Your listing" subtitle="Set your price and where the car is.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Asking price (Rs.)" required>
              <input type="number" value={form.price} onChange={upd('price')} placeholder="e.g. 2500000" className={inputClass} />
            </Field>
            <Field label="Province">
              <select value={form.province} onChange={upd('province')} className={selectClass}>
                <option value="">Select province</option>
                {facets.provinces.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="City / town">
              <input value={form.city} onChange={upd('city')} placeholder="e.g. Kathmandu" className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea value={form.description} onChange={upd('description')} rows={3} placeholder="Anything else buyers should know (modifications, extras, reason for sale)..."
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
              </Field>
            </div>
          </div>
        </Card>

        {/* 6. Contact */}
        <Card step="5" title="Contact details" subtitle="So buyers (and our team) can reach you.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Name" required><input value={form.name} onChange={upd('name')} className={inputClass} /></Field>
            <Field label="Email" required><input type="email" value={form.email} onChange={upd('email')} placeholder="you@example.com" className={inputClass} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={upd('phone')} placeholder="+977 98XX-XXXXXX" className={inputClass} /></Field>
          </div>
        </Card>

        {error && <p className="text-sm font-semibold text-rose-600" role="alert">{error}</p>}

        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-4 font-semibold text-white shadow-sm transition hover:bg-brand-700">
          <Send className="h-4 w-4" /> Submit my vehicle
        </button>
        <p className="text-center text-xs text-ink-400">We'll review your submission and contact you before it goes live.</p>
      </form>
    </>
  )
}
