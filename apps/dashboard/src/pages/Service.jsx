import { useMemo, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Plus, X, CheckCircle2, CalendarClock, Clock, ClipboardCheck, Wrench, AlertTriangle, Download, Search, History } from 'lucide-react'
import { Badge } from '@shared/ui'
import { sanitizeText, isValidPhone, normalizeVin, iso, parseLocal, formatCurrency } from '@shared/lib'
import MetricCard from '../components/MetricCard.jsx'
import Drawer from '../components/Drawer.jsx'
import DetailTable from '../components/DetailTable.jsx'
import ServiceDetailEditor from '../components/ServiceDetailEditor.jsx'
import { useDealer } from '../store/DealerStore.jsx'
import { branchesForDealership, branchById, DEALERSHIPS, TIME_SLOTS, TODAY, fmtDate, addDays } from '../data/dealer.js'

const TODAY_ISO = iso(TODAY)
const STATUS = {
  requested: { label: 'Requested', tone: 'amber' },
  confirmed: { label: 'Confirmed', tone: 'blue' },
  in_progress: { label: 'In service', tone: 'brand' },
  completed: { label: 'Complete', tone: 'green' },
}
const inputClass = 'h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
const selectClass = `field-select ${inputClass} bg-[var(--surface)]`
const pill = (on) => `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${on ? 'bg-[var(--surface)] text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`

