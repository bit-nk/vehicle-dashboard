import { useEffect, useState } from 'react'

// Dual-thumb range slider on a single bar + typed min/max number inputs, kept in sync.
// Ported from the public site so the dashboard inventory filters match it.
export default function RangeSlider({ min, max, step = 1, low, high, onChange, prefix = '', suffix = '' }) {
  const range = Math.max(1, max - min)
  const pct = (v) => ((Math.min(Math.max(v, min), max) - min) / range) * 100

  const [loText, setLoText] = useState(String(low))
  const [hiText, setHiText] = useState(String(high))
  useEffect(() => setLoText(String(low)), [low])
  useEffect(() => setHiText(String(high)), [high])

  const setLow = (v) => { const n = Math.min(Math.max(Number(v), min), high); if (!Number.isNaN(n)) onChange(n, high) }
  const setHigh = (v) => { const n = Math.max(Math.min(Number(v), max), low); if (!Number.isNaN(n)) onChange(low, n) }

  const numClass = 'h-9 w-full rounded-lg border border-ink-200 bg-[var(--surface)] text-sm text-ink-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'

  return (
    <div>
      <div className="relative h-5">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-ink-200" />
        <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-500" style={{ left: `${pct(low)}%`, width: `${Math.max(0, pct(high) - pct(low))}%` }} />
        <input type="range" min={min} max={max} step={step} value={low} onChange={(e) => setLow(e.target.value)} className="range-dual" style={{ zIndex: low > max - range * 0.08 ? 5 : 3 }} aria-label="Minimum" />
        <input type="range" min={min} max={max} step={step} value={high} onChange={(e) => setHigh(e.target.value)} className="range-dual" style={{ zIndex: 4 }} aria-label="Maximum" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          {prefix && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-400">{prefix}</span>}
          <input type="number" inputMode="numeric" min={min} max={high} step={step} value={loText} onChange={(e) => setLoText(e.target.value)} onBlur={(e) => setLow(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setLow(e.currentTarget.value) }} className={`${numClass} ${prefix ? 'pl-9' : 'pl-2.5'} ${suffix ? 'pr-9' : 'pr-2.5'}`} aria-label="Minimum value" />
          {suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-400">{suffix}</span>}
        </div>
        <span className="text-ink-300">-</span>
        <div className="relative flex-1">
          {prefix && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-400">{prefix}</span>}
          <input type="number" inputMode="numeric" min={low} max={max} step={step} value={hiText} onChange={(e) => setHiText(e.target.value)} onBlur={(e) => setHigh(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setHigh(e.currentTarget.value) }} className={`${numClass} ${prefix ? 'pl-9' : 'pl-2.5'} ${suffix ? 'pr-9' : 'pr-2.5'}`} aria-label="Maximum value" />
          {suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-400">{suffix}</span>}
        </div>
      </div>
    </div>
  )
}
