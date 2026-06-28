import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Check, X, FileClock, ShieldAlert, PackagePlus } from 'lucide-react'
import { formatCurrency } from '@shared/lib'
import { useDealer, TYPE_LABEL } from '../store/DealerStore.jsx'
import { branchById, fmtDate } from '../data/dealer.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

const STATUS_TONE = { pending: 'bg-amber-50 text-amber-700', approved: 'bg-emerald-50 text-emerald-700', rejected: 'bg-rose-50 text-rose-700' }
const FILTERS = ['pending', 'approved', 'rejected', 'all']
const show = (v) => (v == null || v === '' ? '-' : typeof v === 'object' ? JSON.stringify(v) : String(v))
const diffRows = (cr) => Object.keys(cr.patch || {}).filter((k) => !k.startsWith('__')).map((k) => ({ field: k, before: (cr.original || {})[k], after: cr.patch[k] }))

// New-part requests show the proposed part as a labelled card (not a before/after diff).
function PartRequest({ patch }) {
  const rows = [
    ['Part name', patch.name], ['SKU / Part No.', patch.sku], ['Category', patch.category],
    ['Branch', branchById(patch.branchId)?.name || patch.branchId || '-'],
    ['Opening stock', patch.qtyOnHand], ['Unit price', patch.unitPriceNpr != null ? formatCurrency(patch.unitPriceNpr) : '-'],
    ['Supplier', patch.supplier], ['Bin', patch.binLocation],
  ].filter(([, v]) => v != null && v !== '')
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-ink-100 bg-ink-50/50 p-3 sm:grid-cols-4">
      {rows.map(([k, v]) => <div key={k}><p className="text-[11px] uppercase tracking-wide text-ink-400">{k}</p><p className="text-sm font-semibold text-ink-800">{String(v)}</p></div>)}
    </div>
  )
}

export default function Approvals() {
  const { role } = useOutletContext()
  const { changeRequests, decideChangeRequest } = useDealer()
  const [filter, setFilter] = useState('pending')
  const [reject, setReject] = useState(null) // cr pending rejection

  if (role !== 'Admin') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-500"><ShieldAlert className="h-7 w-7" /></span>
        <h2 className="mt-4 font-display text-xl font-bold text-ink-900">Admins only</h2>
        <p className="mt-1 text-sm text-ink-500">Change-request approvals are restricted to the dealership Admin.</p>
      </div>
    )
  }

  const list = changeRequests.filter((c) => filter === 'all' || c.status === filter)
  const pendingCount = changeRequests.filter((c) => c.status === 'pending').length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Approvals</h1>
        <p className="text-sm text-ink-500">Review and decide change requests - edits to completed service records, paid bills &amp; parts orders, and new-part requests from your staff.</p>
      </div>

      <div className="flex gap-1 rounded-lg bg-ink-100 p-1 w-max">
        {FILTERS.map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${filter === k ? 'bg-[var(--surface)] text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}>
            {k}{k === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <div className="card flex flex-col items-center gap-2 p-10 text-center text-ink-400">
          <FileClock className="h-7 w-7" /> No {filter === 'all' ? '' : filter} change requests.
        </div>
      )}

      {list.map((cr) => (
        <div key={cr.id} className="card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[cr.status]}`}>{cr.status}</span>
            <span className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-ink-900">{cr.type === 'parts_add' && <PackagePlus className="h-4 w-4 text-brand-600" />}{TYPE_LABEL[cr.type] || cr.type}</span>
            <span className="text-xs text-ink-400">· {cr.targetId} · {cr.requestedByRole || '-'} ({cr.requestedByName || cr.requestedByEmail || '-'}) · {fmtDate(cr.requestedOn)}</span>
          </div>
          {cr.reason && <p className="mt-1 text-sm text-ink-600">Reason: {cr.reason}</p>}

          {cr.type === 'parts_add' ? <PartRequest patch={cr.patch} /> : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wide text-ink-400"><th className="py-1 pr-3 font-semibold">Field</th><th className="py-1 pr-3 font-semibold">Before</th><th className="py-1 font-semibold">After</th></tr></thead>
                <tbody>
                  {diffRows(cr).map((r) => (
                    <tr key={r.field} className="border-t border-ink-100">
                      <td className="py-1 pr-3 font-medium text-ink-700">{r.field}</td>
                      <td className="py-1 pr-3 text-ink-500 line-through">{show(r.before)}</td>
                      <td className="py-1 font-semibold text-ink-900">{show(r.after)}</td>
                    </tr>
                  ))}
                  {diffRows(cr).length === 0 && <tr><td colSpan={3} className="py-2 text-ink-400">No field changes recorded.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {cr.status === 'pending' && (
            <div className="mt-3 flex gap-2">
              <button onClick={() => decideChangeRequest(cr.id, 'approve')} className="btn-sm bg-emerald-600 text-white hover:bg-emerald-700"><Check className="mr-1 inline h-3.5 w-3.5" /> Approve</button>
              <button onClick={() => setReject(cr)} className="btn-sm border border-ink-200 text-rose-600 hover:bg-rose-50"><X className="mr-1 inline h-3.5 w-3.5" /> Reject</button>
            </div>
          )}
          {cr.status === 'rejected' && cr.rejectionReason && <p className="mt-2 text-xs text-rose-600">Rejected: {cr.rejectionReason}</p>}
          {cr.status === 'approved' && <p className="mt-2 text-xs text-emerald-600">Approved by {cr.decidedByName || cr.decidedByEmail} · {fmtDate(cr.decidedOn)}{cr.type === 'parts_add' ? ' · added to inventory' : ''}</p>}
        </div>
      ))}

      <ConfirmDialog
        open={!!reject} title="Reject this request?" tone="danger" confirmLabel="Reject request"
        message={reject ? `${TYPE_LABEL[reject.type] || reject.type} · ${reject.targetId}. The requester will be notified.` : ''}
        withReason reasonLabel="Reason for rejection (optional)"
        onCancel={() => setReject(null)}
        onConfirm={(reason) => { decideChangeRequest(reject.id, 'reject', { reason }); setReject(null) }}
      />
    </div>
  )
}