/* ---------- Book a service (dealer books directly -> confirmed if slot free) ---------- */
function BookModal({ jobs, onClose, onBook, branches, dealershipId }) {
  const [f, setF] = useState({ customer: '', phone: '', vehicle: '', vin: '', branchId: branches[0]?.id || '', slotDate: iso(addDays(TODAY, 1)), slotTime: '' })
  const [details, setDetails] = useState([])   // cascade-built service line items (same editor as the job page)
  const [err, setErr] = useState('')
  const upd = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const taken = jobs.filter((j) => j.slotDate === f.slotDate && j.branchId === f.branchId && j.status !== 'completed' && j.status !== 'cancelled').map((j) => j.slotTime)
  const available = TIME_SLOTS.filter((t) => !taken.includes(t))

  function submit(e) {
    e.preventDefault()
    const customer = sanitizeText(f.customer, 80), vehicle = sanitizeText(f.vehicle, 80)
    if (!customer || !vehicle || !f.slotTime) return setErr('Customer, vehicle and an available slot are required.')
    if (available.indexOf(f.slotTime) === -1) return setErr('That slot was just taken - pick another.')
    if (f.phone && !isValidPhone(f.phone)) return setErr('Enter a valid phone number.')
    onBook({
      id: `SVC-${String(Date.now()).slice(-5)}`, customer, phone: f.phone || '-', vehicle, vin: normalizeVin(f.vin) || 'PENDING',
      branchId: f.branchId, slotDate: f.slotDate, slotTime: f.slotTime,
      status: 'confirmed', // dealer books directly -> confirmed
      odometerKm: null,
      requestedServices: details.length ? details.map((d) => d.item) : ['Periodic service'],
      serviceDetails: details,   // pre-fill the job's servicing detail with what was requested
      workDone: [], labourCostNpr: 0, partsCostNpr: 0, totalNpr: 0, notes: '',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[var(--surface)] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-100 p-5">
          <h2 className="font-display text-lg font-bold text-ink-900">Book a service</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <input value={f.customer} onChange={upd('customer')} placeholder="Customer name *" className={inputClass} />
            <input value={f.phone} onChange={upd('phone')} placeholder="Phone" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={f.vehicle} onChange={upd('vehicle')} placeholder="Vehicle (e.g. 2021 Toyota RAV4) *" className={inputClass} />
            <input value={f.vin} onChange={upd('vin')} placeholder="VIN (optional)" className={`${inputClass} uppercase`} maxLength={17} />
          </div>
          <select value={f.branchId} onChange={(e) => setF((p) => ({ ...p, branchId: e.target.value, slotTime: '' }))} className={selectClass}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-600"><CalendarClock className="mr-1 inline h-3.5 w-3.5" />Date</label>
            <input type="date" min={TODAY_ISO} value={f.slotDate} onChange={(e) => setF((p) => ({ ...p, slotDate: e.target.value, slotTime: '' }))} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-600">Available time slots</label>
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((t) => {
                const free = available.includes(t)
                return <button type="button" key={t} disabled={!free} onClick={() => setF((p) => ({ ...p, slotTime: t }))}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${f.slotTime === t ? 'bg-brand-600 text-white' : free ? 'bg-ink-100 text-ink-700 hover:bg-ink-200' : 'cursor-not-allowed bg-ink-50 text-ink-300 line-through'}`}>{t}</button>
              })}
            </div>
            {available.length === 0 && <p className="mt-1 text-xs text-rose-600">No slots left on this date at this branch.</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-600">Servicing details requested</label>
            <p className="mb-2 text-[11px] text-ink-400">Pick a service type and service, then Add - repeat to list each item. Remove any line with the trash icon.</p>
            <ServiceDetailEditor did={dealershipId} value={details} onChange={setDetails} />
          </div>
          {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}
          <button type="submit" className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700">Book &amp; confirm</button>
        </form>
      </div>
    </div>
  )
}

/* ---------- Request a VIN's history from another dealership / with owner consent ---------- */
function VinRequestModal({ onClose, dealershipId }) {
  const [vin, setVin] = useState('')
  const [from, setFrom] = useState('')
  const [consent, setConsent] = useState(false)
  const [sent, setSent] = useState(false)
  const others = DEALERSHIPS.filter((d) => d.id !== dealershipId)

  function submit(e) {
    e.preventDefault()
    if (normalizeVin(vin).length < 11 || !consent) return
    setSent(true)
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-y-auto rounded-t-3xl bg-[var(--surface)] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-100 p-5">
          <h2 className="font-display text-lg font-bold text-ink-900">Request VIN history</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" /></button>
        </div>
        {sent ? (
          <div className="p-6 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-6 w-6" /></span>
            <p className="font-display font-bold text-ink-900">Request submitted</p>
            <p className="mt-1 text-sm text-ink-500">Pending the other dealership's approval / owner consent. When granted, the history is imported to your records. (Cross-dealership sharing is enforced server-side - see docs/TODO.md.)</p>
            <button onClick={onClose} className="mt-4 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 p-5">
            <p className="text-sm text-ink-500">Need another dealership's service records for a car you're servicing? Request them with the owner's consent.</p>
            <input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="17-character VIN" maxLength={17} className={`${inputClass} uppercase`} />
            <select value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass}>
              <option value="">Source: any dealership in the network</option>
              {others.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <label className="flex items-start gap-2 text-sm text-ink-600">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-brand-600" />
              I confirm the vehicle owner has consented to share their service history for this servicing.
            </label>
            <button type="submit" disabled={!consent} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"><Download className="h-4 w-4" /> Request history</button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Service() {
  const { branch, dealershipId } = useOutletContext()
  const navigate = useNavigate()
  const { serviceJobs, addServiceBooking } = useDealer()
  const [booking, setBooking] = useState(false)
  const [vinReq, setVinReq] = useState(false)
  const [detail, setDetail] = useState(null)
  const [sortBy, setSortBy] = useState('recent')
  const [view, setView] = useState('today')   // 'today' | 'all' (full service history)
  const [q, setQ] = useState('')
  const branchId = branch === 'all' ? undefined : branch
  const myBranches = branchesForDealership(dealershipId)
  const open = (title, columns, rows) => () => setDetail({ title, columns, rows })

  const scoped = useMemo(() => serviceJobs.filter((j) => !branchId || j.branchId === branchId), [serviceJobs, branchId])
  const todaysAppts = scoped.filter((j) => j.slotDate === TODAY_ISO && (j.status === 'confirmed' || j.status === 'requested'))
  const inBay = scoped.filter((j) => j.status === 'in_progress')
  const delayed = inBay.filter((j) => j.slotDate < TODAY_ISO)
  const ready = scoped.filter((j) => j.status === 'completed' && (j.completedOn || j.slotDate) === TODAY_ISO)
  const awaiting = scoped.filter((j) => j.status === 'confirmed' || j.status === 'requested')   // booked, not arrived yet
  const serviced = scoped.filter((j) => j.status === 'completed')                                // total vehicles serviced
  // sort comparator shared by the Today queue and the full history table
  const cmp = useMemo(() => {
    const recent = (a, b) => (b.slotDate === a.slotDate ? b.slotTime.localeCompare(a.slotTime) : b.slotDate.localeCompare(a.slotDate))
    return {
      recent,
      date: (a, b) => a.slotDate.localeCompare(b.slotDate) || a.slotTime.localeCompare(b.slotTime),
      time: (a, b) => a.slotTime.localeCompare(b.slotTime) || recent(a, b),
      status: (a, b) => (a.status || '').localeCompare(b.status || '') || recent(a, b),
      branch: (a, b) => (branchById(a.branchId)?.name || '').localeCompare(branchById(b.branchId)?.name || '') || recent(a, b),
    }[sortBy] || recent
  }, [sortBy])
  // Today = today's appointments + anything currently in the bay. All = the full history.
  const todayQueue = useMemo(() => scoped.filter((j) => j.slotDate === TODAY_ISO || j.status === 'in_progress').sort(cmp), [scoped, cmp])
  const history = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return [...scoped].sort(cmp).filter((j) => !ql || `${j.customer} ${j.vehicle} ${j.vin || ''} ${(j.requestedServices || []).join(' ')}`.toLowerCase().includes(ql))
  }, [scoped, cmp, q])
  const daysSince = (d) => Math.max(1, Math.round((TODAY.getTime() - parseLocal(d).getTime()) / 86400000))

  const jobCols = [
    { label: 'Time', render: (j) => `${fmtDate(j.slotDate)} ${j.slotTime}` },
    { label: 'Customer', render: (j) => j.customer },
    { label: 'Vehicle', render: (j) => j.vehicle },
    { label: 'Service', render: (j) => j.requestedServices?.[0] || '-' },
    { label: 'Status', render: (j) => <Badge tone={STATUS[j.status]?.tone}>{STATUS[j.status]?.label}</Badge> },
  ]
  const KPIS = [
    { key: 'appt', label: "Today's Appointments", value: todaysAppts.length, sub: 'confirmed & requested', icon: CalendarClock, tone: 'brand', onClick: open("Today's appointments", jobCols, todaysAppts) },
    { key: 'await', label: 'Awaiting Arrival', value: awaiting.length, sub: 'booked, not in yet', icon: Clock, tone: 'blue', onClick: open('Awaiting arrival', jobCols, awaiting) },
    { key: 'bay', label: 'Currently In Bay', value: inBay.length, sub: 'on the ramp now', icon: Wrench, tone: 'amber', live: true, onClick: open('Currently in bay', jobCols, inBay) },
    { key: 'delay', label: 'Delayed Servicing', value: delayed.length, sub: 'overdue vs schedule', icon: AlertTriangle, tone: 'rose', onClick: open('Delayed servicing', jobCols, delayed) },
    { key: 'serviced', label: 'Vehicles Serviced', value: serviced.length, sub: 'completed jobs', icon: ClipboardCheck, tone: 'green', onClick: open('Vehicles serviced', jobCols, serviced) },
    { key: 'ready', label: 'Vehicles Ready', value: ready.length, sub: 'pickup scheduled', icon: CheckCircle2, tone: 'green', onClick: open('Ready for pickup', jobCols, ready) },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Servicing Operations Overview</h1>
          <p className="text-sm text-ink-500">{branch === 'all' ? 'All branches' : branchById(branch)?.name} · {scoped.length} jobs tracked</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setVinReq(true)} className="btn border border-ink-200 text-ink-700 hover:bg-ink-50"><Download className="h-4 w-4" /> Request VIN history</button>
          <button onClick={() => setBooking(true)} className="btn bg-brand-600 text-white hover:bg-brand-700"><Plus className="h-4 w-4" /> Book service</button>
        </div>
      </div>

      {/* view toggle: today's live picture vs the full service-record history */}
      <div className="flex w-max flex-wrap gap-1 rounded-lg bg-ink-100 p-1">
        <button onClick={() => setView('today')} className={pill(view === 'today')}><CalendarClock className="h-4 w-4" /> Today</button>
        <button onClick={() => setView('all')} className={pill(view === 'all')}><History className="h-4 w-4" /> All service history</button>
      </div>

      {/* KPIs - all 6 in one row on desktop (labels wrap rather than truncate) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {KPIS.map(({ key, ...m }) => <MetricCard key={key} {...m} />)}
      </div>

      {view === 'today' && (
        <>
          {/* Today's servicing queue */}
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-5 py-4">
              <h2 className="font-display text-base font-bold text-ink-900">Today's Servicing Queue</h2>
              <label className="flex items-center gap-1.5 text-xs text-ink-500">Sort by
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="field-select h-8 rounded-lg border border-ink-200 bg-[var(--surface)] pl-2 pr-7 text-xs outline-none focus:border-brand-500">
                  <option value="recent">Recent first</option>
                  <option value="date">Date</option>
                  <option value="time">Time</option>
                  <option value="status">Status</option>
                  <option value="branch">Branch</option>
                </select>
              </label>
            </div>
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 bg-[var(--surface)]"><tr className="text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-2 font-semibold">Time</th><th className="py-2 pr-3 font-semibold">Customer</th><th className="py-2 pr-3 font-semibold">Vehicle</th>
                  <th className="py-2 pr-3 font-semibold">Service Type</th><th className="py-2 pr-3 font-semibold">Status</th><th className="py-2 pr-5 font-semibold">Branch</th>
                </tr></thead>
                <tbody>
                  {todayQueue.map((j) => (
                    <tr key={j.id} onClick={() => navigate(`/service/${j.id}`)} className="cursor-pointer border-t border-ink-100 hover:bg-ink-50/60">
                      <td className="px-5 py-2.5 text-ink-600">{fmtDate(j.slotDate)} · {j.slotTime}</td>
                      <td className="py-2.5 pr-3 font-medium text-ink-800">{j.customer}</td>
                      <td className="py-2.5 pr-3 text-ink-600">{j.vehicle}</td>
                      <td className="py-2.5 pr-3 text-ink-600">{j.requestedServices?.[0] || '-'}</td>
                      <td className="py-2.5 pr-3"><Badge tone={STATUS[j.status]?.tone}>{STATUS[j.status]?.label}</Badge></td>
                      <td className="py-2.5 pr-5 text-ink-600">{branchById(j.branchId)?.name}</td>
                    </tr>
                  ))}
                  {todayQueue.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-ink-400">No jobs in today or on the ramp. Switch to <button onClick={() => setView('all')} className="font-semibold text-brand-600">All service history</button>.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delayed servicing details */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-4"><AlertTriangle className="h-4 w-4 text-amber-500" /><h2 className="font-display text-base font-bold text-ink-900">Delayed Servicing Details</h2><span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-600">{delayed.length}</span></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wide text-ink-400"><th className="px-5 py-2 font-semibold">Vehicle</th><th className="py-2 pr-3 font-semibold">Delay Reason</th><th className="py-2 pr-3 font-semibold">Days Delayed</th><th className="py-2 pr-5 font-semibold">Current Action</th></tr></thead>
                <tbody>
                  {delayed.map((j) => (
                    <tr key={j.id} onClick={() => navigate(`/service/${j.id}`)} className="cursor-pointer border-t border-ink-100 hover:bg-ink-50/60">
                      <td className="px-5 py-2.5"><p className="font-medium text-ink-800">{j.vehicle}</p><p className="text-xs text-ink-400">{j.customer}</p></td>
                      <td className="py-2.5 pr-3 text-ink-600">{(j.attachedParts || []).length ? 'Waiting for part' : 'In service beyond schedule'}</td>
                      <td className="py-2.5 pr-3 text-ink-600">{daysSince(j.slotDate)} day{daysSince(j.slotDate) !== 1 ? 's' : ''}</td>
                      <td className="py-2.5 pr-5 text-ink-600">{(j.attachedParts || []).length ? 'Parts ordered' : 'Technician assigned'}</td>
                    </tr>
                  ))}
                  {delayed.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-ink-400">No delayed servicing - everything on schedule.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === 'all' && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-5 py-4">
            <h2 className="font-display text-base font-bold text-ink-900">All Service History <span className="text-xs font-normal text-ink-400">· {history.length} record{history.length !== 1 ? 's' : ''}</span></h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-56"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer, vehicle, VIN" className="h-9 w-full rounded-lg border border-ink-200 bg-[var(--surface)] pl-8 pr-2 text-sm outline-none focus:border-brand-500" /></div>
              <label className="flex items-center gap-1.5 text-xs text-ink-500">Sort by
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="field-select h-8 rounded-lg border border-ink-200 bg-[var(--surface)] pl-2 pr-7 text-xs outline-none focus:border-brand-500">
                  <option value="recent">Recent first</option>
                  <option value="date">Date</option>
                  <option value="status">Status</option>
                  <option value="branch">Branch</option>
                </select>
              </label>
            </div>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface)]"><tr className="text-xs uppercase tracking-wide text-ink-400">
                <th className="px-5 py-2 font-semibold">Date</th><th className="py-2 pr-3 font-semibold">Customer</th><th className="py-2 pr-3 font-semibold">Vehicle</th>
                <th className="py-2 pr-3 font-semibold">Service</th><th className="py-2 pr-3 font-semibold">Status</th><th className="py-2 pr-3 font-semibold">Branch</th><th className="py-2 pr-5 text-right font-semibold">Total</th>
              </tr></thead>
              <tbody>
                {history.map((j) => (
                  <tr key={j.id} onClick={() => navigate(`/service/${j.id}`)} className="cursor-pointer border-t border-ink-100 hover:bg-ink-50/60">
                    <td className="px-5 py-2.5 text-ink-600">{fmtDate(j.completedOn || j.slotDate)}</td>
                    <td className="py-2.5 pr-3 font-medium text-ink-800">{j.customer}</td>
                    <td className="py-2.5 pr-3 text-ink-600">{j.vehicle}</td>
                    <td className="py-2.5 pr-3 text-ink-600">{j.requestedServices?.[0] || '-'}</td>
                    <td className="py-2.5 pr-3"><Badge tone={STATUS[j.status]?.tone}>{STATUS[j.status]?.label}</Badge></td>
                    <td className="py-2.5 pr-3 text-ink-600">{branchById(j.branchId)?.name}</td>
                    <td className="py-2.5 pr-5 text-right font-semibold text-ink-900">{j.status === 'completed' ? formatCurrency(j.totalNpr) : '-'}</td>
                  </tr>
                ))}
                {history.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-ink-400">No service records{q ? ' match your search' : ''}.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {booking && <BookModal jobs={serviceJobs} onClose={() => setBooking(false)} onBook={addServiceBooking} branches={myBranches} dealershipId={dealershipId} />}
      {vinReq && <VinRequestModal onClose={() => setVinReq(false)} dealershipId={dealershipId} />}
      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail?.title} subtitle={detail ? `${detail.rows.length} job${detail.rows.length !== 1 ? 's' : ''}` : ''}>
        {detail && <div className="py-2"><DetailTable columns={detail.columns} rows={detail.rows} /></div>}
      </Drawer>
    </div>
  )
}
