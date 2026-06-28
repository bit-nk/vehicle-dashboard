import { useMemo, useState } from 'react'
import { PackagePlus, ClipboardList, UserPlus, Building2 } from 'lucide-react'
import { sanitizeText, isValidEmail } from '@shared/lib'
import { useAdmin } from '../../store/AdminStore.jsx'
import { ROLES } from '../../data/dealer.js'

const field = 'h-10 w-full rounded-lg border border-ink-200 bg-[var(--surface)] px-3 text-sm text-ink-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
const sel = `field-select ${field}`
const label = 'mb-1 block text-xs font-semibold text-ink-600'
const ACCESS = ['Admin', 'Manager', 'Staff']
const STAFF_TYPES = ['Service', 'Parts', 'HR', 'Sales']
const NEW = '__new__'

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card flex flex-col p-5">
      <div className="mb-4 flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span><h2 className="font-display text-lg font-bold text-ink-900">{title}</h2></div>
      {children}
    </div>
  )
}

// Cross-tenant "Add New Item" for the platform admin: pick a dealership, then add parts to
// its catalog, services to its service catalog, or a system user - the same forms the
// dealership Admin has, scoped to whichever dealership the platform admin selects.
export default function AdminAddItem() {
  const admin = useAdmin()
  const dealerships = Object.values(admin.onboarding).map((d) => ({ id: d.dealershipId, name: d.name }))
  const [did, setDid] = useState(dealerships[0]?.id || '')
  const [log, setLog] = useState([])
  const addLog = (msg) => setLog((l) => [{ msg, at: Date.now() + Math.random() }, ...l].slice(0, 12))

  const svc = admin.serviceCatalogFor(did)
  const parts = admin.partsCatalogFor(did)
  const serviceTypes = useMemo(() => svc.map((t) => t.type), [svc])
  const partCategories = useMemo(() => parts.categories.map((c) => c.category), [parts])

  const [p, setP] = useState({ category: '', newCategory: '', name: '', type: '' })
  const [sv, setSv] = useState({ type: '', newType: '', name: '' })
  const [u, setU] = useState({ name: '', email: '', role: 'Sales', access: 'Staff', staffType: 'Service' })

  const pUpd = (k) => (e) => setP((s) => ({ ...s, [k]: e.target.value }))
  const svUpd = (k) => (e) => setSv((s) => ({ ...s, [k]: e.target.value }))
  const uUpd = (k) => (e) => setU((s) => ({ ...s, [k]: e.target.value }))

  function addPart(e) {
    e.preventDefault()
    const category = p.category === NEW ? sanitizeText(p.newCategory, 40) : p.category
    const name = sanitizeText(p.name, 80)
    if (!category || !name) return
    if (!partCategories.includes(category)) admin.addPartCategory(did, category)
    admin.addPart(did, category, { name, subtypes: p.type ? [sanitizeText(p.type, 40)] : [] })
    if (p.type) admin.addPartSubtype(did, category, name, sanitizeText(p.type, 40))
    addLog(`Part '${name}' added to ${category} (${dealerships.find((d) => d.id === did)?.name})`)
    setP({ category: '', newCategory: '', name: '', type: '' })
  }
  function addServicing(e) {
    e.preventDefault()
    const type = sv.type === NEW ? sanitizeText(sv.newType, 60) : sv.type
    const name = sanitizeText(sv.name, 60)
    if (!type || !name) return
    if (!serviceTypes.includes(type)) admin.addServiceType(did, type)
    admin.addServiceSubtype(did, type, name)
    addLog(`Service '${name}' added under ${type}`)
    setSv({ type: '', newType: '', name: '' })
  }
  function addUser(e) {
    e.preventDefault()
    const name = sanitizeText(u.name, 80)
    if (!name || !isValidEmail(u.email)) return
    const access = u.access === 'Staff' ? `Staff - ${u.staffType}` : u.access
    admin.addUser(did, { name, email: u.email, role: u.role, access, dealershipId: did })
    addLog(`User '${name}' (${u.role} · ${access}) created`)
    setU({ name: '', email: '', role: 'Sales', access: 'Staff', staffType: 'Service' })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Add new item</h1>
          <p className="text-sm text-ink-500">Add parts &amp; services to a dealership's catalog, or create a system user - the same forms the dealership Admin has.</p>
        </div>
        <label className="relative flex items-center" title="Dealership">
          <Building2 className="pointer-events-none absolute left-2.5 h-4 w-4 text-brand-600" />
          <select value={did} onChange={(e) => setDid(e.target.value)} className="field-select h-10 rounded-lg border border-ink-200 bg-[var(--surface)] pl-8 pr-8 text-sm font-semibold text-ink-800 outline-none focus:border-brand-500">
            {dealerships.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Section icon={PackagePlus} title="Add Part to Catalog">
          <form onSubmit={addPart} className="space-y-3">
            <div><span className={label}>Category</span>
              <select value={p.category} onChange={pUpd('category')} className={sel}>
                <option value="">Select category…</option>
                {partCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value={NEW}>+ New category…</option>
              </select>
            </div>
            {p.category === NEW && <div><span className={label}>New category name</span><input value={p.newCategory} onChange={pUpd('newCategory')} className={field} /></div>}
            <div><span className={label}>Part Name</span><input value={p.name} onChange={pUpd('name')} placeholder="e.g. Brake Pad" className={field} /></div>
            <div><span className={label}>Type / Variant (optional)</span><input value={p.type} onChange={pUpd('type')} placeholder="e.g. Ceramic" className={field} /></div>
            <button type="submit" className="btn w-full bg-brand-600 text-white hover:bg-brand-700">Add Part</button>
          </form>
        </Section>

        <Section icon={ClipboardList} title="Add Servicing Item">
          <form onSubmit={addServicing} className="space-y-3">
            <div><span className={label}>Service Type</span>
              <select value={sv.type} onChange={svUpd('type')} className={sel}>
                <option value="">Select type…</option>
                {serviceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                <option value={NEW}>+ New service type…</option>
              </select>
            </div>
            {sv.type === NEW && <div><span className={label}>New service type name</span><input value={sv.newType} onChange={svUpd('newType')} className={field} /></div>}
            <div><span className={label}>Service Name</span><input value={sv.name} onChange={svUpd('name')} placeholder="e.g. Brake Pad Replacement" className={field} /></div>
            <button type="submit" className="btn w-full bg-brand-600 text-white hover:bg-brand-700">Create Servicing Item</button>
          </form>
        </Section>

        <Section icon={UserPlus} title="Add System User">
          <form onSubmit={addUser} className="space-y-3">
            <div><span className={label}>Full Name</span><input value={u.name} onChange={uUpd('name')} className={field} /></div>
            <div><span className={label}>Email Address</span><input type="email" value={u.email} onChange={uUpd('email')} className={field} /></div>
            <div><span className={label}>Role / Department</span><select value={u.role} onChange={uUpd('role')} className={sel}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
            <div><span className={label}>Access Level</span><select value={u.access} onChange={uUpd('access')} className={sel}>{ACCESS.map((a) => <option key={a}>{a}</option>)}</select></div>
            {u.access === 'Staff' && <div><span className={label}>Staff Type</span><select value={u.staffType} onChange={uUpd('staffType')} className={sel}>{STAFF_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>}
            <button type="submit" className="btn w-full bg-brand-600 text-white hover:bg-brand-700">Create User Account</button>
          </form>
        </Section>
      </div>

      <div className="card p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Recent activity</h3>
        {log.length === 0 ? <p className="text-sm text-ink-400">Items you add will appear here.</p> : (
          <ul className="space-y-1 text-sm text-ink-700">{log.map((l) => <li key={l.at}>· {l.msg}</li>)}</ul>
        )}
      </div>
    </div>
  )
}
