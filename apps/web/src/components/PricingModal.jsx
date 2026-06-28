import { useState } from 'react'
import { X, Check, ShieldCheck, Lock } from 'lucide-react'
import { formatCurrency } from '@shared/lib'

const PLANS = [
  {
    id: 'single',
    name: 'Single Report',
    price: 1500,
    blurb: 'One complete vehicle history report.',
    perks: ['Full ownership history', 'All accident & damage records', 'Service & odometer history', 'Title & recall checks'],
  },
  {
    id: 'triple',
    name: '3 Report Pack',
    price: 2500,
    badge: 'Most Popular',
    blurb: 'Compare a few cars before you commit.',
    perks: ['Everything in Single', '3 reports, use within 60 days', 'Side-by-side comparison', 'Market value insights'],
  },
  {
    id: 'unlimited',
    name: 'Unlimited (30 days)',
    price: 3900,
    blurb: 'Shopping seriously? Run as many as you like.',
    perks: ['Everything in 3-Pack', 'Unlimited reports for 30 days', 'Price-drop alerts', 'Dealer-listing scans'],
  },
]

// Mock checkout. "Pay" just calls onConfirm() - no real payment.
export default function PricingModal({ open, onClose, onConfirm }) {
  const [selected, setSelected] = useState('triple')
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-100 p-5">
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">Unlock the full report</h2>
            <p className="text-sm text-ink-500">Choose a plan to reveal every record.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-3">
          {PLANS.map((p) => {
            const on = p.id === selected
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`relative flex flex-col rounded-2xl border-2 p-4 text-left transition ${
                  on ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-200' : 'border-ink-100 hover:border-ink-200'
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-2.5 left-4 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {p.badge}
                  </span>
                )}
                <span className="text-sm font-bold text-ink-900">{p.name}</span>
                <span className="mt-1 font-display text-2xl font-extrabold text-ink-900">
                  {formatCurrency(p.price)}
                </span>
                <span className="mb-3 mt-1 text-xs text-ink-500">{p.blurb}</span>
                <ul className="mt-auto space-y-1.5">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-1.5 text-xs text-ink-600">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <span className={`mt-3 h-4 w-4 self-end rounded-full border-2 ${on ? 'border-brand-500 bg-brand-500' : 'border-ink-300'}`} />
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 border-t border-ink-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-ink-500">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Secure checkout · Money-back guarantee · Cancel anytime
          </p>
          <button
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-7 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Lock className="h-4 w-4" />
            Unlock now - {formatCurrency(PLANS.find((p) => p.id === selected).price)}
          </button>
        </div>
      </div>
    </div>
  )
}
