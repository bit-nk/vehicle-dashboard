import { useState } from 'react'
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Check, Trash2, BadgeDollarSign, X, Cog, Car, Fuel, Gauge, Palette, MapPin,
  Wrench, ShieldAlert, Users, AlertTriangle,
} from 'lucide-react'
import { VehiclePhoto, Badge } from '@shared/ui'
import { formatCurrency, formatNumber, vehicleTitle, sanitizeText, isValidPhone, isValidEmail } from '@shared/lib'
import { useDealer } from '../store/DealerStore.jsx'
import { branchById, branchesForDealership, repsForBranch, fmtDate } from '../data/dealer.js'
import StatusPill, { VEHICLE_STATUS, STATUS_KEYS } from '../components/StatusPill.jsx'

const field = 'h-9 w-full rounded-lg border border-ink-200 bg-[var(--surface)] px-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'

function Spec({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-brand-500" />
      <div className="min-w-0"><p className="text-[11px] text-ink-400">{label}</p><p className="truncate text-sm font-semibold text-ink-800">{value ?? '-'}</p></div>
    </div>
  )
}
function Ef({ label, children }) { return <label className="block"><span className="text-[11px] font-medium text-ink-400">{label}</span>{children}</label> }
function Card({ title, icon: Icon, count, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-3">
        {Icon && <Icon className="h-4 w-4 text-brand-600" />}<h2 className="font-display text-base font-bold text-ink-900">{title}</h2>
        {count != null && <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-500">{count}</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function SellModal({ vehicle, onClose, onSell }) {
  const reps = repsForBranch(vehicle.branchId)
  const [f, setF] = useState({ name: '', phone: '', email: '', address: '', pan: '', price: vehicle.price || '', repId: reps[0]?.id || '', financeType: 'cash', paymentMethod: 'Bank Transfer' })
  const [err, setErr] = useState('')
  const upd = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const input = 'h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
  function submit(e) {
    e.preventDefault()
    const name = sanitizeText(f.name, 80)
    if (!name) return setErr('Buyer name is required.')
    if (f.phone && !isValidPhone(f.phone)) return setErr('Enter a valid phone number.')
    if (f.email && !isValidEmail(f.email)) return setErr('Enter a valid email address.')
    onSell({ vehicleId: vehicle.id, repId: f.repId, priceNpr: Number(f.price) || vehicle.price, buyer: { name, phone: f.phone, email: f.email, address: f.address, pan: f.pan }, financeType: f.financeType, paymentMethod: f.paymentMethod })
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[var(--surface)] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-100 p-5"><div><h2 className="font-display text-lg font-bold text-ink-900">Sell vehicle</h2><p className="text-xs text-ink-400">{vehicle.year} {vehicle.make} {vehicle.model} · {vehicle.stockNo}</p></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" /></button></div>
        <form onSubmit={submit} className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <input value={f.name} onChange={upd('name')} placeholder="Buyer name *" className={input} />
            <input value={f.phone} onChange={upd('phone')} placeholder="Phone" className={input} />
            <input value={f.email} onChange={upd('email')} placeholder="Email" className={input} />
            <input value={f.pan} onChange={upd('pan')} placeholder="Buyer PAN" className={input} />
          </div>
          <input value={f.address} onChange={upd('address')} placeholder="Address" className={input} />
          <div className="grid grid-cols-2 gap-3">
            <Ef label="Sale price (Rs.)"><input type="number" value={f.price} onChange={upd('price')} className={input} /></Ef>
            <Ef label="Salesperson"><select value={f.repId} onChange={upd('repId')} className={`field-select ${input} bg-[var(--surface)]`}>{reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Ef>
            <Ef label="Finance"><select value={f.financeType} onChange={upd('financeType')} className={`field-select ${input} bg-[var(--surface)]`}>{['cash', 'loan', 'lease'].map((m) => <option key={m} value={m}>{m}</option>)}</select></Ef>
            <Ef label="Payment"><select value={f.paymentMethod} onChange={upd('paymentMethod')} className={`field-select ${input} bg-[var(--surface)]`}>{['Bank Transfer', 'Cash', 'Card', 'Cheque'].map((m) => <option key={m}>{m}</option>)}</select></Ef>
          </div>
          {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}
          <button type="submit" className="btn w-full bg-brand-600 text-white hover:bg-brand-700"><BadgeDollarSign className="h-4 w-4" /> Record sale &amp; create bill</button>
        </form>
      </div>
    </div>
  )
}

export default function InventoryVehicle() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const { role, dealershipId } = useOutletContext()
  const { inventory, updateVehicle, removeVehicle, createSale } = useDealer()
  const v = inventory.find((x) => x.id === vehicleId)
  const showStatus = !['Parts', 'Service'].includes(role)
  const myBranches = branchesForDealership(dealershipId)
  const [edit, setEdit] = useState(false)
  const [selling, setSelling] = useState(false)
  const [f, setF] = useState({})

  if (!v) return <div className="py-24 text-center text-ink-400">Vehicle not found. <Link to="/inventory" className="font-semibold text-brand-600">Back to Inventory</Link></div>

  const h = v.history || {}
  const svc = h.serviceRecords || []
  const accidents = h.accidentRecords || []
  const owners = h.ownership || []
  const recalls = h.recalls || []
  const margin = v.price && v.landedCostNpr ? v.price - v.landedCostNpr : null
  const upd = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  function startEdit() {
    setF({ price: v.price, status: v.status, branchId: v.branchId, mileage: v.mileage, exteriorColor: v.exteriorColor, interiorColor: v.interiorColor, engine: v.engine, transmission: v.transmission, drivetrain: v.drivetrain, fuelType: v.fuelType, bodyStyle: v.bodyStyle, seats: v.seats })
    setEdit(true)
  }
  function save() {
    updateVehicle(v.id, {
      price: Number(f.price) || v.price, ...(showStatus ? { status: f.status } : {}), branchId: f.branchId,
      mileage: Number(f.mileage) || v.mileage, exteriorColor: sanitizeText(f.exteriorColor, 40) || v.exteriorColor,
      interiorColor: sanitizeText(f.interiorColor, 40), engine: sanitizeText(f.engine, 60), transmission: sanitizeText(f.transmission, 40),
      drivetrain: sanitizeText(f.drivetrain, 20), fuelType: sanitizeText(f.fuelType, 20), bodyStyle: sanitizeText(f.bodyStyle, 30), seats: Number(f.seats) || v.seats,
    })
    setEdit(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate('/inventory')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" /> Inventory</button>
        <div className="flex flex-wrap items-center gap-2">
          {showStatus && <StatusPill status={v.status} />}
          {showStatus && !edit && (
            <select value={v.status} onChange={(e) => updateVehicle(v.id, { status: e.target.value })} title="Change status"
              className="field-select h-8 rounded-lg border border-ink-200 bg-[var(--surface)] pl-2.5 pr-7 text-xs font-semibold text-ink-700 outline-none focus:border-brand-500">
              {STATUS_KEYS.map((k) => <option key={k} value={k}>{VEHICLE_STATUS[k].label}</option>)}
            </select>
          )}
          {edit ? (
            <>
              <button onClick={() => setEdit(false)} className="btn border border-ink-200 text-ink-600 hover:bg-ink-50">Cancel</button>
              <button onClick={save} className="btn bg-brand-600 text-white hover:bg-brand-700"><Check className="h-4 w-4" /> Save changes</button>
            </>
          ) : (
            <>
              <button onClick={startEdit} className="btn border border-ink-200 text-ink-700 hover:bg-ink-50"><Pencil className="h-4 w-4" /> Edit</button>
              {v.status !== 'sold' && <button onClick={() => setSelling(true)} className="btn bg-brand-600 text-white hover:bg-brand-700"><BadgeDollarSign className="h-4 w-4" /> Sell</button>}
              <button onClick={() => { if (confirm('Remove this vehicle from inventory?')) { removeVehicle(v.id); navigate('/inventory') } }} className="btn-icon border border-ink-200 text-rose-600 hover:bg-rose-50" title="Remove"><Trash2 className="h-4 w-4" /></button>
            </>
          )}
        </div>
      </div>

      {/* header: photo + title + price */}
      <div className="card overflow-hidden">
        <div className="relative aspect-[16/7] bg-ink-100"><VehiclePhoto vehicle={v} eager /></div>
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">{vehicleTitle(v)}</h1>
            <p className="font-mono text-xs text-ink-400">VIN {v.vin} · {v.stockNo} · {branchById(v.branchId)?.name}</p>
          </div>
          <div className="text-right">
            <span className="block font-display text-2xl font-extrabold text-ink-900">{formatCurrency(v.price)}</span>
            {margin != null && <span className="text-xs text-ink-400">margin {formatCurrency(margin)}</span>}
          </div>
        </div>
      </div>

      {/* editable core fields */}
      {edit ? (
        <Card title="Edit vehicle" icon={Pencil}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Ef label="Price (Rs.)"><input type="number" value={f.price} onChange={upd('price')} className={field} /></Ef>
            <Ef label="Odometer (km)"><input type="number" value={f.mileage} onChange={upd('mileage')} className={field} /></Ef>
            {showStatus && <Ef label="Status"><select value={f.status} onChange={upd('status')} className={`field-select ${field} bg-[var(--surface)]`}>{STATUS_KEYS.map((k) => <option key={k} value={k}>{VEHICLE_STATUS[k].label}</option>)}</select></Ef>}
            <Ef label="Branch"><select value={f.branchId} onChange={upd('branchId')} className={`field-select ${field} bg-[var(--surface)]`}>{myBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Ef>
            <Ef label="Exterior color"><input value={f.exteriorColor} onChange={upd('exteriorColor')} className={field} /></Ef>
            <Ef label="Interior color"><input value={f.interiorColor} onChange={upd('interiorColor')} className={field} /></Ef>
            <Ef label="Engine"><input value={f.engine} onChange={upd('engine')} className={field} /></Ef>
            <Ef label="Transmission"><input value={f.transmission} onChange={upd('transmission')} className={field} /></Ef>
            <Ef label="Drivetrain"><input value={f.drivetrain} onChange={upd('drivetrain')} className={field} /></Ef>
            <Ef label="Fuel"><input value={f.fuelType} onChange={upd('fuelType')} className={field} /></Ef>
            <Ef label="Body style"><input value={f.bodyStyle} onChange={upd('bodyStyle')} className={field} /></Ef>
            <Ef label="Seats"><input type="number" value={f.seats} onChange={upd('seats')} className={field} /></Ef>
          </div>
        </Card>
      ) : (
        <Card title="Specifications" icon={Cog}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Spec icon={Car} label="Year" value={v.year} />
            <Spec icon={Gauge} label="Odometer" value={`${formatNumber(v.mileage)} km`} />
            <Spec icon={Cog} label="Transmission" value={v.transmission} />
            <Spec icon={Fuel} label="Fuel" value={v.fuelType} />
            <Spec icon={Car} label="Drivetrain" value={v.drivetrain} />
            <Spec icon={Cog} label="Engine" value={v.engine} />
            <Spec icon={Palette} label="Exterior" value={v.exteriorColor} />
            <Spec icon={Palette} label="Interior" value={v.interiorColor} />
            <Spec icon={Car} label="Seats" value={v.seats} />
            <Spec icon={Car} label="Body" value={v.bodyStyle} />
            <Spec icon={MapPin} label="Branch" value={branchById(v.branchId)?.name} />
            <Spec icon={BadgeDollarSign} label="Landed cost" value={formatCurrency(v.landedCostNpr)} />
          </div>
        </Card>
      )}

      {/* history snapshot */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="card p-3 text-center"><p className="text-[11px] text-ink-400">Owners</p><p className="font-display text-lg font-bold text-ink-900">{v.owners ?? owners.length}</p></div>
        <div className="card p-3 text-center"><p className="text-[11px] text-ink-400">Accidents</p><p className="font-display text-lg font-bold text-ink-900">{v.accidents ?? accidents.length}</p></div>
        <div className="card p-3 text-center"><p className="text-[11px] text-ink-400">Service records</p><p className="font-display text-lg font-bold text-ink-900">{v.serviceCount ?? svc.length}</p></div>
        <div className="card p-3 text-center"><p className="text-[11px] text-ink-400">Recalls</p><p className="font-display text-lg font-bold text-ink-900">{v.recallCount ?? recalls.length}</p></div>
        <div className="card p-3 text-center"><p className="text-[11px] text-ink-400">Title</p><p className="font-display text-sm font-bold text-ink-900">{v.titleBrand || 'Clean'}</p></div>
        <div className="card p-3 text-center"><p className="text-[11px] text-ink-400">Use</p><p className="font-display text-sm font-bold text-ink-900">{v.use || 'Personal'}</p></div>
      </div>

      <Card title="Service history" icon={Wrench} count={svc.length}>
        {svc.length === 0 ? <p className="text-sm text-ink-400">No service records on file.</p> : (
          <ul className="space-y-2">
            {svc.map((s, i) => (
              <li key={i} className="rounded-lg border border-ink-100 p-3 text-sm">
                <div className="flex items-center justify-between"><span className="font-semibold text-ink-800">{fmtDate(s.date)} · {formatNumber(s.mileage)} km</span><Badge tone={s.type === 'Repair' ? 'amber' : 'blue'}>{s.type}</Badge></div>
                <p className="mt-0.5 text-ink-600">{(s.items || []).join(' · ')}</p>
                {(s.provider || s.totalCost != null) && <p className="mt-0.5 text-xs text-ink-400">{s.provider}{s.totalCost != null ? ` · ${formatCurrency(s.totalCost)}` : ''}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {accidents.length > 0 && (
        <Card title="Accident & damage" icon={AlertTriangle} count={accidents.length}>
          <ul className="space-y-2">
            {accidents.map((a, i) => (
              <li key={i} className="rounded-lg border border-ink-100 p-3 text-sm">
                <div className="flex items-center justify-between"><span className="font-semibold text-ink-800">{fmtDate(a.date)} · {a.severity}</span><Badge tone="amber">{a.pointOfImpact || a.damageLocation}</Badge></div>
                <p className="mt-0.5 text-ink-600">{a.desc}</p>
                <p className="mt-0.5 text-xs text-ink-400">{[a.airbagDeployed, a.structuralDamage, a.source].filter(Boolean).join(' · ')}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Ownership" icon={Users} count={owners.length}>
          {owners.length === 0 ? <p className="text-sm text-ink-400">No ownership records.</p> : (
            <ul className="space-y-2 text-sm">
              {owners.map((o, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
                  <span className="text-ink-700">Owner {o.idx} · {o.type}</span>
                  <span className="text-xs text-ink-400">{o.province} · {o.durationYears} yr</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recalls" icon={ShieldAlert} count={recalls.length}>
          {recalls.length === 0 ? <p className="text-sm text-ink-400">No open recalls reported.</p> : (
            <ul className="space-y-2 text-sm">
              {recalls.map((r, i) => (
                <li key={i} className="rounded-lg border border-ink-100 p-3">
                  <p className="font-semibold text-ink-800">{r.component}</p>
                  <p className="mt-0.5 text-xs text-ink-400">{r.status}{r.date ? ` · ${r.date}` : ''}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {selling && <SellModal vehicle={v} onClose={() => setSelling(false)} onSell={(payload) => { const sale = createSale(payload); setSelling(false); navigate(`/sales/${sale.id}`) }} />}
    </div>
  )
}
