// Pure formatting + small data helpers. Framework-agnostic so both apps can use them.
import { pad2 } from './random.js'

// Nepali Rupees, e.g. Rs. 10,000,000 (thousands grouping, no decimals).
// Uses a non-breaking space so "Rs." and the amount never wrap onto separate lines.
export const formatCurrency = (n) =>
  typeof n === 'number' ? `Rs. ${Math.round(n).toLocaleString('en-US')}` : '-'

export const formatNumber = (n) =>
  typeof n === 'number' ? n.toLocaleString('en-US') : '-'

// Compact amount in the Nepali number system: K (thousand), Lakh (1e5), Cr (crore, 1e7),
// Arab (1e9). Used for chart axes / tooltips where full "Rs. 60,000,000" won't fit.
// e.g. 60000000 -> "6 Cr", 125000 -> "1.3 Lakh", 4500 -> "4.5K".
export const formatNprShort = (n) => {
  if (typeof n !== 'number' || !isFinite(n)) return '-'
  const a = Math.abs(n)
  const trim = (x) => { const r = Math.round(x * 10) / 10; return r % 1 === 0 ? String(r) : r.toFixed(1) }
  if (a >= 1e9) return `${trim(n / 1e9)} Arab`
  if (a >= 1e7) return `${trim(n / 1e7)} Cr`
  if (a >= 1e5) return `${trim(n / 1e5)} Lakh`
  if (a >= 1e3) return `${trim(n / 1e3)}K`
  return String(Math.round(n))
}

/* ----- date primitives (timezone-safe; shared by dashboard + filters) ----- */
// Date -> 'YYYY-MM-DD' (local).
export const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
// 'YYYY-MM-DD' -> LOCAL Date (avoids new Date(str) being parsed as UTC).
export const parseLocal = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1) }
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// "2019 Toyota RAV4 XLE"
export const vehicleTitle = (v) => `${v.year} ${v.make} ${v.model} ${v.trim}`.trim()

// Carfax-style 8-char masking for teaser VINs (last 8 shown).
export const maskVin = (vin) => (vin ? `${'•'.repeat(9)}${vin.slice(-8)}` : '')

// Deal rating from price vs market value.
export const dealRating = (price, marketValue) => {
  if (!marketValue) return null
  const diff = (price - marketValue) / marketValue
  if (diff <= -0.08) return { label: 'Great Deal', tone: 'great' }
  if (diff <= -0.02) return { label: 'Good Deal', tone: 'good' }
  if (diff <= 0.05) return { label: 'Fair Price', tone: 'fair' }
  return { label: 'Above Market', tone: 'high' }
}
