import { useState } from 'react'
import { X, Mail, Phone, CheckCircle2, MapPin, Send } from 'lucide-react'
import { vehicleTitle, formatCurrency, sanitizeText, isValidEmail, isValidPhone } from '@shared/lib'

// "Check availability" enquiry form. Submitting composes an email to the dealer/seller
// (via the visitor's mail client using a mailto: link) and records the lead.
// A real backend would POST this to /api/leads and send the email server-side
// (see report on the `leads` table in docs/database/schema.sql).
export default function AvailabilityModal({ open, onClose, vehicle: v }) {
  const title = vehicleTitle(v)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: `Hi ${v.dealer.name}, is the ${title} still available? Please share the best price and a time to view it.`,
  })
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  if (!open) return null

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function submit(e) {
    e.preventDefault()
    setError('')
    const name = sanitizeText(form.name, 80)
    const message = sanitizeText(form.message, 600)
    if (!name) return setError('Please enter your name.')
    if (!isValidEmail(form.email)) return setError('Please enter a valid email address.')
    if (form.phone && !isValidPhone(form.phone)) return setError('Please enter a valid phone number.')

    const subject = `Availability enquiry: ${title}`
    const body = [
      `Vehicle: ${title}`,
      `VIN: ${v.vin}`,
      `Listed price: ${formatCurrency(v.price)}`,
      `Location: ${v.location.city}, ${v.location.province}`,
      '',
      message,
      '',
      `From: ${name}`,
      `Email: ${form.email}`,
      form.phone ? `Phone: ${form.phone}` : '',
    ].filter(Boolean).join('\n')

    // Open the visitor's email client addressed to the dealer/seller.
    const mailto = `mailto:${v.dealer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
    setSent(true)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-ink-100 p-5">
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">Check availability</h2>
            <p className="text-sm text-ink-500">{title} · {formatCurrency(v.price)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h3 className="font-display text-lg font-bold text-ink-900">Enquiry sent</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
              Your enquiry has been sent to <span className="font-semibold text-ink-700">{v.dealer.name}</span> at{' '}
              <span className="font-mono text-ink-700">{v.dealer.email}</span>. They typically reply within a day.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-500">
              <Phone className="h-4 w-4" /> Prefer to call? {v.dealer.phone}
            </div>
            <button onClick={onClose} className="mt-5 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5">
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50/60 p-3 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="text-ink-600">Sends an enquiry to <span className="font-semibold text-ink-800">{v.dealer.name}</span></span>
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-ink-400"><MapPin className="h-3.5 w-3.5" />{v.location.city}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-600">Your name *</label>
                <input value={form.name} onChange={upd('name')} placeholder="Full name"
                  className="h-11 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink-600">Email *</label>
                  <input type="email" value={form.email} onChange={upd('email')} placeholder="you@example.com"
                    className="h-11 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink-600">Phone</label>
                  <input value={form.phone} onChange={upd('phone')} placeholder="+977 98XX-XXXXXX"
                    className="h-11 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-600">Message</label>
                <textarea value={form.message} onChange={upd('message')} rows={3}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
              </div>
            </div>

            {error && <p className="mt-2 text-xs font-semibold text-rose-600" role="alert">{error}</p>}

            <button type="submit" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-sm transition hover:bg-brand-700">
              <Send className="h-4 w-4" /> Send enquiry to dealer
            </button>
            <p className="mt-2 text-center text-[11px] text-ink-400">By sending, you agree to be contacted about this vehicle.</p>
          </form>
        )}
      </div>
    </div>
  )
}
