import { Link } from 'react-router-dom'
import { dealershipById } from '../data/dealer.js'

// Shows the signed-in DEALERSHIP's branding (logo or mark + name) - not the platform logo.
// Clicking returns to the dashboard landing. `compact` shows just the mark (collapsed sidebar).
export default function DealerBrand({ session, compact = false }) {
  const d = dealershipById(session?.dealershipId)
  const mark = d?.mark || (session?.dealershipName || 'D').slice(0, 2).toUpperCase()
  const logo = d?.logoDataUrl
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Dashboard home">
      {logo
        ? <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm" />
        : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-sm font-extrabold text-white shadow-sm">{mark}</span>}
      {!compact && (
        <span className="truncate font-display text-base font-extrabold tracking-tight text-ink-900">
          {session?.dealershipName || d?.name || 'Dealer'}
        </span>
      )}
    </Link>
  )
}
