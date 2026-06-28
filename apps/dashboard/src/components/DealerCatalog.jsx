import { useState } from 'react'
import { RotateCcw, Trash2, Wrench, Boxes, Search } from 'lucide-react'
import { readServiceCatalog, readPartsCatalog, setServiceCatalog, setPartsCatalog, DEFAULT_SERVICE_TEMPLATE, DEFAULT_PARTS_TEMPLATE } from '../data/dealer.js'

const clone = (x) => JSON.parse(JSON.stringify(x))

function AddInput({ placeholder, onAdd, wide }) {
  const [v, setV] = useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onAdd(v.trim()); setV('') } }} className={`flex gap-1 ${wide ? '' : 'max-w-xs'}`}>
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="h-8 flex-1 rounded-lg border border-ink-200 bg-[var(--surface)] px-2 text-xs outline-none focus:border-brand-500" />
      <button className="btn-sm bg-brand-600 text-white hover:bg-brand-700">Add</button>
    </form>
  )
}
// A removable chip whose label is click-to-rename.
function EditableChip({ label, onRename, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(label)
  if (editing) {
    return <input autoFocus value={v} onChange={(e) => setV(e.target.value)}
      onBlur={() => { const n = v.trim(); if (n && n !== label) onRename(n); setEditing(false) }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setV(label); setEditing(false) } }}
      className="h-6 w-32 rounded-full border border-brand-300 bg-[var(--surface)] px-2 text-xs outline-none" />
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-700">
      <button type="button" onClick={() => { setV(label); setEditing(true) }} className="hover:text-brand-700" title="Click to edit">{label}</button>
      <button type="button" onClick={onRemove} className="text-ink-400 hover:text-rose-600" aria-label="remove">×</button>
    </span>
  )
}
// A name (service type / part category / part item) that is click-to-rename.
function EditableName({ name, onRename, className = '' }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(name)
  if (editing) {
    return <input autoFocus value={v} onChange={(e) => setV(e.target.value)}
      onBlur={() => { const n = v.trim(); if (n && n !== name) onRename(n); setEditing(false) }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setV(name); setEditing(false) } }}
      className="h-7 w-48 rounded-lg border border-brand-300 bg-[var(--surface)] px-2 text-sm font-semibold outline-none" />
  }
  return <button type="button" onClick={() => { setV(name); setEditing(true) }} className={`text-left hover:text-brand-700 ${className}`} title="Click to rename">{name}</button>
}
const SearchBox = ({ value, onChange, placeholder }) => (
  <div className="relative w-44"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 w-full rounded-lg border border-ink-200 bg-[var(--surface)] pl-8 pr-2 text-xs outline-none focus:border-brand-500" /></div>
)

