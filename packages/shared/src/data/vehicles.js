// Vehicle dataset = REAL data (specs, recalls, safety, photos from open/government
// sources) + a DETERMINISTIC simulated history layer (ownership, accidents, service,
// title, odometer, liens…) because per-VIN history is not open data.
//
//   real specs/recalls/safety -> packages/shared/src/data/real-vehicles.json
//     EPA fueleconomy.gov · NHTSA Recalls · NHTSA Safety Ratings (NCAP)
//   photos -> Wikimedia Commons (openly licensed; attribution kept per record)
//
// The history layer is seeded per-vehicle so values are stable across reloads.
import real from './real-vehicles.json'
import { hash, rng, pick, between, intBetween, roundTo } from '../lib/random.js'
import { slugify } from '../lib/format.js'

const CURRENT_YEAR = 2026

/* ----------------------------- lookup tables ----------------------------- */
const COLORS = [
  { name: 'Magnetic Gray', hex: '#5d6066' },
  { name: 'Super White', hex: '#eef0f2' },
  { name: 'Midnight Black', hex: '#1b1d22' },
  { name: 'Silver Metallic', hex: '#c7ccd1' },
  { name: 'Barcelona Red', hex: '#b4262a' },
  { name: 'Blueprint Blue', hex: '#2b5fb0' },
  { name: 'Army Green', hex: '#5b5f49' },
  { name: 'Pearl White', hex: '#f2f3f5' },
  { name: 'Ruby Flare', hex: '#8c1d1f' },
  { name: 'Cavalry Blue', hex: '#3b6ea5' },
  { name: 'Lunar Rock', hex: '#9aa0a0' },
  { name: 'Graphite', hex: '#3a3f47' },
]
const INTERIORS = ['Black', 'Gray', 'Beige', 'Tan', 'Charcoal']
// Dealers across Nepal (city + province). Phone/email are deliberately FAKE
// placeholders (980-000-00NN numbers + reserved example.com domain) - not real.
const DEALERS = [
  { name: 'Himalayan Motors', city: 'Kathmandu', province: 'Bagmati', phone: '+977 980-000-0001', rating: 4.7, reviews: 1840 },
  { name: 'Everest Auto House', city: 'Lalitpur', province: 'Bagmati', phone: '+977 980-000-0002', rating: 4.4, reviews: 612 },
  { name: 'Annapurna Automobiles', city: 'Pokhara', province: 'Gandaki', phone: '+977 980-000-0003', rating: 4.6, reviews: 980 },
  { name: 'Lumbini Auto Gallery', city: 'Butwal', province: 'Lumbini', phone: '+977 980-000-0004', rating: 4.8, reviews: 430 },
  { name: 'Koshi Motors', city: 'Biratnagar', province: 'Koshi', phone: '+977 980-000-0005', rating: 4.2, reviews: 305 },
  { name: 'Kathmandu Car Bazaar', city: 'Kathmandu', province: 'Bagmati', phone: '+977 980-000-0006', rating: 4.5, reviews: 720 },
  { name: 'Gandaki Wheels', city: 'Pokhara', province: 'Gandaki', phone: '+977 980-000-0007', rating: 3.9, reviews: 540 },
  { name: 'Pashupati Auto', city: 'Bhaktapur', province: 'Bagmati', phone: '+977 980-000-0008', rating: 4.6, reviews: 870 },
  { name: 'Capital Motors', city: 'Lalitpur', province: 'Bagmati', phone: '+977 980-000-0009', rating: 4.7, reviews: 1320 },
  { name: 'Madhesh Auto Hub', city: 'Birgunj', province: 'Madhesh', phone: '+977 980-000-0010', rating: 4.3, reviews: 410 },
  { name: 'Sagarmatha Cars', city: 'Dharan', province: 'Koshi', phone: '+977 980-000-0011', rating: 3.7, reviews: 220 },
  { name: 'Trishuli Motors', city: 'Hetauda', province: 'Bagmati', phone: '+977 980-000-0012', rating: 4.8, reviews: 1610 },
]
const NPR_PER_USD = 133 // straight FX conversion for the demo (no Nepal import-tax markup)
// approximate new-vehicle MSRP by model (USD) for depreciation math
const MSRP = {
  RAV4: 29000, Civic: 24000, 'F-150': 47000, 'Model 3': 45000, Wrangler: 39000,
  'Silverado 1500': 46000, Outback: 31000, 'CR-V': 30000, Camry: 28000, Mustang: 36000,
}
const FEATURES_BASE = ['Bluetooth', 'Backup Camera', 'Keyless Entry', 'Cruise Control']
const FEATURES_BY_BODY = {
  SUV: ['Roof Rails', 'Power Liftgate', 'All-Weather Mats', 'Blind Spot Monitor', 'Heated Seats'],
  Truck: ['Tow Package', 'Bed Liner', 'Trailer Brake Controller', '360 Camera', 'Running Boards'],
  Sedan: ['Sunroof', 'Lane Keep Assist', 'Adaptive Cruise', 'Heated Seats', 'Wireless Charging'],
  Coupe: ['Sport Exhaust', 'Performance Tires', 'Leather Seats', 'Launch Control', 'Premium Audio'],
}
const FEATURES_BY_FUEL = {
  Electric: ['Fast Charging', 'One-Pedal Driving', 'Glass Roof', 'Over-the-air Updates', 'Heat Pump'],
}
const VIN_WMI = { Toyota: '4T1', Honda: '2HG', Ford: '1FT', Tesla: '5YJ', Jeep: '1C4', Chevrolet: '1GC', Subaru: '4S4' }

