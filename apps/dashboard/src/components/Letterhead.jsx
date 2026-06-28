import { letterheadFor } from '../data/dealer.js'

// Per-dealership letterhead header. The mark/name/address/PAN/accent all come from the
// signed-in dealership, so every printed bill/report is branded to THAT dealer.
export default function Letterhead({ dealershipId, docTitle, docNo, docDate, copyLabel }) {
  const lh = letterheadFor(dealershipId)
  // Bills are intentionally plain: black on white, no accent/brand color.
  return (
    <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-4">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-black text-base font-extrabold text-white">{lh.mark}</span>
        <div>
          <h1 className="font-display text-lg font-extrabold leading-tight text-ink-900">{lh.name}</h1>
          <p className="text-xs text-ink-500">{lh.address}</p>
          <p className="text-xs text-ink-500">Tel {lh.phone} · {lh.email}</p>
          <p className="text-xs text-ink-500">PAN: {lh.pan}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-display text-base font-bold uppercase tracking-wide text-ink-900">{docTitle}</p>
        {copyLabel && <p className="text-[11px] uppercase tracking-wide text-ink-400">{copyLabel}</p>}
        {docNo && <p className="mt-1 text-xs text-ink-600">No: <span className="font-semibold">{docNo}</span></p>}
        {docDate && <p className="text-xs text-ink-600">Date: {docDate}</p>}
      </div>
    </div>
  )
}

export function LetterheadFooter({ dealershipId }) {
  const lh = letterheadFor(dealershipId)
  return (
    <div className="mt-8 border-t border-ink-200 pt-3 text-[11px] leading-relaxed text-ink-400">
      <p>This is a computer-generated document and is valid without signature. Goods and services are subject to {lh.name}'s standard terms. VAT @ 13% included where shown.</p>
      <p className="mt-1">{lh.name} · {lh.address} · PAN {lh.pan} · {lh.phone}</p>
    </div>
  )
}
