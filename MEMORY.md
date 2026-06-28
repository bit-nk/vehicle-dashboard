# MEMORY - Vehicle Records knowledge base

> Vector-DB-styled knowledge base. Each `### [CHUNK:id]` block is a **self-contained, retrievable
> unit** with a title, `Tags:` line (keywords for semantic lookup), and body - so a relevant
> chunk can be pulled on its own instead of re-reading the whole repo.
> Update the relevant chunk when something changes; keep chunks atomic.

---

### [CHUNK:overview] Project overview & goal
Tags: project, vehicle records, carfax, vinsight, scope, two-app, purpose
Two-part product. **Part 1 (built):** a public, anyone-can-access vehicle-history + used-car
listings site modeled on carfax.com's *information architecture* (free snapshot, full report behind
a paywall, filtered listings, photos) but with an original, smoother UI. Brand name **"VINsight"**.
**Part 2 (planned, not built):** a backend dashboard with **customer logins** (own profile + their
car history) and **company logins** (import → sell → service → customer follow-ups → sales history).
Localized for **Nepal** (NPR currency, provinces, km).

### [CHUNK:boundary] Scraping / security boundary (IMPORTANT, hold this line)
Tags: carfax, scraping, refusal, terms-of-service, security, ethics, boundary
The user asked to "scrape Carfax end-to-end including their security." This was **declined**:
scraping a paid login/paywalled commercial service violates its ToS, copying its DB isn't lawful/
possible, and probing/replicating a third party's security controls is unauthorized. Instead we use
**open/government data** (NHTSA, EPA) + **openly-licensed photos** (Wikimedia Commons), and apply
standard security to **our own** app. If revisited, keep refusing the Carfax-scraping part; offer the
open-data alternative.

### [CHUNK:stack] Tech stack
Tags: stack, vite, react, tailwind, router, recharts, lucide, versions
Vite 6 + React 19 + React Router 7 (BrowserRouter, lazy routes) + Tailwind CSS 4 (`@tailwindcss/vite`)
+ lucide-react (icons) + Recharts (charts, **lazy-loaded** into its own chunk). npm **workspaces**
monorepo. No backend yet (public site is static). Chosen for low-end mobile: small initial JS
(~75 kB gzip), route code-splitting, inline SVG visuals (zero image deps for fallback).

### [CHUNK:layout] Monorepo layout & file map
Tags: monorepo, workspaces, folders, file map, structure, shared, alias
```
vehicle-records/
├─ package.json            # workspaces: apps/*, packages/*  (dev/build scripts target @vinsight/web)
├─ MEMORY.md               # this file
├─ README.md  SECURITY.md
├─ docs/database/          # schema.sql (real DB DDL) + README data dictionary
├─ packages/shared/        # @vinsight/shared, imported via '@shared/*' (Vite source alias)
│  └─ src/
│     ├─ data/             # vehicles.js (builder), real-vehicles.json (raw scrape)
│     ├─ lib/              # format.js (NPR/km/km-l), validate.js (VIN/plate)
│     └─ ui/               # CarImage, VehiclePhoto, Badge, StarRating, HistoryBadges, Logo
└─ apps/web/               # @vinsight/web (public site)
   ├─ vite.config.js       # @shared + @ aliases; build-only CSP meta; recharts manualChunk
   ├─ public/_headers      # prod security headers (Netlify/CF Pages)
   └─ src/
      ├─ components/        # Navbar, Footer, Layout, SearchBar, VehicleCard, Paywall, PricingModal, MileageChart, ScrollToTop, RouteFallback
      ├─ pages/             # Home, Listings, VehicleDetail, Report, ReportDetail, NotFound
      ├─ lib/useUnlock.js   # sessionStorage paywall unlock hook
      └─ main.jsx           # router
```
`apps/dashboard` will be a sibling under `apps/`, reusing `@vinsight/shared`.

### [CHUNK:data-sources] Real data sources (open / government / licensed)
Tags: data, NHTSA, EPA, wikimedia, sources, real data, attribution, APIs
- **EPA fueleconomy.gov** → engine, transmission, drivetrain, MPG (converted to km/l), CO₂.
- **NHTSA Recalls API** (`api.nhtsa.gov/recalls/recallsByVehicle`) → real recall campaigns.
- **NHTSA Safety Ratings** (`api.nhtsa.gov/SafetyRatings`) → NCAP crash-test stars.
- **Wikimedia Commons** (`commons.wikimedia.org/w/api.php`) → photos, openly licensed (CC0 / CC BY-SA / PD), attribution (author + license + source URL) kept per photo.
All 20 vehicles' recalls + safety were **independently re-verified** against the live NHTSA APIs (workflow) - all matched.

