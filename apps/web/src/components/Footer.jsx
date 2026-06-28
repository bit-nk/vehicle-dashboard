import { Link } from 'react-router-dom'
import { Logo } from '@shared/ui'

const cols = [
  {
    title: 'Shop',
    links: [
      { to: '/listings', label: 'Used Cars for Sale' },
      { to: '/listings?deal=great', label: 'Great Deals' },
      { to: '/listings?bodyStyle=SUV', label: 'SUVs' },
      { to: '/listings?bodyStyle=Truck', label: 'Trucks' },
    ],
  },
  {
    title: 'Research',
    links: [
      { to: '/report', label: 'Vehicle History Report' },
      { to: '/report', label: 'VIN Lookup' },
      { to: '/report', label: 'License Plate Lookup' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/', label: 'About' },
      { to: '/', label: 'How It Works' },
      { to: '/', label: 'Contact' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-500">
            Know the full story before you buy. Vehicle history, market value, and listings in one place.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-sm font-bold text-ink-900">{c.title}</h4>
            <ul className="mt-3 space-y-2">
              {c.links.map((l, i) => (
                <li key={i}>
                  <Link to={l.to} className="text-sm text-ink-500 transition-colors hover:text-brand-600">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-100">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-[11px] leading-relaxed text-ink-400">
            <span className="font-semibold text-ink-500">Data &amp; attribution:</span> Specs &amp; fuel economy from{' '}
            <a href="https://www.fueleconomy.gov" target="_blank" rel="noreferrer noopener" className="underline hover:text-ink-600">EPA fueleconomy.gov</a>;
            recalls &amp; crash-test ratings from{' '}
            <a href="https://www.nhtsa.gov" target="_blank" rel="noreferrer noopener" className="underline hover:text-ink-600">NHTSA</a>;
            vehicle photos from{' '}
            <a href="https://commons.wikimedia.org" target="_blank" rel="noreferrer noopener" className="underline hover:text-ink-600">Wikimedia Commons</a>{' '}
            (openly licensed - see each photo&apos;s credit). Ownership, accident, service, title and price history are simulated for this demo.
          </p>
          <div className="mt-3 flex flex-col items-center justify-between gap-2 border-t border-ink-100 pt-3 text-xs text-ink-400 sm:flex-row">
            <p>© 2026 VINsight. Demo project.</p>
            <p className="flex gap-4">
              <Link to="/" className="hover:text-ink-600">Privacy</Link>
              <Link to="/" className="hover:text-ink-600">Terms</Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
