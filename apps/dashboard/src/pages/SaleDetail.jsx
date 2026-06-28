import { useState } from 'react'
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom'
import { ArrowLeft, Printer, User, Car, Wallet, BadgeCheck } from 'lucide-react'
import { formatCurrency } from '@shared/lib'
import { useDealer } from '../store/DealerStore.jsx'
import { REPS, branchById, fmtDate, withTaxVat, amountInWords } from '../data/dealer.js'
import PrintDoc from '../components/PrintDoc.jsx'

const Row = ({ label, value }) => (
  <div className="flex justify-between gap-4 border-b border-ink-100 py-1.5 text-sm last:border-0">
    <span className="text-ink-400">{label}</span><span className="text-right font-medium text-ink-800">{value ?? '-'}</span>
  </div>
)

export default function SaleDetail() {
  const { saleId } = useParams()
  const navigate = useNavigate()
  const { dealershipId } = useOutletContext()
  const { salesAll } = useDealer()
  const [printing, setPrinting] = useState(false)
  const s = salesAll.find((x) => x.id === saleId)

  if (!s) return <div className="py-24 text-center text-ink-400">Sale not found. <Link to="/sales" className="font-semibold text-brand-600">Back to Sales</Link></div>

  const rep = REPS.find((r) => r.id === (s.salespersonId || s.repId))
  const br = branchById(s.branchId)
  const price = s.priceNpr || 0
  // Dashboard shows the pre-tax price; tax + VAT are computed (and broken out) only on the printed bill.
  const { tax, vat, total, taxRate, vatRate } = withTaxVat(price, dealershipId)
  const vehicle = `${s.year || ''} ${s.make || ''} ${s.model || ''}`.trim()

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate('/sales')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" /> Sales</button>
        <button onClick={() => setPrinting(true)} className="btn bg-brand-600 text-white hover:bg-brand-700"><Printer className="h-4 w-4" /> Print bill</button>
      </div>

      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">{vehicle || 'Vehicle'}</h1>
            <p className="font-mono text-xs text-ink-400">{s.id}{s.vin ? ` · VIN ${s.vin}` : ''} · sold {fmtDate(s.soldOn)}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> {s.paymentStatus || 'completed'}</span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-ink-100 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400"><User className="h-3.5 w-3.5" /> Sold to</p>
            <Row label="Buyer" value={s.buyerName} />
            <Row label="Phone" value={s.buyerPhone} />
            <Row label="Email" value={s.buyerEmail} />
            <Row label="Address" value={s.buyerAddress} />
            <Row label="PAN" value={s.buyerPan} />
          </div>
          <div className="rounded-xl border border-ink-100 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400"><Wallet className="h-3.5 w-3.5" /> Sale</p>
            <Row label="Price" value={<span className="font-bold">{formatCurrency(price)}</span>} />
            <Row label="Finance" value={s.financeType ? s.financeType : '-'} />
            <Row label="Payment" value={s.paymentMethod} />
          </div>
          <div className="rounded-xl border border-ink-100 p-3 sm:col-span-2">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400"><Car className="h-3.5 w-3.5" /> Signed off by</p>
            <Row label="Salesperson" value={rep?.name} />
            <Row label="Branch" value={br ? `${br.name} · ${br.city}, ${br.province}` : '-'} />
          </div>
        </div>
        {!s.buyerName && <p className="mt-3 text-xs text-ink-400">This is a historical seed sale without buyer details captured. New sales recorded via Inventory → Sell include full buyer details.</p>}
      </div>

      {printing && (
        <PrintDoc dealershipId={dealershipId} docTitle="TAX INVOICE" docNo={s.invoiceNo || s.id} docDate={fmtDate(s.soldOn)} copyLabel="Original" ownerEmail={s.buyerEmail || undefined} onClose={() => setPrinting(false)}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-[11px] uppercase tracking-wide text-ink-400">Bill To</p><p className="font-semibold text-ink-900">{s.buyerName || '-'}</p>{s.buyerPhone && <p className="text-ink-500">{s.buyerPhone}</p>}{s.buyerAddress && <p className="text-ink-500">{s.buyerAddress}</p>}{s.buyerPan && <p className="text-ink-500">PAN {s.buyerPan}</p>}</div>
            <div className="text-right"><p className="text-[11px] uppercase tracking-wide text-ink-400">Vehicle</p><p className="font-semibold text-ink-900">{vehicle}</p>{s.vin && <p className="text-ink-500">VIN {s.vin}</p>}</div>
          </div>
          <table className="mt-5 w-full text-left text-sm">
            <thead><tr className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500"><th className="border border-ink-200 px-3 py-1.5">Description</th><th className="border border-ink-200 px-3 py-1.5 text-right">Amount</th></tr></thead>
            <tbody>
              <tr><td className="border border-ink-200 px-3 py-1.5">Vehicle sale - {vehicle}</td><td className="border border-ink-200 px-3 py-1.5 text-right">{formatCurrency(price)}</td></tr>
            </tbody>
          </table>
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-ink-500">Total</span><span className="font-semibold">{formatCurrency(price)}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Tax ({Math.round(taxRate * 100)}%)</span><span className="font-semibold">{formatCurrency(tax)}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">VAT ({Math.round(vatRate * 100)}%)</span><span className="font-semibold">{formatCurrency(vat)}</span></div>
              <div className="flex justify-between border-t border-ink-200 pt-1 text-base"><span className="font-bold">Grand Total</span><span className="font-bold">{formatCurrency(total)}</span></div>
            </div>
          </div>
          <p className="mt-2 text-xs italic text-ink-500">{amountInWords(total)}</p>
          <p className="mt-3 text-xs text-ink-500">Sold by {rep?.name || '-'}{br ? ` · ${br.name}` : ''}{s.paymentMethod ? ` · ${s.paymentMethod}` : ''}</p>
        </PrintDoc>
      )}
    </div>
  )
}
