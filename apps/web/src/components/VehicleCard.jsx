import { Link } from 'react-router-dom'
import { MapPin, Gauge, Heart } from 'lucide-react'
import { useState } from 'react'
import { VehiclePhoto, Badge, HistoryBadges } from '@shared/ui'
import { formatCurrency, formatNumber, vehicleTitle, dealRating } from '@shared/lib'

export default function VehicleCard({ vehicle: v }) {
  const [saved, setSaved] = useState(false)
  const deal = dealRating(v.price, v.marketValue)

  return (
    <Link
      to={`/vehicle/${v.id}`}
      className="group card flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-100">
        <VehiclePhoto vehicle={v} showCredit={false} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        {deal && (
          <span className="absolute left-3 top-3">
            <Badge tone={deal.tone}>{deal.label}</Badge>
          </span>
        )}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); setSaved((s) => !s) }}
          aria-label={saved ? 'Remove from saved' : 'Save vehicle'}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink-500 shadow-sm backdrop-blur transition hover:text-rose-500"
        >
          <Heart className={`h-4.5 w-4.5 ${saved ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>
        {v.badges.cleanTitle && (
          <span className="absolute bottom-3 left-3 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
            Clean Title
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold leading-tight text-ink-900">
            {vehicleTitle(v)}
          </h3>
          <p className="whitespace-nowrap text-lg font-extrabold text-ink-900">{formatCurrency(v.price)}</p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-4 w-4 text-ink-400" /> {formatNumber(v.mileage)} km
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4 text-ink-400" /> {v.location.city}, {v.location.province}
          </span>
        </div>

        <HistoryBadges vehicle={v} size="sm" className="mt-3" />

        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-ink-400">
          <span className="truncate">{v.dealer.name}</span>
          <span className="font-semibold text-brand-600 group-hover:underline">View details →</span>
        </div>
      </div>
    </Link>
  )
}
