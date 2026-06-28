import { createContext, useContext, useEffect, useState } from 'react'
import { getSession } from '../lib/auth.js'
import { sanitizeText, iso } from '@shared/lib'
import {
  followups as seedFollowups, serviceJobs as seedJobs, inventory as seedInventory, sales as seedSales,
  partsInventory as seedPartsInv, partsOrders as seedPartsOrders, TODAY, nextDocNo,
  segmentByModel, PARTS_CATALOG,
} from '../data/dealer.js'

// Retail markup on the catalog cost (mirrors the parts-sale pricing rule).
const retail = (n) => Math.round((n * 1.2) / 10) * 10
// A draft parts-sale cart, pre-seeded so the New Parts Sale view isn't empty on first open.
function seedCart() {
  return [PARTS_CATALOG[0], PARTS_CATALOG[2]].filter(Boolean).map((p, i) => {
    const qty = i + 1, unitPriceNpr = retail(p.unitPriceNpr)
    return { sku: p.sku, name: p.name, oemNumber: p.oemNumber, hsCode: p.hsCode, qty, unitPriceNpr, lineTotalNpr: unitPriceNpr * qty }
  })
}

// Tenant-scoped store. Every collection is filtered to the signed-in dealership.
// Persisted per-dealership in sessionStorage. (Front-end scoping is a DEMO - TODO.md.)
const DealerContext = createContext(null)
const KEY = 'vinsight:dealer:store'
const TODAY_ISO = iso(TODAY)
export const TYPE_LABEL = { service_edit: 'Service record edit', parts_order_edit: 'Parts order edit', parts_add: 'New part request' }

const scoped = (arr, did) => (did ? arr.filter((x) => x.dealershipId === did) : arr)

function seed(did) {
  return {
    followups: scoped(seedFollowups, did),
    serviceJobs: scoped(seedJobs, did),
    inventory: scoped(seedInventory, did),
    partsInventory: scoped(seedPartsInv, did),
    partsOrders: scoped(seedPartsOrders, did),
    partsCart: seedCart(),   // draft parts-sale cart (lookup -> add -> checkout / attach to job)
    salesExtra: [],   // new sales recorded in-app (with buyer)
    saleEdits: {},    // overrides on seed sales (so the big seed stays static)
    repTargets: {},   // per-salesperson target: { [repId]: { type: 'units'|'revenue', value } }
    changeRequests: [], // approvals queue (service edits, paid-bill/order edits, new-part requests) - decided by the dealership Admin
    notifications: [],  // in-app notifications targeted by role (Admin gets requests; Parts gets approvals)
  }
}

function load(did) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(`${KEY}:${did}`) || 'null')
    // Merge over fresh defaults so snapshots from before a new field (e.g. partsCart) stay valid.
    if (saved && saved.partsInventory && saved.salesExtra) return { ...seed(did), ...saved }
  } catch { /* ignore */ }
  return seed(did)
}

