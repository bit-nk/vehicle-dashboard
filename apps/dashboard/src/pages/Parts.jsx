import { useMemo, useState } from 'react'
import { useOutletContext, Link, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Plus, X, Search, Boxes, AlertTriangle, Printer, Wrench, BadgeDollarSign, PackagePlus, Truck, Warehouse, Gauge, PackageCheck, Trash2, ShoppingCart, Check } from 'lucide-react'
import { Badge } from '@shared/ui'
import { formatCurrency, formatNumber, sanitizeText, isValidPhone, iso } from '@shared/lib'
import { useDealer } from '../store/DealerStore.jsx'
import { PARTS_CATALOG, partBySku, PART_CATEGORIES, branchById, branchesForDealership, cap, fmtDate, TODAY, readPartsCatalog } from '../data/dealer.js'
import MetricCard from '../components/MetricCard.jsx'
import Drawer from '../components/Drawer.jsx'
import DetailTable from '../components/DetailTable.jsx'
import { chartTip as tip, chartGrid as grid, chartAxis as axis } from '../lib/chart.js'

const TODAY_ISO = iso(TODAY)
const ORDER_TONE = { paid: 'green', taken: 'blue', requested: 'amber', cancelled: 'gray' }
const TITLE = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)   // proper-case status labels
// Editable statuses exclude 'paid' - paying must go through "Mark paid" so paidOn/paymentMethod are set.
const ORDER_STATUSES = ['requested', 'taken', 'cancelled']
const ETA_BY_INDEX = ['Tomorrow', '2-3 days', '4-5 days', 'Next week', '7-10 days']
const retail = (n) => Math.round((n * 1.2) / 10) * 10
const input = 'h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
const selectCls = `field-select ${input} bg-[var(--surface)]`
const pill = (on) => `rounded-md px-3 py-1.5 text-sm font-semibold transition ${on ? 'bg-[var(--surface)] text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`

/* ---------- Receive parts into stock ----------------------------------------------------
   Cascade (category -> part -> type) off the dealership catalog. After a part is picked we
   match it against existing inventory at the chosen branch:
     - MATCH  -> show current stock and let the user restock (direct).
     - NO MATCH -> it's a new part: the same admin-style add form, submitted as a request to
       the dealership Admin for approval (Admin can add directly).                            */
