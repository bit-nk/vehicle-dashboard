import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Package } from 'lucide-react'
import { useAdmin } from '../store/AdminStore.jsx'
import { SERVICE_TYPE_NAMES, PARTS_CATEGORY_NAMES } from '../data/dealer.js'
import ConfirmDialog from './ConfirmDialog.jsx'

// Platform-admin editor for the onboarding packages: rename, re-describe, toggle which
// service types & parts categories each includes, and add / remove packages.
export default function PackageManager() {
  const admin = useAdmin()
  const [newId, setNewId] = useState(null)   // newest package -> highlight + scroll into view
  const [del, setDel] = useState(null)       // package pending deletion (custom confirm dialog)
  const newRef = useRef(null)
  useEffect(() => {
    if (!newId) return
    newRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(() => setNewId(null), 2500)
    return () => clearTimeout(t)
  }, [newId])
  const addPackage = () => setNewId(admin.addPackage())
  const toggle = (pkg, key, val) => {
    const arr = pkg[key] || []
    admin.updatePackage(pkg.id, { [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] })
  }
  const Checks = ({ pkg, field, options }) => (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2 text-xs text-ink-600">
          <input type="checkbox" checked={(pkg[field] || []).includes(o)} onChange={() => toggle(pkg, field, o)} className="accent-brand-600" /> {o}
        </label>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900"><Package className="h-4 w-4 text-brand-600" /> Onboarding packages</h2>
        <button onClick={addPackage} className="btn-sm bg-brand-600 text-white hover:bg-brand-700"><Plus className="mr-1 inline h-3.5 w-3.5" /> New package</button>
      </div>
      <p className="text-xs text-ink-400">Packages auto-seed a dealership's catalog at onboarding. Edits here apply to future onboardings.</p>

      {admin.packages.map((pkg) => (
        <div key={pkg.id} ref={pkg.id === newId ? newRef : null} className={`card p-4 transition ${pkg.id === newId ? 'ring-2 ring-brand-500' : ''}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <input value={pkg.name} onChange={(e) => admin.updatePackage(pkg.id, { name: e.target.value })} placeholder="Package name" className="h-9 w-full max-w-sm rounded-lg border border-ink-200 bg-[var(--surface)] px-3 text-sm font-bold text-ink-900 outline-none focus:border-brand-500" />
              <input value={pkg.description} onChange={(e) => admin.updatePackage(pkg.id, { description: e.target.value })} placeholder="Short description" className="h-9 w-full rounded-lg border border-ink-200 bg-[var(--surface)] px-3 text-sm outline-none focus:border-brand-500" />
            </div>
            <button onClick={() => setDel(pkg)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" title="Remove package"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-ink-100 p-3">
              <p className="mb-2 text-xs font-semibold text-ink-600">Service types <span className="text-ink-400">({(pkg.serviceTypes || []).length})</span></p>
              <Checks pkg={pkg} field="serviceTypes" options={SERVICE_TYPE_NAMES} />
            </div>
            <div className="rounded-lg border border-ink-100 p-3">
              <p className="mb-2 text-xs font-semibold text-ink-600">Parts categories <span className="text-ink-400">({(pkg.partsCategories || []).length})</span></p>
              <Checks pkg={pkg} field="partsCategories" options={PARTS_CATEGORY_NAMES} />
            </div>
          </div>
        </div>
      ))}
      {admin.packages.length === 0 && <p className="card p-6 text-center text-sm text-ink-400">No packages. Add one for onboarding.</p>}

      <ConfirmDialog
        open={!!del} title="Remove package?" tone="danger" confirmLabel="Remove package"
        message={del ? `"${del.name}" will no longer be available when onboarding new dealerships. This doesn't affect dealerships already onboarded.` : ''}
        onCancel={() => setDel(null)}
        onConfirm={() => { admin.removePackage(del.id); setDel(null) }}
      />
    </div>
  )
}
