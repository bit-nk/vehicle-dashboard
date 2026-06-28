import { Link } from 'react-router-dom'
import { ShieldCheck, Wrench, FileSearch, AlertTriangle, ArrowRight, Clock } from 'lucide-react'
import { vehicles } from '@shared/data'
import { vehicleTitle } from '@shared/lib'
import { VehiclePhoto } from '@shared/ui'
import SearchBar from '../components/SearchBar.jsx'

const includes = [
  { icon: ShieldCheck, title: 'Accidents & damage', body: 'Reported collisions, severity, and airbag deployment.' },
  { icon: FileSearch, title: 'Title checks', body: 'Salvage, rebuilt, flood, and lemon brandings.' },
  { icon: Wrench, title: 'Service records', body: 'Logged maintenance and repair visits over time.' },
  { icon: AlertTriangle, title: 'Open recalls', body: 'Outstanding safety recalls that still need a fix.' },
]

export default function Report() {
  const samples = vehicles.slice(0, 4)
  return (
    <>
      <section className="hero-mesh">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Run a vehicle history report
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-brand-100/80">
            Enter a VIN or license plate to reveal accidents, ownership, service history, and more.
          </p>
          <div className="mt-8 text-left">
            <SearchBar variant="report" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-center font-display text-2xl font-extrabold text-ink-900">What you'll uncover</h2>
        <div className="mx-auto mt-8 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {includes.map((i) => (
            <div key={i.title} className="card p-5 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <i.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-3 font-display text-base font-bold text-ink-900">{i.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{i.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center gap-2 text-ink-500">
          <Clock className="h-4 w-4" />
          <h2 className="font-display text-lg font-bold text-ink-900">Try a sample report</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {samples.map((v) => (
            <Link key={v.id} to={`/report/${v.vin}`} className="card group flex items-center gap-3 p-3 transition hover:shadow-md">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                <VehiclePhoto vehicle={v} showCredit={false} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">{vehicleTitle(v)}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
                  View report <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
