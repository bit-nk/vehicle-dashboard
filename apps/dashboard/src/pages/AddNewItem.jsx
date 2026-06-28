import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { PackagePlus, ClipboardList, UserPlus, ShieldAlert, Boxes, Search, Check } from 'lucide-react'
import { sanitizeText, isValidEmail, formatCurrency } from '@shared/lib'
import { useDealer } from '../store/DealerStore.jsx'
import { ROLES, branchesForDealership, branchById, partBySku, readServiceCatalog, readPartsCatalog, setServiceCatalog, setPartsCatalog, readPlatformStore, writePlatformStore, PART_CATEGORIES } from '../data/dealer.js'
import DealerCatalog from '../components/DealerCatalog.jsx'

const field = 'h-10 w-full rounded-lg border border-ink-200 bg-[var(--surface)] px-3 text-sm text-ink-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
const sel = `field-select ${field}`
const label = 'mb-1 block text-xs font-semibold text-ink-600'
const small = 'h-9 w-full rounded-lg border border-ink-200 bg-[var(--surface)] px-2.5 text-sm outline-none focus:border-brand-500'
const ACCESS = ['Admin', 'Manager', 'Staff']
const STAFF_TYPES = [
  { value: 'Service', note: 'Service jobs & billing. No vehicle inventory.' },
  { value: 'Parts', note: 'Parts stock & sales. No vehicle inventory.' },
  { value: 'HR', note: 'People & team management.' },
  { value: 'Sales', note: 'Vehicle inventory access; can view parts - not sell.' },
]
const clone = (x) => JSON.parse(JSON.stringify(x))
const pill = (on) => `rounded-md px-3 py-1.5 text-sm font-semibold transition ${on ? 'bg-[var(--surface)] text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card flex flex-col p-5">
      <div className="mb-4 flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span><h2 className="font-display text-lg font-bold text-ink-900">{title}</h2></div>
      {children}
    </div>
  )
}

/* ---- Edit a stocked inventory part (name / category / stock / unit price / bin) ---- */
function InventoryRow({ p, branchName, onSave, expanded, onToggle }) {
  const [f, setF] = useState({ name: p.name || partBySku(p.sku)?.name || '', category: p.category || partBySku(p.sku)?.category || '', qty: p.qtyOnHand, price: p.unitPriceNpr, bin: p.binLocation || '' })
  const [saved, setSaved] = useState(false)
  const upd = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setSaved(false) }
  function save() { onSave(p.id, { name: sanitizeText(f.name, 80), category: f.category, qtyOnHand: Math.max(0, Number(f.qty) || 0), unitPriceNpr: Math.max(0, Number(f.price) || 0), binLocation: sanitizeText(f.bin, 16) }); setSaved(true) }
  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer border-t border-ink-100 hover:bg-ink-50/60">
        <td className="px-5 py-2.5 font-semibold text-ink-900">{p.name || partBySku(p.sku)?.name}</td>
        <td className="py-2.5 pr-3 font-mono text-[11px] text-ink-400">{p.sku}</td>
        <td className="py-2.5 pr-3 text-ink-600">{p.category || partBySku(p.sku)?.category || '-'}</td>
        <td className="py-2.5 pr-3 text-ink-600">{branchName}</td>
        <td className="py-2.5 pr-3 text-ink-700">{p.qtyOnHand}</td>
        <td className="py-2.5 pr-5 text-right font-semibold text-ink-900">{formatCurrency(p.unitPriceNpr)}</td>
      </tr>
      {expanded && (
        <tr className="border-t border-ink-100 bg-ink-50/40"><td colSpan={6} className="px-5 py-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <label className="text-[11px] font-medium text-ink-400">Part name<input value={f.name} onChange={upd('name')} className={`mt-0.5 block ${small}`} /></label>
            <label className="text-[11px] font-medium text-ink-400">Category<select value={f.category} onChange={upd('category')} className={`field-select mt-0.5 block ${small}`}><option value="">-</option>{PART_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="text-[11px] font-medium text-ink-400">Stock qty<input type="number" value={f.qty} onChange={upd('qty')} className={`mt-0.5 block ${small}`} /></label>
            <label className="text-[11px] font-medium text-ink-400">Unit price (Rs.)<input type="number" value={f.price} onChange={upd('price')} className={`mt-0.5 block ${small}`} /></label>
            <label className="text-[11px] font-medium text-ink-400">Bin<input value={f.bin} onChange={upd('bin')} className={`mt-0.5 block ${small}`} /></label>
          </div>
          <div className="mt-3 flex justify-end"><button onClick={save} className="btn-sm bg-brand-600 text-white hover:bg-brand-700"><Check className="mr-1 inline h-3.5 w-3.5" /> {saved ? 'Saved' : 'Save changes'}</button></div>
        </td></tr>
      )}
    </>
  )
}

function PartsInventoryEditor({ items, updatePart }) {
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)
  const rows = items.filter((p) => { const h = `${p.name || ''} ${p.sku} ${p.category || ''}`.toLowerCase(); return !q || h.includes(q.toLowerCase()) })
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-5 py-4">
        <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900"><Boxes className="h-4 w-4 text-brand-600" /> Parts inventory <span className="text-xs font-normal text-ink-400">click a part to edit</span></h3>
        <div className="relative w-52"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search part, SKU, category" className="h-9 w-full rounded-lg border border-ink-200 bg-[var(--surface)] pl-8 pr-2 text-sm outline-none focus:border-brand-500" /></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead><tr className="text-xs uppercase tracking-wide text-ink-400"><th className="px-5 py-2 font-semibold">Part name</th><th className="py-2 pr-3 font-semibold">SKU</th><th className="py-2 pr-3 font-semibold">Category</th><th className="py-2 pr-3 font-semibold">Branch</th><th className="py-2 pr-3 font-semibold">Stock</th><th className="py-2 pr-5 text-right font-semibold">Unit price</th></tr></thead>
          <tbody>
            {rows.map((p) => <InventoryRow key={p.id} p={p} branchName={branchById(p.branchId)?.name} expanded={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} onSave={updatePart} />)}
            {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-ink-400">No parts match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AddNewItem() {
  const { dealershipId, role } = useOutletContext()
  const { addPartToInventory, partsInventory, updatePart } = useDealer()
  const branches = branchesForDealership(dealershipId)
  const [tab, setTab] = useState('add')
  const [log, setLog] = useState([])
  const addLog = (msg) => setLog((l) => [{ msg, at: Date.now() + Math.random() }, ...l].slice(0, 12))

  // catalogs are stateful so add/remove from the forms reflects immediately
  const [svcTypes, setSvcTypes] = useState(() => readServiceCatalog(dealershipId).map((t) => t.type))
  const [partCats, setPartCats] = useState(() => readPartsCatalog(dealershipId).categories.map((c) => c.category))
  const [newCat, setNewCat] = useState('')
  const [newSvc, setNewSvc] = useState('')

  // hooks must run before any early return
  const [p, setP] = useState({ name: '', sku: '', category: partCats[0] || '', branchId: branches[0]?.id || '', qty: '', price: '', supplier: '' })
  const [sv, setSv] = useState({ type: svcTypes[0] || '', name: '', time: '', price: '' })
  const [u, setU] = useState({ name: '', email: '', role: 'Sales', password: '', access: 'Staff', staffType: 'Service', show: false })

  if (role !== 'Admin') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-500"><ShieldAlert className="h-7 w-7" /></span>
        <h2 className="mt-4 font-display text-xl font-bold text-ink-900">Admins only</h2>
        <p className="mt-1 text-sm text-ink-500">The item-addition hub is restricted to the dealership Admin role.</p>
      </div>
    )
  }

  const pUpd = (k) => (e) => setP((s) => ({ ...s, [k]: e.target.value }))
  function addPart(e) {
    e.preventDefault()
    const name = sanitizeText(p.name, 80); if (!name) return
    addPartToInventory({
      id: `PINV-${String(Date.now()).slice(-6)}`, sku: sanitizeText(p.sku, 24) || `SKU-${Date.now()}`,
      name, category: p.category, oemNumber: sanitizeText(p.sku, 24), branchId: p.branchId,
      qtyOnHand: Number(p.qty) || 0, reorderLevel: 5, unitPriceNpr: Number(p.price) || 0,
      binLocation: '', supplier: sanitizeText(p.supplier, 60),
    })
    addLog(`Part '${name}' added to inventory`)
    setP({ name: '', sku: '', category: partCats[0] || '', branchId: branches[0]?.id || '', qty: '', price: '', supplier: '' })
  }

  // ---- Parts category add / remove (persists to the dealership parts catalog) ----
  function addCategory() {
    const name = sanitizeText(newCat, 40)
    if (!name || partCats.includes(name)) { setNewCat(''); return }
    const cat = clone(readPartsCatalog(dealershipId))
    if (!cat.categories.some((c) => c.category === name)) cat.categories.push({ category: name, items: [] })
    setPartsCatalog(dealershipId, cat)
    setPartCats((c) => [...c, name])
    setP((s) => ({ ...s, category: name }))
    setNewCat(''); addLog(`Parts category '${name}' added`)
  }
  function removeCategory(name) {
    if (!name || !confirm(`Remove category '${name}'? Its catalog items are removed too.`)) return
    const cat = clone(readPartsCatalog(dealershipId)); cat.categories = cat.categories.filter((c) => c.category !== name)
    setPartsCatalog(dealershipId, cat)
    const next = partCats.filter((x) => x !== name)
    setPartCats(next)
    setP((s) => ({ ...s, category: s.category === name ? (next[0] || '') : s.category }))
    addLog(`Parts category '${name}' removed`)
  }

  const svUpd = (k) => (e) => setSv((s) => ({ ...s, [k]: e.target.value }))
  function addServicing(e) {
    e.preventDefault()
    const name = sanitizeText(sv.name, 60); if (!sv.type || !name) return
    const ps = readPlatformStore()
    const cat = ps.serviceCatalog?.[dealershipId] ? clone(ps.serviceCatalog[dealershipId]) : clone(readServiceCatalog(dealershipId))
    const t = cat.find((x) => x.type === sv.type)
    if (t && !t.subtypes.includes(name)) t.subtypes.push(name)
    writePlatformStore({ ...ps, serviceCatalog: { ...(ps.serviceCatalog || {}), [dealershipId]: cat } })
    addLog(`Service '${name}' added under ${sv.type}`)
    setSv({ type: svcTypes[0] || '', name: '', time: '', price: '' })
  }

  // ---- Service type add / remove (persists to the dealership service catalog) ----
  function addSvcType() {
    const name = sanitizeText(newSvc, 60)
    if (!name || svcTypes.includes(name)) { setNewSvc(''); return }
    const cat = clone(readServiceCatalog(dealershipId))
    if (!cat.some((t) => t.type === name)) cat.push({ type: name, subtypes: [] })
    setServiceCatalog(dealershipId, cat)
    setSvcTypes((t) => [...t, name])
    setSv((s) => ({ ...s, type: name }))
    setNewSvc(''); addLog(`Service type '${name}' added`)
  }
  function removeSvcType(name) {
    if (!name || !confirm(`Remove service type '${name}'? Its services are removed too.`)) return
    const cat = clone(readServiceCatalog(dealershipId)).filter((t) => t.type !== name)
    setServiceCatalog(dealershipId, cat)
    const next = svcTypes.filter((x) => x !== name)
    setSvcTypes(next)
    setSv((s) => ({ ...s, type: s.type === name ? (next[0] || '') : s.type }))
    addLog(`Service type '${name}' removed`)
  }

  const uUpd = (k) => (e) => setU((s) => ({ ...s, [k]: e.target.value }))
  function addUser(e) {
    e.preventDefault()
    const name = sanitizeText(u.name, 80); if (!name || !isValidEmail(u.email)) return
    const access = u.access === 'Staff' ? `Staff - ${u.staffType}` : u.access
    addLog(`User '${name}' (${u.role} · ${access}) created`)
    setU({ name: '', email: '', role: 'Sales', password: '', access: 'Staff', staffType: 'Service', show: false })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Add &amp; edit items</h1>
        <p className="text-sm text-ink-500">Add parts, servicing items &amp; users, or edit your existing services, parts catalog &amp; stock. Admin only.</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg bg-ink-100 p-1">
        <button onClick={() => setTab('add')} className={pill(tab === 'add')}>Add new item</button>
        <button onClick={() => setTab('edit')} className={pill(tab === 'edit')}>Edit items</button>
      </div>

      {tab === 'add' && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Section icon={PackagePlus} title="Add New Parts Inventory">
              <form onSubmit={addPart} className="space-y-3">
                <div><span className={label}>Part Name</span><input value={p.name} onChange={pUpd('name')} className={field} /></div>
                <div><span className={label}>SKU / Part Number</span><input value={p.sku} onChange={pUpd('sku')} className={field} /></div>
                <div>
                  <span className={label}>Category</span>
                  <div className="flex gap-2">
                    <select value={p.category} onChange={pUpd('category')} className={sel}>{partCats.length === 0 && <option value="">No categories</option>}{partCats.map((c) => <option key={c}>{c}</option>)}</select>
                    <button type="button" onClick={() => removeCategory(p.category)} disabled={!p.category} className="btn shrink-0 border border-ink-200 px-2.5 text-ink-500 hover:bg-ink-50 disabled:opacity-40" title="Remove selected category">Remove</button>
                  </div>
                  <div className="mt-1.5 flex gap-2">
                    <input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }} placeholder="New category name" className={field} />
                    <button type="button" onClick={addCategory} disabled={!newCat.trim()} className="btn shrink-0 border border-brand-200 px-2.5 text-brand-700 hover:bg-brand-50 disabled:opacity-40">+ Add</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className={label}>Stock Quantity</span><input type="number" value={p.qty} onChange={pUpd('qty')} className={field} /></div>
                  <div><span className={label}>Unit Price</span><input type="number" value={p.price} onChange={pUpd('price')} className={field} /></div>
                </div>
                <div><span className={label}>Branch</span><select value={p.branchId} onChange={pUpd('branchId')} className={sel}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                <div><span className={label}>Supplier</span><input value={p.supplier} onChange={pUpd('supplier')} placeholder="Supplier name" className={field} /></div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setP({ name: '', sku: '', category: partCats[0] || '', branchId: branches[0]?.id || '', qty: '', price: '', supplier: '' })} className="btn flex-1 border border-ink-200 text-ink-600 hover:bg-ink-50">Reset</button>
                  <button type="submit" className="btn flex-[2] bg-brand-600 text-white hover:bg-brand-700">Add Part to Inventory</button>
                </div>
              </form>
            </Section>

            <Section icon={ClipboardList} title="Add New Servicing Item">
              <form onSubmit={addServicing} className="space-y-3">
                <div>
                  <span className={label}>Service Type</span>
                  <div className="flex gap-2">
                    <select value={sv.type} onChange={svUpd('type')} className={sel}>{svcTypes.length === 0 && <option value="">No service types</option>}{svcTypes.map((t) => <option key={t}>{t}</option>)}</select>
                    <button type="button" onClick={() => removeSvcType(sv.type)} disabled={!sv.type} className="btn shrink-0 border border-ink-200 px-2.5 text-ink-500 hover:bg-ink-50 disabled:opacity-40" title="Remove selected service type">Remove</button>
                  </div>
                  <div className="mt-1.5 flex gap-2">
                    <input value={newSvc} onChange={(e) => setNewSvc(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSvcType() } }} placeholder="New service type name" className={field} />
                    <button type="button" onClick={addSvcType} disabled={!newSvc.trim()} className="btn shrink-0 border border-brand-200 px-2.5 text-brand-700 hover:bg-brand-50 disabled:opacity-40">+ Add</button>
                  </div>
                </div>
                <div><span className={label}>Service Name</span><input value={sv.name} onChange={svUpd('name')} placeholder="e.g. Brake Pad Replacement" className={field} /></div>
                <div><span className={label}>Estimated Time (hrs/min)</span><input value={sv.time} onChange={svUpd('time')} placeholder="e.g. 1h 30m" className={field} /></div>
                <div><span className={label}>Standard Price (Rs.)</span><input type="number" value={sv.price} onChange={svUpd('price')} className={field} /></div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setSv({ type: svcTypes[0] || '', name: '', time: '', price: '' })} className="btn flex-1 border border-ink-200 text-ink-600 hover:bg-ink-50">Reset</button>
                  <button type="submit" className="btn flex-[2] bg-brand-600 text-white hover:bg-brand-700">Create Servicing Item</button>
                </div>
              </form>
            </Section>

            <Section icon={UserPlus} title="Add New System User">
              <form onSubmit={addUser} className="space-y-3">
                <div><span className={label}>Full Name</span><input value={u.name} onChange={uUpd('name')} className={field} /></div>
                <div><span className={label}>Email Address</span><input type="email" value={u.email} onChange={uUpd('email')} className={field} /></div>
                <div><span className={label}>Role / Department</span><select value={u.role} onChange={uUpd('role')} className={sel}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
                <div><span className={label}>Temporary Password</span>
                  <div className="relative">
                    <input type={u.show ? 'text' : 'password'} value={u.password} onChange={uUpd('password')} className={field} />
                    <button type="button" onClick={() => setU((s) => ({ ...s, show: !s.show }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-600">{u.show ? 'Hide' : 'Show'}</button>
                  </div>
                </div>
                <div><span className={label}>Access Level</span><select value={u.access} onChange={uUpd('access')} className={sel}>{ACCESS.map((a) => <option key={a}>{a}</option>)}</select></div>
                {u.access === 'Staff' && (
                  <div>
                    <span className={label}>Staff Type</span>
                    <select value={u.staffType} onChange={uUpd('staffType')} className={sel}>{STAFF_TYPES.map((t) => <option key={t.value}>{t.value}</option>)}</select>
                    <p className="mt-1 text-xs text-ink-500">{STAFF_TYPES.find((t) => t.value === u.staffType)?.note}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setU({ name: '', email: '', role: 'Sales', password: '', access: 'Staff', staffType: 'Service', show: false })} className="btn flex-1 border border-ink-200 text-ink-600 hover:bg-ink-50">Reset</button>
                  <button type="submit" className="btn flex-[2] bg-brand-600 text-white hover:bg-brand-700">Create User Account</button>
                </div>
              </form>
            </Section>
          </div>

          <div className="card p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Recent activity</h3>
            {log.length === 0 ? <p className="text-sm text-ink-400">Items you add will appear here.</p> : (
              <ul className="space-y-1 text-sm text-ink-700">{log.map((l) => <li key={l.at}>· {l.msg}</li>)}</ul>
            )}
          </div>
        </>
      )}

      {tab === 'edit' && (
        <div className="space-y-5">
          <div>
            <h2 className="font-display text-base font-bold text-ink-900">Service types &amp; parts catalog</h2>
            <p className="text-sm text-ink-500">Search, rename (click a name or chip), add or remove the services &amp; parts your dealership offers.</p>
          </div>
          <DealerCatalog did={dealershipId} />
          <div>
            <h2 className="font-display text-base font-bold text-ink-900">Stocked parts</h2>
            <p className="text-sm text-ink-500">Edit name, category, stock quantity, unit price &amp; bin for parts in your inventory.</p>
          </div>
          <PartsInventoryEditor items={partsInventory} updatePart={updatePart} />
        </div>
      )}
    </div>
  )
}
