import { Suspense, lazy, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft, ShieldCheck, AlertTriangle, Wrench, FileText, User, Car,
  BadgeCheck, Bell, CheckCircle2, XCircle, Lock, Search, Star, Landmark, Leaf,
} from 'lucide-react'
import { getVehicleByVin } from '@shared/data'
import { formatNumber, formatCurrency, vehicleTitle, maskVin } from '@shared/lib'
import { VehiclePhoto, Badge, HistoryBadges } from '@shared/ui'
import LockedReport from '../components/LockedReport.jsx'
import PricingModal from '../components/PricingModal.jsx'
import { useUnlock } from '../lib/useUnlock.js'

const MileageChart = lazy(() => import('../components/MileageChart.jsx'))

function SectionCard({ icon: Icon, title, count, tone = 'blue', children }) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-3 border-b border-ink-100 px-5 py-4">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${
          tone === 'amber' ? 'bg-amber-50 text-amber-600' : tone === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'
        }`}>
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="font-display text-base font-bold text-ink-900">{title}</h3>
        {count != null && <span className="ml-auto text-sm font-semibold text-ink-400">{count}</span>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Timeline({ items, render }) {
  return (
    <ol className="relative ml-2 border-l-2 border-ink-100">
      {items.map((it, i) => (
        <li key={i} className="relative pb-6 pl-6 last:pb-0">
          <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
          {render(it)}
        </li>
      ))}
    </ol>
  )
}

function NotFoundReport({ vin }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-500">
        <Search className="h-7 w-7" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-900">No record found</h1>
      <p className="mt-2 text-ink-500">
        We couldn't find a vehicle for VIN <span className="font-mono font-semibold text-ink-700">{vin}</span>.
        Try one of our sample vehicles instead.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/report" className="rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">Try another VIN</Link>
        <Link to="/listings" className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Browse listings</Link>
      </div>
    </div>
  )
}

export default function ReportDetail() {
  const { vin } = useParams()
  const [sp] = useSearchParams()
  const v = getVehicleByVin(vin)
  const [unlocked, unlock] = useUnlock(vin)
  const [modal, setModal] = useState(false)

  if (!v) return <NotFoundReport vin={vin} />

  const h = v.history
  const confirm = () => { unlock(); setModal(false) }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <Link to="/report" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-ink-800">
        <ChevronLeft className="h-4 w-4" /> New search
      </Link>

      {/* Header */}
      <div className="card overflow-hidden">
        <div className="grid sm:grid-cols-[200px_1fr]">
          <div className="aspect-[16/10] bg-ink-100 sm:aspect-auto">
            <VehiclePhoto vehicle={v} eager />
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              {v.badges.cleanTitle
                ? <Badge tone="green" icon={ShieldCheck}>Clean Title</Badge>
                : <Badge tone="amber" icon={AlertTriangle}>{v.titleBrand} Title</Badge>}
              {v.openRecall && <Badge tone="amber" icon={Bell}>Open Recall</Badge>}
              {sp.get('plate') && <Badge tone="gray">Plate {sp.get('plate')} · {sp.get('state')}</Badge>}
            </div>
            <h1 className="mt-2 font-display text-2xl font-extrabold text-ink-900">{vehicleTitle(v)}</h1>
            <p className="mt-1 font-mono text-sm text-ink-500">
              VIN {unlocked ? v.vin : maskVin(v.vin)}
            </p>
            <p className="mt-0.5 text-sm text-ink-400">Last updated {v.history.titleRecords.at(-1)?.date ?? v.lastReported}</p>
          </div>
        </div>
      </div>

      {/* FREE snapshot */}
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-emerald-500" />
          <h2 className="font-display text-lg font-bold text-ink-900">VINsight Snapshot</h2>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Free</span>
        </div>
        <div className="card p-5">
          <HistoryBadges vehicle={v} />
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {[
              ['Owners', v.owners, User],
              ['Accidents', v.accidents === 0 ? 'None reported' : `${v.accidents} reported`, AlertTriangle],
              ['Service records', formatNumber(v.serviceCount), Wrench],
              ['Title brand', v.titleBrand, FileText],
              ['Primary use', v.use, Car],
              ['Recalls', v.recallCount === 0 ? 'None' : `${v.recallCount} ${v.openRecall ? '· action needed' : '· remedy avail.'}`, Bell],
            ].map(([k, val, Icon]) => (
              <div key={k} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-ink-400" />
                <div>
                  <dt className="text-xs text-ink-400">{k}</dt>
                  <dd className="text-sm font-semibold text-ink-900">{val}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* PAYWALLED full report */}
      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand-600" />
          <h2 className="font-display text-lg font-bold text-ink-900">Full History Report</h2>
          {!unlocked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-600">
              <Lock className="h-3 w-3" /> Locked
            </span>
          )}
        </div>

        {/* When locked, the real report is NOT rendered at all (no sensitive data in
            the DOM) - only a skeleton placeholder. It mounts only once unlocked. */}
        {!unlocked ? (
          <LockedReport
            onUnlock={() => setModal(true)}
            teaser={`Unlock ${v.owners}-owner history, ${v.accidents === 0 ? 'all records' : v.accidents + ' accident reports'} & more`}
          />
        ) : (
          <div className="space-y-5">
            <SectionCard icon={User} title="Ownership history" count={`${v.owners} owner${v.owners > 1 ? 's' : ''}`}>
              <Timeline
                items={h.ownership}
                render={(o) => (
                  <div>
                    <p className="text-sm font-bold text-ink-900">Owner {o.idx} - {o.type}</p>
                    <p className="text-sm text-ink-500">Purchased {o.purchased} · {o.province}</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      Owned ~{o.durationYears} yr · est. {o.est} · last reported {formatNumber(o.lastOdometer)} km
                    </p>
                  </div>
                )}
              />
            </SectionCard>

            <SectionCard
              icon={v.accidents ? AlertTriangle : ShieldCheck}
              tone={v.accidents ? 'amber' : 'green'}
              title="Accident & damage"
              count={v.accidents === 0 ? 'None' : `${v.accidents} record${v.accidents > 1 ? 's' : ''}`}
            >
              {h.accidentRecords.length === 0 ? (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" /> No accidents or damage reported to VINsight.
                </p>
              ) : (
                <div className="space-y-3">
                  {h.accidentRecords.map((a, i) => (
                    <div key={i} className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-ink-900">{a.eventType} · {a.date}</p>
                        <Badge tone={a.severity === 'Totaled' || a.severity === 'Severe Damage' ? 'red' : a.severity === 'Moderate Damage' ? 'amber' : 'gray'}>{a.severity}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-ink-600">{a.desc}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
                        {[
                          ['Damage', a.severity],
                          ['Point of impact', a.pointOfImpact],
                          ['Airbags', a.airbagDeployed],
                          ['Structural', a.structuralDamage],
                          ['Driveable', a.driveable],
                          ['Location', a.location],
                          ['Reported by', a.source],
                          ['Est. damage', formatCurrency(a.estimatedDamage)],
                        ].map(([k, val]) => (
                          <div key={k}>
                            <dt className="text-ink-400">{k}</dt>
                            <dd className="font-semibold text-ink-700">{val}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard icon={Wrench} title="Service & odometer" count={`${v.serviceCount} records`}>
              <div className="mb-5 rounded-xl border border-ink-100 bg-ink-50/40 p-3">
                <p className="mb-1 px-1 text-xs font-semibold text-ink-500">Reported odometer over time</p>
                <Suspense fallback={<div className="flex h-64 items-center justify-center text-sm text-ink-400">Loading chart...</div>}>
                  <MileageChart data={h.odometer} />
                </Suspense>
              </div>
              <Timeline
                items={h.serviceRecords}
                render={(s) => (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink-900">{s.date} · {formatNumber(s.mileage)} km</p>
                      <Badge tone={s.type === 'Repair' ? 'amber' : s.type === 'Inspection' ? 'gray' : 'blue'}>{s.type}</Badge>
                    </div>
                    <p className="text-sm text-ink-500">{s.provider}</p>
                    <p className="mt-1 text-sm font-medium text-ink-700">{s.items.join(' · ')}</p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-ink-50/60 p-2.5 text-xs sm:grid-cols-3">
                      {[
                        ['Invoice', s.invoiceNo],
                        ['Service advisor', s.advisor],
                        ['Reported by', s.source],
                        ['Parts', formatCurrency(s.partsCost)],
                        ['Labour', formatCurrency(s.labourCost)],
                        ['Total', formatCurrency(s.totalCost)],
                        ['Next service due', `${formatNumber(s.nextServiceDueKm)} km`],
                      ].map(([k, val]) => (
                        <div key={k}>
                          <dt className="text-ink-400">{k}</dt>
                          <dd className="font-semibold text-ink-700">{val}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              />
            </SectionCard>

            <SectionCard icon={FileText} title="Title history" count={`${h.titleRecords.length} events`}>
              <Timeline
                items={h.titleRecords}
                render={(t) => (
                  <div>
                    <p className="text-sm font-bold text-ink-900">{t.event}</p>
                    <p className="text-sm text-ink-500">{t.date} · {t.province}</p>
                  </div>
                )}
              />
            </SectionCard>

            <SectionCard icon={Bell} tone={v.openRecall ? 'amber' : 'green'} title="Recalls" count={h.recalls.length}>
              {h.recalls.length === 0 ? (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" /> No recalls on record.
                </p>
              ) : (
                <ul className="space-y-3">
                  {h.recalls.map((r, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl border border-ink-100 p-4">
                      {r.status === 'Remedy available'
                        ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                        : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />}
                      <div>
                        <p className="text-sm font-bold text-ink-900">{r.component} <span className="font-normal text-ink-400">· {r.date}</span></p>
                        <p className="text-sm text-ink-600">{r.desc}</p>
                        {r.consequence && (
                          <p className="mt-1 text-xs text-ink-500"><span className="font-semibold text-ink-600">Risk:</span> {r.consequence}</p>
                        )}
                        {r.remedy && (
                          <p className="mt-1 text-xs text-ink-500"><span className="font-semibold text-ink-600">Fix:</span> {r.remedy}</p>
                        )}
                        <p className="mt-1 text-xs font-semibold text-ink-500">{r.status}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard icon={Star} title="Crash-test safety" count={v.safety?.overall != null ? 'NCAP' : 'Not rated'}>
              {v.safety?.overall != null ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Overall', v.safety.overall],
                    ['Frontal crash', v.safety.frontalCrash],
                    ['Side crash', v.safety.sideCrash],
                    ['Rollover', v.safety.rollover],
                  ].map(([label, stars]) => (
                    <div key={label} className="rounded-xl border border-ink-100 p-3 text-center">
                      <p className="text-xs text-ink-400">{label}</p>
                      <p className="mt-1 flex items-center justify-center gap-1">
                        {stars != null ? (
                          <>
                            <span className="font-display text-xl font-extrabold text-ink-900">{stars}</span>
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          </>
                        ) : <span className="text-sm text-ink-400">N/A</span>}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-500">No independent NCAP crash-test rating has been published for this configuration.</p>
              )}
            </SectionCard>

            <SectionCard icon={Landmark} title="Title, lien & registration">
              <dl className="divide-y divide-ink-100 text-sm">
                {[
                  ['Title brand', v.titleBrand],
                  ['Lien / loan', v.history.lien.hasLien ? `${v.history.lien.lender} - ${v.history.lien.status}` : v.history.lien.status],
                  ['Last registration', v.history.titleRecords.at(-1)?.date],
                  ['Theft check', v.history.theftCheck],
                ].map(([k, val]) => (
                  <div key={k} className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="text-ink-500">{k}</dt>
                    <dd className="text-right font-semibold text-ink-900">{val}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>

            <SectionCard icon={Leaf} title="Warranty & emissions">
              <dl className="divide-y divide-ink-100 text-sm">
                {[
                  ['Basic warranty', `${v.history.warranty.basic} · ${v.history.warranty.basicRemaining ? 'likely active' : 'likely expired'}`],
                  ['Powertrain warranty', `${v.history.warranty.powertrain} · ${v.history.warranty.powertrainRemaining ? 'likely active' : 'likely expired'}`],
                  ['Emission test (green sticker)', `${v.history.emissions.result} · ${v.history.emissions.lastTest} · ${v.history.emissions.station}`],
                  ['CO₂ tailpipe', v.co2gkm ? `${v.co2gkm} g/km` : (v.isEv ? '0 g/km (electric)' : '-')],
                ].map(([k, val]) => (
                  <div key={k} className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="text-ink-500">{k}</dt>
                    <dd className="text-right font-semibold text-ink-900">{val}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
          </div>
        )}

        {unlocked && (
          <p className="mt-5 flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Full report unlocked for this session.
          </p>
        )}
      </div>

      <PricingModal open={modal} onClose={() => setModal(false)} onConfirm={confirm} />
    </div>
  )
}