const label2 = 'mb-1 block text-xs font-semibold text-ink-600'
const panelField = `${input} bg-[var(--surface)]`   // inputs inside the tinted panels keep the surface bg (theme-aware)
function AddStockModal({ did, role, branches, partsInventory, onClose, onAdd, onRestock, onRequestNew }) {
  const tree = readPartsCatalog(did)
  const [cat, setCat] = useState('')
  const [item, setItem] = useState('')
  const [sub, setSub] = useState('')
  const [f, setF] = useState({ branchId: branches[0]?.id || '', qty: 10, price: '', bin: '', sku: '', supplier: '' })
  const [sent, setSent] = useState(false)
  const items = tree.categories.find((c) => c.category === cat)?.items || []
  const subs = items.find((i) => i.name === item)?.subtypes || []
  const isAdmin = role === 'Admin'
  const upd = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const selectedName = item ? `${item}${sub ? ` (${sub})` : ''}` : ''
  // Match the picked part against existing stock at the branch. Catalog cascade names
  // ("Air Filter") and seed inventory names ("Engine Air Filter", via partBySku) use parallel
  // taxonomies, so compare on the base item with substring-either-direction (after stripping
  // punctuation) rather than strict equality - otherwise already-stocked parts look "new".
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  const related = (invName, pick) => { const a = norm(invName), b = norm(pick); return !!a && !!b && (a === b || a.includes(b) || b.includes(a)) }
  const invName = (p) => p.name || partBySku(p.sku)?.name
  // base part = is THIS part stocked at all; type-narrowed = is the chosen TYPE/variant stocked.
  const baseMatches = useMemo(() => (!item ? [] : partsInventory.filter((p) => p.branchId === f.branchId && related(invName(p), item))), [item, f.branchId, partsInventory])
  const matches = useMemo(() => {
    if (!item) return []
    if (!sub) return baseMatches
    // a Type is chosen -> only count rows that actually carry that variant (by subtype or name)
    return baseMatches.filter((p) => (p.subtype && norm(p.subtype) === norm(sub)) || norm(invName(p)).includes(norm(sub)))
  }, [item, sub, baseMatches, partsInventory])
  const matched = matches[0]
  const currentQty = matches.reduce((a, p) => a + p.qtyOnHand, 0)
  // base part exists but the chosen type doesn't -> warn only about the type
  const typeMissing = !!sub && baseMatches.length > 0 && matches.length === 0
  const branchName = branchById(f.branchId)?.name || 'this branch'

  function restock(e) {
    e.preventDefault()
    if (!matched) return
    onRestock(matched.id, { qtyOnHand: matched.qtyOnHand + (Number(f.qty) || 0), ...(f.price ? { unitPriceNpr: Number(f.price) } : {}) })
    onClose()
  }
  function submitNew(e) {
    e.preventDefault()
    if (!cat || !item) return
    const record = {
      id: `PINV-${String(Date.now()).slice(-6)}`,
      sku: sanitizeText(f.sku, 28) || `CAT-${item}-${sub}`.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 28) || `CAT-${Date.now()}`,
      name: selectedName, category: cat, subtype: sub, oemNumber: sanitizeText(f.sku, 28),
      branchId: f.branchId, qtyOnHand: Number(f.qty) || 0, reorderLevel: 5,
      unitPriceNpr: Number(f.price) || 0, binLocation: sanitizeText(f.bin, 12) || 'A-1', supplier: sanitizeText(f.supplier, 60),
    }
    if (isAdmin) { onAdd(record); onClose() }
    else { onRequestNew(record, `New part "${selectedName}" received at ${branchName}`); setSent(true) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-[var(--surface)] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-5">
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">Receive parts into stock</h2>
            <p className="text-sm text-ink-500">Pick the part, then restock it or - if it's new - request your Admin to add it.</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" /></button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-6 w-6" /></span>
            <p className="font-display text-lg font-bold text-ink-900">Request sent to Admin</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">"{selectedName}" was sent to your dealership Admin for approval. You'll get a notification once it's added to inventory.</p>
            <button onClick={onClose} className="mt-5 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Done</button>
          </div>
        ) : (
          <div className="space-y-5 p-6">
            {/* part picker + branch */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div><span className={label2}>Category</span><select value={cat} onChange={(e) => { setCat(e.target.value); setItem(''); setSub('') }} className={selectCls}><option value="">Category…</option>{tree.categories.map((c) => <option key={c.category} value={c.category}>{c.category}</option>)}</select></div>
              <div><span className={label2}>Part</span><select value={item} onChange={(e) => { setItem(e.target.value); setSub('') }} disabled={!cat} className={selectCls}><option value="">Part…</option>{items.map((i) => <option key={i.name} value={i.name}>{i.name}</option>)}</select></div>
              <div><span className={label2}>Type</span><select value={sub} onChange={(e) => setSub(e.target.value)} disabled={!subs.length} className={selectCls}><option value="">Type…</option>{subs.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div><span className={label2}>Branch</span><select value={f.branchId} onChange={(e) => setF((p) => ({ ...p, branchId: e.target.value }))} className={selectCls}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>

            {!selectedName && <p className="rounded-xl border border-dashed border-ink-200 p-4 text-center text-sm text-ink-400">Choose a category and part to continue.</p>}

            {/* MATCH -> restock */}
            {selectedName && matched && (
              <form onSubmit={restock} className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600"><PackageCheck className="h-4 w-4" /> In your inventory · SKU {matched.sku}</div>
                <div className="flex items-baseline gap-2"><span className="font-display text-2xl font-extrabold text-ink-900">{formatNumber(currentQty)}</span><span className="text-sm text-ink-500">currently in stock at {branchName}</span></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className={label2}>Quantity to add</span><input type="number" value={f.qty} onChange={upd('qty')} className={panelField} /></div>
                  <div><span className={label2}>New unit price (optional)</span><input type="number" value={f.price} onChange={upd('price')} placeholder={`${matched.unitPriceNpr}`} className={panelField} /></div>
                </div>
                <p className="text-xs text-ink-500">After receiving: <span className="font-semibold text-ink-800">{formatNumber(currentQty + (Number(f.qty) || 0))}</span> in stock.</p>
                <button type="submit" className="btn w-full bg-brand-600 text-white hover:bg-brand-700">Add {Number(f.qty) || 0} to stock</button>
              </form>
            )}

            {/* NO MATCH -> new part: request to admin (or direct add for Admin) */}
            {selectedName && !matched && (
              <form onSubmit={submitNew} className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-2 text-sm text-ink-600"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /><span><span className="font-semibold text-amber-600">{typeMissing ? `The "${sub}" type of ${item} isn't in your inventory yet.` : `"${selectedName}" isn't in your inventory yet.`}</span>{typeMissing ? ` (${item} is stocked, but not this type.)` : ''} {isAdmin ? 'Add it directly below.' : 'Fill the details and send a request to your Admin to add it.'}</span></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><span className={label2}>Part name</span><input value={selectedName} disabled className={`${input} bg-ink-100 text-ink-500`} /></div>
                  <div><span className={label2}>SKU / Part number</span><input value={f.sku} onChange={upd('sku')} placeholder="e.g. OEM-12345" className={panelField} /></div>
                  <div><span className={label2}>Opening stock</span><input type="number" value={f.qty} onChange={upd('qty')} className={panelField} /></div>
                  <div><span className={label2}>Unit price (Rs.)</span><input type="number" value={f.price} onChange={upd('price')} className={panelField} /></div>
                  <div><span className={label2}>Supplier</span><input value={f.supplier} onChange={upd('supplier')} placeholder="Supplier name" className={panelField} /></div>
                  <div><span className={label2}>Bin</span><input value={f.bin} onChange={upd('bin')} placeholder="A-1" className={panelField} /></div>
                </div>
                <button type="submit" className="btn w-full bg-brand-600 text-white hover:bg-brand-700">{isAdmin ? 'Add new part to inventory' : 'Request Admin to add this part'}</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- Custom part picker: each option shows price + a green/red availability dot ---------- */
function PartPicker({ stockBySku, onPick }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const results = useMemo(() => PARTS_CATALOG.filter((p) => {
    const h = `${p.name} ${p.sku} ${p.oemNumber}`.toLowerCase()
    return !q || h.includes(q.toLowerCase())
  }).slice(0, 40), [q])
  return (
    <div className="relative">
      <div className="relative z-20">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
          placeholder="Search a part to add…" className={`${input} pl-9`} />
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-ink-200 bg-[var(--surface)] p-1 shadow-xl">
            {results.map((p) => {
              const qty = stockBySku[p.sku] || 0
              const avail = qty > 0
              const price = retail(p.unitPriceNpr)
              return (
                <li key={p.sku}>
                  <button type="button" onClick={() => { onPick(p); setOpen(false); setQ('') }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-ink-50">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink-900">{p.name}</span>
                      <span className="block text-[11px] text-ink-400">{p.sku} · {formatCurrency(price)}</span>
                    </span>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${avail ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                      <span className={`h-2 w-2 rounded-full ${avail ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {avail ? `${qty} in stock` : 'Unavailable'}
                    </span>
                  </button>
                </li>
              )
            })}
            {results.length === 0 && <li className="px-3 py-4 text-center text-sm text-ink-400">No parts match.</li>}
          </ul>
        </>
      )}
    </div>
  )
}

/* ---------- Editable Open-orders drawer body (edit line qty/price, status, mark paid) ---------- */
function OrdersEditor({ orders, did, canSell, onSaveOrder, onPay }) {
  const [openId, setOpenId] = useState(orders[0]?.id || null)
  if (orders.length === 0) return <p className="py-10 text-center text-sm text-ink-400">No open orders.</p>
  return (
    <div className="space-y-2 py-2">
      {orders.map((o) => (
        // key includes mutable fields so the row remounts (fresh local state) after a store edit
        <OrderRow key={`${o.id}:${o.status}:${o.totalNpr}:${o.lines.length}`} o={o} did={did} expanded={openId === o.id} onToggle={() => setOpenId(openId === o.id ? null : o.id)} canSell={canSell} onSaveOrder={onSaveOrder} onPay={onPay} />
      ))}
    </div>
  )
}
function OrderRow({ o, did, expanded, onToggle, canSell, onSaveOrder, onPay }) {
  const [lines, setLines] = useState(() => o.lines.map((l) => ({ ...l })))
  const [status, setStatus] = useState(o.status)
  const [msg, setMsg] = useState('')
  const setQty = (sku, q) => setLines((ls) => ls.map((l) => (l.sku === sku ? { ...l, qty: Math.max(1, Number(q) || 1), lineTotalNpr: Math.max(1, Number(q) || 1) * l.unitPriceNpr } : l)))
  const setPrice = (sku, pr) => setLines((ls) => ls.map((l) => (l.sku === sku ? { ...l, unitPriceNpr: Math.max(0, Number(pr) || 0), lineTotalNpr: l.qty * Math.max(0, Number(pr) || 0) } : l)))
  const removeLine = (sku) => setLines((ls) => ls.filter((l) => l.sku !== sku))
  const subtotal = lines.reduce((a, l) => a + l.lineTotalNpr, 0)   // pre-tax; tax/VAT only on the printed bill
  const dirty = JSON.stringify(lines) !== JSON.stringify(o.lines) || status !== o.status
  function save() {
    if (!canSell) return
    const res = onSaveOrder(o.id, { lines, status, subtotalNpr: subtotal, totalNpr: subtotal })
    setMsg(res?.queued ? 'Edit to a paid order - sent for admin approval.' : 'Saved.')
  }
  return (
    <div className="rounded-xl border border-ink-100">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div>
          <p className="text-sm font-semibold text-ink-900">{o.id} · {o.customer}</p>
          <p className="text-[11px] text-ink-400">{fmtDate(o.createdOn)} · {lines.reduce((a, l) => a + l.qty, 0)} item(s){o.serviceJobId ? ` · ${o.serviceJobId}` : ''}</p>
        </div>
        <div className="flex items-center gap-2"><Badge tone={ORDER_TONE[status]}>{TITLE(status)}</Badge><span className="text-sm font-bold text-ink-900">{formatCurrency(subtotal)}</span></div>
      </button>
      {expanded && (
        <div className="border-t border-ink-100 p-4">
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={l.sku} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{l.name}</span>
                <input type="number" min={1} value={l.qty} disabled={!canSell} onChange={(e) => setQty(l.sku, e.target.value)} className="h-8 w-14 rounded-lg border border-ink-200 px-2 text-sm disabled:opacity-60" />
                <span className="text-ink-300">×</span>
                <input type="number" min={0} value={l.unitPriceNpr} disabled={!canSell} onChange={(e) => setPrice(l.sku, e.target.value)} className="h-8 w-24 rounded-lg border border-ink-200 px-2 text-right text-sm disabled:opacity-60" />
                <span className="w-24 text-right text-sm font-semibold text-ink-900">{formatCurrency(l.lineTotalNpr)}</span>
                {canSell && <button onClick={() => removeLine(l.sku)} className="grid h-7 w-7 place-items-center rounded-md text-rose-500 hover:bg-rose-50"><X className="h-4 w-4" /></button>}
              </div>
            ))}
            {lines.length === 0 && <p className="text-sm text-ink-400">No line items.</p>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
            <select value={status} disabled={!canSell} onChange={(e) => setStatus(e.target.value)} className={`field-select h-9 w-auto rounded-lg border border-ink-200 bg-[var(--surface)] pl-2 pr-7 text-sm disabled:opacity-60`}>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{TITLE(s)}</option>)}
            </select>
            <span className="text-xs text-ink-400">Total {formatCurrency(subtotal)} <span className="text-ink-300">· tax &amp; VAT on the printed bill</span></span>
            <div className="ml-auto flex items-center gap-2">
              {canSell && o.status !== 'paid' && <button onClick={() => onPay(o.id, 'Cash')} className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Mark paid</button>}
              <Link to={`/billing/parts/${o.id}`} className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"><Printer className="h-3.5 w-3.5" /> Print</Link>
              {canSell && <button onClick={save} disabled={!dirty} className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Save</button>}
            </div>
          </div>
          {msg && <p className="mt-2 text-xs font-semibold text-brand-600">{msg}</p>}
        </div>
      )}
    </div>
  )
}

/* ---------- Editable backorders drawer body (restock qty, reorder level, price) ---------- */
function BackordersEditor({ items, canManage, onSave }) {
  if (items.length === 0) return <p className="py-10 text-center text-sm text-ink-400">All parts are above reorder level.</p>
  return <div className="space-y-2 py-2">{items.map((p) => <BackorderRow key={`${p.id}:${p.qtyOnHand}:${p.unitPriceNpr}:${p.reorderLevel}`} p={p} canManage={canManage} onSave={onSave} />)}</div>
}
function BackorderRow({ p, canManage, onSave }) {
  const [qty, setQty] = useState(p.qtyOnHand)
  const [reorder, setReorder] = useState(p.reorderLevel)
  const [price, setPrice] = useState(p.unitPriceNpr)
  const [saved, setSaved] = useState(false)
  const dirty = Number(qty) !== p.qtyOnHand || Number(reorder) !== p.reorderLevel || Number(price) !== p.unitPriceNpr
  function save() { onSave(p.id, { qtyOnHand: Math.max(0, Number(qty) || 0), reorderLevel: Math.max(0, Number(reorder) || 0), unitPriceNpr: Math.max(0, Number(price) || 0) }); setSaved(true) }
  return (
    <div className="rounded-xl border border-ink-100 p-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink-900">{p.dName}</p><p className="text-[11px] text-ink-400">{p.sku} · {p.dCategory} · {branchById(p.branchId)?.name}</p></div>
        {p.qtyOnHand === 0 ? <Badge tone="rose">Out of stock</Badge> : <Badge tone="amber">{p.qtyOnHand} left</Badge>}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-[11px] font-medium text-ink-400">Qty on hand<input type="number" min={0} value={qty} disabled={!canManage} onChange={(e) => { setQty(e.target.value); setSaved(false) }} className="mt-0.5 block h-9 w-24 rounded-lg border border-ink-200 px-2 text-sm disabled:opacity-60" /></label>
        <label className="text-[11px] font-medium text-ink-400">Reorder level<input type="number" min={0} value={reorder} disabled={!canManage} onChange={(e) => { setReorder(e.target.value); setSaved(false) }} className="mt-0.5 block h-9 w-24 rounded-lg border border-ink-200 px-2 text-sm disabled:opacity-60" /></label>
        <label className="text-[11px] font-medium text-ink-400">Unit price (Rs.)<input type="number" min={0} value={price} disabled={!canManage} onChange={(e) => { setPrice(e.target.value); setSaved(false) }} className="mt-0.5 block h-9 w-28 rounded-lg border border-ink-200 px-2 text-sm disabled:opacity-60" /></label>
        {canManage
          ? <button onClick={save} disabled={!dirty} className="ml-auto inline-flex h-9 items-center gap-1 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{saved && !dirty ? <><Check className="h-3.5 w-3.5" /> Saved</> : 'Restock / save'}</button>
          : <span className="ml-auto self-center text-[11px] text-ink-400">View only</span>}
      </div>
    </div>
  )
}

export default function Parts() {
  const { branch, dealershipId, role } = useOutletContext()
  const navigate = useNavigate()
  const {
    partsInventory, partsOrders, serviceJobs, partsCart,
    payPartsOrder, addPartToInventory, updatePart, updatePartsOrder, requestNewPart,
    addToCart, updateCartLine, removeCartLine, clearCart, checkoutCart, cartToJob,
  } = useDealer()
  const [tab, setTab] = useState('overview')
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [addStock, setAddStock] = useState(false)
  const [detail, setDetail] = useState(null)
  const branchId = branch === 'all' ? undefined : branch
  const myBranches = branchesForDealership(dealershipId)
  const canStock = cap(role, 'managePartsStock')   // receive / restock
  const canSell = cap(role, 'sellParts')            // create sale / checkout / edit orders
  const canAttach = cap(role, 'attachPartsToJob')

  // seed stock joins the flat PARTS_CATALOG; cascade-added stock carries its own name/category.
  const allStock = useMemo(() => partsInventory
    .filter((p) => !branchId || p.branchId === branchId)
    .map((p) => { const c = partBySku(p.sku); return { ...p, dName: p.name || c?.name, dCategory: p.category || c?.category, dOem: p.oemNumber || c?.oemNumber || '' } })
    .filter((p) => p.dName), [partsInventory, branchId])

  const stock = useMemo(() => allStock
    .filter((p) => catFilter === 'all' || p.dCategory === catFilter)
    .filter((p) => { if (!q) return true; const h = `${p.dName} ${p.sku} ${p.dOem}`.toLowerCase(); return h.includes(q.toLowerCase()) }),
    [allStock, catFilter, q])

  const outOfStock = allStock.filter((p) => p.qtyOnHand === 0)
  const lowStock = allStock.filter((p) => p.qtyOnHand > 0 && p.qtyOnHand <= p.reorderLevel)
  const backorders = [...outOfStock, ...lowStock]
  const inventoryValue = allStock.reduce((a, p) => a + p.qtyOnHand * p.unitPriceNpr, 0)
  const orders = partsOrders.filter((o) => !branchId || o.branchId === branchId)
  const openOrders = orders.filter((o) => o.status !== 'paid' && o.status !== 'cancelled')
  const paidOrders = orders.filter((o) => o.status === 'paid')
  const todayOrders = orders.filter((o) => o.createdOn === TODAY_ISO || o.paidOn === TODAY_ISO)
  const partsSoldToday = todayOrders.reduce((a, o) => a + o.lines.reduce((b, l) => b + l.qty, 0), 0)
  const activeJobs = serviceJobs.filter((j) => (j.status === 'in_progress' || j.status === 'confirmed') && (!branchId || j.branchId === branchId))

  const topSelling = useMemo(() => {
    const m = {}
    for (const o of paidOrders) for (const l of o.lines) { m[l.name] = (m[l.name] || 0) + (l.lineTotalNpr || 0) }
    return Object.entries(m).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 6)
  }, [paidOrders])

  const invStatus = useMemo(() => {
    const cats = [...new Set(allStock.map((p) => p.dCategory))]
    return cats.map((c) => {
      const items = allStock.filter((p) => p.dCategory === c)
      return {
        name: c,
        Healthy: items.filter((p) => p.qtyOnHand > p.reorderLevel).length,
        Low: items.filter((p) => p.qtyOnHand > 0 && p.qtyOnHand <= p.reorderLevel).length,
        Out: items.filter((p) => p.qtyOnHand === 0).length,
      }
    }).sort((a, b) => (b.Healthy + b.Low + b.Out) - (a.Healthy + a.Low + a.Out)).slice(0, 7)
  }, [allStock])

  const stockCols = [
    { label: 'Part', render: (p) => p.dName },
    { label: 'SKU', render: (p) => p.sku },
    { label: 'Category', render: (p) => p.dCategory },
    { label: 'Bin', render: (p) => p.binLocation },
    { label: 'Qty', render: (p) => p.qtyOnHand },
    { label: 'Price', render: (p) => formatCurrency(p.unitPriceNpr), align: 'right' },
  ]
  const orderCols = [
    { label: 'Order', render: (o) => o.id },
    { label: 'Customer', render: (o) => o.customer },
    { label: 'Items', render: (o) => o.lines.reduce((a, l) => a + l.qty, 0) },
    { label: 'Status', render: (o) => o.status },
    { label: 'Total', render: (o) => formatCurrency(o.totalNpr), align: 'right' },
    { label: '', render: (o) => <button onClick={() => navigate(`/billing/parts/${o.id}`)} className="text-xs font-semibold text-brand-600 hover:underline">Bill →</button> },
  ]

  const subnav = [
    { key: 'overview', label: 'Overview' },
    { key: 'backorders', label: 'Urgent backorders' },
    { key: 'inventory', label: 'Parts inventory' },
    ...(canSell ? [{ key: 'sale', label: 'New parts sale' }] : []),
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Parts Department Overview</h1>
          <p className="text-sm text-ink-500">{branch === 'all' ? 'All branches' : branchById(branch)?.name} · stock, sales &amp; parts for active servicing</p>
        </div>
        <div className="flex gap-2">
          {canStock && <button onClick={() => setAddStock(true)} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"><PackagePlus className="h-4 w-4" /> Receive stock</button>}
          {canSell && <button onClick={() => setTab('sale')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'sale' ? 'bg-brand-700 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'}`}><Plus className="h-4 w-4" /> New parts sale</button>}
        </div>
      </div>

      {/* top sub-nav */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-ink-100 p-1">
        {subnav.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={pill(tab === t.key)}>{t.label}</button>)}
      </div>

      {/* ============ OVERVIEW (up to Today's Parts Orders) ============ */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricCard label="Total Inventory Value" value={formatCurrency(inventoryValue)} icon={Warehouse} tone="brand" sub={`${allStock.length} SKUs`} onClick={() => setDetail({ kind: 'stock', title: 'Parts inventory', subtitle: `${allStock.length} SKUs`, rows: allStock })} />
            <MetricCard label="Parts Sold Today" value={formatNumber(partsSoldToday)} icon={PackageCheck} tone="green" sub={`${todayOrders.length} order(s)`} onClick={() => setDetail({ kind: 'orders-ro', title: "Today's parts orders", subtitle: `${todayOrders.length} order(s)`, rows: todayOrders })} />
            <MetricCard label="Open Orders" value={formatNumber(openOrders.length)} icon={BadgeDollarSign} tone="amber" sub="requested / taken" onClick={() => setDetail({ kind: 'orders', title: 'Open parts orders', subtitle: 'edit lines, status & payment', rows: openOrders })} />
            <MetricCard label="Urgent Backorders" value={formatNumber(backorders.length)} icon={AlertTriangle} tone="rose" sub={`${outOfStock.length} out of stock`} onClick={() => setDetail({ kind: 'backorders', title: 'Backorders & low stock', subtitle: canStock ? 'restock / adjust' : 'view only', rows: backorders })} />
            <MetricCard label="In-stock SKUs" value={`${allStock.length ? Math.round((allStock.filter((p) => p.qtyOnHand > 0).length / allStock.length) * 1000) / 10 : 100}%`} icon={Gauge} tone="blue" sub="have stock on hand" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="mb-3 font-display text-base font-bold text-ink-900">Top Selling Parts by Revenue</h2>
              <div className="h-60">
                {topSelling.length === 0 ? <p className="grid h-full place-items-center text-sm text-ink-400">No parts sold yet.</p> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSelling} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid {...grid} vertical={false} />
                      <XAxis dataKey="name" {...axis} tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} angle={-15} textAnchor="end" height={54} />
                      <YAxis {...axis} width={40} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip cursor={{ fill: 'rgba(100,116,139,0.12)' }} contentStyle={tip} formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="var(--color-brand-600)" isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-display text-base font-bold text-ink-900">Parts Inventory Status</h2>
                <div className="ml-auto flex items-center gap-3 text-xs text-ink-500">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Healthy</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Low</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Out</span>
                </div>
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={invStatus} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid {...grid} vertical={false} />
                    <XAxis dataKey="name" {...axis} tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} angle={-15} textAnchor="end" height={48} />
                    <YAxis {...axis} allowDecimals={false} width={28} />
                    <Tooltip cursor={{ fill: 'rgba(100,116,139,0.12)' }} contentStyle={tip} />
                    <Bar dataKey="Healthy" stackId="a" fill="#10b981" isAnimationActive={false} />
                    <Bar dataKey="Low" stackId="a" fill="#f59e0b" isAnimationActive={false} />
                    <Bar dataKey="Out" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-4"><Truck className="h-4 w-4 text-brand-600" /><h2 className="font-display text-base font-bold text-ink-900">Today's Parts Orders &amp; Shipments</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wide text-ink-400"><th className="px-5 py-2 font-semibold">Order</th><th className="py-2 pr-3 font-semibold">Customer</th><th className="py-2 pr-3 font-semibold">Items</th><th className="py-2 pr-3 font-semibold">Status</th><th className="py-2 pr-3 text-right font-semibold">Total</th><th className="py-2 pr-5 text-right font-semibold">Actions</th></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="cursor-pointer border-t border-ink-100 hover:bg-ink-50/60" onClick={() => navigate(`/billing/parts/${o.id}`)}>
                      <td className="px-5 py-2.5"><p className="font-semibold text-ink-900">{o.id}</p><p className="text-[11px] text-ink-400">{fmtDate(o.createdOn)}{o.serviceJobId ? ` · for ${o.serviceJobId}` : ''}</p></td>
                      <td className="py-2.5 pr-3 text-ink-700">{o.customer}</td>
                      <td className="py-2.5 pr-3 text-ink-600">{o.lines.reduce((a, l) => a + l.qty, 0)} item(s)</td>
                      <td className="py-2.5 pr-3"><Badge tone={ORDER_TONE[o.status]}>{TITLE(o.status)}</Badge></td>
                      <td className="py-2.5 pr-3 text-right font-semibold">{formatCurrency(o.totalNpr)}</td>
                      <td className="py-2.5 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          {o.status !== 'paid' && canSell && <button onClick={() => payPartsOrder(o.id, 'Cash')} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700">Mark paid</button>}
                          <Link to={`/billing/parts/${o.id}`} className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-50"><Printer className="h-3.5 w-3.5" /> Print</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-ink-400">No parts orders yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ============ URGENT BACKORDERS & ETA + active servicing ============ */}
      {tab === 'backorders' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-500" /><h2 className="font-display text-base font-bold text-ink-900">Urgent Backorders &amp; ETA</h2></div>
            <div className="space-y-2">
              {backorders.slice(0, 8).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink-900">{p.dName}</p><p className="text-[11px] text-ink-400">{p.sku} · {p.dCategory} · {branchById(p.branchId)?.name}</p></div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {p.qtyOnHand === 0 ? <Badge tone="rose">Out of stock</Badge> : <Badge tone="amber">{p.qtyOnHand} left</Badge>}
                      <p className="mt-0.5 text-[11px] text-ink-400">ETA {ETA_BY_INDEX[i % ETA_BY_INDEX.length]}</p>
                    </div>
                    <button onClick={() => setDetail({ kind: 'backorders', title: 'Backorders & low stock', subtitle: canStock ? 'restock / adjust' : 'view only', rows: backorders })} className="rounded-md border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-50">{canStock ? 'Adjust' : 'View'}</button>
                  </div>
                </div>
              ))}
              {backorders.length === 0 && <p className="py-8 text-center text-sm text-ink-400">All parts above reorder level.</p>}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2"><Wrench className="h-4 w-4 text-brand-600" /><h2 className="font-display text-base font-bold text-ink-900">Active Servicing - Parts</h2></div>
            <p className="mb-2 text-xs text-ink-500">{canAttach ? 'Use New parts sale → "Add to service job" to attach parts.' : 'View only - Service handles servicing detail.'}</p>
            <div className="space-y-2">
              {activeJobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink-900">{j.vehicle}</p><p className="text-[11px] text-ink-400">{j.id} · {j.customer} · {(j.attachedParts || []).length} part(s)</p></div>
                  <Link to={`/service/${j.id}`} className="rounded-md border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-50">View</Link>
                </div>
              ))}
              {activeJobs.length === 0 && <p className="py-8 text-center text-sm text-ink-400">No active service jobs right now.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ============ PARTS INVENTORY ============ */}
      {tab === 'inventory' && (
        <div className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2"><Boxes className="h-4 w-4 text-brand-600" /><h2 className="font-display text-base font-bold text-ink-900">Parts Inventory</h2></div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search part, SKU, OEM" className="h-9 w-52 rounded-lg border border-ink-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" /></div>
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={`${selectCls} h-9 w-auto`}><option value="all">All categories</option>{PART_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wide text-ink-400"><th className="px-5 py-2 font-semibold">Part</th><th className="py-2 pr-3 font-semibold">SKU / OEM</th><th className="py-2 pr-3 font-semibold">Category</th><th className="py-2 pr-3 font-semibold">Bin</th><th className="py-2 pr-3 font-semibold">Qty</th><th className="py-2 pr-5 text-right font-semibold">Price</th></tr></thead>
              <tbody>
                {stock.map((p) => (
                  <tr key={p.id} className="border-t border-ink-100 hover:bg-ink-50/60">
                    <td className="px-5 py-2.5 font-semibold text-ink-900">{p.dName}</td>
                    <td className="py-2.5 pr-3"><p className="text-ink-700">{p.sku}</p><p className="font-mono text-[11px] text-ink-400">{p.dOem}</p></td>
                    <td className="py-2.5 pr-3 text-ink-600">{p.dCategory}</td>
                    <td className="py-2.5 pr-3 text-ink-600">{p.binLocation}</td>
                    <td className="py-2.5 pr-3">{p.qtyOnHand === 0 ? <Badge tone="rose">Out</Badge> : p.qtyOnHand <= p.reorderLevel ? <Badge tone="amber">{p.qtyOnHand} low</Badge> : <span className="font-semibold text-ink-800">{p.qtyOnHand}</span>}</td>
                    <td className="py-2.5 pr-5 text-right font-semibold text-ink-900">{formatCurrency(p.unitPriceNpr)}</td>
                  </tr>
                ))}
                {stock.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-ink-400">No parts match.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ NEW PARTS SALE (2 sections: lookup + cart) ============ */}
      {tab === 'sale' && canSell && (
        <NewSale
          did={dealershipId} myBranches={myBranches} defaultBranch={branchId || myBranches[0]?.id} partsInventory={partsInventory}
          cart={partsCart} activeJobs={serviceJobs} canAttach={canAttach}
          addToCart={addToCart} updateCartLine={updateCartLine} removeCartLine={removeCartLine} clearCart={clearCart}
          onCheckout={(form) => { const o = checkoutCart(form); if (o) navigate(`/billing/parts/${o.id}`) }}
          onAddToJob={(jobId) => { if (cartToJob(jobId)) navigate(`/service/${jobId}`) }}
        />
      )}

      {/* ============ editable side panel ============ */}
      {/* Drawer reads LIVE arrays (not a frozen snapshot) so edits reflect immediately after save */}
      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail?.title} subtitle={detail?.subtitle}>
        {detail?.kind === 'orders' && <OrdersEditor orders={openOrders} did={dealershipId} canSell={canSell} onSaveOrder={updatePartsOrder} onPay={payPartsOrder} />}
        {detail?.kind === 'backorders' && <BackordersEditor items={backorders} canManage={canStock} onSave={updatePart} />}
        {detail?.kind === 'stock' && <div className="py-2"><DetailTable columns={stockCols} rows={allStock} /></div>}
        {detail?.kind === 'orders-ro' && <div className="py-2"><DetailTable columns={orderCols} rows={todayOrders} /></div>}
      </Drawer>

      {addStock && <AddStockModal did={dealershipId} role={role} branches={myBranches} partsInventory={partsInventory} onClose={() => setAddStock(false)} onAdd={addPartToInventory} onRestock={updatePart} onRequestNew={requestNewPart} />}
    </div>
  )
}

/* ---------- New parts sale: section 1 lookup (availability dots) -> section 2 cart ---------- */
function NewSale({ did, myBranches, defaultBranch, partsInventory, cart, activeJobs, canAttach, addToCart, updateCartLine, removeCartLine, clearCart, onCheckout, onAddToJob }) {
  const [saleBranch, setSaleBranch] = useState(defaultBranch || myBranches[0]?.id || '')
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [pay, setPay] = useState('Cash')
  const [jobId, setJobId] = useState('')
  const [err, setErr] = useState('')

  const stockBySku = useMemo(() => {
    const m = {}
    for (const p of partsInventory) { if (p.branchId === saleBranch) m[p.sku] = (m[p.sku] || 0) + p.qtyOnHand }
    return m
  }, [partsInventory, saleBranch])

  // vehicles currently being serviced (across the dealership) - the cart can be attached to any of them
  const jobs = activeJobs.filter((j) => j.status === 'in_progress' || j.status === 'confirmed')
  const subtotal = cart.reduce((a, l) => a + l.lineTotalNpr, 0)   // pre-tax; tax/VAT only on the printed bill

  function pick(p) {
    const unitPriceNpr = retail(p.unitPriceNpr)
    addToCart({ sku: p.sku, name: p.name, oemNumber: p.oemNumber, hsCode: p.hsCode, qty: 1, unitPriceNpr, lineTotalNpr: unitPriceNpr })
  }
  function checkout() {
    setErr('')
    const c = sanitizeText(customer, 80)
    if (!c) return setErr('Customer name is required.')
    if (phone && !isValidPhone(phone)) return setErr('Enter a valid phone number.')
    if (!cart.length) return setErr('Add at least one part.')
    onCheckout({ customer: c, phone, branchId: saleBranch, paymentMethod: pay })
  }
  function addToJob() {
    setErr('')
    if (!cart.length) return setErr('Add at least one part.')
    if (!jobId) return setErr('Pick a service job to attach to.')
    onAddToJob(jobId)
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* section 1 - look up & add */}
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2"><Search className="h-4 w-4 text-brand-600" /><h2 className="font-display text-base font-bold text-ink-900">1 · Look up &amp; add parts</h2></div>
        <label className="mb-3 block text-[11px] font-medium text-ink-400">Selling from branch
          <select value={saleBranch} onChange={(e) => setSaleBranch(e.target.value)} className={`mt-0.5 ${selectCls}`}>{myBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        </label>
        <PartPicker stockBySku={stockBySku} onPick={pick} />
        <p className="mt-3 text-xs text-ink-400">Each part shows live availability for the selected branch - <span className="font-semibold text-emerald-600">green</span> in stock, <span className="font-semibold text-rose-600">red</span> unavailable. Picking adds it to the cart.</p>
      </div>

      {/* section 2 - cart + checkout / attach */}
      <div className="card flex flex-col p-5">
        <div className="mb-3 flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-brand-600" /><h2 className="font-display text-base font-bold text-ink-900">2 · Cart</h2>{cart.length > 0 && <button onClick={clearCart} className="ml-auto text-xs font-semibold text-rose-500 hover:underline">Clear</button>}</div>

        <div className="space-y-2">
          {cart.map((l) => {
            const avail = (stockBySku[l.sku] || 0)
            return (
              <div key={l.sku} className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{l.name}</p>
                  <p className="text-[11px] text-ink-400">{formatCurrency(l.unitPriceNpr)} · {avail > 0 ? <span className="text-emerald-600">{avail} in stock</span> : <span className="text-rose-500">out of stock</span>}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateCartLine(l.sku, l.qty - 1)} className="grid h-7 w-7 place-items-center rounded-md border border-ink-200 text-ink-600 hover:bg-ink-50">−</button>
                  <input type="number" min={1} value={l.qty} onChange={(e) => updateCartLine(l.sku, Math.max(1, Number(e.target.value) || 1))} className="h-7 w-12 rounded-md border border-ink-200 px-1 text-center text-sm" />
                  <button onClick={() => updateCartLine(l.sku, l.qty + 1)} className="grid h-7 w-7 place-items-center rounded-md border border-ink-200 text-ink-600 hover:bg-ink-50">+</button>
                </div>
                <span className="w-24 text-right text-sm font-semibold text-ink-900">{formatCurrency(l.lineTotalNpr)}</span>
                <button onClick={() => removeCartLine(l.sku)} className="grid h-7 w-7 place-items-center rounded-md text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            )
          })}
          {cart.length === 0 && <p className="rounded-lg border border-dashed border-ink-200 py-8 text-center text-sm text-ink-400">Cart is empty - search a part on the left to add it.</p>}
        </div>

        {cart.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-ink-100 pt-3 text-sm">
            <li className="flex justify-between font-bold text-ink-900">Total<span>{formatCurrency(subtotal)}</span></li>
            <li className="text-[11px] font-normal text-ink-400">Tax &amp; VAT are added on the printed bill.</li>
          </ul>
        )}

        <div className="mt-4 space-y-2 border-t border-ink-100 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name *" className={input} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={input} />
          </div>
          <select value={pay} onChange={(e) => setPay(e.target.value)} className={selectCls}>{['Cash', 'Card', 'Bank Transfer'].map((m) => <option key={m}>{m}</option>)}</select>
          {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}
          <button onClick={checkout} className="btn w-full bg-brand-600 text-white hover:bg-brand-700"><BadgeDollarSign className="h-4 w-4" /> Checkout &amp; create bill</button>

          {canAttach && (
            <div className="rounded-xl border border-ink-100 bg-ink-50/40 p-3">
              <p className="mb-2 text-xs font-semibold text-ink-600">Or add this cart to a live service job</p>
              <div className="flex gap-2">
                <select value={jobId} onChange={(e) => setJobId(e.target.value)} className={`${selectCls} flex-1`}>
                  <option value="">Select an active job…</option>
                  {jobs.map((j) => <option key={j.id} value={j.id}>{j.vehicle} · {j.customer} · {branchById(j.branchId)?.name}</option>)}
                </select>
                <button onClick={addToJob} disabled={!jobs.length} className="shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-3 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50"><Wrench className="mr-1 inline h-4 w-4" /> Add to job</button>
              </div>
              {jobs.length === 0 && <p className="mt-1 text-[11px] text-ink-400">No vehicles being serviced right now.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