export function DealerProvider({ children }) {
  const session = getSession() || {}
  const did = session.dealershipId
  const [state, setState] = useState(() => load(did))

  useEffect(() => {
    try { sessionStorage.setItem(`${KEY}:${did}`, JSON.stringify(state)) } catch { /* ignore */ }
  }, [state, did])

  const partsTotal = (lines) => lines.reduce((a, p) => a + (p.lineTotalNpr || 0), 0)
  const clean = (patch) => Object.fromEntries(Object.entries(patch || {}).filter(([k]) => !k.startsWith('__'))) // drop metadata (e.g. __reason)
  const mkNotif = (to, kind, message, link) => ({ id: nextDocNo('NT'), to, kind, message, link: link || null, createdOn: TODAY_ISO, read: false })

  // Queue a change request for the dealership Admin to decide (in-app, dealership-scoped).
  // `original` is snapshotted for the before/after diff; null for brand-new items (e.g. a part request).
  const createChangeRequest = ({ type, targetId, patch, reason, original }) => {
    const target = original !== undefined ? original
      : type === 'service_edit' ? state.serviceJobs.find((j) => j.id === targetId)
        : type === 'parts_order_edit' ? state.partsOrders.find((o) => o.id === targetId) : null
    const cr = {
      id: nextDocNo('CR'), dealershipId: did, branchId: target?.branchId || patch?.branchId || null,
      type, targetId, original: target ? { ...target } : null, patch,
      reason: sanitizeText(reason || '', 200), requestedByRole: session.role || '', requestedByName: session.name || '', requestedByEmail: session.email || '',
      requestedOn: TODAY_ISO, status: 'pending', applied: false,
    }
    const note = mkNotif('Admin', 'approval_request', `${session.name || session.role || 'A user'} requested approval: ${TYPE_LABEL[type] || type}`, '/approvals')
    setState((s) => ({ ...s, changeRequests: [cr, ...s.changeRequests], notifications: [note, ...s.notifications] }))
    return cr
  }

  const api = {
    dealershipId: did,
    // merged read-only view: new sales + seed sales with any edits applied
    salesAll: [...state.salesExtra, ...scoped(seedSales, did).map((s) => ({ ...s, ...(state.saleEdits[s.id] || {}) }))]
      .sort((a, b) => (b.soldOn || '').localeCompare(a.soldOn || '')),
    sales: scoped(seedSales, did), // legacy read-only (charts)

    ...state,

    updateFollowup: (id, patch) =>
      setState((s) => ({ ...s, followups: s.followups.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),

    recordFollowupDisposition: (id, { disposition, note }) =>
      setState((s) => ({
        ...s,
        followups: s.followups.map((f) =>
          f.id === id ? { ...f, status: 'done', disposition, note: sanitizeText(note || '', 200), dispositionOn: TODAY_ISO } : f),
      })),

    // Editing a COMPLETED service record dated before today needs admin approval -> queue
    // a change request instead of a direct edit. Otherwise edit directly.
    updateServiceJob: (id, patch) => {
      const job = state.serviceJobs.find((j) => j.id === id)
      if (job && job.status === 'completed' && job.completedOn && job.completedOn < TODAY_ISO) {
        createChangeRequest({ type: 'service_edit', targetId: id, patch, reason: patch.__reason || 'Edit to a completed service record' })
        return { queued: true }
      }
      setState((s) => ({ ...s, serviceJobs: s.serviceJobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) }))
      return { queued: false }
    },

    setServiceDetails: (jobId, serviceDetails) =>
      setState((s) => ({ ...s, serviceJobs: s.serviceJobs.map((j) => (j.id === jobId ? { ...j, serviceDetails } : j)) })),

    addServiceBooking: (booking) =>
      setState((s) => ({ ...s, serviceJobs: [{ dealershipId: did, serviceDetails: [], attachedParts: [], labourCostNpr: 0, partsCostNpr: 0, totalNpr: 0, ...booking }, ...s.serviceJobs] })),

    addVehicle: (vehicle) =>
      setState((s) => ({ ...s, inventory: [{ ...vehicle, dealershipId: did }, ...s.inventory] })),

    updateVehicle: (id, patch) =>
      setState((s) => ({ ...s, inventory: s.inventory.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),

    removeVehicle: (id) =>
      setState((s) => ({ ...s, inventory: s.inventory.filter((v) => v.id !== id) })),

    /* ----- sales (with buyer + salesperson + branch) ----- */
    createSale: ({ vehicleId, repId, priceNpr, buyer = {}, financeType = 'cash', downPaymentNpr = 0, loanAmountNpr = 0, paymentMethod = 'Cash', notes = '' }) => {
      const v = state.inventory.find((x) => x.id === vehicleId)
      const sub = Math.round(Number(priceNpr) || 0)   // tax/VAT are added only on the printed bill
      const id = nextDocNo('SALE')
      const sale = {
        id, dealershipId: did, branchId: v?.branchId, salespersonId: repId, repId,
        vehicleId, make: v?.make, model: v?.model, year: v?.year, vin: v?.vin,
        condition: 'used', segment: segmentByModel[v?.model] || 'Sedan', leadSource: 'Walk-in',
        priceNpr: sub, subtotalNpr: sub, totalNpr: sub,
        buyerName: sanitizeText(buyer.name || '', 80), buyerPhone: sanitizeText(buyer.phone || '', 20), buyerEmail: sanitizeText(buyer.email || '', 80),
        buyerAddress: sanitizeText(buyer.address || '', 120), buyerPan: sanitizeText(buyer.pan || '', 24),
        financeType, downPaymentNpr: Number(downPaymentNpr) || 0, loanAmountNpr: Number(loanAmountNpr) || 0,
        paymentMethod, paymentStatus: 'completed', soldOn: TODAY_ISO, invoiceNo: id, notes: sanitizeText(notes, 200),
      }
      setState((s) => ({ ...s, salesExtra: [sale, ...s.salesExtra], inventory: s.inventory.map((x) => (x.id === vehicleId ? { ...x, status: 'sold' } : x)) }))
      return sale
    },
    setRepTarget: (repId, target) =>
      setState((s) => ({ ...s, repTargets: { ...s.repTargets, [repId]: target } })),

    updateSale: (id, patch) =>
      setState((s) => (s.salesExtra.some((x) => x.id === id)
        ? { ...s, salesExtra: s.salesExtra.map((x) => (x.id === id ? { ...x, ...patch } : x)) }
        : { ...s, saleEdits: { ...s.saleEdits, [id]: { ...(s.saleEdits[id] || {}), ...patch } } })),

    /* ----- parts ----- */
    adjustPartStock: (pinvId, delta) =>
      setState((s) => ({
        ...s,
        partsInventory: s.partsInventory.map((p) => (p.id === pinvId ? { ...p, qtyOnHand: Math.max(0, p.qtyOnHand + delta) } : p)),
      })),

    addPartToInventory: (record) =>
      setState((s) => ({ ...s, partsInventory: [{ ...record, dealershipId: did }, ...s.partsInventory] })),

    // Edit a stock row in place (restock qty, price, reorder level) - used by the editable backorders panel.
    updatePart: (pinvId, patch) =>
      setState((s) => ({ ...s, partsInventory: s.partsInventory.map((p) => (p.id === pinvId ? { ...p, ...patch } : p)) })),

    /* ----- parts-sale cart (lookup -> add -> checkout, or attach to a live service job) ----- */
    addToCart: (line) =>
      setState((s) => {
        const existing = s.partsCart.find((l) => l.sku === line.sku)
        const partsCart = existing
          ? s.partsCart.map((l) => (l.sku === line.sku ? { ...l, qty: l.qty + line.qty, lineTotalNpr: (l.qty + line.qty) * l.unitPriceNpr } : l))
          : [...s.partsCart, line]
        return { ...s, partsCart }
      }),
    updateCartLine: (sku, qty) =>
      setState((s) => ({
        ...s,
        partsCart: qty <= 0
          ? s.partsCart.filter((l) => l.sku !== sku)
          : s.partsCart.map((l) => (l.sku === sku ? { ...l, qty, lineTotalNpr: qty * l.unitPriceNpr } : l)),
      })),
    removeCartLine: (sku) => setState((s) => ({ ...s, partsCart: s.partsCart.filter((l) => l.sku !== sku) })),
    clearCart: () => setState((s) => ({ ...s, partsCart: [] })),

    // Checkout the cart as a paid parts order (reduces stock for the chosen branch) -> returns the order.
    checkoutCart: ({ customer, phone = '', branchId, paymentMethod = 'Cash', note = '' }) => {
      const lines = state.partsCart
      if (!lines.length) return null
      const sub = Math.round(lines.reduce((a, l) => a + l.lineTotalNpr, 0))   // tax/VAT added only on the bill
      const order = {
        id: nextDocNo('PO'), dealershipId: did, branchId, customer: sanitizeText(customer, 80), phone: phone || '-',
        vin: null, serviceJobId: null, status: 'paid', lines,
        subtotalNpr: sub, totalNpr: sub,
        paymentMethod, createdOn: TODAY_ISO, paidOn: TODAY_ISO, createdByRole: session.role || '', note: sanitizeText(note, 200),
      }
      setState((s) => {
        let inv = s.partsInventory
        for (const l of lines) inv = inv.map((p) => (p.sku === l.sku && p.branchId === branchId ? { ...p, qtyOnHand: Math.max(0, p.qtyOnHand - l.qty) } : p))
        return { ...s, partsInventory: inv, partsOrders: [order, ...s.partsOrders], partsCart: [] }
      })
      return order
    },

    // Attach the whole cart to a live service job (parts billed through the job, stock reduced).
    // Returns false if the cart is empty or the job no longer exists (so the caller doesn't
    // navigate to a job that wasn't actually updated).
    cartToJob: (jobId) => {
      const lines = state.partsCart
      if (!lines.length) return false
      if (!state.serviceJobs.some((j) => j.id === jobId)) return false
      setState((s) => {
        const job = s.serviceJobs.find((j) => j.id === jobId)
        if (!job) return s
        let inv = s.partsInventory
        for (const l of lines) inv = inv.map((p) => (p.sku === l.sku && p.branchId === job.branchId ? { ...p, qtyOnHand: Math.max(0, p.qtyOnHand - l.qty) } : p))
        const serviceJobs = s.serviceJobs.map((j) => {
          if (j.id !== jobId) return j
          const attachedParts = [...(j.attachedParts || []), ...lines.map((l) => ({ ...l, addedByRole: session.role || '', poId: null }))]
          const partsCostNpr = partsTotal(attachedParts)
          return { ...j, attachedParts, partsCostNpr, totalNpr: (j.labourCostNpr || 0) + partsCostNpr }
        })
        return { ...s, partsInventory: inv, serviceJobs, partsCart: [] }
      })
      return true
    },

    createPartsOrder: (order) => {
      const next = { ...order, id: nextDocNo('PO'), dealershipId: did }  // id computed outside the updater (pure)
      setState((s) => {
        let inv = s.partsInventory
        for (const l of next.lines) {
          inv = inv.map((p) => (p.sku === l.sku && p.branchId === next.branchId ? { ...p, qtyOnHand: Math.max(0, p.qtyOnHand - l.qty) } : p))
        }
        return { ...s, partsInventory: inv, partsOrders: [next, ...s.partsOrders] }
      })
      return next
    },

    // A change to a SOLD (paid) order needs admin approval -> queue a change request.
    updatePartsOrder: (id, patch) => {
      const order = state.partsOrders.find((o) => o.id === id)
      if (order && order.status === 'paid') {
        createChangeRequest({ type: 'parts_order_edit', targetId: id, patch, reason: patch.__reason || 'Edit to a sold parts order' })
        return { queued: true }
      }
      setState((s) => ({ ...s, partsOrders: s.partsOrders.map((o) => (o.id === id ? { ...o, ...patch } : o)) }))
      return { queued: false }
    },

    payPartsOrder: (id, paymentMethod) =>
      setState((s) => ({ ...s, partsOrders: s.partsOrders.map((o) => (o.id === id ? { ...o, status: 'paid', paymentMethod, paidOn: TODAY_ISO, paidByName: session.name || '', paidByEmail: session.email || '' } : o)) })),

    // Mark a completed service job's bill as paid; records WHO collected it (shown on the invoice).
    markServiceBillPaid: (jobId, paymentMethod = 'Cash') =>
      setState((s) => ({ ...s, serviceJobs: s.serviceJobs.map((j) => (j.id === jobId ? { ...j, billStatus: 'paid', billPaidOn: TODAY_ISO, billPaidByName: session.name || '', billPaidByEmail: session.email || '', billPaymentMethod: paymentMethod } : j)) })),

    attachPartToJob: (jobId, line) =>
      setState((s) => ({
        ...s,
        serviceJobs: s.serviceJobs.map((j) => {
          if (j.id !== jobId) return j
          const attachedParts = [...(j.attachedParts || []), line]
          const partsCostNpr = partsTotal(attachedParts)
          return { ...j, attachedParts, partsCostNpr, totalNpr: (j.labourCostNpr || 0) + partsCostNpr }
        }),
      })),

    /* ----- approvals (decided by the dealership Admin, in-app) ----- */
    // A Parts/Service staff request to add a brand-new part the dealership doesn't stock yet.
    requestNewPart: (record, reason) =>
      createChangeRequest({ type: 'parts_add', targetId: record.sku || record.name, patch: record, reason: reason || 'New part not in current inventory', original: null }),

    // Approve / reject a queued change request. Approving applies it immediately (and notifies
    // the requester); service-record & paid-order edits and new-part requests all flow through here.
    decideChangeRequest: (id, decision, { reason = '' } = {}) => {
      const cr = state.changeRequests.find((c) => c.id === id)
      if (!cr || cr.status !== 'pending') return
      const approved = decision === 'approve'
      const decidedByName = session.name || '', decidedByEmail = session.email || ''
      setState((s) => {
        let { serviceJobs, partsOrders, partsInventory } = s
        if (approved) {
          if (cr.type === 'service_edit') serviceJobs = serviceJobs.map((j) => (j.id === cr.targetId ? { ...j, ...clean(cr.patch) } : j))
          else if (cr.type === 'parts_order_edit') partsOrders = partsOrders.map((o) => (o.id === cr.targetId ? { ...o, ...clean(cr.patch) } : o))
          else if (cr.type === 'parts_add') partsInventory = [{ ...clean(cr.patch), dealershipId: did }, ...partsInventory]
        }
        const changeRequests = s.changeRequests.map((c) => (c.id === id
          ? { ...c, status: approved ? 'approved' : 'rejected', applied: approved, decidedByName, decidedByEmail, decidedOn: TODAY_ISO, rejectionReason: approved ? undefined : sanitizeText(reason, 200) }
          : c))
        const verb = approved ? 'approved' : 'rejected'
        const msg = cr.type === 'parts_add'
          ? `Your new part "${cr.patch?.name || cr.targetId}" was ${verb}${approved ? ' and added to inventory' : ''}.`
          : `Your ${TYPE_LABEL[cr.type] || 'change'} (${cr.targetId}) was ${verb}.`
        const link = cr.type === 'parts_add' ? '/parts' : cr.type === 'service_edit' ? `/service/${cr.targetId}` : '/billing'
        const note = mkNotif(cr.requestedByRole || 'Parts', approved ? 'approved' : 'rejected', msg, link)
        return { ...s, serviceJobs, partsOrders, partsInventory, changeRequests, notifications: [note, ...s.notifications] }
      })
    },

    // Mark this role's notifications read (bell badge clears).
    markNotificationsRead: (role) =>
      setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.to === role ? { ...n, read: true } : n)) })),

    resetDemo: () => setState(seed(did)),
  }

  return <DealerContext.Provider value={api}>{children}</DealerContext.Provider>
}

export const useDealer = () => {
  const ctx = useContext(DealerContext)
  if (!ctx) throw new Error('useDealer must be used within DealerProvider')
  return ctx
}
