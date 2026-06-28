import { useState } from 'react'
import { Trash2, Wrench, Pencil } from 'lucide-react'
import { readServiceCatalog } from '../data/dealer.js'

const OTHER = '__other__'
const field = 'h-9 rounded-lg border border-ink-200 px-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-ink-50'

// Simplified 2-level service picker: Dropdown 1 = type, Dropdown 2 = subtype (from the
// dealership's editable service catalog). A manual "Other" entry covers anything not
// listed. readOnly is used for the Parts role (view only).
export default function ServiceDetailEditor({ did, value = [], onChange, readOnly = false }) {
  const catalog = readServiceCatalog(did)
  const [type, setType] = useState('')
  const [sub, setSub] = useState('')
  const [custom, setCustom] = useState('')
  const subtypes = catalog.find((t) => t.type === type)?.subtypes || []

  const add = () => {
    const item = sub === OTHER ? custom.trim() : sub
    if (!type || !item) return
    onChange([...value, { category: type, item, note: '', values: {}, manual: sub === OTHER }])
    setType(''); setSub(''); setCustom('')
  }
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i))
  const setNote = (i, v) => onChange(value.map((e, idx) => (idx === i ? { ...e, note: v } : e)))

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="block text-[11px] text-ink-400">Service type</span>
            <select value={type} onChange={(e) => { setType(e.target.value); setSub('') }} className={`field-select ${field} w-44 bg-[var(--surface)]`}>
              <option value="">Select type…</option>
              {catalog.map((t) => <option key={t.type} value={t.type}>{t.type}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[11px] text-ink-400">Service</span>
            <select value={sub} onChange={(e) => setSub(e.target.value)} disabled={!type} className={`field-select ${field} w-52 bg-[var(--surface)]`}>
              <option value="">Select…</option>
              {subtypes.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value={OTHER}>Other (type manually)…</option>
            </select>
          </label>
          {sub === OTHER && <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Describe the work done" className={`${field} w-56`} />}
          <button type="button" onClick={add} className="btn-sm bg-brand-600 text-white hover:bg-brand-700">Add</button>
        </div>
      )}

      {value.length === 0 && <p className="rounded-lg bg-ink-50 p-4 text-sm text-ink-400">No service items recorded yet.{!readOnly && ' Pick a type and service above, or type a custom one.'}</p>}

      {value.map((entry, i) => (
        <div key={i} className="rounded-xl border border-ink-100 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600">{entry.manual ? <Pencil className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}</span>
              <div>
                <p className="text-sm font-semibold text-ink-900">{entry.item}</p>
                <p className="text-[11px] text-ink-400">{entry.category}{entry.manual ? ' · manual entry' : ''}</p>
              </div>
            </div>
            {!readOnly && <button type="button" onClick={() => remove(i)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
          </div>
          <label className="mt-2 block">
            <span className="text-[11px] text-ink-400">Note</span>
            <textarea disabled={readOnly} value={entry.note || ''} onChange={(e) => setNote(i, e.target.value)} rows={2} placeholder="Observations / parts used / advisory" className="w-full rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-ink-50" />
          </label>
        </div>
      ))}
    </div>
  )
}