/* ----------------------------- derivations ----------------------------- */
function bodyStyleOf(model, vClass = '') {
  if (model === 'Mustang') return 'Coupe'
  const c = vClass.toLowerCase()
  if (c.includes('sport utility')) return 'SUV'
  if (c.includes('pickup') || c.includes('truck')) return 'Truck'
  if (c.includes('van') || c.includes('minivan')) return 'Minivan'
  if (c.includes('station wagon') || c.includes('wagon')) return 'Wagon'
  if (c.includes('two seater')) return 'Coupe'
  return 'Sedan'
}
const DRIVE_SHORT = (d = '') => {
  const x = d.toLowerCase()
  if (x.includes('all-wheel')) return 'AWD'
  if (x.includes('front-wheel')) return 'FWD'
  if (x.includes('rear-wheel')) return 'RWD'
  if (x.includes('4') || x.includes('four')) return '4WD'
  return 'AWD'
}
const fuelLabel = (f = '') => {
  const x = f.toLowerCase()
  if (x.includes('electric')) return 'EV'
  if (x.includes('diesel')) return 'Diesel'
  if (x.includes('hybrid')) return 'Hybrid'
  return 'Petrol'
}
function cleanTrans(t = '', isEv) {
  if (isEv) return 'Single-Speed Automatic'
  const m = t.match(/S(\d+)|(\d+)-spd|AM-S(\d+)/i)
  const speeds = m && (m[1] || m[2] || m[3])
  if (/manual/i.test(t)) return `${speeds || 6}-Speed Manual`
  if (/variable|cvt/i.test(t)) return 'CVT Automatic'
  if (speeds) return `${speeds}-Speed Automatic`
  return 'Automatic'
}
function makeVin(make, model, year, r) {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'
  const wmi = VIN_WMI[make] || '1XX'
  let mid = ''
  for (let i = 0; i < 5; i++) mid += chars[Math.floor(r() * chars.length)]
  const yc = 'ABCDEFGHJKLMNPRSTVWXY12345678'[(year - 2010) % 29]
  let tail = ''
  for (let i = 0; i < 8; i++) tail += chars[Math.floor(r() * chars.length)]
  return `${wmi}${mid}${yc}${tail}` // 3 + 5 + 1 + 8 = 17 chars
}
function genOdometer(year, mileage) {
  const span = Math.max(1, CURRENT_YEAR - year)
  const pts = []
  for (let i = 0; i <= span; i++) {
    const t = i / span
    pts.push({ year: year + i, mileage: Math.round(mileage * (1 - Math.pow(1 - t, 1.25))) })
  }
  pts[pts.length - 1].mileage = mileage
  return pts
}
// The 7 provinces of Nepal.
const PROVINCES = ['Bagmati', 'Gandaki', 'Lumbini', 'Koshi', 'Madhesh', 'Karnali', 'Sudurpashchim']
const EMISSION_STATIONS = ['Balaju Eco Centre', 'Ekantakuna Test Station', 'Pokhara Vehicle Testing', 'Itahari Emission Centre']
const LENDERS = ['Nabil Bank Auto Loan', 'NIC Asia Auto Loan', 'Global IME Auto Finance', 'Sanima Bank Vehicle Loan', 'Local Co-operative']
// Authorized Nepal distributors (handle recall repairs locally) - the Nepal
// equivalent of the US "contact your dealer / NHTSA campaign" remedy.
const DISTRIBUTORS = { Toyota: 'Sipradi Trading', Honda: 'Syakar Trading', Ford: 'Go Automobiles' }
const distributorFor = (make) => DISTRIBUTORS[make] || 'an authorized service centre in Nepal'
const ADVISORS = ['Ramesh K.', 'Sita Sharma', 'Bikash Thapa', 'Anil Gurung', 'Pooja Rai', 'Dipesh Magar']
const pad = (n) => String(n).padStart(2, '0')
const dateStr = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`

/* ----------------------------- main builder ----------------------------- */
function build(rec, index) {
  const r = rng(hash(`${rec.make}-${rec.model}-${rec.year}-${rec.trim}`))
  const s = rec.specs || {}
  const id = slugify(`${rec.year}-${rec.make}-${rec.model}-${rec.trim}`)
  const age = CURRENT_YEAR - rec.year
  const bodyStyle = bodyStyleOf(rec.model, s.vClass)
  const isEv = fuelLabel(s.fuelType) === 'EV'
  const drivetrain = DRIVE_SHORT(s.drive)

  // colors / cabin / dealer
  const color = pick(r, COLORS)
  const interiorColor = pick(r, INTERIORS)
  const dealer = DEALERS[index % DEALERS.length]
  const seats = bodyStyle === 'Coupe' ? 4 : bodyStyle === 'Truck' ? (r() > 0.4 ? 5 : 6) : 5

  // mileage + pricing
  const annual = intBetween(r, 8500, 15000)
  const mileage = Math.min(roundTo(age * annual + intBetween(r, -3000, 4000), 10), 165000)
  const base = MSRP[rec.model] ?? 30000
  const evBonus = isEv ? 1.06 : 1
  const dep = Math.pow(0.86, age) * evBonus
  const kmPenalty = Math.max(0.78, 1 - Math.max(0, mileage - age * 14000) / 300000)
  const marketValueUsd = Math.max(7000, base * dep * kmPenalty)
  // spread vs market value drives the deal rating (great ≤ -8%, good ≤ -2%, …)
  const priceUsd = marketValueUsd * between(r, 0.88, 1.08)
  // stored in Nepali Rupees (straight FX conversion), rounded to the nearest 10,000
  const marketValue = roundTo(marketValueUsd * NPR_PER_USD, 10000)
  const price = roundTo(priceUsd * NPR_PER_USD, 10000)

  // ownership
  const ownerCount = age <= 2 ? 1 : age <= 5 ? intBetween(r, 1, 2) : intBetween(r, 2, 3)
  let cursorY = rec.year - (r() > 0.5 ? 1 : 0)
  let cursorM = intBetween(r, 1, 11)
  const homeProvince = PROVINCES[index % PROVINCES.length]
  const ownership = []
  for (let i = 0; i < ownerCount; i++) {
    const last = i === ownerCount - 1
    const yrs = last ? Math.max(1, CURRENT_YEAR - cursorY) : intBetween(r, 1, Math.max(2, Math.floor((age + 1) / ownerCount)))
    const estYr = intBetween(r, 8000, 15000)
    const type = i === 0 && r() > 0.7 ? 'Lease (Personal)' : i === 0 && r() > 0.85 ? 'Commercial fleet' : 'Personal'
    ownership.push({
      idx: i + 1,
      type,
      province: homeProvince,
      purchased: dateStr(cursorY, cursorM, intBetween(r, 1, 27)),
      durationYears: yrs,
      est: `${estYr.toLocaleString()} km/yr`,
      lastOdometer: 0,
    })
    cursorY += yrs
    cursorM = intBetween(r, 1, 11)
  }
  // distribute odometer endpoints across owners
  ownership.forEach((o, i) => {
    o.lastOdometer = roundTo((mileage * (i + 1)) / ownerCount, 10)
  })

  // title brand: one rebuilt (oldest Mustang), rest clean
  const isRebuilt = id === '2018-ford-mustang-ecoboost'
  const titleBrand = isRebuilt ? 'Rebuilt' : 'Clean'

  // accidents - damage severity uses the standard descriptors: Minor / Moderate /
  // Severe Damage and Totaled (total loss). Each record carries the granular detail.
  const accidentRecords = []
  const IMPACT_AREAS = ['Front', 'Rear', 'Left side', 'Right side', 'Front and left', 'Rear and right']
  const SOURCES = ['Police report', 'Insurance record', 'Repair facility', 'Damage report']
  const DAMAGE_EST = {
    'Minor Damage': [40000, 160000],
    'Moderate Damage': [160000, 420000],
    'Severe Damage': [420000, 950000],
    Totaled: [1100000, 3200000],
  }
  function buildAccident(severity, when) {
    const major = severity === 'Severe Damage' || severity === 'Totaled'
    const area = severity === 'Totaled' ? 'Front' : pick(r, IMPACT_AREAS)
    const [lo, hi] = DAMAGE_EST[severity]
    return {
      date: when,
      eventType: 'Accident reported',
      severity,
      pointOfImpact: area,
      damageLocation: area,
      airbagDeployed: major ? 'Deployed' : 'Not deployed',
      structuralDamage: major ? 'Structural damage reported' : 'No structural damage reported',
      driveable: severity === 'Totaled' ? 'Not driveable - towed' : major ? 'Towed from scene' : 'Vehicle reported driveable',
      source: severity === 'Totaled' ? 'Insurance record' : pick(r, SOURCES),
      estimatedDamage: roundTo(between(r, lo, hi), 10000),
      location: `${dealer.city}, ${dealer.province}`,
      desc:
        severity === 'Totaled'
          ? 'Front collision reported. Vehicle declared a total loss (written off), later rebuilt and re-registered after passing inspection.'
          : `${severity} to the ${area.toLowerCase()} reported. ${major ? 'Body panel and structural repair performed.' : 'Cosmetic repair performed.'}`,
    }
  }
  if (isRebuilt) {
    accidentRecords.push(buildAccident('Totaled', dateStr(rec.year + 2, intBetween(r, 1, 12), intBetween(r, 1, 27))))
  } else {
    const n = r() < 0.1 ? 2 : r() < 0.42 ? 1 : 0
    for (let i = 0; i < n; i++) {
      const severity = pick(r, ['Minor Damage', 'Minor Damage', 'Minor Damage', 'Moderate Damage', 'Severe Damage'])
      accidentRecords.push(buildAccident(severity, dateStr(rec.year + intBetween(r, 1, Math.max(1, age - 1)), intBetween(r, 1, 12), intBetween(r, 1, 27))))
    }
  }

  // service records across the timeline
  const svcCount = Math.min(8, Math.max(3, ownerCount * 2 + intBetween(r, 0, 2)))
  const serviceRecords = []
  const SVC = [
    ['Oil & filter change', 'Tyre rotation'],
    ['Brake pads', 'Brake fluid flush'],
    ['Scheduled maintenance', 'Multi-point inspection'],
    ['4 tyres replaced', 'Wheel alignment'],
    ['Battery replaced', 'Cabin air filter'],
    ['Transmission service', 'Coolant flush'],
  ]
  for (let i = 0; i < svcCount; i++) {
    const frac = (i + 1) / (svcCount + 1)
    const y = rec.year + Math.floor(frac * age)
    const odo = roundTo(mileage * frac, 10)
    const items = isEv && i % 2 === 0 ? ['Tyre rotation', 'Software update', 'Brake service'] : pick(r, SVC)
    const type = pick(r, ['Maintenance', 'Repair', 'Inspection'])
    const facility = pick(r, [dealer.name, 'Authorized Service Centre', 'CG Motors Workshop', 'Local Garage'])
    const labourCost = roundTo(intBetween(r, 1500, 9000), 100)
    const partsCost = type === 'Inspection' ? 0 : roundTo(items.length * intBetween(r, 900, 6500), 100)
    serviceRecords.push({
      date: dateStr(y, intBetween(r, 1, 12), intBetween(r, 1, 27)),
      mileage: odo,
      odometer: odo,
      provider: facility,
      location: `${facility}, ${dealer.city}`,
      type,
      source: pick(r, ['Service facility reported', 'Dealer reported', 'Independent garage reported']),
      invoiceNo: `RO-${y}-${intBetween(r, 1000, 9999)}`,
      advisor: pick(r, ADVISORS),
      items,
      labourCost,
      partsCost,
      totalCost: labourCost + partsCost,
      nextServiceDueKm: odo + 5000,
    })
  }
  serviceRecords.sort((a, b) => a.date.localeCompare(b.date))

  // title / registration events
  const titleRecords = [{ date: ownership[0].purchased, province: homeProvince, event: 'Registered - new vehicle' }]
  if (isRebuilt) {
    const acc = accidentRecords[0]
    titleRecords.push({ date: acc.date, province: homeProvince, event: 'Written off - total loss recorded' })
    titleRecords.push({ date: dateStr(rec.year + 2, 10, 5), province: homeProvince, event: 'Rebuilt - re-registered after inspection' })
  }
  ownership.slice(1).forEach((o) => titleRecords.push({ date: o.purchased, province: o.province, event: 'Ownership transferred - sold' }))
  titleRecords.push({ date: dateStr(CURRENT_YEAR, intBetween(r, 1, 6), intBetween(r, 1, 27)), province: homeProvince, event: 'Registration (bluebook) renewed' })
  titleRecords.sort((a, b) => a.date.localeCompare(b.date))

  // recalls (REAL, NHTSA) -> globally-relevant defect info only (US admin fields dropped)
  const recalls = (rec.recalls || []).map((rc) => {
    const yr = Number((rc.reportDate || '').split('/').pop()) || rec.year
    const status = CURRENT_YEAR - yr >= 2 ? 'Remedy available' : 'Open - action recommended'
    return {
      component: rc.component ? rc.component.replace(/:/g, ' · ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : 'Component',
      date: rc.reportDate,
      desc: rc.summary,
      consequence: rc.consequence || null,
      // Nepal-localized remedy: who to contact locally for the free fix.
      authorizedDealer: distributorFor(rec.make),
      remedy: `Contact ${distributorFor(rec.make)} (authorized ${rec.make} service in Nepal) to book the free recall repair.`,
      status,
    }
  })
  const openRecall = recalls.some((rc) => rc.status !== 'Remedy available')

  // extra history sections
  const use = ownership.some((o) => o.type.includes('Commercial')) ? 'Commercial'
    : ownership.some((o) => o.type.includes('Lease')) ? 'Lease' : 'Personal'
  const lien = r() > 0.6
    ? { hasLien: true, lender: pick(r, LENDERS), opened: ownership.at(-1).purchased, status: 'Active - to be cleared at sale' }
    : { hasLien: false, status: 'No active loan or hypothecation reported' }
  // Nepal requires periodic vehicle emission testing (the "green sticker").
  const emissions = {
    required: true,
    lastTest: dateStr(CURRENT_YEAR - 1, intBetween(r, 1, 12), intBetween(r, 1, 27)),
    result: 'Pass - green sticker issued',
    station: pick(r, EMISSION_STATIONS),
    province: homeProvince,
  }
  const warranty = {
    basic: '3 yr / 100,000 km',
    powertrain: isEv ? '8 yr / 160,000 km (battery)' : '5 yr / 100,000 km',
    basicRemaining: age < 3 && mileage < 100000,
    powertrainRemaining: isEv ? age < 8 : age < 5 && mileage < 100000,
  }

  // photo (REAL, openly licensed)
  const photo = rec.image
    ? {
        thumbUrl: rec.image.thumbUrl,
        fullUrl: rec.image.fullUrl,
        sourceUrl: rec.image.descriptionUrl,
        license: rec.image.license,
        licenseUrl: rec.image.licenseUrl,
        author: rec.image.author,
      }
    : null

  const lastReported = titleRecords.at(-1)?.date
  const transmissionDisplay = cleanTrans(s.transmission, isEv)
  const transmissionType = isEv
    ? 'Single-Speed'
    : /Manual/.test(transmissionDisplay) ? 'Manual'
    : /CVT/.test(transmissionDisplay) ? 'CVT'
    : 'Automatic'

  const vehicle = {
    id,
    vin: makeVin(rec.make, rec.model, rec.year, r),
    year: rec.year,
    make: rec.make,
    model: rec.model,
    trim: rec.trim,
    bodyStyle,
    // pricing (Nepali Rupees)
    price,
    marketValue,
    currency: 'NPR',
    mileage, // kilometres
    // appearance
    exteriorColor: color.name,
    colorHex: color.hex,
    interiorColor,
    // powertrain (REAL specs from EPA, localized units)
    engine: isEv ? (drivetrain === 'AWD' ? 'Dual Motor Electric' : 'Single Motor Electric') : (s.engine || '-'),
    displacement: s.displacement,
    cylinders: s.cylinders,
    transmission: transmissionDisplay,
    transmissionType,
    drivetrain,
    fuelType: fuelLabel(s.fuelType),
    kmplCity: isEv ? null : (s.mpgCity ? Math.round(s.mpgCity * 0.425144 * 10) / 10 : null),
    kmplHwy: isEv ? null : (s.mpgHwy ? Math.round(s.mpgHwy * 0.425144 * 10) / 10 : null),
    co2gkm: s.co2 ? Math.round(s.co2 / 1.609) : null, // g/mi -> g/km
    isEv,
    epaClass: s.vClass,
    seats,
    // commerce
    location: { city: dealer.city, province: dealer.province },
    dealer: { ...dealer, email: `sales@${dealer.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example.com` },
    features: [...new Set([
      ...FEATURES_BASE,
      ...((FEATURES_BY_BODY[bodyStyle] || FEATURES_BY_BODY.Sedan)),
      ...(isEv ? FEATURES_BY_FUEL.Electric : []),
    ])].slice(0, 9),
    // summary (free)
    use,
    titleBrand,
    lastReported,
    openRecall,
    // REAL safety (NCAP)
    safety: rec.safety && rec.safety.overall != null ? rec.safety : (rec.safety || {}),
    // detailed history (paywalled)
    history: {
      ownership,
      accidentRecords,
      serviceRecords,
      titleRecords,
      odometer: genOdometer(rec.year, mileage),
      recalls,
      lien,
      emissions,
      warranty,
      theftCheck: 'No theft or write-off record found with Nepal Police or the Department of Transport Management (DoTM)',
    },
    photo,
  }

  // derived FREE summary + badges (source of truth = detailed records)
  vehicle.owners = ownership.length
  vehicle.accidents = accidentRecords.length
  vehicle.serviceCount = serviceRecords.length
  vehicle.recallCount = recalls.length
  vehicle.badges = {
    oneOwner: ownership.length === 1,
    noAccidents: accidentRecords.length === 0,
    personalUse: use === 'Personal',
    serviceRecords: serviceRecords.length > 0,
    cleanTitle: titleBrand === 'Clean',
  }
  return vehicle
}

export const vehicles = real.map(build)

export const getVehicleById = (id) => vehicles.find((v) => v.id === id)
export const getVehicleByVin = (vin) =>
  vehicles.find((v) => v.vin.toLowerCase() === String(vin).toLowerCase().trim())

const uniq = (sel) => [...new Set(vehicles.map(sel))].filter((x) => x != null)

export const facets = {
  makes: uniq((v) => v.make).sort(),
  models: uniq((v) => v.model).sort(),
  bodyStyles: uniq((v) => v.bodyStyle).sort(),
  fuelTypes: uniq((v) => v.fuelType).sort(),
  drivetrains: uniq((v) => v.drivetrain).sort(),
  transmissions: uniq((v) => v.transmissionType).sort(),
  colors: uniq((v) => v.exteriorColor).sort(),
  provinces: uniq((v) => v.location.province).sort(),
  seatOptions: uniq((v) => v.seats).sort((a, b) => a - b),
  yearRange: [
    Math.min(...vehicles.map((v) => v.year)),
    Math.max(...vehicles.map((v) => v.year)),
  ],
  priceRange: [
    Math.min(...vehicles.map((v) => v.price)),
    Math.max(...vehicles.map((v) => v.price)),
  ],
  odometerMax: Math.max(...vehicles.map((v) => v.mileage)),
}

// Models grouped by make, for dependent make->model selects.
export const modelsByMake = vehicles.reduce((acc, v) => {
  ;(acc[v.make] ||= new Set()).add(v.model)
  return acc
}, {})
Object.keys(modelsByMake).forEach((k) => (modelsByMake[k] = [...modelsByMake[k]].sort()))

// ----- Vehicle spec catalog (powers the "Sell your vehicle" auto-fill) -----
// In production this would be a catalog/VIN-decode service in the dashboard backend.
// Here it is mocked from our 20 vehicles: enter make/model/year (or a known VIN) and
// the powertrain specs auto-fill.
export const catalog = vehicles.map((v) => ({
  make: v.make, model: v.model, year: v.year, trim: v.trim, bodyStyle: v.bodyStyle,
  engine: v.engine, transmission: v.transmission, transmissionType: v.transmissionType,
  drivetrain: v.drivetrain, fuelType: v.fuelType, kmplCity: v.kmplCity, kmplHwy: v.kmplHwy,
  co2gkm: v.co2gkm, seats: v.seats, isEv: v.isEv,
}))

export const catalogYears = (make, model) =>
  [...new Set(catalog.filter((c) => c.make === make && c.model === model).map((c) => c.year))].sort((a, b) => b - a)

// Best spec match for a make/model(/year). Returns null when the model is not in our catalog.
export function lookupSpecs(make, model, year) {
  const matches = catalog.filter((c) => c.make === make && c.model === model)
  if (!matches.length) return null
  return matches.find((c) => c.year === Number(year)) || matches[0]
}
