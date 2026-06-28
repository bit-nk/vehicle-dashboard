import { User, ShieldCheck, Wrench, BadgeCheck, AlertTriangle } from 'lucide-react'

// Carfax-style row of history highlights derived from a vehicle's `badges`.
// `size="sm"` renders compact icon chips for cards; default renders labelled tiles.
export default function HistoryBadges({ vehicle, size = 'md', className = '' }) {
  const b = vehicle.badges
  const items = [
    b.oneOwner && { icon: User, label: '1-Owner', tone: 'green' },
    b.noAccidents
      ? { icon: ShieldCheck, label: 'No Accidents', tone: 'green' }
      : { icon: AlertTriangle, label: `${vehicle.accidents} Accident${vehicle.accidents > 1 ? 's' : ''}`, tone: 'amber' },
    b.personalUse && { icon: BadgeCheck, label: 'Personal Use', tone: 'green' },
    b.serviceRecords && { icon: Wrench, label: `${vehicle.serviceCount} Service Records`, tone: 'blue' },
  ].filter(Boolean)

  const toneClass = {
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    blue: 'text-brand-600',
  }

  if (size === 'sm') {
    return (
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className}`}>
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs font-medium text-ink-600">
            <it.icon className={`h-3.5 w-3.5 ${toneClass[it.tone]}`} />
            {it.label}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}>
      {items.map((it, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 rounded-xl border border-ink-100 bg-white px-3 py-4 text-center">
          <it.icon className={`h-6 w-6 ${toneClass[it.tone]}`} />
          <span className="text-sm font-semibold text-ink-800">{it.label}</span>
        </div>
      ))}
    </div>
  )
}
