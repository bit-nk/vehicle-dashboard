import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Sun, Moon, Monitor, SlidersHorizontal, Palette, Percent } from 'lucide-react'
import { getThemePref, setThemePref, getSettings, setSettings } from '../lib/theme.js'
import { accentScale, setDealershipAccent, dealershipById, dealershipRates, setDealershipRates } from '../data/dealer.js'
import { ACCENT_PRESETS } from '../components/OnboardingForm.jsx'

// Apply a brand accent to the live dashboard shell + persist it for this dealership.
function applyAccentLive(accent) {
  const shell = document.getElementById('dealer-shell')
  if (!shell) return
  shell.style.setProperty('--color-brand-50', accent[50]); shell.style.setProperty('--color-brand-100', accent[100])
  shell.style.setProperty('--color-brand-500', accent[500]); shell.style.setProperty('--color-brand-600', accent[600]); shell.style.setProperty('--color-brand-700', accent[700])
}

const THEMES = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
]

function Toggle({ on, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span><span className="text-sm font-medium text-ink-800">{label}</span>{hint && <span className="block text-xs text-ink-400">{hint}</span>}</span>
      <button type="button" onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-brand-600' : 'bg-ink-200'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  )
}

export default function Settings() {
  const { role, dealershipId } = useOutletContext()
  const [theme, setTheme] = useState(getThemePref())
  const [s, setS] = useState(getSettings())
  const [accent, setAccent] = useState(() => dealershipById(dealershipId)?.accent || ACCENT_PRESETS.Teal)
  const [rates, setRates] = useState(() => { const r = dealershipRates(dealershipId); return { tax: Math.round(r.taxRate * 1000) / 10, vat: Math.round(r.vatRate * 1000) / 10 } })
  const upd = (patch) => setS(setSettings(patch))
  const pickTheme = (t) => { setTheme(t); setThemePref(t) }
  const pickAccent = (a) => { setAccent(a); applyAccentLive(a); setDealershipAccent(dealershipId, a) }
  const saveRates = (next) => { setRates(next); setDealershipRates(dealershipId, { taxRate: Math.max(0, Number(next.tax) || 0) / 100, vatRate: Math.max(0, Number(next.vat) || 0) / 100 }) }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500">Personalize your dashboard. Changes are saved on this device.</p>
      </div>

      {/* Appearance - compact segmented control */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-display text-base font-bold text-ink-900">Appearance</h2>
          <p className="text-sm text-ink-500">Theme - "System" follows your OS.</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-ink-100 p-1">
          {THEMES.map((t) => {
            const active = theme === t.key
            return (
              <button key={t.key} onClick={() => pickTheme(t.key)} title={t.label}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${active ? 'bg-[var(--surface)] text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}>
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Dashboard preferences (recommended) */}
      <div className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 font-display text-base font-bold text-ink-900"><SlidersHorizontal className="h-4 w-4 text-brand-600" /> Dashboard preferences</h2>
        <p className="mb-2 text-sm text-ink-500">Recommended defaults for how the dashboard behaves.</p>
        <div className="divide-y divide-ink-100">
          <Toggle label="Show revenue trend chart on Overview" hint="Display the sales & service revenue area chart" on={s.showRevenueChart} onChange={(v) => upd({ showRevenueChart: v })} />
          <Toggle label="Live KPI tiles" hint="Pulse animation on live metric tiles" on={s.liveTiles} onChange={(v) => upd({ liveTiles: v })} />
          <Toggle label="Collapse sidebar by default" hint="Start with the navigation collapsed to icons" on={s.sidebarDefaultCollapsed} onChange={(v) => upd({ sidebarDefaultCollapsed: v })} />
          <label className="flex items-center justify-between gap-4 py-2">
            <span><span className="text-sm font-medium text-ink-800">Table density</span><span className="block text-xs text-ink-400">Row spacing in tables</span></span>
            <select value={s.tableDensity} onChange={(e) => upd({ tableDensity: e.target.value })} className="field-select h-9 rounded-lg border border-ink-200 bg-[var(--surface)] pl-3 text-sm outline-none focus:border-brand-500">
              <option value="comfortable">Comfortable</option><option value="compact">Compact</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-4 py-2">
            <span><span className="text-sm font-medium text-ink-800">Default landing page</span><span className="block text-xs text-ink-400">Where you land after signing in</span></span>
            <select value={s.defaultLanding} onChange={(e) => upd({ defaultLanding: e.target.value })} className="field-select h-9 rounded-lg border border-ink-200 bg-[var(--surface)] pl-3 text-sm outline-none focus:border-brand-500">
              <option value="/">Overview</option><option value="/inventory">Inventory</option><option value="/service">Service</option><option value="/sales">Sales</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-ink-400">More settings (notifications, branches, integrations) will appear here as the platform grows.</p>
      </div>

      {/* Dealership-admin only: brand accent + self-service catalog */}
      {role === 'Admin' && (
        <>
          <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900"><Palette className="h-4 w-4 text-brand-600" /> Brand accent</h2>
              <p className="text-sm text-ink-500">Your accent color - applies across your dashboard &amp; bills.</p>
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-ink-200 px-2.5 py-1.5">
              <input type="color" value={accent[600]} onChange={(e) => pickAccent(accentScale(e.target.value))} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0" title="Pick a brand color" />
              <span className="text-sm font-semibold text-ink-700">Pick a color</span>
              <span className="font-mono text-xs text-ink-400">{accent[600]}</span>
            </label>
          </div>

          {/* Tax & VAT rates - applied to every bill (tax on the subtotal, then VAT on subtotal + tax) */}
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900"><Percent className="h-4 w-4 text-brand-600" /> Tax &amp; VAT</h2>
            <p className="mt-0.5 text-sm text-ink-500">Applied to every bill: <span className="font-medium text-ink-700">tax on the subtotal, then VAT on (subtotal + tax)</span>.</p>
            <div className="mt-4 grid max-w-md grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-600">Tax %</span>
                <div className="relative">
                  <input type="number" min="0" step="0.5" value={rates.tax} onChange={(e) => saveRates({ ...rates, tax: e.target.value })}
                    className="h-10 w-full rounded-lg border border-ink-200 bg-[var(--surface)] px-3 pr-8 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">%</span>
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-600">VAT %</span>
                <div className="relative">
                  <input type="number" min="0" step="0.5" value={rates.vat} onChange={(e) => saveRates({ ...rates, vat: e.target.value })}
                    className="h-10 w-full rounded-lg border border-ink-200 bg-[var(--surface)] px-3 pr-8 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">%</span>
                </div>
              </label>
            </div>
            <p className="mt-2 text-xs text-ink-400">Defaults: Tax 10% · VAT 13%. Saved for {dealershipById(dealershipId)?.name || 'this dealership'}.</p>
          </div>
        </>
      )}
    </div>
  )
}
