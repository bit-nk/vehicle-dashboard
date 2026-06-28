import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Compass className="h-8 w-8" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-extrabold text-ink-900">Page not found</h1>
      <p className="mt-2 text-ink-500">The page you're looking for doesn't exist or has moved.</p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Go home</Link>
        <Link to="/listings" className="rounded-full border border-ink-200 px-6 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">Browse cars</Link>
      </div>
    </div>
  )
}
