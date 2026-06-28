import { useState } from 'react'
import { RotateCcw, Trash2, Wrench, Boxes } from 'lucide-react'
import { useAdmin } from '../store/AdminStore.jsx'

function AddInput({ placeholder, onAdd, wide }) {
  const [v, setV] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV('') } }} className={`flex gap-1 ${wide ? '' : 'max-w-xs'}`}>
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="h-8 flex-1 rounded-lg border border-ink-200 px-2 text-xs outline-none focus:border-brand-500" />
      <button className="btn-sm bg-brand-600 text-white hover:bg-brand-700">Add</button>
    </form>
  )
}
function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-700">
      {label}<button type="button" onClick={onRemove} className="text-ink-400 hover:text-rose-600" aria-label="remove">×</button>
    </span>
  )
}

// Per-dealership catalog editor: service (type -> subtype) and parts (category -> item -> subtype).
export default function CatalogManager() {
  const admin = useAdmin()
  const dealers = Object.values(admin.onboarding).map((o) => ({ id: o.dealershipId, name: o.name }))
  const [did, setDid] = useState(dealers[0]?.id || '')
  const svc = admin.serviceCatalogFor(did)
  const parts = admin.partsCatalogFor(did)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-ink-700">Dealership</label>
        <select value={did} onChange={(e) => setDid(e.target.value)} className="field-select h-10 rounded-lg border border-ink-200 bg-[var(--surface)] pl-3 text-sm outline-none focus:border-brand-500">
          {dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <p className="text-xs text-ink-400">Edits apply to this dealership; they also drive the dealership's service &amp; parts dropdowns.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Service catalog */}
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900"><Wrench className="h-4 w-4 text-brand-600" /> Service types</h3>
            <button onClick={() => { if (confirm('Replace this dealership’s service catalog with the default template?')) admin.loadServiceTemplate(did) }} className="btn-sm border border-ink-200 text-ink-600 hover:bg-ink-50"><RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Load default</button>
          </div>
          <div className="space-y-3">
            {svc.map((t) => (
              <div key={t.type} className="rounded-lg border border-ink-100 p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink-800">{t.type}</p>
                  <button onClick={() => admin.removeServiceType(did, t.type)} className="text-ink-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {t.subtypes.map((s) => <Chip key={s} label={s} onRemove={() => admin.removeServiceSubtype(did, t.type, s)} />)}
                </div>
                <div className="mt-2"><AddInput placeholder="+ add subtype" onAdd={(v) => admin.addServiceSubtype(did, t.type, v)} /></div>
              </div>
            ))}
            {svc.length === 0 && <p className="text-sm text-ink-400">No service types. Load the default template or add one.</p>}
          </div>
          <div className="mt-3"><AddInput placeholder="+ add service type" onAdd={(v) => admin.addServiceType(did, v)} wide /></div>
        </div>

        {/* Parts catalog */}
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900"><Boxes className="h-4 w-4 text-brand-600" /> Parts catalog</h3>
            <button onClick={() => { if (confirm('Replace this dealership’s parts catalog with the default template?')) admin.loadPartsTemplate(did) }} className="btn-sm border border-ink-200 text-ink-600 hover:bg-ink-50"><RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Load default</button>
          </div>
          <div className="space-y-3">
            {parts.categories.map((cat) => (
              <div key={cat.category} className="rounded-lg border border-ink-100 p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink-800">{cat.category}</p>
                  <button onClick={() => admin.removePartCategory(did, cat.category)} className="text-ink-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="mt-1.5 space-y-1.5">
                  {cat.items.map((it) => (
                    <div key={it.name} className="rounded-md bg-ink-50 p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-ink-700">{it.name}</p>
                        <button onClick={() => admin.removePart(did, cat.category, it.name)} className="text-ink-400 hover:text-rose-600">×</button>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {it.subtypes.map((s) => <Chip key={s} label={s} onRemove={() => admin.removePartSubtype(did, cat.category, it.name, s)} />)}
                      </div>
                      <div className="mt-1.5"><AddInput placeholder="+ subtype" onAdd={(v) => admin.addPartSubtype(did, cat.category, it.name, v)} /></div>
                    </div>
                  ))}
                </div>
                <div className="mt-2"><AddInput placeholder="+ add part item" onAdd={(v) => admin.addPart(did, cat.category, { name: v, subtypes: [] })} /></div>
              </div>
            ))}
            {parts.categories.length === 0 && <p className="text-sm text-ink-400">No part categories. Load the default template or add one.</p>}
          </div>
          <div className="mt-3"><AddInput placeholder="+ add part category" onAdd={(v) => admin.addPartCategory(did, v)} wide /></div>
        </div>
      </div>
    </div>
  )
}
