// Mock dealer/ERP data for the dashboard. Deterministic (seeded) so the demo is
// stable across reloads. Reuses the shared 20-vehicle dataset as the inventory base.
// A real build would read all of this from the backend (see docs/database/schema.sql:
// dealers, listings, sales_transactions, service_jobs, customer_followups, ...).
import { vehicles } from '@shared/data'
import { hash, rng, pick, intBetween, pad2, iso, addDays, parseLocal } from '@shared/lib'

// Anchor "today" to the project's reference date so relative windows are stable.
export const TODAY = new Date('2026-06-27T00:00:00')
export { addDays } // re-exported for pages that import it from this module

// y/m (1-12) going `back` months from TODAY
function monthBack(back) {
  const total = TODAY.getFullYear() * 12 + TODAY.getMonth() - back
  return { y: Math.floor(total / 12), m: (total % 12) + 1 }
}
export const fmtDate = (s) => parseLocal(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
export const monthLabel = (y, m) => new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })

/* ----------------------------- people ----------------------------- */
const FIRST = ['Aarav', 'Sita', 'Bishal', 'Priya', 'Niraj', 'Anjali', 'Rohan', 'Maya', 'Suman', 'Gita', 'Kiran', 'Asha', 'Dipendra', 'Sunita', 'Hari', 'Rita', 'Bibek', 'Nisha']
const LAST = ['Sharma', 'Thapa', 'Gurung', 'Magar', 'Rai', 'KC', 'Shrestha', 'Tamang', 'Adhikari', 'Bhandari']
const name = (r) => `${pick(r, FIRST)} ${pick(r, LAST)}`
const fakePhone = (i) => `+977 980-000-${pad2(((i * 7) % 89) + 10)}`

