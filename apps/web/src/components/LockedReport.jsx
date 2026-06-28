import { Lock } from 'lucide-react'

// Shown in place of the full report when it is NOT unlocked. Renders ONLY a
// non-sensitive skeleton (no real vehicle data is ever put in the DOM here) plus
// the unlock prompt. The real report sections are only rendered once unlocked.
//
// NOTE: the underlying dataset still ships in the JS bundle in this static demo.
// Truly removing locked data from the frontend requires serving it from an
// authenticated/paid backend endpoint — see docs/TODO.md and SECURITY.md.
function SkeletonCard() {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-3 border-b border-ink-100 px-5 py-4">
        <span className="h-9 w-9 rounded-lg bg-ink-100" />
        <span className="h-3.5 w-40 rounded bg-ink-100" />
        <span className="ml-auto h-3 w-16 rounded bg-ink-100" />
      </header>
      <div className="space-y-2.5 p-5">
        <span className="block h-3 w-3/4 rounded bg-ink-100" />
        <span className="block h-3 w-2/3 rounded bg-ink-100" />
        <span className="block h-3 w-1/2 rounded bg-ink-100" />
      </div>
    </section>
  )
}

export default function LockedReport({ onUnlock, teaser }) {
  return (
    <div className="relative max-h-[460px] overflow-hidden rounded-2xl">
      <div className="locked-blur space-y-5" aria-hidden="true">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/30 via-white/80 to-white p-6">
        <div className="max-w-sm text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-200">
            <Lock className="h-5 w-5" />
          </span>
          <p className="font-display text-lg font-bold text-ink-900">{teaser ?? 'Full details are locked'}</p>
          <p className="mt-1 text-sm text-ink-500">
            Unlock the complete history to see every ownership, accident, service, title and recall record for this vehicle.
          </p>
          <button
            type="button"
            onClick={onUnlock}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Lock className="h-4 w-4" /> Unlock full report
          </button>
        </div>
      </div>
    </div>
  )
}