// Self-service catalog editor: add / rename / remove service types & parts (per dealership),
// with search. Persists to the shared platform store.
export default function DealerCatalog({ did }) {
  const [svc, setSvcState] = useState(() => clone(readServiceCatalog(did)))
  const [parts, setPartsState] = useState(() => clone(readPartsCatalog(did)))
  const [svcQ, setSvcQ] = useState('')
  const [partsQ, setPartsQ] = useState('')
  const saveSvc = (next) => { setSvcState(next); setServiceCatalog(did, next) }
  const saveParts = (next) => { setPartsState(next); setPartsCatalog(did, next) }

  // service mutators
  const addType = (type) => { if (!svc.some((t) => t.type === type)) saveSvc([...svc, { type, subtypes: [] }]) }
  const renameType = (type, name) => { if (!svc.some((t) => t.type === name)) saveSvc(svc.map((t) => (t.type === type ? { ...t, type: name } : t))) }
  const removeType = (type) => saveSvc(svc.filter((t) => t.type !== type))
  const addSub = (type, sub) => saveSvc(svc.map((t) => (t.type === type && !t.subtypes.includes(sub) ? { ...t, subtypes: [...t.subtypes, sub] } : t)))
  const renameSub = (type, sub, name) => saveSvc(svc.map((t) => (t.type === type ? { ...t, subtypes: t.subtypes.map((x) => (x === sub ? name : x)) } : t)))
  const removeSub = (type, sub) => saveSvc(svc.map((t) => (t.type === type ? { ...t, subtypes: t.subtypes.filter((x) => x !== sub) } : t)))
  const loadSvcDefault = () => saveSvc(clone(DEFAULT_SERVICE_TEMPLATE))

  // parts mutators
  const mapCat = (cat, fn) => saveParts({ ...parts, categories: parts.categories.map((c) => (c.category === cat ? fn(c) : c)) })
  const addCat = (cat) => { if (!parts.categories.some((c) => c.category === cat)) saveParts({ ...parts, categories: [...parts.categories, { category: cat, items: [] }] }) }
  const renameCat = (cat, name) => { if (!parts.categories.some((c) => c.category === name)) mapCat(cat, (c) => ({ ...c, category: name })) }
  const removeCat = (cat) => saveParts({ ...parts, categories: parts.categories.filter((c) => c.category !== cat) })
  const addItem = (cat, name) => mapCat(cat, (c) => (c.items.some((i) => i.name === name) ? c : { ...c, items: [...c.items, { name, subtypes: [] }] }))
  const renameItem = (cat, name, next) => mapCat(cat, (c) => ({ ...c, items: c.items.map((i) => (i.name === name ? { ...i, name: next } : i)) }))
  const removeItem = (cat, name) => mapCat(cat, (c) => ({ ...c, items: c.items.filter((i) => i.name !== name) }))
  const addItemSub = (cat, name, sub) => mapCat(cat, (c) => ({ ...c, items: c.items.map((i) => (i.name === name && !i.subtypes.includes(sub) ? { ...i, subtypes: [...i.subtypes, sub] } : i)) }))
  const renameItemSub = (cat, name, sub, next) => mapCat(cat, (c) => ({ ...c, items: c.items.map((i) => (i.name === name ? { ...i, subtypes: i.subtypes.map((s) => (s === sub ? next : s)) } : i)) }))
  const removeItemSub = (cat, name, sub) => mapCat(cat, (c) => ({ ...c, items: c.items.map((i) => (i.name === name ? { ...i, subtypes: i.subtypes.filter((s) => s !== sub) } : i)) }))
  const loadPartsDefault = () => saveParts(clone(DEFAULT_PARTS_TEMPLATE))

  // search views
  const sq = svcQ.trim().toLowerCase()
  const svcView = !sq ? svc : svc.map((t) => {
    const hit = t.type.toLowerCase().includes(sq)
    const subs = hit ? t.subtypes : t.subtypes.filter((s) => s.toLowerCase().includes(sq))
    return (hit || subs.length) ? { ...t, subtypes: subs } : null
  }).filter(Boolean)
  const pq = partsQ.trim().toLowerCase()
  const partsView = !pq ? parts.categories : parts.categories.map((c) => {
    const catHit = c.category.toLowerCase().includes(pq)
    const items = catHit ? c.items : c.items.map((i) => {
      const itemHit = i.name.toLowerCase().includes(pq)
      const subs = itemHit ? i.subtypes : i.subtypes.filter((s) => s.toLowerCase().includes(pq))
      return (itemHit || subs.length) ? { ...i, subtypes: subs } : null
    }).filter(Boolean)
    return (catHit || items.length) ? { ...c, items } : null
  }).filter(Boolean)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900"><Wrench className="h-4 w-4 text-brand-600" /> Service types</h3>
          <div className="flex items-center gap-2">
            <SearchBox value={svcQ} onChange={setSvcQ} placeholder="Search services" />
            <button onClick={() => { if (confirm('Replace your service catalog with the default template?')) loadSvcDefault() }} className="btn-sm border border-ink-200 text-ink-600 hover:bg-ink-50"><RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Default</button>
          </div>
        </div>
        <div className="space-y-3">
          {svcView.map((t) => (
            <div key={t.type} className="rounded-lg border border-ink-100 p-2.5">
              <div className="flex items-center justify-between"><EditableName name={t.type} onRename={(n) => renameType(t.type, n)} className="text-sm font-semibold text-ink-800" /><button onClick={() => removeType(t.type)} className="text-ink-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">{t.subtypes.map((s) => <EditableChip key={s} label={s} onRename={(n) => renameSub(t.type, s, n)} onRemove={() => removeSub(t.type, s)} />)}</div>
              <div className="mt-2"><AddInput placeholder="+ add service" onAdd={(v) => addSub(t.type, v)} /></div>
            </div>
          ))}
          {svcView.length === 0 && <p className="text-sm text-ink-400">{sq ? 'No services match your search.' : 'No service types. Load the default template or add one.'}</p>}
        </div>
        <div className="mt-3"><AddInput placeholder="+ add service type" onAdd={addType} wide /></div>
      </div>

      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900"><Boxes className="h-4 w-4 text-brand-600" /> Parts catalog</h3>
          <div className="flex items-center gap-2">
            <SearchBox value={partsQ} onChange={setPartsQ} placeholder="Search parts" />
            <button onClick={() => { if (confirm('Replace your parts catalog with the default template?')) loadPartsDefault() }} className="btn-sm border border-ink-200 text-ink-600 hover:bg-ink-50"><RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Default</button>
          </div>
        </div>
        <div className="space-y-3">
          {partsView.map((cat) => (
            <div key={cat.category} className="rounded-lg border border-ink-100 p-2.5">
              <div className="flex items-center justify-between"><EditableName name={cat.category} onRename={(n) => renameCat(cat.category, n)} className="text-sm font-semibold text-ink-800" /><button onClick={() => removeCat(cat.category)} className="text-ink-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></div>
              <div className="mt-1.5 space-y-1.5">
                {cat.items.map((it) => (
                  <div key={it.name} className="rounded-md bg-ink-50 p-2">
                    <div className="flex items-center justify-between"><EditableName name={it.name} onRename={(n) => renameItem(cat.category, it.name, n)} className="text-xs font-semibold text-ink-700" /><button onClick={() => removeItem(cat.category, it.name)} className="text-ink-400 hover:text-rose-600">×</button></div>
                    <div className="mt-1 flex flex-wrap gap-1">{it.subtypes.map((s) => <EditableChip key={s} label={s} onRename={(n) => renameItemSub(cat.category, it.name, s, n)} onRemove={() => removeItemSub(cat.category, it.name, s)} />)}</div>
                    <div className="mt-1.5"><AddInput placeholder="+ variant" onAdd={(v) => addItemSub(cat.category, it.name, v)} /></div>
                  </div>
                ))}
              </div>
              <div className="mt-2"><AddInput placeholder="+ add part" onAdd={(v) => addItem(cat.category, v)} /></div>
            </div>
          ))}
          {partsView.length === 0 && <p className="text-sm text-ink-400">{pq ? 'No parts match your search.' : 'No part categories. Load the default template or add one.'}</p>}
        </div>
        <div className="mt-3"><AddInput placeholder="+ add part category" onAdd={addCat} wide /></div>
      </div>
    </div>
  )
}
