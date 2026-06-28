import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { formatCurrency, formatNumber } from '@shared/lib'
import { useDealer } from '../store/DealerStore.jsx'
import { withTaxVat, amountInWords, fmtDate, branchById, cap } from '../data/dealer.js'
import PrintDoc from '../components/PrintDoc.jsx'

const TITLES = { service: 'Service Report', parts: 'Parts Tax Invoice', combined: 'Tax Invoice' }
const ownerEmailFor = (name) => `${String(name || 'owner').split(' ')[0].toLowerCase()}@email.com`

function valueSummary(values = {}) {
  return Object.entries(values).filter(([, v]) => v !== '' && v != null && v !== false)
    .map(([k, v]) => `${k}: ${v === true ? 'Yes' : v}`).join(' · ')
}

export default function PrintInvoice() {
  const { docType, id } = useParams()
  const navigate = useNavigate()
  const { role } = useOutletContext()
  const { dealershipId, serviceJobs, partsOrders } = useDealer()

  // Enforce the billing capability at the route too (not just the buttons that link here).
  if (!cap(role, 'printBilling')) {
    return <PrintDoc dealershipId={dealershipId} docTitle="Billing" onClose={() => navigate('/')}><p className="text-ink-500">Your role does not have permission to print billing documents.</p></PrintDoc>
  }

  const job = id.startsWith('SVC') ? serviceJobs.find((j) => j.id === id) : null
  const order = id.startsWith('PO') ? partsOrders.find((o) => o.id === id) : null
  const close = () => navigate(-1)

  if (!job && !order) {
    return <PrintDoc dealershipId={dealershipId} docTitle="Document" onClose={() => navigate('/billing')}><p className="text-ink-500">Document not found.</p></PrintDoc>
  }

  const isReport = docType === 'service'   // Service Report = work performed only, NOT a priced bill
  const includeService = (docType === 'service' || docType === 'combined') && job
  const includeParts = docType === 'parts' || docType === 'combined'
  const src = job || order
  const customer = src.customer
  const vehicle = job ? job.vehicle : '-'
  const vin = job ? job.vin : '-'
  const branch = branchById(src.branchId)
  const docDate = fmtDate(job ? (job.completedOn || job.slotDate) : order.createdOn)

  const partLines = job ? (job.attachedParts || []) : (order.lines || [])
  const labour = includeService ? (job.labourCostNpr || 0) : 0

  const charges = []
  if (includeService && labour) charges.push({ desc: 'Service labour & workshop charge', qty: 1, rate: labour, amount: labour })
  if (includeParts) partLines.forEach((p) => charges.push({ desc: `${p.name}${p.oemNumber ? ` (${p.oemNumber})` : ''}`, qty: p.qty, rate: p.unitPriceNpr, amount: p.lineTotalNpr }))

  const subtotal = charges.reduce((a, c) => a + c.amount, 0)
  const { tax, vat, total, taxRate, vatRate } = withTaxVat(subtotal, dealershipId)

  return (
    <PrintDoc
      dealershipId={dealershipId}
      docTitle={TITLES[docType] || 'Tax Invoice'}
      docNo={id}
      docDate={docDate}
      copyLabel="Original"
      ownerEmail={ownerEmailFor(customer)}
      onClose={close}
    >
      {/* customer / vehicle block */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink-400">Bill To</p>
          <p className="font-semibold text-ink-900">{customer}</p>
          {src.phone && <p className="text-ink-500">{src.phone}</p>}
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-ink-400">Vehicle</p>
          <p className="font-semibold text-ink-900">{vehicle}</p>
          <p className="text-ink-500">VIN {vin}</p>
          {branch && <p className="text-ink-500">{branch.name}</p>}
          {job?.odometerKm ? <p className="text-ink-500">Odometer {formatNumber(job.odometerKm)} km</p> : null}
        </div>
      </div>

      {/* work performed (service report detail) */}
      {includeService && (job.serviceDetails || []).length > 0 && (
        <div className="mt-5">
          <p className="mb-1 text-sm font-bold text-ink-900">Work performed</p>
          <ul className="space-y-1 text-sm text-ink-700">
            {job.serviceDetails.map((d, i) => (
              <li key={i} className="border-b border-ink-100 pb-1">
                <span className="font-semibold">{d.item}</span>
                {valueSummary(d.values) && <span className="text-ink-500"> - {valueSummary(d.values)}</span>}
                {d.note && <span className="block text-xs text-ink-400">Note: {d.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* advisor notes - service report only */}
      {isReport && job?.notes && (
        <div className="mt-4"><p className="mb-1 text-sm font-bold text-ink-900">Advisor notes</p><p className="text-sm text-ink-700">{job.notes}</p></div>
      )}
      {isReport && (
        <p className="mt-6 text-xs italic text-ink-500">This is a service report detailing the work performed and the advisor's notes. It is not a tax invoice - see the Tax Invoice for the priced bill.</p>
      )}

      {/* charges + totals: priced bills only (parts / combined), NOT the service report */}
      {!isReport && (<>
      <table className="mt-5 w-full text-left text-sm">
        <thead>
          <tr className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
            <th className="border border-ink-200 px-3 py-1.5">#</th>
            <th className="border border-ink-200 px-3 py-1.5">Description</th>
            <th className="border border-ink-200 px-3 py-1.5 text-right">Qty</th>
            <th className="border border-ink-200 px-3 py-1.5 text-right">Rate</th>
            <th className="border border-ink-200 px-3 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {charges.map((c, i) => (
            <tr key={i}>
              <td className="border border-ink-200 px-3 py-1.5">{i + 1}</td>
              <td className="border border-ink-200 px-3 py-1.5">{c.desc}</td>
              <td className="border border-ink-200 px-3 py-1.5 text-right">{c.qty}</td>
              <td className="border border-ink-200 px-3 py-1.5 text-right">{formatCurrency(c.rate)}</td>
              <td className="border border-ink-200 px-3 py-1.5 text-right">{formatCurrency(c.amount)}</td>
            </tr>
          ))}
          {charges.length === 0 && <tr><td colSpan={5} className="border border-ink-200 px-3 py-4 text-center text-ink-400">No chargeable items.</td></tr>}
        </tbody>
      </table>

      {/* totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-ink-500">Total</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-ink-500">Tax ({Math.round(taxRate * 100)}%)</span><span className="font-semibold">{formatCurrency(tax)}</span></div>
          <div className="flex justify-between"><span className="text-ink-500">VAT ({Math.round(vatRate * 100)}%)</span><span className="font-semibold">{formatCurrency(vat)}</span></div>
          <div className="flex justify-between border-t border-ink-200 pt-1 text-base"><span className="font-bold">Grand Total</span><span className="font-bold">{formatCurrency(total)}</span></div>
        </div>
      </div>
      <p className="mt-2 text-xs italic text-ink-500">{amountInWords(total)}</p>
      {order?.paymentMethod && <p className="mt-1 text-xs text-ink-500">Payment: {order.paymentMethod}{order.paidOn ? ` · ${fmtDate(order.paidOn)}` : ''}{order.paidByName ? ` · received by ${order.paidByName}` : ''}</p>}
      {job?.billStatus === 'paid' && <p className="mt-1 text-xs text-ink-500">Payment received by {job.billPaidByName || '-'}{job.billPaidOn ? ` on ${fmtDate(job.billPaidOn)}` : ''}{job.billPaymentMethod ? ` · ${job.billPaymentMethod}` : ''}</p>}
      </>)}
    </PrintDoc>
  )
}
