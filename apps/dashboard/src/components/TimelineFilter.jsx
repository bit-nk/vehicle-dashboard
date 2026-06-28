import { useState } from 'react'
import { iso } from '@shared/lib'
import { TODAY } from '../data/dealer.js'

const TODAY_ISO = iso(TODAY)

function firstOfMonthsBack(n) {
  const total = TODAY.getFullYear() * 12 + TODAY.getMonth() - n
  return new Date(Math.floor(total / 12), total % 12, 1)
}

export const PRESETS = {
  thisMonth: { label: 'This month', range: () => ({ from: iso(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)), to: TODAY_ISO }) },
  m3: { label: 'Last 3 months', range: () => ({ from: iso(firstOfMonthsBack(2)), to: TODAY_ISO }) },
  m6: { label: 'Last 6 months', range: () => ({ from: iso(firstOfMonthsBack(5)), to: TODAY_ISO }) },
  m12: { label: 'Last 12 months', range: () => ({ from: iso(firstOfMonthsBack(11)), to: TODAY_ISO }) },
}

export const defaultRange = () => ({ preset: 'm6', ...PRESETS.m6.range() })

// Timeline filter: quick presets + manual date range (the "auto + manual" filter).
export default function TimelineFilter({ value, onChange }) {
  const [custom, setCustom] = useState(false)

  const choosePreset = (key) => { setCustom(false); onChange({ preset: key, ...PRESETS[key].range() }) }
  const setDate = (k, v) => {
    const next = { ...value, [k]: v, preset: 'custom' }
    if (next.from && next.to && next.from <= next.to) onChange(next)
    else onChange(next)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-lg bg-ink-100 p-1">
        {Object.entries(PRESETS).map(([k, p]) => (
          <button
            key={k}
            onClick={() => choosePreset(k)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
              value.preset === k ? 'bg-[var(--surface)] text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => { setCustom(true); onChange({ ...value, preset: 'custom' }) }}
          className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
            value.preset === 'custom' ? 'bg-[var(--surface)] text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-800'
          }`}
        >
          Custom
        </button>
      </div>

      {(custom || value.preset === 'custom') && (
        <div className="flex items-center gap-2">
          <input type="date" value={value.from} max={value.to || TODAY_ISO} onChange={(e) => setDate('from', e.target.value)}
            className="h-9 rounded-lg border border-ink-200 px-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
          <span className="text-ink-400">-</span>
          <input type="date" value={value.to} max={TODAY_ISO} onChange={(e) => setDate('to', e.target.value)}
            className="h-9 rounded-lg border border-ink-200 px-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
        </div>
      )}
    </div>
  )
}
