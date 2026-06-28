import { Link } from 'react-router-dom'
import { ShieldCheck, FileSearch, TrendingDown, Wrench, ArrowRight, Star, CheckCircle2 } from 'lucide-react'
import { vehicles } from '@shared/data'
import { formatNumber } from '@shared/lib'
import { CarImage } from '@shared/ui'
import SearchBar from '../components/SearchBar.jsx'
import VehicleCard from '../components/VehicleCard.jsx'

const stats = [
  { value: '40B+', label: 'history records' },
  { value: '120M+', label: 'vehicles tracked' },
  { value: '4.8★', label: 'shopper rating' },
]

const steps = [
  { icon: FileSearch, title: 'Search any car', body: 'Look up by VIN, license plate, or browse thousands of listings.' },
  { icon: ShieldCheck, title: 'See the full story', body: 'Accidents, owners, service, title brands and recalls - all in one report.' },
  { icon: TrendingDown, title: 'Know the value', body: 'Compare the asking price against fair market value before you negotiate.' },
]

const reasons = [
  { icon: ShieldCheck, title: 'Accident & damage checks', body: 'Reported collisions, airbag deployment, and structural damage.' },
  { icon: Wrench, title: 'Full service history', body: 'Every logged oil change, repair, and maintenance visit.' },
  { icon: FileSearch, title: 'Title & odometer', body: 'Salvage, rebuilt, and flood titles plus odometer-rollback flags.' },
  { icon: TrendingDown, title: 'Open recalls', body: 'Outstanding manufacturer recalls that still need a fix.' },
]

export default function Home() {
  const featured = vehicles.slice(0, 6)

  return (
    <>
      {/* Hero */}
      <section className="hero-mesh relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 ring-1 ring-white/15">
              <Star className="h-3.5 w-3.5 fill-brand-200 text-brand-200" /> Trusted by millions of car shoppers
            </span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Know the car
              <br />
              <span className="text-brand-300">before you buy.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-brand-100/80">
              Run a full vehicle history report, check fair market value, and shop used cars with confidence - all in one place.
            </p>
          </div>

          <div className="mt-8 max-w-3xl">
            <SearchBar variant="home" />
          </div>

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            {stats.map((s) => (
              <div key={s.label} className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold text-white">{s.value}</span>
                <span className="text-sm text-brand-100/70">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute -right-6 top-1/2 hidden w-[40%] max-w-lg -translate-y-1/2 lg:block">
          <div className="animate-floaty overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
            <CarImage color="#3385fc" bodyStyle="SUV" rounded={false} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="card p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="font-display text-sm font-bold text-ink-400">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-ink-500">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured listings */}
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
              Featured used cars
            </h2>
            <p className="mt-1 text-ink-500">Hand-picked listings with clean histories and fair prices.</p>
          </div>
          <Link to="/listings" className="hidden items-center gap-1 text-sm font-semibold text-brand-600 hover:underline sm:inline-flex">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </div>
        <div className="mt-8 text-center sm:hidden">
          <Link to="/listings" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
            View all listings <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* What's in a report */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
                What's inside every report
              </h2>
              <p className="mt-2 text-ink-500">
                A VINsight report turns a stranger's car into an open book. Here's the full picture you get.
              </p>
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                {reasons.map((r) => (
                  <div key={r.title} className="flex gap-3">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                      <r.icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-ink-900">{r.title}</h3>
                      <p className="mt-0.5 text-sm text-ink-500">{r.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/report"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                <FileSearch className="h-4.5 w-4.5" /> Run a report
              </Link>
            </div>

            {/* Sample report teaser card */}
            <div className="card overflow-hidden">
              <div className="border-b border-ink-100 bg-ink-50/60 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Sample report</p>
                <p className="font-display text-lg font-bold text-ink-900">{vehicles[0].year} {vehicles[0].make} {vehicles[0].model}</p>
              </div>
              <ul className="divide-y divide-ink-100">
                {[
                  ['Owners', `${vehicles[0].owners} owner`],
                  ['Accidents', 'None reported'],
                  ['Service records', `${formatNumber(vehicles[0].serviceCount)} records`],
                  ['Title', 'Clean'],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-sm text-ink-500">{k}</span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {v}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="p-5">
                <Link
                  to={`/report/${vehicles[0].vin}`}
                  className="flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
                >
                  See this full report <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="hero-mesh overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12">
          <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
            Don't buy a used car blind.
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-brand-100/80">
            Enter a VIN and get the full history in seconds. It's the smartest Rs. 1,500 you'll spend on a car.
          </p>
          <Link
            to="/report"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
          >
            <FileSearch className="h-4.5 w-4.5" /> Get your report
          </Link>
        </div>
      </section>
    </>
  )
}