/* ----------------------------- dealerships (tenants) ----------------------------- */
// Each dealership is an isolated tenant. A signed-in user only ever sees their own
// dealership's branches/inventory/sales/service/follow-ups. (Front-end scoping here is
// a DEMO; real isolation must be enforced server-side - see docs/TODO.md "RBAC".)
// Each dealership carries its own branding (mark initials + accent palette) so the
// signed-in dashboard reflects THEIR brand, not the platform's. The accent overrides
// the teal --color-brand-* CSS vars on the layout root at runtime.
export const DEALERSHIPS = [
  { id: 'himalayan', name: 'Himalayan Auto Group', mark: 'HA',
    accent: { 50: '#f0fdfa', 100: '#ccfbf1', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' } },
  { id: 'everest', name: 'Everest Motors', mark: 'EM',
    accent: { 50: '#eef2ff', 100: '#e0e7ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' } },
  { id: 'annapurna', name: 'Annapurna Autos', mark: 'AA',
    accent: { 50: '#fff7ed', 100: '#ffedd5', 500: '#f97316', 600: '#ea580c', 700: '#c2410c' } },
]
// --- platform (admin) config store: dealership onboarding + per-dealership catalogs +
// change requests. Persisted in localStorage by AdminStore; read here through pure
// helpers so dealership branding / letterhead / catalogs pick up onboarded dealerships
// and admin edits WITHOUT coupling the dealer subtree to the admin provider.
const PLATFORM_STORE_KEY = 'vinsight:platform:store'
export function readPlatformStore() {
  try { return JSON.parse(localStorage.getItem(PLATFORM_STORE_KEY) || 'null') || {} } catch { return {} }
}
export function writePlatformStore(next) {
  try { localStorage.setItem(PLATFORM_STORE_KEY, JSON.stringify(next)) } catch { /* ignore quota */ }
}
// Onboarding record (store override, else seed dealership + its letterhead defaults).
export function readOnboarding(id) {
  const o = readPlatformStore().onboarding?.[id]
  if (o) return o
  const d = DEALERSHIPS.find((x) => x.id === id)
  if (!d) return null
  const c = LETTERHEAD[id] || {}
  return { dealershipId: id, name: d.name, mark: d.mark, accent: d.accent, logoDataUrl: null, status: 'active', address: c.address, pan: c.pan, phone: c.phone, email: c.email }
}
export const dealershipById = (id) => {
  const base = DEALERSHIPS.find((d) => d.id === id)
  const o = readPlatformStore().onboarding?.[id]
  if (!base && !o) return undefined
  return { ...(base || {}), ...(o || {}), id }
}
// Every dealership the platform knows about (seed + onboarded), for admin lists.
export function allDealerships() {
  const ob = readPlatformStore().onboarding || {}
  const seeded = DEALERSHIPS.map((d) => ({ ...d, ...(ob[d.id] || {}), id: d.id }))
  const extras = Object.keys(ob).filter((id) => !DEALERSHIPS.some((d) => d.id === id))
    .map((id) => ({ id, ...ob[id] }))
  return [...seeded, ...extras]
}
// Dealerships available to sign into (active only).
export const activeDealerships = () => allDealerships().filter((d) => (d.status || 'active') === 'active')
// Per-dealership editable catalogs (store override, else the shared default template).
export const readServiceCatalog = (id) => readPlatformStore().serviceCatalog?.[id] || DEFAULT_SERVICE_TEMPLATE
export const readPartsCatalog = (id) => readPlatformStore().partsCatalog?.[id] || DEFAULT_PARTS_TEMPLATE
// CSS-var object that re-themes --color-brand-* to a dealership's accent.
export const accentVars = (dealershipId) => {
  const a = dealershipById(dealershipId)?.accent
  if (!a) return {}
  return { '--color-brand-50': a[50], '--color-brand-100': a[100], '--color-brand-500': a[500], '--color-brand-600': a[600], '--color-brand-700': a[700] }
}

// Build a full 5-stop brand accent (the shape accentVars expects) from a single picked color.
const _hexToRgb = (h) => { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const _toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const _mix = (rgb, t, k) => rgb.map((c, i) => c + (t[i] - c) * k)
export function accentScale(hex) {
  const base = _hexToRgb(hex), W = [255, 255, 255], B = [0, 0, 0]
  return { 50: _toHex(_mix(base, W, 0.9)), 100: _toHex(_mix(base, W, 0.8)), 500: _toHex(_mix(base, W, 0.14)), 600: _toHex(base), 700: _toHex(_mix(base, B, 0.16)) }
}
const _clone = (x) => JSON.parse(JSON.stringify(x))

// Persist a dealership's accent / catalogs into the shared platform store (used by the
// dealership's own Settings as well as the platform admin). Pure helpers, no provider.
export function setDealershipAccent(did, accent) {
  const ps = readPlatformStore(); const onboarding = { ...(ps.onboarding || {}) }
  onboarding[did] = { ...(onboarding[did] || readOnboarding(did) || {}), accent }
  writePlatformStore({ ...ps, onboarding })
}
// Per-dealership tax / VAT rates (stored as fractions, e.g. 0.10). Used by the bill math.
export function setDealershipRates(did, { taxRate, vatRate }) {
  const ps = readPlatformStore(); const onboarding = { ...(ps.onboarding || {}) }
  onboarding[did] = { ...(onboarding[did] || readOnboarding(did) || {}), taxRate, vatRate }
  writePlatformStore({ ...ps, onboarding })
}
export function setServiceCatalog(did, catalog) {
  const ps = readPlatformStore(); writePlatformStore({ ...ps, serviceCatalog: { ...(ps.serviceCatalog || {}), [did]: catalog } })
}
export function setPartsCatalog(did, catalog) {
  const ps = readPlatformStore(); writePlatformStore({ ...ps, partsCatalog: { ...(ps.partsCatalog || {}), [did]: catalog } })
}

// Platform-admin accounts ("us"). Mock; any password in the demo.
export const PLATFORM_ADMINS = [
  { email: 'admin@vinsight.app', name: 'Platform Admin' },
]
export const findAdminUser = (email) => PLATFORM_ADMINS.find((a) => a.email.toLowerCase() === String(email).toLowerCase().trim())

/* ----------------------------- default catalog templates (admin "Load default template") ----------------------------- */
// 2-level SERVICE catalog: Dropdown1 = type, Dropdown2 = subtype. Generalized common knowledge.
export const DEFAULT_SERVICE_TEMPLATE = [
  { type: 'Periodic & Scheduled Service', subtypes: ['Regular Oil & Filter Change', 'Fluid Top-ups & Replacements', 'Air Filter Replacement', 'Cabin Air Filter Replacement', 'Spark Plug Service', 'Belt & Hose Inspection'] },
  { type: 'Engine & Powertrain', subtypes: ['Engine Diagnosis & Scanning', 'Timing Belt Replacement', 'Valve Clearance Adjustment', 'Coolant Flush & Refill', 'Engine Oil Leak Repair', 'Compression Test', 'Head Gasket Service'] },
  { type: 'Brakes', subtypes: ['Front Pad Replacement', 'Rear Pad Replacement', 'Brake Fluid Flush', 'Disc Resurfacing', 'Caliper Service & Repair', 'Brake Line Inspection', 'ABS System Diagnosis'] },
  { type: 'Tyres & Wheels', subtypes: ['Tyre Fitting & Balancing', 'Wheel Alignment & Tracking', 'Tyre Repair & Patching', 'Puncture Repair', 'Tyre Rotation', 'Wheel Bearing Service'] },
  { type: 'Suspension & Steering', subtypes: ['Shock Absorber Replacement', 'Strut Service', 'Tie Rod & Linkage Repair', 'Steering Box Service', 'Control Arm Replacement', 'Suspension Geometry Check'] },
  { type: 'Electrical & Battery', subtypes: ['Battery Replacement & Testing', 'Alternator Service & Repair', 'Starter Motor Repair', 'Electrical Fault Diagnosis', 'Wiring & Connector Repair', 'Lighting System Repair'] },
  { type: 'AC & Climate Control', subtypes: ['AC Gas Recharge', 'AC Compressor Service', 'Condenser Cleaning & Repair', 'Cabin Heater Repair', 'Blower Motor Service', 'AC System Flush'] },
  { type: 'Transmission & Drivetrain', subtypes: ['Transmission Fluid Change', 'Clutch Plate Replacement', 'Gear Box Service', 'Driveshaft & CV Boot Repair', 'Differential Service'] },
  { type: 'Bodywork & Detailing', subtypes: ['Dent Repair & Panel Beating', 'Paint Touch-up & Spray', 'Glass Replacement', 'Rust Treatment & Prevention', 'Interior Upholstery Repair'] },
  { type: 'Inspection & Diagnostics', subtypes: ['Pre-purchase Vehicle Inspection', 'Emission Test & Compliance', 'Safety Inspection Checklist', 'Computer Diagnostic Scan', 'Road Test Assessment'] },
  { type: 'Cooling System', subtypes: ['Radiator Flush & Refill', 'Water Pump Replacement', 'Thermostat Service', 'Coolant Leak Detection', 'Heater Core Repair'] },
]
// 3-level PARTS catalog tree: category -> item -> subtype/variant. Generalized common knowledge.
export const DEFAULT_PARTS_TEMPLATE = {
  vehicleBrands: ['Toyota', 'Honda', 'Hyundai', 'Suzuki', 'Kia', 'Nissan', 'Mahindra', 'Tata', 'MG', 'Ford', 'Volkswagen', 'Skoda', 'BMW', 'Mercedes-Benz', 'Tesla'],
  categories: [
    { category: 'Engine', items: [
      { name: 'Spark Plug', subtypes: ['Copper', 'Platinum', 'Iridium', 'NGK', 'Denso', 'Bosch'] },
      { name: 'Timing Belt', subtypes: ['OEM Grade', 'Reinforced', 'Gates', 'Dayco'] },
      { name: 'Engine Mount', subtypes: ['Rubber', 'Hydraulic', 'OEM Type'] },
      { name: 'Head Gasket', subtypes: ['OEM', 'Multi-Layer Steel', 'Graphite Coated'] } ] },
    { category: 'Filters', items: [
      { name: 'Air Filter', subtypes: ['Paper', 'Reusable', 'OEM', 'Aftermarket'] },
      { name: 'Oil Filter', subtypes: ['Spin-On', 'Cartridge', 'OEM', 'Bosch'] },
      { name: 'Cabin Air Filter', subtypes: ['Standard', 'Activated Carbon', 'HEPA'] },
      { name: 'Fuel Filter', subtypes: ['Inline', 'Tank-Mounted', 'High-Pressure'] } ] },
    { category: 'Brakes', items: [
      { name: 'Brake Pad', subtypes: ['Semi-Metallic', 'Organic', 'Ceramic', 'OEM'] },
      { name: 'Brake Disc', subtypes: ['Solid', 'Vented', 'Slotted', 'OEM Grade'] },
      { name: 'Brake Caliper', subtypes: ['Single Piston', 'Twin Piston', 'Remanufactured'] },
      { name: 'Brake Fluid', subtypes: ['DOT 3', 'DOT 4', 'DOT 5.1'] } ] },
    { category: 'Tyres & Wheels', items: [
      { name: 'Tyre', subtypes: ['175/65 R14', '185/65 R15', '195/65 R15', '205/65 R16', '215/55 R17', 'All-Season', 'Winter'] },
      { name: 'Wheel Bearing', subtypes: ['Tapered Roller', 'Ball Bearing', 'Sealed'] },
      { name: 'Tyre Valve', subtypes: ['Schrader', 'Clamp-in', 'Tubeless'] } ] },
    { category: 'Suspension', items: [
      { name: 'Shock Absorber', subtypes: ['Mono-Tube', 'Twin-Tube', 'Gas Pressurized', 'OEM Type'] },
      { name: 'Control Arm', subtypes: ['Upper', 'Lower', 'OEM'] },
      { name: 'Ball Joint', subtypes: ['Lower', 'Upper', 'OEM Type'] },
      { name: 'Tie Rod', subtypes: ['Inner', 'Outer', 'OEM Grade'] } ] },
    { category: 'Electrical & Battery', items: [
      { name: 'Car Battery', subtypes: ['12V 45Ah', '12V 60Ah', '12V 75Ah', 'AGM', 'EFB'] },
      { name: 'Alternator', subtypes: ['80A', '100A', '120A', 'Remanufactured'] },
      { name: 'Starter Motor', subtypes: ['Gear Reduction', 'Direct Drive', 'Remanufactured'] },
      { name: 'Ignition Coil', subtypes: ['Pencil Type', 'Stick Type', 'OEM'] } ] },
    { category: 'Cooling System', items: [
      { name: 'Radiator', subtypes: ['Aluminum', 'Copper-Brass', 'Single Row', 'Double Row'] },
      { name: 'Thermostat', subtypes: ['Standard', 'OEM Grade'] },
      { name: 'Water Pump', subtypes: ['Mechanical', 'Electric', 'Remanufactured'] },
      { name: 'Radiator Hose', subtypes: ['Upper', 'Lower', 'Silicone'] } ] },
    { category: 'Fluids & Lubricants', items: [
      { name: 'Engine Oil', subtypes: ['5W-30', '5W-40', '10W-40', '15W-40', 'Full Synthetic', 'Semi-Synthetic'] },
      { name: 'Coolant', subtypes: ['Green', 'Orange', 'Pink', 'Long-Life'] },
      { name: 'Transmission Fluid', subtypes: ['ATF', 'CVT Fluid', 'DSG Fluid'] } ] },
    { category: 'Air Conditioning', items: [
      { name: 'AC Compressor', subtypes: ['Piston Type', 'Rotary Type', 'Remanufactured'] },
      { name: 'AC Condenser', subtypes: ['Aluminum', 'Single Core', 'Double Core'] },
      { name: 'Refrigerant', subtypes: ['R-134a', 'R-1234yf'] } ] },
    { category: 'Body & Lighting', items: [
      { name: 'Headlight', subtypes: ['H4', 'H7', 'H11', '9005', 'LED', 'Halogen'] },
      { name: 'Side Mirror', subtypes: ['Manual', 'Power', 'Heated', 'Left', 'Right'] },
      { name: 'Windshield Wiper', subtypes: ['Blade Refill', 'Complete Blade', 'Frameless'] } ] },
  ],
}

/* ----------------------------- onboarding packages ----------------------------- */
// The full lists the package editor offers as checkboxes.
export const SERVICE_TYPE_NAMES = DEFAULT_SERVICE_TEMPLATE.map((t) => t.type)
export const PARTS_CATEGORY_NAMES = DEFAULT_PARTS_TEMPLATE.categories.map((c) => c.category)

// A package auto-seeds a curated subset of the service + parts catalogs at onboarding; the
// dealership can add/remove afterwards. The platform admin can edit/add/remove packages
// (persisted to the platform store via AdminStore); these are the seed defaults.
export const DEFAULT_PACKAGES = [
  { id: 'essential', name: 'Essential Service', description: 'Core maintenance: periodic service, brakes, tyres, battery & inspection.',
    serviceTypes: ['Periodic & Scheduled Service', 'Brakes', 'Tyres & Wheels', 'Electrical & Battery', 'Inspection & Diagnostics'],
    partsCategories: ['Filters', 'Brakes', 'Tyres & Wheels', 'Electrical & Battery', 'Fluids & Lubricants'] },
  { id: 'full', name: 'Full Workshop', description: 'Everything - all service types and the full parts catalog.',
    serviceTypes: [...SERVICE_TYPE_NAMES], partsCategories: [...PARTS_CATEGORY_NAMES] },
  { id: 'ev', name: 'EV Specialist', description: 'Tuned for EVs: electrical, brakes, tyres, AC, periodic & inspection.',
    serviceTypes: ['Periodic & Scheduled Service', 'Electrical & Battery', 'Brakes', 'Tyres & Wheels', 'AC & Climate Control', 'Inspection & Diagnostics'],
    partsCategories: ['Electrical & Battery', 'Brakes', 'Tyres & Wheels', 'Fluids & Lubricants', 'Air Conditioning'] },
  { id: 'body', name: 'Body & Detailing', description: 'Panel, paint & detailing focus plus the essentials.',
    serviceTypes: ['Bodywork & Detailing', 'Periodic & Scheduled Service', 'Inspection & Diagnostics'],
    partsCategories: ['Body & Lighting', 'Fluids & Lubricants', 'Filters'] },
]
// Admin-editable packages live in the platform store; fall back to the seed defaults.
export const readPackages = () => readPlatformStore().packages || DEFAULT_PACKAGES
// Resolve a package object to concrete { service, parts } catalogs (subset of the default templates).
export function buildCatalogsFromPackage(pkg) {
  if (!pkg) return null
  const service = DEFAULT_SERVICE_TEMPLATE.filter((t) => (pkg.serviceTypes || []).includes(t.type)).map(_clone)
  const cats = DEFAULT_PARTS_TEMPLATE.categories.filter((c) => (pkg.partsCategories || []).includes(c.category))
  return { service, parts: { vehicleBrands: [...DEFAULT_PARTS_TEMPLATE.vehicleBrands], categories: cats.map(_clone) } }
}

/* ----------------------------- branches & reps ----------------------------- */
export const BRANCHES = [
  { id: 'ktm', name: 'Kathmandu Main', city: 'Kathmandu', province: 'Bagmati', monthlyTarget: 12, dealershipId: 'himalayan' },
  { id: 'ltp', name: 'Lalitpur', city: 'Lalitpur', province: 'Bagmati', monthlyTarget: 8, dealershipId: 'himalayan' },
  { id: 'pkr', name: 'Pokhara', city: 'Pokhara', province: 'Gandaki', monthlyTarget: 7, dealershipId: 'himalayan' },
  { id: 'brt', name: 'Biratnagar', city: 'Biratnagar', province: 'Koshi', monthlyTarget: 6, dealershipId: 'everest' },
  { id: 'btl', name: 'Butwal', city: 'Butwal', province: 'Lumbini', monthlyTarget: 5, dealershipId: 'everest' },
  { id: 'ctw', name: 'Chitwan', city: 'Bharatpur', province: 'Bagmati', monthlyTarget: 6, dealershipId: 'annapurna' },
  { id: 'npj', name: 'Nepalgunj', city: 'Nepalgunj', province: 'Lumbini', monthlyTarget: 5, dealershipId: 'annapurna' },
]
export const branchById = (id) => BRANCHES.find((b) => b.id === id)
export const branchesForDealership = (dealershipId) => BRANCHES.filter((b) => b.dealershipId === dealershipId)

export const REPS = BRANCHES.flatMap((b, bi) => {
  const r = rng(hash('rep' + b.id))
  const count = 2 + (bi % 2)
  return Array.from({ length: count }, (_, i) => ({ id: `${b.id}-r${i + 1}`, name: name(r), branchId: b.id }))
})
export const repsForBranch = (id) => REPS.filter((x) => x.branchId === id)

// average sale price per model (NPR) from the shared dataset
const priceByModel = (() => {
  const m = {}
  for (const v of vehicles) { (m[v.model] ||= []).push(v.price) }
  Object.keys(m).forEach((k) => (m[k] = Math.round(m[k].reduce((a, b) => a + b, 0) / m[k].length)))
  return m
})()
const MODELS = [...new Set(vehicles.map((v) => ({ make: v.make, model: v.model, year: v.year })).map((x) => JSON.stringify(x)))].map((s) => JSON.parse(s))
// model -> sales segment (for "Sales by Model Segment")
export const segmentByModel = (() => {
  const seg = (v) => (v.fuelType === 'EV' ? 'EV' : /truck|pickup/i.test(v.bodyStyle || '') ? 'Truck' : /suv|crossover|wagon/i.test(v.bodyStyle || '') ? 'SUV' : 'Sedan')
  const m = {}
  for (const v of vehicles) m[v.model] = seg(v)
  return m
})()
export const SALE_SEGMENTS = ['Sedan', 'SUV', 'Truck', 'EV']
export const LEAD_SOURCES = ['Walk-in', 'Referral', 'Online', 'Email Campaign']

/* ----------------------------- inventory ----------------------------- */
const STATUS_POOL = ['in_stock', 'in_stock', 'in_stock', 'sold', 'in_service', 'reserved']
export const inventory = vehicles.map((v, i) => {
  const r = rng(hash('inv' + v.id))
  const branch = BRANCHES[i % BRANCHES.length]
  const status = pick(r, STATUS_POOL)
  return {
    ...v,
    stockNo: `STK-${1000 + i}`,
    branchId: branch.id,
    dealershipId: branch.dealershipId,
    status,
    landedCostNpr: Math.round(v.price * (0.78 + r() * 0.06)), // dealer cost incl. import duty
    arrivedOn: iso(addDays(TODAY, -intBetween(r, 20, 420))),
    source: pick(r, ['Import - Japan', 'Import - India', 'Trade-in', 'Local purchase', 'Auction']),
  }
})

/* ----------------------------- sales (last 12 months) ----------------------------- */
export const sales = (() => {
  const out = []
  let n = 0
  for (let back = 11; back >= 0; back--) {
    const { y, m } = monthBack(back)
    for (const b of BRANCHES) {
      const r = rng(hash(`sales${b.id}${y}${m}`))
      const reps = repsForBranch(b.id)
      // this month (back===0) is partial -> fewer sales
      const cap = back === 0 ? Math.ceil(b.monthlyTarget * 0.7) : b.monthlyTarget + 2
      const count = intBetween(r, Math.max(1, b.monthlyTarget - 3), cap)
      for (let k = 0; k < count; k++) {
        const mm = pick(r, MODELS)
        const base = priceByModel[mm.model] || 2000000
        const priceNpr = Math.round(base * (0.92 + r() * 0.12) / 10000) * 10000
        const ft = pick(r, ['cash', 'cash', 'loan', 'loan', 'lease'])   // realistic finance mix
        const downPaymentNpr = ft === 'cash' ? 0 : Math.round(priceNpr * (0.2 + r() * 0.2) / 10000) * 10000
        out.push({
          id: `S-${++n}`,
          soldOn: iso(new Date(y, m - 1, intBetween(r, 1, back === 0 ? Math.min(27, TODAY.getDate()) : 27))),
          branchId: b.id,
          dealershipId: b.dealershipId,
          repId: reps[k % reps.length].id,
          make: mm.make, model: mm.model, year: mm.year,
          priceNpr,
          condition: pick(r, ['new', 'new', 'new', 'used', 'used']), // ~60% new
          segment: segmentByModel[mm.model] || 'Sedan',
          leadSource: pick(r, LEAD_SOURCES),
          buyerName: name(r), buyerPhone: fakePhone(n),
          financeType: ft,
          downPaymentNpr,
          loanAmountNpr: ft === 'loan' ? priceNpr - downPaymentNpr : 0,
          paymentMethod: ft === 'loan' ? 'Bank Loan' : ft === 'lease' ? 'Lease' : pick(r, ['Cash', 'Card', 'Bank Transfer']),
        })
      }
    }
  }
  return out.sort((a, b) => b.soldOn.localeCompare(a.soldOn))
})()

/* ----------------------------- service bookings / jobs ----------------------------- */
export const SERVICE_TYPES = ['Periodic service', 'Oil & filter change', 'Brake service', 'Tyre replacement', 'AC service', 'Engine diagnostics', 'Battery replacement', 'Wheel alignment']
export const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00']


/* ----------------------------- invoicing helpers ----------------------------- */
export const TAX_RATE = 0.10 // default service/sales tax
export const VAT_RATE = 0.13 // default Nepal VAT
// A dealership's configured rates (set in Settings), falling back to the defaults.
export const dealershipRates = (did) => {
  const d = did ? dealershipById(did) : null
  return { taxRate: typeof d?.taxRate === 'number' ? d.taxRate : TAX_RATE, vatRate: typeof d?.vatRate === 'number' ? d.vatRate : VAT_RATE }
}
// Bill math: tax applies to the subtotal, then VAT applies to (subtotal + tax).
// Grand total = subtotal + tax + vat. Pass the dealershipId to use its configured rates.
export const withTaxVat = (subtotal, did) => {
  const { taxRate, vatRate } = dealershipRates(did)
  const sub = Math.round(subtotal || 0)
  const tax = Math.round(sub * taxRate)
  const vat = Math.round((sub + tax) * vatRate)
  return { subtotal: sub, tax, vat, total: sub + tax + vat, taxRate, vatRate }
}
// Runtime doc number. The base36 sequence suffix guarantees uniqueness even for
// multiple documents created within the same millisecond.
let _docSeq = 0
export const nextDocNo = (prefix) => `${prefix}-${String(Date.now()).slice(-5)}${(_docSeq++).toString(36).toUpperCase()}`
// integer NPR -> words (Nepali/South-Asian crore/lakh system)
export const amountInWords = (num) => {
  num = Math.max(0, Math.round(num || 0))
  if (num === 0) return 'Rupees Zero only'
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const two = (n) => (n < 20 ? a[n] : `${b[Math.floor(n / 10)]}${n % 10 ? ' ' + a[n % 10] : ''}`)
  const seg = (n) => (n < 100 ? two(n) : `${a[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + two(n % 100) : ''}`)
  let w = ''
  const crore = Math.floor(num / 10000000); num %= 10000000
  const lakh = Math.floor(num / 100000); num %= 100000
  const thousand = Math.floor(num / 1000); num %= 1000
  if (crore) w += seg(crore) + ' Crore '
  if (lakh) w += seg(lakh) + ' Lakh '
  if (thousand) w += seg(thousand) + ' Thousand '
  if (num) w += seg(num)
  return `Rupees ${w.trim().replace(/\s+/g, ' ')} only`
}

/* ----------------------------- per-dealership letterhead (print header/footer) ----------------------------- */
export const LETTERHEAD = {
  himalayan: { address: 'Tinkune, Kathmandu, Bagmati', pan: '301234567', phone: '+977 1-4112233', email: 'service@himalayanauto.com.np' },
  everest: { address: 'Main Road, Biratnagar, Koshi', pan: '302345678', phone: '+977 21-445566', email: 'service@everestmotors.com.np' },
  annapurna: { address: 'Pulchowk, Bharatpur, Bagmati', pan: '303456789', phone: '+977 56-778899', email: 'service@annapurnaautos.com.np' },
}
export const letterheadFor = (dealershipId) => {
  const d = dealershipById(dealershipId) || {} // already merges onboarding overrides
  const c = LETTERHEAD[dealershipId] || {}
  return {
    id: dealershipId, mark: d.mark, name: d.name, accent: d.accent, logoDataUrl: d.logoDataUrl || null,
    address: d.address || c.address, pan: d.pan || c.pan, phone: d.phone || c.phone, email: d.email || c.email,
  }
}

/* ----------------------------- parts catalog (shared master SKU list) ----------------------------- */
export const PARTS_CATALOG = [
  { sku: 'PRT-1001', name: 'Engine Oil Filter', category: 'Engine & Oil', oemNumber: '90915-YZZE1', hsCode: '8421', unit: 'pc', unitPriceNpr: 850, relatedServiceItems: ['Engine Oil Change'] },
  { sku: 'PRT-1002', name: 'Engine Oil 5W-30 (1L)', category: 'Engine & Oil', oemNumber: '08880-83716', hsCode: '2710', unit: 'L', unitPriceNpr: 1100, relatedServiceItems: ['Engine Oil Change', 'Oil Level Check'] },
  { sku: 'PRT-1003', name: 'Engine Oil 10W-40 (1L)', category: 'Engine & Oil', oemNumber: '08880-80843', hsCode: '2710', unit: 'L', unitPriceNpr: 950, relatedServiceItems: ['Engine Oil Change'] },
  { sku: 'PRT-1004', name: 'Valve Cover Gasket', category: 'Engine & Oil', oemNumber: '11213-37020', hsCode: '8409', unit: 'pc', unitPriceNpr: 2400, relatedServiceItems: ['Valve Clearance Inspection'] },
  { sku: 'PRT-1010', name: 'Front Brake Pad Set', category: 'Brakes', oemNumber: '04465-42160', hsCode: '8708', unit: 'set', unitPriceNpr: 4200, relatedServiceItems: ['Brake Pad Inspection & Replacement'] },
  { sku: 'PRT-1011', name: 'Rear Brake Pad Set', category: 'Brakes', oemNumber: '04466-42060', hsCode: '8708', unit: 'set', unitPriceNpr: 3800, relatedServiceItems: ['Brake Pad Inspection & Replacement'] },
  { sku: 'PRT-1012', name: 'Brake Disc / Rotor', category: 'Brakes', oemNumber: '43512-42060', hsCode: '8708', unit: 'pc', unitPriceNpr: 6500, relatedServiceItems: ['Brake Rotor Inspection'] },
  { sku: 'PRT-1013', name: 'Brake Fluid DOT4 (500ml)', category: 'Brakes', oemNumber: '08823-80011', hsCode: '3819', unit: 'pc', unitPriceNpr: 650, relatedServiceItems: ['Brake Fluid Check', 'Brake System Bleeding'] },
  { sku: 'PRT-1020', name: 'Tyre 195/65 R15', category: 'Tyres & Wheels', oemNumber: 'TY-19565R15', hsCode: '4011', unit: 'pc', unitPriceNpr: 11500, relatedServiceItems: ['Tyre Pressure Check', 'Tyre Tread Depth Check'] },
  { sku: 'PRT-1021', name: 'Tyre 215/60 R16', category: 'Tyres & Wheels', oemNumber: 'TY-21560R16', hsCode: '4011', unit: 'pc', unitPriceNpr: 14500, relatedServiceItems: ['Tyre Tread Depth Check'] },
  { sku: 'PRT-1022', name: 'Wheel Balance Weights (set)', category: 'Tyres & Wheels', oemNumber: 'WB-SET', hsCode: '8708', unit: 'set', unitPriceNpr: 450, relatedServiceItems: ['Tyre Rotation', 'Wheel Alignment Check'] },
  { sku: 'PRT-1030', name: 'Shock Absorber (front)', category: 'Suspension & Steering', oemNumber: '48510-80541', hsCode: '8708', unit: 'pc', unitPriceNpr: 7800, relatedServiceItems: ['Shock Absorber Inspection'] },
  { sku: 'PRT-1033', name: 'Tie Rod End', category: 'Suspension & Steering', oemNumber: '45046-09280', hsCode: '8708', unit: 'pc', unitPriceNpr: 1900, relatedServiceItems: ['Steering Component Inspection'] },
  { sku: 'PRT-1040', name: 'Coolant / Antifreeze (1L)', category: 'Cooling System', oemNumber: '08889-80015', hsCode: '3820', unit: 'L', unitPriceNpr: 700, relatedServiceItems: ['Coolant Level Check', 'Coolant Flush & Fill'] },
  { sku: 'PRT-1041', name: 'Radiator', category: 'Cooling System', oemNumber: '16400-0H290', hsCode: '8708', unit: 'pc', unitPriceNpr: 14500, relatedServiceItems: ['Radiator Inspection'] },
  { sku: 'PRT-1050', name: 'Battery 12V 45Ah', category: 'Electrical & Battery', oemNumber: 'GS-NS60', hsCode: '8507', unit: 'pc', unitPriceNpr: 12500, relatedServiceItems: ['Battery Test & Inspection'] },
  { sku: 'PRT-1051', name: 'Alternator', category: 'Electrical & Battery', oemNumber: '27060-0H120', hsCode: '8511', unit: 'pc', unitPriceNpr: 16500, relatedServiceItems: ['Alternator Test'] },
  { sku: 'PRT-1053', name: 'Headlight Bulb (H4)', category: 'Electrical & Battery', oemNumber: 'H4-12V', hsCode: '8539', unit: 'pc', unitPriceNpr: 750, relatedServiceItems: ['Light Inspection'] },
  { sku: 'PRT-1060', name: 'ATF Transmission Fluid (1L)', category: 'Fluids', oemNumber: '08886-81210', hsCode: '2710', unit: 'L', unitPriceNpr: 1300, relatedServiceItems: ['Transmission Fluid Check', 'Transmission Fluid Flush & Fill'] },
  { sku: 'PRT-1061', name: 'Power Steering Fluid (1L)', category: 'Fluids', oemNumber: '08886-01206', hsCode: '2710', unit: 'L', unitPriceNpr: 900, relatedServiceItems: ['Power Steering Fluid Check'] },
  { sku: 'PRT-1062', name: 'Windshield Washer Fluid (2L)', category: 'Fluids', oemNumber: 'WWF-2L', hsCode: '3402', unit: 'pc', unitPriceNpr: 350, relatedServiceItems: ['Windshield Washer Fluid Check'] },
  { sku: 'PRT-1070', name: 'Engine Air Filter', category: 'Filters', oemNumber: '17801-21050', hsCode: '8421', unit: 'pc', unitPriceNpr: 1200, relatedServiceItems: ['Engine Air Filter Replacement'] },
  { sku: 'PRT-1071', name: 'Cabin Air Filter', category: 'Filters', oemNumber: '87139-YZZ08', hsCode: '8421', unit: 'pc', unitPriceNpr: 1400, relatedServiceItems: ['Cabin Air Filter Replacement'] },
  { sku: 'PRT-1072', name: 'Fuel Filter', category: 'Filters', oemNumber: '23300-21010', hsCode: '8421', unit: 'pc', unitPriceNpr: 1800, relatedServiceItems: ['Fuel Filter Replacement'] },
  { sku: 'PRT-1080', name: 'Clutch Kit', category: 'Transmission & Drivetrain', oemNumber: 'CK-31250', hsCode: '8708', unit: 'set', unitPriceNpr: 18500, relatedServiceItems: ['Clutch Inspection'] },
  { sku: 'PRT-1081', name: 'Serpentine / Drive Belt', category: 'Transmission & Drivetrain', oemNumber: '90916-02685', hsCode: '4010', unit: 'pc', unitPriceNpr: 2200, relatedServiceItems: ['Drive Belt Inspection'] },
  { sku: 'PRT-1090', name: 'Spark Plug (Iridium)', category: 'Ignition System', oemNumber: '90919-01247', hsCode: '8511', unit: 'pc', unitPriceNpr: 1100, relatedServiceItems: ['Spark Plug Inspection & Replacement'] },
  { sku: 'PRT-1091', name: 'Ignition Coil', category: 'Ignition System', oemNumber: '90919-02240', hsCode: '8511', unit: 'pc', unitPriceNpr: 5200, relatedServiceItems: ['Ignition Coil Test'] },
  { sku: 'PRT-1100', name: 'AC Refrigerant R-134a (can)', category: 'AC & Climate', oemNumber: 'R134A-CAN', hsCode: '3824', unit: 'pc', unitPriceNpr: 1600, relatedServiceItems: ['AC System Inspection'] },
  { sku: 'PRT-1101', name: 'AC Compressor', category: 'AC & Climate', oemNumber: '88320-0K080', hsCode: '8414', unit: 'pc', unitPriceNpr: 22500, relatedServiceItems: ['AC Compressor Test'] },
]
export const partBySku = (sku) => PARTS_CATALOG.find((p) => p.sku === sku)
export const PART_CATEGORIES = [...new Set(PARTS_CATALOG.map((p) => p.category))]

/* ----------------------------- per-dealership parts inventory (seed) ----------------------------- */
export const partsInventory = (() => {
  const out = []
  let n = 0
  for (const b of BRANCHES) {
    const r = rng(hash('pinv' + b.id))
    const stocked = PARTS_CATALOG.filter((_, i) => hash(`${b.id}:${i}`) % 3 !== 0) // deterministic ~2/3 subset
    for (const p of stocked) {
      out.push({
        id: `PINV-${1000 + (++n)}`,
        sku: p.sku,
        dealershipId: b.dealershipId,
        branchId: b.id,
        qtyOnHand: intBetween(r, 0, 36),
        reorderLevel: 5,
        unitPriceNpr: Math.round((p.unitPriceNpr * (1.15 + r() * 0.25)) / 10) * 10,
        binLocation: `${String.fromCharCode(65 + (n % 6))}-${intBetween(r, 1, 40)}`,
      })
    }
  }
  return out
})()

/* ----------------------------- parts orders (taken / requested / paid) ----------------------------- */
export const partsOrders = (() => {
  const r = rng(hash('porders'))
  const skuPool = PARTS_CATALOG.map((p) => p.sku)
  // every branch gets a few orders across statuses so each dealership always has
  // open (requested/taken) AND paid orders to click into.
  const statusCycle = ['requested', 'taken', 'paid', 'paid']
  const samples = [
    // one open request tied to Himalayan's active in-service job (SVC-2401)
    { branchId: 'ltp', status: 'requested', serviceJobId: 'SVC-2401', skus: ['PRT-1010'], pay: null },
  ]
  for (const b of BRANCHES) {
    const rb = rng(hash('po' + b.id))
    const count = intBetween(rb, 2, 3)
    for (let k = 0; k < count; k++) {
      const status = statusCycle[k % statusCycle.length]
      const skus = Array.from({ length: intBetween(rb, 1, 3) }, () => pick(rb, skuPool))
      samples.push({ branchId: b.id, status, serviceJobId: null, skus, pay: status === 'paid' ? pick(rb, ['Cash', 'Card', 'Bank Transfer']) : null })
    }
  }
  return samples.map((s, i) => {
    const b = branchById(s.branchId)
    const counts = {}
    s.skus.forEach((sku) => (counts[sku] = (counts[sku] || 0) + 1))
    const lines = Object.entries(counts).map(([sku, qty]) => {
      const p = partBySku(sku)
      const unitPriceNpr = Math.round((p.unitPriceNpr * 1.2) / 10) * 10
      return { sku, name: p.name, oemNumber: p.oemNumber, hsCode: p.hsCode, qty, unitPriceNpr, lineTotalNpr: unitPriceNpr * qty }
    })
    const subtotal = Math.round(lines.reduce((a, l) => a + l.lineTotalNpr, 0))   // tax/VAT added only on the bill
    const day = -intBetween(r, 0, 20)
    return {
      id: `PO-${1000 + i}`,
      dealershipId: b.dealershipId,
      branchId: b.id,
      customer: name(rng(hash('pocust' + i))),
      phone: fakePhone(i + 21),
      vin: null,
      serviceJobId: s.serviceJobId,
      status: s.status,
      lines,
      subtotalNpr: subtotal,
      totalNpr: subtotal,
      paymentMethod: s.pay,
      createdOn: iso(addDays(TODAY, day)),
      paidOn: s.status === 'paid' ? iso(addDays(TODAY, day)) : null,
      createdByRole: 'Parts',
      note: '',
    }
  })
})()

/* ----------------------------- follow-up dispositions ----------------------------- */
export const FOLLOWUP_DISPOSITIONS = ['Serviced here', 'Service not required', 'Customer declined', 'Done elsewhere', 'Rescheduled', 'Unreachable']

export const serviceJobs = (() => {
  const r = rng(hash('svc'))
  // Curated front rows so every dealership has a live "today" picture (someone awaiting
  // arrival + a car on the ramp, and Himalayan also one serviced today). Rest is history.
  const plan = [
    { status: 'confirmed', day: 0, branchId: 'ktm' },
    { status: 'in_progress', day: 0, branchId: 'ltp' },
    { status: 'completed', day: 0, branchId: 'pkr' },
    { status: 'confirmed', day: 0, branchId: 'brt' },
    { status: 'in_progress', day: 0, branchId: 'btl' },
    { status: 'confirmed', day: 0, branchId: 'ctw' },
    { status: 'in_progress', day: 0, branchId: 'npj' },
  ]
  // build 1-2 itemized part lines so completed jobs' parts cost is real (not a random
  // number) and the printed invoice, job page and billing summary all agree.
  const makeParts = (rr) => Array.from({ length: intBetween(rr, 1, 2) }, () => {
    const p = pick(rr, PARTS_CATALOG)
    const qty = intBetween(rr, 1, 4)
    const unitPriceNpr = Math.round((p.unitPriceNpr * 1.2) / 10) * 10
    return { sku: p.sku, name: p.name, oemNumber: p.oemNumber, hsCode: p.hsCode, qty, unitPriceNpr, lineTotalNpr: unitPriceNpr * qty, addedByRole: 'Parts', poId: null }
  })
  // history-weighted pool for the non-curated rows: most past jobs are completed, a few
  // still in service (overdue = delayed), the odd upcoming booking.
  const histPool = ['completed', 'completed', 'completed', 'completed', 'in_progress', 'confirmed', 'requested']
  return Array.from({ length: 40 }, (_, i) => {
    const v = inventory[(i * 3) % inventory.length]
    let status, day, branch
    if (plan[i]) {
      status = plan[i].status; day = plan[i].day; branch = branchById(plan[i].branchId)
    } else {
      status = pick(r, histPool)
      const future = status === 'requested' || status === 'confirmed'
      day = future ? intBetween(r, 1, 14) : -intBetween(r, 1, 330)   // spread history across ~11 months
      branch = pick(r, BRANCHES)
    }
    const reqd = Array.from({ length: intBetween(r, 1, 3) }, () => pick(r, SERVICE_TYPES))
    const done = status === 'completed'
    const labour = done ? intBetween(r, 1500, 9000) : 0
    // Seed one active job (the curated himalayan in_progress row) with a part + detail so
    // the full-page form, parts and billing flows show populated data out of the box.
    const seedDetails = i === 1
      ? [{ item: 'Engine Oil Change', category: 'Engine & Oil', note: 'Synthetic, customer supplied filter declined.', values: { 'Oil Grade': '5W-30', 'Quantity (litres)': 4, 'Filter Changed': true } }]
      : done
        ? [{ item: 'General Vehicle Inspection', category: 'Inspection & General', note: 'Routine periodic service completed; no advisories.', values: { 'Inspection Type': 'Post-Service', 'Overall Condition': 'Good' } }]
        : []
    const seedParts = i === 1
      ? [{ sku: 'PRT-1002', name: 'Engine Oil 5W-30 (1L)', oemNumber: '08880-83716', hsCode: '2710', qty: 4, unitPriceNpr: 1320, lineTotalNpr: 5280, addedByRole: 'Parts', poId: 'PO-1001' }]
      : done ? makeParts(r) : []
    const parts = seedParts.reduce((a, p) => a + p.lineTotalNpr, 0)
    return {
      id: `SVC-${2400 + i}`,
      customer: name(rng(hash('svccust' + i))),
      phone: fakePhone(i + 3),
      vehicle: `${v.year} ${v.make} ${v.model}`,
      vin: v.vin,
      make: v.make, model: v.model, year: v.year, // for "filter by car / year"
      branchId: branch.id,
      dealershipId: branch.dealershipId,
      slotDate: iso(addDays(TODAY, day)),
      slotTime: pick(r, TIME_SLOTS),
      status,
      odometerKm: status === 'requested' ? null : (v.mileage + intBetween(r, 500, 6000)),
      requestedServices: [...new Set(reqd)],
      workDone: done ? [...new Set(reqd)].map((s) => `${s} - completed`) : [],
      serviceDetails: seedDetails, // structured taxonomy entries (full-page form)
      attachedParts: seedParts,    // parts the parts dept attached to this active job
      labourCostNpr: labour,
      partsCostNpr: parts,
      totalNpr: labour + parts,
      completedOn: done ? iso(addDays(TODAY, day)) : null,
      notes: '',
    }
  })
})()

/* ----------------------------- followups (servicing) ----------------------------- */
const FOLLOWUP_REASONS = ['Periodic service due', 'Insurance renewal', 'Warranty check-up', '6-month service reminder', 'Tyre / brake inspection due']
export const followups = (() => {
  const r = rng(hash('followups'))
  return Array.from({ length: 11 }, (_, i) => {
    const v = inventory[(i * 5 + 2) % inventory.length]
    const branch = pick(r, BRANCHES)
    const due = intBetween(r, -12, 14) // some overdue, some upcoming
    return {
      id: `FU-${700 + i}`,
      customer: name(rng(hash('fucust' + i))),
      phone: fakePhone(i + 11),
      vehicle: `${v.year} ${v.make} ${v.model}`,
      vin: v.vin,
      branchId: branch.id,
      dealershipId: branch.dealershipId,
      make: v.make, model: v.model, year: v.year,
      dueOn: iso(addDays(TODAY, due)),
      reason: pick(r, FOLLOWUP_REASONS),
      status: 'pending', // pending | done
      disposition: null,  // set when actioned: one of FOLLOWUP_DISPOSITIONS
      dispositionOn: null,
      note: '',
    }
  }).sort((a, b) => a.dueOn.localeCompare(b.dueOn))
})()

/* ----------------------------- query helpers ----------------------------- */
export const inRange = (dateStr, from, to) => {
  const d = dateStr // 'YYYY-MM-DD'
  return d >= from && d <= to
}
// sales for a date window (+ optional branch)
export function salesInRange(list, from, to, branchId) {
  return list.filter((s) => inRange(s.soldOn, from, to) && (!branchId || s.branchId === branchId))
}
// month buckets between two dates (for charts)
export function monthBuckets(from, to) {
  const [fy, fm] = String(from).split('-').map(Number)
  const [ty, tm] = String(to).split('-').map(Number)
  const out = []
  let y = fy, m = fm
  while (y < ty || (y === ty && m <= tm)) {
    out.push({ key: `${y}-${pad2(m)}`, label: monthLabel(y, m), y, m })
    m++; if (m > 12) { m = 1; y++ }
  }
  return out
}

/* ----------------------------- accounts & RBAC ----------------------------- */
// Roles (the screenshot's dealership roles). Each login carries exactly one role.
export const ROLES = ['Admin', 'Sales', 'Finance', 'HR', 'Service', 'Parts', 'Marketing', 'Customer Care', 'Cashier', 'Logistic', 'Account']

// Demo accounts: one per (dealership x role) for the first 5 roles. Email is scoped to
// the dealership, so an account only authenticates against ITS OWN dealership.
const ACCOUNT_ROLES = ['Admin', 'Sales', 'Finance', 'HR', 'Service', 'Parts']
export const USERS = DEALERSHIPS.flatMap((d) =>
  ACCOUNT_ROLES.map((role) => ({
    dealershipId: d.id,
    email: `${role.toLowerCase().replace(/\s+/g, '')}@${d.id}.example.com`,
    name: `${d.name.split(' ')[0]} ${role}`,
    role,
  })),
)
export const usersForDealership = (id) => USERS.filter((u) => u.dealershipId === id)
// A user only resolves within the dealership they belong to -> can't sign into another tenant.
export const findUser = (dealershipId, email) =>
  USERS.find((u) => u.dealershipId === dealershipId && u.email.toLowerCase() === String(email).toLowerCase().trim())

// Which dashboard sections each role may open. (Front-end gating only; the server must
// enforce the same matrix - see docs/TODO.md.)
// Note: '/settings' is appended to every role below; '/add-item' is Admin-only.
export const PERMISSIONS = {
  Admin: ['/', '/inventory', '/service', '/sales', '/parts', '/billing', '/add-item', '/approvals', '/settings'],
  Sales: ['/', '/inventory', '/sales', '/parts', '/settings'],   // parts: SALES view only (no stock mgmt)
  Finance: ['/', '/inventory', '/sales', '/billing', '/settings'],     // billing: see servicing done + print bills
  Account: ['/', '/inventory', '/sales', '/billing', '/settings'],
  Cashier: ['/', '/sales', '/billing', '/settings'],
  Service: ['/service', '/parts', '/billing', '/settings'], // no overview (their Service section covers it); no vehicle inventory; can VIEW parts; print parts+service bills
  Parts: ['/parts', '/service', '/billing', '/settings'],   // no overview; no vehicle inventory; owns parts; READ-ONLY service
  'Customer Care': ['/', '/service', '/settings'],
  Marketing: ['/', '/sales', '/settings'],
  Logistic: ['/', '/inventory', '/settings'],
  HR: ['/', '/settings'],
}
// Route access (prefix-aware so sub-routes like /service/SVC-1 and /billing/parts/PO-1 inherit).
export const can = (role, path) => {
  const allow = PERMISSIONS[role] || ['/']
  if (path === '/') return allow.includes('/')
  return allow.some((p) => p !== '/' && (path === p || path.startsWith(p + '/')))
}
// The home route for a role: '/' (Overview) when allowed, else their first section
// (e.g. Parts -> /parts, Service -> /service). Used to redirect the logo / '/' landing.
export const landingFor = (role) => {
  const allow = PERMISSIONS[role] || ['/']
  return allow.includes('/') ? '/' : (allow.find((p) => p !== '/settings') || '/settings')
}

// Finer-grained capabilities (two roles can reach the same section with different rights).
// Parts reaches /service but is READ-ONLY there (cannot edit servicing detail); Service &
// Parts can both add/attach parts; several roles can print billing. (Front-end gating only.)
export const CAPS = {
  editServiceDetails: ['Admin', 'Service'],            // Parts CANNOT add servicing details
  managePartsStock: ['Admin', 'Parts'],                // receive / edit / restock parts inventory
  sellParts: ['Admin', 'Parts', 'Service'],   // create a parts sale, checkout cart, mark paid (Sales can VIEW parts, not sell)
  attachPartsToJob: ['Admin', 'Parts', 'Service'],     // add parts to a live service job
  printBilling: ['Admin', 'Finance', 'Account', 'Cashier', 'Service', 'Parts'],
}
export const cap = (role, ability) => (CAPS[ability] || []).includes(role)