### [CHUNK:data-pipeline] How the dataset is built / regenerated
Tags: scraper, regenerate, pipeline, real-vehicles.json, builder, how-to
1. `/private/tmp/.../scratchpad/scrape.py` fetches the 4 sources for 20 vehicles (10 models × 2)
   and writes `packages/shared/src/data/real-vehicles.json` (raw US-unit provenance: mpg, US recall text).
   - EPA model names differ from common names (e.g. `F-150`→`F150 Pickup 4WD`, `Silverado 1500`→`Silverado 4WD`, `Model 3`→`Model 3 Long Range AWD`); the scraper has a normalized matcher + drive-hint.
   - Commons rate-limits aggressive clients (429) → images fetched serially with backoff; a strict filename filter avoids wrong-model photos (e.g. Model 3 vs Model Y).
2. `vehicles.js` imports that JSON and `build()`s each record: merges real specs/recalls/safety/photo
   with a **deterministic** (seeded per-VIN) simulated history layer, and **localizes** (NPR, km, km/l, g/km, Nepal provinces/dealers). Re-running the app re-derives the same values (stable).

### [CHUNK:vehicles] The 20 vehicles (2 per model)
Tags: vehicles, models, count, dataset, list
10 models × 2 variants = **20**: Toyota RAV4, Honda Civic, Ford F-150, Tesla Model 3, Jeep Wrangler,
Chevrolet Silverado 1500, Subaru Outback, Honda CR-V, Toyota Camry, Ford Mustang. Mix of SUV / Sedan /
Truck / Coupe and Gasoline / Electric. One unit (`2018-ford-mustang-ecoboost`) is deterministically a
**Rebuilt**-title car with a severe accident, to exercise that UI branch.

