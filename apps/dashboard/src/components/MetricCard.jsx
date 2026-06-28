import { ArrowUpRight } from 'lucide-react'

const TONES = {
  brand: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  blue: 'bg-sky-50 text-sky-600',
  ink: 'bg-ink-100 text-ink-600',
}
const STROKE = { brand: '#0d9488', green: '#059669', amber: '#d97706', rose: '#e11d48', blue: '#0284c7', ink: '#64748b' }

// Tiny inline sparkline (no chart lib) for the "live" feel.
function Spark({ data = [], tone = 'brand' }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1), min = Math.min(...data, 0)
  const span = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${24 - ((v - min) / span) * 20 - 2}`).join(' ')
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-6 w-full">
      <polyline points={pts} fill="none" stroke={STROKE[tone] || STROKE.brand} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// Compact "live" KPI tile. Optionally clickable (click-through to a detail view) and
// optionally carries its OWN period filter (period={{value, options:[{key,label}], onChange}}).
export default function MetricCard({ label, value, sub, icon: Icon, tone = 'brand', trend, spark, live, onClick, period }) {
  const clickable = !!onClick
  const showFoot = trend != null || sub || clickable
  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      className={`card group p-4 text-left transition ${clickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-300' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="text-[13px] font-medium leading-tight text-ink-500">{label}</p>
          {live && <span className="relative flex h-2 w-2 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" /></span>}
        </div>
        {period ? (
          <select
            value={period.value}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => { e.stopPropagation(); period.onChange(e.target.value) }}
            className="field-select shrink-0 rounded-md border border-ink-200 bg-[var(--surface)] py-0.5 pl-1.5 pr-5 text-[11px] font-medium text-ink-500 outline-none focus:border-brand-400"
            title="Period for this card"
          >
            {period.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        ) : Icon && (
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TONES[tone] || TONES.brand}`}><Icon className="h-4 w-4" /></span>
        )}
      </div>

      <p className="mt-1 whitespace-nowrap font-display text-xl font-extrabold tracking-tight text-ink-900">{value}</p>

      {spark && <div className="mt-1.5"><Spark data={spark} tone={tone} /></div>}

      {showFoot && (
        <div className="mt-1.5 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs">
            {trend != null && (
              <span className={`font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%</span>
            )}
            {sub && <span className="text-ink-400">{sub}</span>}
          </p>
          {clickable && (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100">
              View <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      )}
    </div>
  )
}
