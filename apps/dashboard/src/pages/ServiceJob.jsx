import { useState } from 'react'
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom'
import { ArrowLeft, Gauge, CheckCircle2, Printer, Boxes, Lock, FileText, ClipboardCheck, Clock, Check } from 'lucide-react'
import { Badge } from '@shared/ui'
import { formatCurrency, formatNumber, sanitizeText, iso } from '@shared/lib'
import { useDealer } from '../store/DealerStore.jsx'
import { branchById, cap, fmtDate, TODAY } from '../data/dealer.js'
import ServiceDetailEditor from '../components/ServiceDetailEditor.jsx'

const TODAY_ISO = iso(TODAY)
const STATUS = {
  requested: { label: 'Requested', tone: 'amber' }, confirmed: { label: 'Confirmed', tone: 'blue' },
  in_progress: { label: 'In service', tone: 'brand' }, completed: { label: 'Serviced', tone: 'green' },
}
const inputClass = 'h-10 w-44 rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'

const ciField = 'h-10 w-full rounded-lg border border-ink-200 bg-[var(--surface)] px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'

// Vehicle check-in: the owner confirms drop-off, a check-in time is logged, and the booked
// services are re-visited. Saved onto the job so the Service Centre shows it BEFORE servicing
// starts; "Start servicing" then auto-fetches these items (the advisor can add more).
function CheckInCard({ job, dealershipId, onCheckIn }) {
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const [by, setBy] = useState(job.customer || '')
  const [time, setTime] = useState(/^\d{1,2}:\d{2}/.test(job.slotTime || '') ? job.slotTime : hhmm)
  const [odometer, setOdometer] = useState(job.odometerKm || '')
  const seedItems = (job.serviceDetails && job.serviceDetails.length)
    ? job.serviceDetails
    : (job.requestedServices || []).map((s) => ({ category: 'Booked', item: s, note: '', values: {} }))
  const [details, setDetails] = useState(seedItems)
  const [confirmed, setConfirmed] = useState(false)
  const submit = () => {
    if (!by.trim() || !confirmed) return
    onCheckIn({ checkInOn: TODAY_ISO, checkInTime: time, checkInBy: sanitizeText(by, 80), odometerKm: Number(odometer) || job.odometerKm || null, serviceDetails: details })
  }
  return (
    <div className="card p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900"><ClipboardCheck className="h-4 w-4 text-brand-600" /> Vehicle check-in</h2>
      <p className="mt-0.5 text-sm text-ink-500">Confirm the owner has dropped the vehicle off, log the check-in time, and re-visit the services to perform.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-600">Checked in by (owner)</span>
          <input value={by} onChange={(e) => setBy(e.target.value)} className={ciField} /></label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-600"><Clock className="mr-1 inline h-3.5 w-3.5" />Check-in time</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={ciField} /></label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-600"><Gauge className="mr-1 inline h-3.5 w-3.5" />Odometer (km)</span>
          <input type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="e.g. 48200" className={ciField} /></label>
      </div>
      <div className="mt-4">
        <p className="mb-1 text-xs font-semibold text-ink-600">Services to perform (re-visit with owner)</p>
        <p className="mb-2 text-[11px] text-ink-400">Pulled from the booking - confirm, remove, or add items with the owner present.</p>
        <ServiceDetailEditor did={dealershipId} value={details} onChange={setDetails} />
      </div>
      <label className="mt-4 flex items-start gap-2 text-sm text-ink-600">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 accent-brand-600" />
        The owner has confirmed drop-off and the services listed above.
      </label>
      <button onClick={submit} disabled={!by.trim() || !confirmed} className="btn mt-3 w-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"><ClipboardCheck className="h-4 w-4" /> Confirm check-in</button>
    </div>
  )
}