### [CHUNK:localization] Nepal + NPR localization
Tags: nepal, npr, currency, rupees, km, units, provinces, localization, dealers
- **Currency:** Nepali Rupees. `formatCurrency` → `Rs. 1,690,000` (en-US thousands grouping, no decimals). FX: `NPR_PER_USD = 133`, straight conversion (no import-tax markup), prices rounded to nearest 10,000.
- **Distance:** km (odometer, service, warranty in km). **Fuel economy:** km/l (mpg×0.425144; EVs show "Electric (EV)"). **CO₂:** g/km (g/mi÷1.609).
- **Geography:** 7 Nepal provinces (Bagmati, Gandaki, Lumbini, Koshi, Madhesh, Karnali, Sudurpashchim); Nepali cities + dealer names; plate-lookup dropdown uses provinces.
- **Emissions:** Nepal "green sticker" test (not US state emissions).
- **Removed US-only:** US states/cities/dealers, `$`, MPG, g/mi, US plate states, US recall admin fields (campaign #, mailing remedy). Safety relabeled "Crash-Test Safety (NCAP)" (kept - globally meaningful).
- Report plan prices (NPR): Single Rs. 1,500 · 3-Pack Rs. 2,500 · Unlimited Rs. 3,900.

### [CHUNK:paywall] Paywall mechanic (free vs locked)
Tags: paywall, report, unlock, pricing, sessionStorage, carfax-pattern
Report page = **free snapshot** (owners, accidents, service count, title, recalls, masked VIN) + a
**full report behind a blur/lock**. Flow: blurred teaser (capped height) → "Unlock" → `PricingModal`
→ confirm → `useUnlock` writes the VIN to `sessionStorage` → full report reveals + VIN unmasks.
This is a **client-side demo**; the real version gates server-side via `report_unlocks` (see schema).

### [CHUNK:schema] Database schema location & shape
Tags: database, schema, sql, postgres, tables, keys, columns, ddl, data-dictionary
Full PostgreSQL DDL: **`docs/database/schema.sql`** (run order, enums, PK/FK/unique/indexes, CHECKs,
Nepal province seed). Data dictionary + app-field→column mapping: **`docs/database/README.md`**.
Groups: reference (provinces, cities, makes, models); identity (companies, users[role enum customer/
company_*], sessions, customer_vehicles); vehicle (vehicles[vin unique], vehicle_photos, vehicle_safety_
ratings, recalls); history (ownership/accident/service/title/odometer/liens/emission_tests/warranties);
commerce (dealers, listings[price_npr], favorites); reports/paywall (report_products, report_orders,
payments[esewa/khalti/imepay/connectips], report_unlocks); dashboard ops (vehicle_acquisitions[import],
sales_transactions, service_jobs, customer_followups); audit_logs. Money = numeric(14,2) NPR; distances km.

### [CHUNK:security] Security model
Tags: security, csp, headers, auth, rbac, validation, dashboard, SECURITY.md
Public site: build-only CSP meta (`vite.config.js`) + `apps/web/public/_headers` (HSTS, X-Frame-Options,
etc.); input validation in `@shared/lib/validate.js` (VIN `[A-HJ-NPR-Z0-9]{17}`, plate/text sanitized);
external links `rel=noopener`. Dashboard (planned, in `SECURITY.md`): HttpOnly+SameSite session cookies,
Argon2id, MFA for company accounts, **server-side tenant scoping** (customer sees only own data),
CSRF, rate-limiting, audit logging, **server-side paywall gating** (never ship locked data to client).

### [CHUNK:components] Reusable UI inventory
Tags: components, ui, shared, CarImage, VehiclePhoto, props
`@shared/ui`: **CarImage** (recolorable SVG car, views side/front/rear/interior, `bodyStyle`+`color` props,
zero network - fallback visual); **VehiclePhoto** (real photo with credit chip + onError→CarImage fallback;
props `vehicle`, `eager`, `showCredit`); **Badge** (tone palette incl. deal tones); **StarRating**;
**HistoryBadges** (1-owner/no-accidents/personal-use/service, `size="sm"|"md"`); **Logo**.
App components in `apps/web/src/components` (Navbar, Footer, SearchBar 3-tab VIN/Plate/Make-Model, VehicleCard, Paywall, PricingModal, MileageChart lazy).

### [CHUNK:pages] Pages & routes
Tags: pages, routes, navigation, home, listings, report
`/` Home (hero search, featured, value props) · `/listings` (URL-synced filters: make→model, body style,
price min/max, year from/to, max odometer, fuel, drivetrain, transmission [transmissionType: Automatic/
Manual/CVT/Single-Speed], seats(min), exterior colour, province, min NCAP safety, deal rating(great/good),
history toggles [no accidents/1-owner/clean title/no recall/personal use]; multi-select pills + removable
chips + 7 sort options. All verified filtering correctly.) · `/vehicle/:id` VehicleDetail (gallery photo+SVG views,
specs, safety, features, snapshot, dealer) · `/report` lookup landing · `/report/:vin` ReportDetail
(snapshot + paywalled full report + lazy MileageChart) · `*` NotFound.

### [CHUNK:howto] Run / build / verify commands
Tags: commands, run, dev, build, preview, how-to
From repo root: `npm install` (workspaces) · `npm run dev` (apps/web on :5173) · `npm run build` ·
`npm run preview`. Dashboard: `npm run dev:dashboard` (:5174).
Build is clean at ~2239 modules; Recharts is a separate lazy chunk.

### [CHUNK:dashboard-next] Dashboard app - next steps
Tags: dashboard, next, todo, customer, company, plan
Create `apps/dashboard` (same Vite+React setup), import `@vinsight/shared` for data/UI. Build customer
portal (login → own vehicles via `customer_vehicles` → their report/service history) and company console
(inventory/import → listings → sales → service jobs → follow-ups → sales history dashboards). Wire a real
backend implementing the `docs/database/schema.sql` model + the auth/RBAC in `SECURITY.md`. Replace the
client-side paywall with server-side `report_unlocks` gating.

### [CHUNK:record-detail] Accident / service / VIN record detail
Tags: accident, damage, totaled, service, detail, fields, severity, schema
Accident records carry full detail (all paywalled): eventType, severity using standard descriptors
**Minor Damage / Moderate Damage / Severe Damage / Totaled** (Totaled = total loss → the rebuilt
`2018-ford-mustang-ecoboost`), pointOfImpact, airbagDeployed, structuralDamage, driveable, source
(Police report / Insurance record / Repair facility), estimatedDamage (NPR), location, desc. Service
records carry date, odometer(km), provider, type (badge), source, items[]. Ownership shows duration +
est km/yr + last-reported odometer. DB columns added to `accident_records` (event_type, structural_damage,
driveable, source, estimated_damage_npr) + `accident_severity` enum updated + `service_records.source`.
Typography: **all em/en dashes replaced with plain hyphen `-`** project-wide (middot `·` kept as separator).
Note: VehiclePhoto credit is a link → on cards use `showCredit={false}` to avoid nested `<a>`.

### [CHUNK:sell-flow] Sell-your-vehicle form
Tags: sell, submit, vin lookup, autofill, catalog, seller, lead
Route `/sell` ([SellVehicle.jsx](apps/web/src/pages/SellVehicle.jsx)), nav "Sell My Car". Flow: VIN
lookup -> if VIN matches a known vehicle (`getVehicleByVin`) it's pulled "from the backend" and the
whole form pre-fills (specs + odometer/owners/accidents/service/title); if not found, the seller
picks make/model/year and the **specs auto-fill from the catalog** (`lookupSpecs`, `catalogYears`,
`catalog` in vehicles.js - mocked from the 20 vehicles), and they enter condition/history manually
(odometer km, owners, accidents + worst damage, service count, title, colour) + price + contact.
Submit -> success screen with a `VS-######` ref (no backend; would POST to `seller_submissions`).
DB table `seller_submissions` added. Email validator `isValidEmail`/`isValidPhone` in validate.js.

### [CHUNK:paywall-security] Locked report - data not in DOM (but still in bundle)
Tags: paywall, security, locked, scraping, todo, backend, report_unlocks
`ReportDetail` now CONDITIONALLY renders: locked -> `LockedReport` skeleton (NO real data in DOM);
unlocked -> the real sections mount. This stops DOM/inspect scraping. **Not full security:** the
dataset still ships in the JS bundle and unlock is `sessionStorage`. Production fix (in `docs/TODO.md`
+ `SECURITY.md`, top priority): serve full `history` from an authenticated endpoint gated on the
`report_unlocks` table; never send locked fields to the client. `Paywall.jsx` is now unused by the
report (kept for reference). Select arrow spacing handled by `.field-select` in index.css.

### [CHUNK:filters-ui] Listings filter UI specifics
Tags: filters, range slider, dual thumb, fuel, EV petrol diesel, fake contacts, optimization
Price & Odometer use a **dual-thumb `RangeSlider`** (one bar, two handles) + typed min/max number
inputs (commit on blur/Enter). Filter params: priceMin/priceMax, odoMin/odoMax. **Fuel filter is a
fixed list `EV / Petrol / Diesel`** (`FUEL_OPTIONS` in Listings); data `fuelLabel` now returns
`EV`/`Petrol`/`Diesel`/`Hybrid` (isEv checks `=== 'EV'`). Client filter is single-pass with cheap
predicates first and `dealRating` computed only when the deal filter is active. Real massive-DB
optimization (server-side faceted search, indexes, pagination) is in `docs/TODO.md` + schema indexes.
Dealer contacts are deliberately FAKE: phones `+977 980-000-00NN`, emails `…@<slug>.example.com`.
Sell form clears auto-filled vehicle/spec/condition fields when a VIN isn't found (keeps contact).

### [CHUNK:dashboard] Dealer dashboard (apps/dashboard) - BUILT
Tags: dashboard, dealer, login, auth, inventory, service, sales, branches, followups, store
Second app `apps/dashboard` (Vite, port 5174, reuses @shared via @shared alias). Separate **mock
login** (`/login`, `lib/auth.js`, sessionStorage session; public site "Dealer sign in" links to
http://localhost:5174). Layout = Lumina/Moonshine style (top nav Overview/Inventory/Service/Sales,
branch-selector chips passed to pages via Outlet context, avatar+sign out). Mock data in
`data/dealer.js` (5 BRANCHES, REPS, inventory from shared 20 vehicles + status/branch/landed cost,
12mo `sales`, `serviceJobs`, `followups`, TIME_SLOTS; anchored to TODAY=2026-06-27; deterministic
seeded). Mutable state in `store/DealerStore.jsx` (context + sessionStorage): updateFollowup,
updateServiceJob, addServiceBooking, addVehicle.
Pages: **Overview** (KPIs, TimelineFilter [this month/3/6/12mo/custom dates], sales bar chart,
sales-vs-target by branch, follow-ups table with mark-Serviced + note); **Inventory** (table,
search, status filter, detail drawer w/ specs + service records, Add-vehicle modal w/ VIN/catalog
autofill); **Service** (end-to-end: book w/ live slot availability -> confirm -> check-in odometer+
requested -> complete work+costs -> "published to vehicle history"); **Sales** (branch targets
fulfilled/not filter, rep leaderboard, recent sales by branch, follow-ups). NOTE: dates must be
parsed LOCAL not via new Date(str) (UTC shift bug fixed in dealer.js parseLocal/monthBuckets).
Run: `npm run dev:dashboard` (5174) / `npm run build:dashboard`. UI follows the referenced
GitHub dashboard designs (Lumina/Moonshine).

**Multi-tenant + RBAC (front-end DEMO):** dealerships are tenants (DEALERSHIPS: himalayan/everest/
annapurna in dealer.js); every record carries `dealershipId`; DealerStore filters all collections to
the signed-in tenant (per-dealership sessionStorage key). Login has a **dealership dropdown**; account
is validated within the selected dealership (`findUser`) so you CANNOT sign into another dealership's
account. Per-login **role** (USERS: Admin/Sales/Finance/HR/Service per dealership); `PERMISSIONS`+`can()`
gate nav AND routes (DashboardLayout shows `NoAccess` for disallowed paths). Verified: A vs B see
different branches/data; cross-tenant login rejected; Sales role hides+blocks /service. NOT real
security (data still in bundle) - full server-side spec (RLS, tenant_id, session claims, permission
matrix, acceptance tests) is written agent-readably in `docs/TODO.md` "RBAC + multi-tenant isolation".

### [CHUNK:hardening-pass] Audit pass: schema, security, DRY, dead code
Tags: schema, normalize, rls, rbac, sanitize, dead code, dry, optimization, clsx
A 5-way audit (DB coverage, security, dead code, reuse, library research) drove this pass:
- **Schema (`docs/database/schema.sql`) normalized + completed for the dashboard:** added `branches`,
  `sales_reps`, `branch_sales_targets`, `stock_items`, `service_slot_templates`, `contacts`, `roles`,
  `role_permissions` (seeded to match the app matrix); added `branch_id`/`rep_id`/booking columns
  (slot_date/slot_time/requested_services/completed_on/notes/walk-in customer) via ALTER; reconciled
  enums (`service_job_status` +requested/confirmed, `followup_status` +pending, new `stock_status`);
  added **Row-Level Security** ENABLE + tenant_isolation policies (8 tables) using `app.dealership_id`.
  43 tables total. `companies` == dealership/tenant.
- **Security:** all dashboard forms now sanitize via `@shared/lib/validate` (a background task applied
  Login/Inventory/Service/Overview). Comprehensive security checklist + DB build mapping in `docs/TODO.md`.
  Known demo limit (documented, needs backend): full dataset + all tenants' data still ship in the bundle.
- **DRY:** extracted shared `@shared/lib/random.js` (hash/rng/pick/intBetween/roundTo/pad2) + date prims
  (iso/parseLocal/addDays in format.js); vehicles.js + dealer.js + TimelineFilter import them.
- **Dead code removed:** `Paywall.jsx` (deleted), unused exports (formatKm, formatKmpl, CURRENCY, byModel,
  DATA_SOURCES, CAR_VIEWS) + unused imports. `slugify` now used in vehicles.js.
- **Library research:** adopt `clsx` (~240B) if needed; skip react-range/zod/date-fns (documented in TODO).
  Remaining optional DRY: shared INPUT_CLASS, <Modal>/<Drawer>, status-tone maps.

### [CHUNK:ux-pass] UX pass: teal theme, branding, role landings, service overhaul
Tags: ux, theme, teal, branding, accent, drawer, metriccard, rbac, role-landing, maintenance, edit, vin
A UI/UX enhancement pass modeled on the referenced `new_dashboard` (Lumina) design.
- **Teal theme:** `apps/dashboard/src/index.css` `--color-brand-*` switched blue->teal (500 #14b8a6,
  600 #0d9488, 700 #0f766e). Charts use `var(--color-brand-600)` so they follow the accent.
- **Per-dealership branding (not VINsight):** `DEALERSHIPS` in dealer.js carry `mark` + `accent`
  (himalayan=teal, everest=indigo, annapurna=orange). `accentVars(dealershipId)` returns CSS-var
  overrides; `DashboardLayout` root sets `style={accentVars(session.dealershipId)}` so the whole
  dashboard re-themes per tenant at runtime (no Tailwind rebuild). `DealerBrand.jsx` shows the
  dealership mark+name and is a `<Link to="/">` (logo -> dashboard landing). Login stays VINsight.
- **Interactive "live" KPI tiles:** `components/MetricCard.jsx` (tone map, inline SVG `Spark`
  sparkline, trend ▲/▼, animate-ping `live` dot, renders as `<button>` w/ hover-lift + "View" when
  `onClick`). Render with `metrics.map(({key,...m}) => <MetricCard key={key} {...m}/>)` - destructure
  key out of the spread or React warns.
- **Role-specific landing (Overview.jsx rewrite):** `ROLE_DOMAINS` maps role->domains
  (Admin: kpi+service+sales+finance = sees all; Service: service only; Sales: sales; Finance:
  finance+sales; HR: hr; Logistic: inventory). `METRICS` builds per-domain tiles; metrics deduped
  **by label** (not key) so Admin doesn't get 3x "Follow-ups due"/2x "Revenue". Every tile is
  clickable -> generic `<DetailTable>` inside a `<Drawer>` (the "click a metric to view details").
  Service role has NO sales tile/nav.
- **Smooth shared `components/Drawer.jsx`:** right slide-over w/ rAF slide-in, backdrop fade, Esc,
  body scroll-lock, title/subtitle/footer. NOTE: its z-50 backdrop covers the header - a nav click
  while the drawer is open just closes the drawer (close first, then navigate).
- **Inventory editable (Inventory.jsx):** `DetailDrawer` now uses shared `Drawer` + inline **Edit
  mode** (price/odometer/status/branch/colour/fuel/engine/trans/drivetrain) saved via store
  `updateVehicle` (sanitized). Keeps last vehicle during slide-out so it doesn't blank.
- **Service overhaul (Service.jsx):** "Book service" books **confirmed** directly (dealer books, not
  just request) if the slot is free. Buckets: **Awaiting arrival / In service / Serviced**. In-service
  cars are LIVE (shown regardless of date); awaiting filters by slotDate; serviced by completedOn.
  A **date picker** + "Include unfinished from earlier dates" **FILTER** (overdue prior-date jobs are
  surfaced by the filter, NOT pinned on top). **VIN lookup** searches the tenant's jobs+inventory.
  "Start servicing" opens a **maintenance checklist** (categorized from `MAINTENANCE` catalog in
  dealer.js - generalized common-knowledge items, NOT the copyrighted PDF) + odometer/labour/parts/
  notes -> "Mark serviced & publish". "Request VIN history" = cross-dealership import mock (owner
  consent). Seed: `serviceJobs` has curated front rows giving every dealership today activity +
  `completedOn` on completed jobs. **Clear `vinsight:dealer:store:<id>` sessionStorage to pick up
  seed changes** (store hydrates from it).
- **Schema:** added `maintenance_categories`, `maintenance_items` (global reference, no RLS),
  `service_checklist_results` + `vin_share_requests` (tenant, RLS + `vin_share_status` enum).
Verified in-browser (both apps build clean): teal Himalayan vs indigo Everest, Service role no-sales
landing, clickable metric drawers, service buckets w/ overdue flags, maintenance checklist, inventory
edit persists, Admin sees all (deduped).

### [CHUNK:parts-billing] Parts dept, billing, full-page servicing, printable invoices
Tags: parts, billing, invoice, letterhead, print, service-form, taxonomy, disposition, filters, rbac, caps
Second dashboard expansion (parts + billing + service-form rework). All client-only demo.
- **Public site link:** header of `DashboardLayout.jsx` + `Login.jsx` -> `VITE_PUBLIC_SITE_URL || http://localhost:5173/` (open public site logged in or out).
- **Service-item taxonomy:** `SERVICE_ITEMS` in dealer.js (12 categories, each item has `fields:[{label,kind,options?,unit?}]`, kind ∈ dropdown|number|checkbox|note|text) + `SERVICE_ITEM_BY_NAME`. Generalized common-knowledge (not from any copyrighted source).
- **Full-page servicing form:** route `/service/:jobId` -> `pages/ServiceJob.jsx`; Service cards in `Service.jsx` now `navigate()` there (no drawer). `components/ServiceDetailEditor.jsx` = dropdown to add a taxonomy item -> reveals its fields + note. Persists via store `setServiceDetails`. JobDrawer in Service.jsx is now dead (kept, unused).
- **Parts:** `PARTS_CATALOG` (global master SKUs, ~29), `partsInventory` (tenant+branch stock seed), `partsOrders` (seed). `pages/Parts.jsx` tabs: Parts inventory / Sales & orders / Active servicing. Store: `createPartsOrder` (decrements stock), `attachPartToJob` (recomputes job partsCostNpr+totalNpr) + `adjustPartStock`, `payPartsOrder`, `addPartToInventory`. Completed `serviceJobs` now seed real `attachedParts` (makeParts) so partsCost is itemized & reconciles with billing.
- **Billing:** `pages/Billing.jsx` (Service bills | Parts bills, search + date range). Print routes `/billing/:docType/:id` (docType service|parts|combined) -> `pages/PrintInvoice.jsx` -> `components/PrintDoc.jsx` (overlay, window.print, mock "Email to owner") with `components/Letterhead.jsx` (per-dealership mark/name/address/PAN/accent via `letterheadFor`). VAT 13% (`withVat`), amount-in-words (`amountInWords`), Nepal "Tax Invoice". `@media print` in index.css shows only `.print-sheet`.
- **RBAC:** `PERMISSIONS` adds `/parts`,`/billing`; `can()` is now prefix-aware (sub-routes inherit). `CAPS` + `cap(role,ability)`: `editServiceDetails`(Admin,Service - Parts CANNOT), `managePartsOrders`/`attachPartsToJob`(Admin,Parts,Service), `printBilling`(Admin,Finance,Account,Cashier,Service,Parts). 'Parts' added to ACCOUNT_ROLES (demo login parts@<did>.example.com). Parts on `/service/:id` is read-only (banner + disabled fields).
- **Follow-up rework:** `FOLLOWUP_DISPOSITIONS` (Serviced here / Service not required / Customer declined / Done elsewhere / Rescheduled / Unreachable). `FollowupRow` uses a disposition `<select>` + note + Record -> store `recordFollowupDisposition` (sets status done + disposition + dispositionOn). "Disposition history" button opens the done list in the detail drawer. (Replaces the old mislabeled "Serviced" that dropped rows.)
- **Per-card period filter:** `MetricCard` takes optional `period={{value,options,onChange}}` (compact select; the card is a div w/ role=button to avoid nested interactive els). Overview gives Units sold / Revenue / Vehicles serviced their own period (1m/3m/6m/12m) independent of the global TimelineFilter. Fine perf at this data scale.
- **More filters:** Service (car text + year), Inventory (make + year selects), Sales (make + year, plus existing date TimelineFilter), Billing (date range). Cards denser (`MetricCard` p-4/text-xl) and Drawer rounded (`rounded-l-2xl`).
- **Schema:** docs/database/schema.sql adds `parts_catalog`, `part_service_items`, `parts_inventory`, `parts_orders`(+enum)/`parts_order_lines`, `service_job_items`, `service_job_parts`; `customer_followups` gets `disposition`(enum)/`disposition_on`; RLS for the tenant ones; role_permissions seed gains parts/billing.

### [CHUNK:admin-onboarding] Platform admin panel, onboarding, catalogs, approvals, sidebar, sales
Tags: admin, onboarding, two-mode-login, signin, catalog, approval, change-request, sidebar, sale-detail, sell, remove, cascade, logo
Big rework adding a platform-admin app + dealer-side changes. Client-only demo.
- **Two-mode auth** (`lib/auth.js`): two sessionStorage keys - dealer (`vinsight:dealer:session`) +
  platform admin (`vinsight:platform:session`). `signIn(session,isAdmin)`, `getAdminSession`,
  `isPlatformAdmin`. `isAuthed()` stays dealer-only (admin must not mount DealerProvider).
- **Login** (`pages/Login.jsx`): Dealership | Admin toggle. Dealer dropdown lists `activeDealerships()`
  (onboarded + active). Admin -> `findAdminUser` (PLATFORM_ADMINS = admin@vinsight.app) -> `/admin`.
- **Routing** (`main.jsx`): sign-in moved to `/signin` (`/login` redirects). Guards `RequireAuth`/
  `RequireAdmin`/`SigninGate`/`CatchAll`. Unauthed dealer routes -> `/signin` (apps kept SEPARATE per
  user; public site reached via the "Public site" button -> :5173, run both servers). Admin subtree
  `/admin/*` wrapped in `AdminStoreProvider`+`AdminLayout`. Dealer subtree adds `/sales/:saleId`.
- **AdminStore** (`store/AdminStore.jsx`, persists `localStorage['vinsight:platform:store']`): holds
  `onboarding` (seeded from DEALERSHIPS+LETTERHEAD on first run), per-dealership `serviceCatalog` +
  `partsCatalog`, and `changeRequests`. Mutations: onboardDealership/updateOnboarding/setOnboardingStatus;
  add/remove service type+subtype + loadServiceTemplate; add/remove part category/item/subtype +
  loadPartsTemplate; approve/rejectChangeRequest.
- **dealer.js platform readers** (the key integration): `readPlatformStore`/`writePlatformStore`,
  `readOnboarding`, `allDealerships`/`activeDealerships`, `readServiceCatalog`/`readPartsCatalog`
  (fall back to `DEFAULT_SERVICE_TEMPLATE` / `DEFAULT_PARTS_TEMPLATE`). `dealershipById`,
  `letterheadFor`, `accentVars` now PREFER onboarding overrides so new dealerships + edited branding/
  logo flow through to the login list, layout, and printed letterhead.
- **Approval workflow** (pull-based, no provider coupling): DealerStore `updateServiceJob` queues a
  `change_request` (instead of editing) when the job is completed && completedOn < today; `updatePartsOrder`
  queues when status==='paid'. Both return `{queued:true}`. `createChangeRequest` snapshots target +
  writes to the platform store. AdminStore `approveChangeRequest` flips status -> 'approved';
  DealerStore `applyApprovedRequests` (mount effect) applies approved+unapplied CRs to its
  serviceJobs/partsOrders and marks `applied`. ServiceJob shows a "Request change" panel for locked
  records; ApprovalsQueue shows before/after diff + Approve/Reject.
- **Catalogs** (`DEFAULT_SERVICE_TEMPLATE` = [{type,subtypes}]; `DEFAULT_PARTS_TEMPLATE` =
  {categories:[{category,items:[{name,subtypes}]}], vehicleBrands}) in dealer.js. `CatalogManager.jsx`
  (admin) edits them per dealership + "Load default template".
- **Service dropdown simplified** (`ServiceDetailEditor.jsx`): 2-level cascade (type -> subtype from
  `readServiceCatalog(did)`) + an "Other (type manually)" free-text fallback; each entry has a Note.
- **Parts cascade** (`Parts.jsx` AddStockModal): category -> item -> subtype from `readPartsCatalog(did)`;
  adds to inventory carrying its own name/category (stock table uses `dName/dCategory/dOem`, partBySku fallback).
- **Inventory** (`Inventory.jsx`): drawer footer = minimalist Edit / Sell / Remove (`removeVehicle`).
  `SellModal` captures buyer + salesperson + finance -> `createSale` -> navigates to `/sales/:id`.
- **Sales** uses `salesAll` (seed + new sales); recent-sales rows link to **SaleDetail** (`pages/SaleDetail.jsx`):
  buyer, price/VAT/total, salesperson + branch, and **Print bill** via PrintDoc/letterhead.
- **Layout**: top nav replaced by a **collapsible left `Sidebar.jsx`** (persists collapse in localStorage);
  `DashboardLayout` is now flex sidebar+content. `Drawer` floats with an edge gap (`sm:py-4 sm:pr-4`,
  rounded). Button conventions `.btn`/`.btn-sm`/`.btn-icon` in index.css (minimalist).
- **PrintDoc** print now opens a popup window with the page's styles + the sheet and calls print()
  (reliable across embeds; falls back to window.print()); "Email to owner" also opens a mailto.
- **Stub data**: `partsOrders` seed expanded so every branch has open + paid orders (Open Orders is non-empty).
- **Libraries**: `clsx` available; `react-hook-form` NOT installed (offline) - onboarding/sell forms are
  inline useState. **Git author** set to nirvikkc@gmail.com (repo-local). NOT committed this round (no repo given).
- Full DB backlog (all tables incl. catalogs/onboarding/change_requests/invoices, migrations, RLS, etc.)
  added to `docs/TODO.md` "DATABASE - full implementation backlog".

### [CHUNK:theming-settings] Light/dark theme, Settings, Add New Item, admin approvals on Overview
Tags: theme, dark-mode, light-mode, settings, add-item, central-item-hub, pending-approvals, prestige-redesign
Foundation slice toward the "Prestige Auto Group" reference redesign (user chose: DARK default, foundation-first).
- **Theme** (`lib/theme.js`): `getThemePref`/`setThemePref`/`applyTheme` (default 'dark'; 'light'|'system' options).
  `main.jsx` calls `applyTheme()` before render -> sets `document.documentElement.dataset.theme`. index.css defines
  semantic surface vars (`--app-bg`/`--surface`) + a `[data-theme="dark"]` block that INVERTS the `--color-ink-*`
  scale (so `text-ink-900` reads light, `bg/border-ink-*` go dark) and sets dark surfaces. `.card`/body use the vars.
  All `bg-white` in dashboard components were bulk-replaced with `bg-[var(--surface)]` (PrintDoc kept white for
  printing). Light + dark both verified in-browser.
- **Settings page** (`pages/Settings.jsx`, route `/settings`, all roles): theme picker (Light/Dark/System) +
  recommended dashboard prefs (show revenue chart, live tiles, collapse sidebar, table density, default landing)
  persisted via `getSettings`/`setSettings` (localStorage `vinsight:settings`). Prefs persist; theme is fully wired.
- **Add New Item** (`pages/AddNewItem.jsx`, route `/add-item`, **Admin role only** via PERMISSIONS + in-page guard):
  the "Central Item Addition Hub" — 3 forms (Add Parts Inventory -> `addPartToInventory`; Add Servicing Item ->
  appends a subtype to the dealership service catalog via `writePlatformStore`; Add System User -> demo/activity-log)
  + a recent-activity feed. Matches the reference image 5.
- **Admin pending approvals** on Overview (role Admin): reads `readPlatformStore().changeRequests` for the dealership
  where status==='pending', renders a clickable list (row -> detail drawer with before/after diff).
- **Sidebar**: added "Add New Item" (Admin-only via `can()`) + "Settings". PERMISSIONS: `/settings` for all roles,
  `/add-item` Admin only; `can()` is prefix-aware.
- **Review fix**: `applyApprovedRequests` now strips `__`-prefixed metadata (e.g. `__reason`) before merging a CR
  patch into the record (was the one concrete bug from the 30-finding review; the rest are the inherent cross-store
  localStorage race in the client-only demo, documented).
- **DEFERRED (next round)**: pixel-matching the page LAYOUTS to the reference images (Overview 6-dept KPI row +
  revenue-trend area chart + financing donut + upcoming-appointments table + HR panel; Sales/Servicing/Parts
  layouts incl. the Servicing removals: drop Technician-Efficiency card + the status-breakdown & parts-availability
  charts), and making EVERY card/line-item open a detail view. The reference designs are dark "Prestige Auto Group"
  mockups; we keep our multi-tenant/RBAC/branding ideas under that visual language.

### [CHUNK:facts] Quick facts / constants
Tags: facts, constants, numbers, rate, counts
20 vehicles (10 models ×2) · NPR_PER_USD=133 · price format `Rs. 10,000,000` · CURRENT_YEAR baseline 2026 ·
7 Nepal provinces · report prices Rs.1,500/2,500/3,900 · photos licensed CC0/CC BY-SA/PD · initial JS ~75 kB gzip.
