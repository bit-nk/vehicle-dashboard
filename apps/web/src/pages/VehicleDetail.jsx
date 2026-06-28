import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ChevronLeft, MapPin, Gauge, Fuel, Cog, Users, Palette, Calendar,
  Phone, ShieldCheck, FileSearch, Check, ArrowRight, Star,
} from 'lucide-react'
import { getVehicleById } from '@shared/data'
import { formatCurrency, formatNumber, vehicleTitle, dealRating } from '@shared/lib'
import { CarImage, VehiclePhoto, Badge, StarRating, HistoryBadges } from '@shared/ui'
import NotFound from './NotFound.jsx'
import AvailabilityModal from '../components/AvailabilityModal.jsx'

const GALLERY = ['photo', 'front', 'rear', 'interior']
const VIEW_LABEL = { photo: 'Photo', front: 'Front', rear: 'Rear', interior: 'Interior' }

function Spec({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-4 py-3">
      <Icon className="h-5 w-5 shrink-0 text-brand-500" />
      <div className="min-w-0">
        <p className="text-xs text-ink-400">{label}</p>
        <p className="truncate text-sm font-semibold text-ink-900">{value}</p>
      </div>
    </div>
  )
}

export default function VehicleDetail() {
  const { id } = useParams()
  const v = getVehicleById(id)
  const [view, setView] = useState('photo')
  const [avail, setAvail] = useState(false)
  if (!v) return <NotFound />

  const deal = dealRating(v.price, v.marketValue)
  const diff = v.price - v.marketValue

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Link to="/listings" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-ink-800">
        <ChevronLeft className="h-4 w-4" /> Back to listings
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: gallery + specs */}
        <div>
          <div className="card overflow-hidden">
            <div className="relative aspect-[16/10] bg-ink-100">
              {view === 'photo'
                ? <VehiclePhoto vehicle={v} eager />
                : <CarImage color={v.colorHex} interiorHex="#2a2d33" bodyStyle={v.bodyStyle} view={view} rounded={false} />}
              {deal && <span className="absolute left-4 top-4"><Badge tone={deal.tone}>{deal.label}</Badge></span>}
            </div>
            <div className="flex gap-2 p-3">
              {GALLERY.map((vw) => (
                <button
                  key={vw}
                  onClick={() => setView(vw)}
                  aria-label={`Show ${VIEW_LABEL[vw]}`}
                  className={`relative aspect-[16/10] w-1/4 overflow-hidden rounded-lg ring-2 transition ${
                    view === vw ? 'ring-brand-500' : 'ring-transparent hover:ring-ink-200'
                  }`}
                >
                  {vw === 'photo'
                    ? <VehiclePhoto vehicle={v} showCredit={false} />
                    : <CarImage color={v.colorHex} bodyStyle={v.bodyStyle} view={vw} rounded={false} />}
                </button>
              ))}
            </div>
          </div>

          {/* Key specs */}
          <h2 className="mb-3 mt-8 font-display text-lg font-bold text-ink-900">Vehicle details</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Spec icon={Calendar} label="Year" value={v.year} />
            <Spec icon={Gauge} label="Odometer" value={`${formatNumber(v.mileage)} km`} />
            <Spec icon={Cog} label="Transmission" value={v.transmission} />
            <Spec icon={Fuel} label="Fuel" value={v.fuelType} />
            <Spec icon={ShieldCheck} label="Drivetrain" value={v.drivetrain} />
            <Spec icon={Cog} label="Engine" value={v.engine} />
            <Spec icon={Palette} label="Exterior" value={v.exteriorColor} />
            <Spec icon={Palette} label="Interior" value={v.interiorColor} />
            <Spec icon={Users} label="Seats" value={v.seats} />
            <Spec
              icon={Fuel}
              label="Fuel economy"
              value={v.isEv ? 'Electric (EV)' : (v.kmplCity ? `${v.kmplCity} / ${v.kmplHwy} km/l` : '-')}
            />
          </div>

          {/* Crash-test safety ratings (real NCAP data) */}
          {v.safety?.overall != null && (
            <>
              <h2 className="mb-3 mt-8 flex items-center gap-2 font-display text-lg font-bold text-ink-900">
                Crash-Test Safety
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-500">NCAP</span>
              </h2>
              <div className="card grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                {[
                  ['Overall', v.safety.overall],
                  ['Frontal', v.safety.frontalCrash],
                  ['Side', v.safety.sideCrash],
                  ['Rollover', v.safety.rollover],
                ].map(([label, stars]) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-ink-400">{label}</p>
                    <p className="mt-1 flex items-center justify-center gap-1">
                      {stars != null ? (
                        <>
                          <span className="font-display text-xl font-extrabold text-ink-900">{stars}</span>
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        </>
                      ) : (
                        <span className="text-sm text-ink-400">N/A</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Features */}
          <h2 className="mb-3 mt-8 font-display text-lg font-bold text-ink-900">Features & options</h2>
          <div className="card grid grid-cols-1 gap-x-6 gap-y-2.5 p-5 sm:grid-cols-2">
            {v.features.map((feat) => (
              <p key={feat} className="flex items-center gap-2 text-sm text-ink-700">
                <Check className="h-4 w-4 shrink-0 text-emerald-500" /> {feat}
              </p>
            ))}
          </div>
        </div>

        {/* Right: price + history + dealer (sticky on desktop) */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-6">
            <h1 className="font-display text-xl font-extrabold leading-tight text-ink-900">{vehicleTitle(v)}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-ink-500">
              <MapPin className="h-4 w-4" /> {v.location.city}, {v.location.province}
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="font-display text-4xl font-extrabold text-ink-900">{formatCurrency(v.price)}</p>
                <p className="mt-1 text-sm text-ink-500">
                  Market value {formatCurrency(v.marketValue)}
                  {diff !== 0 && (
                    <span className={diff < 0 ? 'text-emerald-600' : 'text-amber-600'}>
                      {' '}· {diff < 0 ? formatCurrency(-diff) + ' below' : formatCurrency(diff) + ' above'}
                    </span>
                  )}
                </p>
              </div>
              {deal && <Badge tone={deal.tone}>{deal.label}</Badge>}
            </div>

            <button onClick={() => setAvail(true)} className="mt-5 w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-sm transition hover:bg-brand-700">
              Check availability
            </button>
            <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 py-3 font-semibold text-ink-700 transition hover:bg-ink-50">
              <Phone className="h-4 w-4" /> {v.dealer.phone}
            </button>
          </div>

          {/* History snapshot */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ink-900">History snapshot</h3>
              {v.badges.cleanTitle ? (
                <Badge tone="green" icon={ShieldCheck}>Clean Title</Badge>
              ) : (
                <Badge tone="amber">{v.titleBrand} Title</Badge>
              )}
            </div>
            <HistoryBadges vehicle={v} className="mt-4" />
            <dl className="mt-4 divide-y divide-ink-100 text-sm">
              {[
                ['Owners', `${v.owners}`],
                ['Reported accidents', v.accidents === 0 ? 'None' : v.accidents],
                ['Service records', formatNumber(v.serviceCount)],
                ['Primary use', v.use],
                ['Recalls', v.recallCount === 0 ? 'None' : `${v.recallCount}${v.openRecall ? ' (action needed)' : ' (remedy avail.)'}`],
              ].map(([k, val]) => (
                <div key={k} className="flex items-center justify-between py-2.5">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="font-semibold text-ink-900">{val}</dd>
                </div>
              ))}
            </dl>
            <Link
              to={`/report/${v.vin}`}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
            >
              <FileSearch className="h-4 w-4" /> View full history report <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Dealer */}
          <div className="card p-6">
            <h3 className="font-display text-base font-bold text-ink-900">{v.dealer.name}</h3>
            <div className="mt-1.5 flex items-center gap-2">
              <StarRating value={v.dealer.rating} />
              <span className="text-sm font-semibold text-ink-700">{v.dealer.rating}</span>
              <span className="text-sm text-ink-400">({formatNumber(v.dealer.reviews)} reviews)</span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-500">
              <MapPin className="h-4 w-4" /> {v.location.city}, {v.location.province}
            </p>
          </div>
        </div>
      </div>

      <AvailabilityModal open={avail} onClose={() => setAvail(false)} vehicle={v} />
    </div>
  )
}