// Live servicing progress: Check-in -> In service (or Delayed) -> Done. Shown only once
// the job is in the servicing pipeline (checked in / in service / completed).
function ServiceProgress({ job }) {
  const delayed = job.status === 'in_progress' && job.slotDate < TODAY_ISO
  const steps = [
    { key: 'checkin', label: 'Check-in', sub: job.checkInOn ? `${job.checkInTime ? job.checkInTime + ' · ' : ''}${fmtDate(job.checkInOn)}` : '' },
    { key: 'service', label: delayed ? 'Delayed' : 'In service', sub: delayed ? `${Math.max(1, Math.round((TODAY.getTime() - new Date(job.slotDate).getTime()) / 86400000))}d overdue` : '' },
    { key: 'done', label: 'Done', sub: job.completedOn ? fmtDate(job.completedOn) : '' },
  ]
  const stateOf = (key) => {
    if (key === 'checkin') return 'done'
    if (key === 'service') return job.status === 'completed' ? 'done' : 'current'
    return job.status === 'completed' ? 'done' : 'todo'
  }
  return (
    <div className="card p-5">
      <div className="flex items-start">
        {steps.map((s, i) => {
          const state = stateOf(s.key)
          const prevDone = i > 0 && stateOf(steps[i - 1].key) === 'done'
          const node = state === 'done' ? 'border-brand-600 bg-brand-600 text-white'
            : state === 'current' ? (delayed ? 'border-amber-400 bg-amber-50 text-amber-600' : 'border-brand-500 bg-brand-50 text-brand-600')
              : 'border-ink-200 bg-[var(--surface)] text-ink-300'
          const labelCls = state === 'todo' ? 'text-ink-400' : (delayed && state === 'current') ? 'text-amber-600' : 'text-ink-900'
          return (
            <div key={s.key} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : prevDone ? 'bg-brand-500' : 'bg-ink-200'}`} />
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 ${node}`}>
                  {state === 'done'
                    ? <Check className="h-4 w-4" />
                    : state === 'current' && !delayed
                      ? <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-500" /></span>
                      : <span className="h-2 w-2 rounded-full bg-current" />}
                </span>
                <span className={`h-0.5 flex-1 ${i === steps.length - 1 ? 'opacity-0' : state === 'done' ? 'bg-brand-500' : 'bg-ink-200'}`} />
              </div>
              <p className={`mt-2 text-xs font-bold ${labelCls}`}>{s.label}</p>
              {s.sub && <p className="text-[11px] text-ink-400">{s.sub}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ServiceJob() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { role, dealershipId } = useOutletContext()
  const { serviceJobs, partsOrders, updateServiceJob, setServiceDetails, attachPartToJob, updatePartsOrder } = useDealer()
  const job = serviceJobs.find((j) => j.id === jobId)
  const canEdit = cap(role, 'editServiceDetails') // Parts => read-only here
  const [labour, setLabour] = useState(job?.labourCostNpr || '')
  const [notes, setNotes] = useState(job?.notes || '')
  const [reqLabour, setReqLabour] = useState('')
  const [reqReason, setReqReason] = useState('')
  const [queued, setQueued] = useState(false)
  const [partsPrompt, setPartsPrompt] = useState(null)

  if (!job) return <div className="py-24 text-center text-ink-400">Job not found. <Link to="/service" className="font-semibold text-brand-600">Back to Service</Link></div>

  const details = job.serviceDetails || []
  const parts = job.attachedParts || []
  const partsTotal = parts.reduce((a, p) => a + (p.lineTotalNpr || 0), 0)
  const labourNum = Number(labour) || 0
  // a completed record dated before today is locked: edits need admin approval
  const locked = job.status === 'completed' && job.completedOn && job.completedOn < TODAY_ISO

  const requestChange = () => {
    const patch = {}
    if (reqLabour !== '') patch.labourCostNpr = Number(reqLabour)
    if (!Object.keys(patch).length) return
    const res = updateServiceJob(job.id, { ...patch, __reason: reqReason || 'Correction to completed record' })
    if (res?.queued) { setQueued(true); setReqLabour(''); setReqReason('') }
  }

  const confirmBooking = () => updateServiceJob(job.id, { status: 'confirmed' })
  // Items + odometer were captured at check-in; starting just flips status (items auto-fetched below).
  const startServicing = () => updateServiceJob(job.id, { status: 'in_progress' })

  // An OPEN (requested/taken) parts order tied to this job, or same customer at the same branch,
  // whose lines aren't already on the job -> offer to fold into the service bill. Paid orders are
  // excluded (already billed); name match is branch-scoped to avoid mis-association.
  const linkedOrder = partsOrders.find((o) => (o.status === 'requested' || o.status === 'taken') &&
    (o.serviceJobId === job.id || (o.customer && job.customer && o.customer.toLowerCase() === job.customer.toLowerCase() && o.branchId === job.branchId)))
  const extraLines = linkedOrder ? (linkedOrder.lines || []).filter((l) => !parts.some((p) => p.sku === l.sku)) : []

  const finalizeComplete = (lines = []) => {
    for (const l of lines) attachPartToJob(job.id, { ...l, addedByRole: role, poId: linkedOrder?.id || null })
    // reconcile the source order so the same parts can't be billed again standalone
    if (lines.length && linkedOrder) updatePartsOrder(linkedOrder.id, { status: 'cancelled', note: `Billed through service job ${job.id}` })
    const extra = lines.reduce((a, l) => a + (l.lineTotalNpr || 0), 0)
    const newParts = partsTotal + extra
    updateServiceJob(job.id, {
      status: 'completed', labourCostNpr: labourNum, partsCostNpr: newParts, totalNpr: labourNum + newParts,
      workDone: details.map((d) => d.item), notes: sanitizeText(notes, 600), completedOn: TODAY_ISO,
    })
    setPartsPrompt(null)
    navigate(`/billing/combined/${job.id}`)   // completing servicing generates the bill
  }
  const complete = () => {
    if (linkedOrder && extraLines.length) setPartsPrompt(linkedOrder)
    else finalizeComplete([])
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate('/service')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" /> Service centre</button>
        <Badge tone={STATUS[job.status]?.tone}>{STATUS[job.status]?.label}</Badge>
      </div>

      {/* header */}
      <div className="card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">{job.vehicle}</h1>
            <p className="font-mono text-xs text-ink-400">{job.id} · VIN {job.vin}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:text-right">
            <div className="rounded-lg bg-ink-50 p-2.5"><p className="text-[11px] text-ink-400">Customer</p><p className="font-semibold">{job.customer}</p><p className="text-xs text-ink-400">{job.phone}</p></div>
            <div className="rounded-lg bg-ink-50 p-2.5"><p className="text-[11px] text-ink-400">Slot · branch</p><p className="font-semibold">{fmtDate(job.slotDate)} {job.slotTime}</p><p className="text-xs text-ink-400">{branchById(job.branchId)?.name}</p></div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-xs text-ink-400">Requested:</span>
          {job.requestedServices.map((s) => <span key={s} className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs text-ink-600">{s}</span>)}
        </div>
      </div>

      {/* live servicing progress tracker (only once the vehicle is checked in / in service / done) */}
      {(job.checkInOn || job.status === 'in_progress' || job.status === 'completed') && <ServiceProgress job={job} />}

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <Lock className="h-4 w-4" /> Read-only: your role ({role}) can view this job but not edit servicing details. Manage parts from the <Link to="/parts" className="font-semibold underline">Parts</Link> section.
        </div>
      )}

      {/* requested -> confirm the booking */}
      {job.status === 'requested' && canEdit && (
        <button onClick={confirmBooking} className="btn w-full bg-brand-600 text-white hover:bg-brand-700">Confirm booking</button>
      )}

      {/* confirmed, not yet checked in -> vehicle check-in */}
      {job.status === 'confirmed' && !job.checkInOn && canEdit && (
        <CheckInCard job={job} dealershipId={dealershipId} onCheckIn={(payload) => updateServiceJob(job.id, payload)} />
      )}

      {/* confirmed & checked in -> check-in summary + start servicing */}
      {job.status === 'confirmed' && job.checkInOn && canEdit && (
        <div className="card border-l-4 border-l-emerald-400 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900"><ClipboardCheck className="h-4 w-4 text-emerald-600" /> Checked in</h2>
              <p className="mt-0.5 text-sm text-ink-500">By {job.checkInBy || job.customer} · {job.checkInTime} · {fmtDate(job.checkInOn)}{job.odometerKm ? ` · Odometer ${formatNumber(job.odometerKm)} km` : ''}</p>
            </div>
            <button onClick={startServicing} className="btn bg-brand-600 text-white hover:bg-brand-700"><Gauge className="h-4 w-4" /> Start servicing</button>
          </div>
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-semibold text-ink-600">Services confirmed at check-in</p>
            {details.length ? (
              <div className="flex flex-wrap gap-1.5">{details.map((d, i) => <span key={i} className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs text-ink-700">{d.item}</span>)}</div>
            ) : <p className="text-sm text-ink-400">No specific items recorded - add them after starting.</p>}
          </div>
        </div>
      )}

      {/* service detail form (the dropdown-driven taxonomy editor) */}
      {(job.status === 'in_progress' || job.status === 'completed') && (
        <div className="card p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-ink-900">Servicing details</h2>
          <ServiceDetailEditor
            did={dealershipId}
            value={details}
            readOnly={!canEdit || job.status === 'completed'}
            onChange={(d) => setServiceDetails(job.id, d)}
          />
        </div>
      )}

      {/* attached parts (added by Parts dept) */}
      <div className="card p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900"><Boxes className="h-4 w-4 text-brand-600" /> Parts on this job</h2>
          {(job.status === 'in_progress' || job.status === 'confirmed') && <Link to="/parts" className="text-xs font-semibold text-brand-600 hover:underline">Add a part →</Link>}
        </div>
        {parts.length === 0 ? <p className="text-sm text-ink-400">No parts attached yet. The Parts department can add requested/issued parts to this active job.</p> : (
          <table className="w-full text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-wide text-ink-400"><th className="py-1.5 font-semibold">Part</th><th className="py-1.5 font-semibold">Qty</th><th className="py-1.5 text-right font-semibold">Unit</th><th className="py-1.5 text-right font-semibold">Total</th></tr></thead>
            <tbody>
              {parts.map((p, i) => (
                <tr key={i} className="border-t border-ink-100"><td className="py-1.5">{p.name}<span className="ml-1 text-xs text-ink-400">{p.oemNumber}</span></td><td className="py-1.5">{p.qty}</td><td className="py-1.5 text-right">{formatCurrency(p.unitPriceNpr)}</td><td className="py-1.5 text-right font-semibold">{formatCurrency(p.lineTotalNpr)}</td></tr>
              ))}
              <tr className="border-t border-ink-200"><td colSpan={3} className="py-1.5 text-right font-semibold text-ink-500">Parts subtotal</td><td className="py-1.5 text-right font-bold">{formatCurrency(partsTotal)}</td></tr>
            </tbody>
          </table>
        )}
      </div>

      {/* labour + complete */}
      {job.status === 'in_progress' && canEdit && (
        <div className="card p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-xs font-semibold text-ink-600">Labour / service charge (Rs.)</span>
              <input type="number" value={labour} onChange={(e) => setLabour(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" /></label>
            <div className="rounded-lg bg-ink-50 p-3 text-sm"><p className="text-xs text-ink-400">Job total (labour + parts)</p><p className="font-display text-lg font-bold">{formatCurrency(labourNum + partsTotal)}</p></div>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Advisor notes / recommendation for next visit" className="mt-3 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
          <button onClick={complete} className="btn mt-3 w-full bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle2 className="h-4 w-4" /> Mark serviced &amp; publish</button>
          <p className="mt-1 text-center text-xs text-ink-400">Logged to the vehicle's service history and published to its public report.</p>
        </div>
      )}

      {/* completed summary + print/email */}
      {job.status === 'completed' && (
        <div className="card p-5">
          <p className="flex items-center gap-2 font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Serviced{job.completedOn ? ` on ${fmtDate(job.completedOn)}` : ''}</p>
          <p className="mt-1 text-sm text-ink-500">Odometer {formatNumber(job.odometerKm)} km · Labour {formatCurrency(job.labourCostNpr)} · Parts {formatCurrency(job.partsCostNpr)} · <span className="font-semibold text-ink-800">Total {formatCurrency(job.totalNpr)}</span></p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to={`/billing/service/${job.id}`} className="btn border border-ink-200 text-ink-700 hover:bg-ink-50"><FileText className="h-4 w-4" /> Service report</Link>
            <Link to={`/billing/combined/${job.id}`} className="btn bg-brand-600 text-white hover:bg-brand-700"><Printer className="h-4 w-4" /> Print bill (service + parts)</Link>
          </div>

          {/* old completed records need admin approval to change */}
          {locked && canEdit && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800"><Lock className="h-4 w-4" /> Completed before today - changes need admin approval</p>
              {queued ? (
                <p className="mt-1 text-sm font-medium text-emerald-700">✓ Change request sent to admin for approval.</p>
              ) : (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="block"><span className="block text-[11px] text-ink-500">Corrected labour (Rs.)</span>
                    <input type="number" value={reqLabour} onChange={(e) => setReqLabour(e.target.value)} className="h-9 w-40 rounded-lg border border-ink-200 px-2.5 text-sm outline-none focus:border-brand-500" /></label>
                  <label className="block flex-1"><span className="block text-[11px] text-ink-500">Reason</span>
                    <input value={reqReason} onChange={(e) => setReqReason(e.target.value)} placeholder="Why this change?" className="h-9 w-full rounded-lg border border-ink-200 px-2.5 text-sm outline-none focus:border-brand-500" /></label>
                  <button onClick={requestChange} className="btn-sm bg-brand-600 text-white hover:bg-brand-700">Request change</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Completing servicing: offer to add the customer's linked parts order to the bill */}
      {partsPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/60 p-4" onClick={() => setPartsPrompt(null)}>
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-ink-900">Add the customer's parts to this bill?</h3>
            <p className="mt-1 text-sm text-ink-500">{partsPrompt.customer} has parts order <span className="font-semibold">{partsPrompt.id}</span> - {extraLines.length} item(s), {formatCurrency(extraLines.reduce((a, l) => a + (l.lineTotalNpr || 0), 0))} - not yet on this service bill.</p>
            <ul className="mt-3 max-h-44 overflow-auto rounded-lg border border-ink-100 text-sm">
              {extraLines.map((l) => <li key={l.sku} className="flex justify-between border-b border-ink-100 px-3 py-1.5 last:border-0"><span className="text-ink-700">{l.name} × {l.qty}</span><span className="font-semibold text-ink-900">{formatCurrency(l.lineTotalNpr)}</span></li>)}
            </ul>
            <div className="mt-4 flex gap-2">
              <button onClick={() => finalizeComplete([])} className="btn flex-1 border border-ink-200 text-ink-700 hover:bg-ink-50">Service only</button>
              <button onClick={() => finalizeComplete(extraLines)} className="btn flex-1 bg-brand-600 text-white hover:bg-brand-700">Add parts &amp; bill</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
