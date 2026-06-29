# MEMORY - Vehicle Records / VINsight knowledge base

> Vector-DB-styled index of the codebase. Each `### [CHUNK:id]` block is a self-contained,
> retrievable unit with a title, a `Tags:` line (keywords for semantic lookup), and a body that
> says **what it is and where it lives** (file paths + key exports). Pull the relevant chunk
> instead of re-reading the repo. Keep chunks atomic; update the chunk when the code changes.
> Jump-to-fix index is in [CHUNK:lookup]. Repo: github.com/bit-nk/vehicle-dashboard.

---

### [CHUNK:overview] What this is
Tags: project, vinsight, scope, two-app, public site, dashboard, purpose, built
Two connected products in one monorepo, **both fully built** (front-end demo, no backend):
- **Public site** (`apps/web`) - VINsight, a Carfax-style vehicle-history + used-car listings site
  for buyers. Free snapshot + paywalled full report, filtered listings, sell-your-vehicle form.
- **Dealer dashboard** (`apps/dashboard`) - multi-tenant operations console for dealerships
  (inventory, servicing, parts, sales, billing, approvals, notifications) + a platform-admin
  console (`/admin`) for the VINsight team (onboarding, catalogs/packages, cross-dealership add).
Localized for **Nepal** (NPR, km, provinces). All data is deterministic seeded mock data in the
browser; any password works.

### [CHUNK:boundary] Scraping / security boundary (hold this line)
Tags: carfax, scraping, refusal, terms-of-service, ethics, boundary
A request to "scrape Carfax end-to-end including their security" was **declined** (violates ToS;
copying a paid DB / probing a third party's security is unauthorized). Instead: open/government
data (NHTSA, EPA) + openly-licensed photos (Wikimedia), standard security on **our own** app. Keep
refusing the Carfax-scraping part; offer the open-data alternative.

### [CHUNK:stack] Tech stack
Tags: stack, vite, react, tailwind, router, recharts, lucide, versions
Vite 6 + React 19 + React Router 7 + Tailwind CSS 4 (`@tailwindcss/vite`, design tokens) +
lucide-react + Recharts (lazy chunk). npm **workspaces** monorepo (`@vinsight/web`,
`@vinsight/dashboard`, `@vinsight/shared`; `@shared/*` is a Vite source alias). Router is
`BrowserRouter` locally, `HashRouter` on the GitHub Pages build (gated by `VITE_HASH_ROUTER`).

### [CHUNK:layout] Monorepo file map
Tags: monorepo, workspaces, folders, file map, structure, where
```
vehicle-records/
├─ package.json              # workspaces; scripts: dev, build, build:dashboard, build:all, dev:dashboard
├─ .github/workflows/deploy.yml   # GitHub Pages CI (builds both apps -> one site)
├─ README.md  CHANGELOG.md  USER_GUIDE.md  SECURITY.md  MEMORY.md   # the only tracked .md (.gitignore)
├─ docs/TODO.md (gitignored)  docs/database/   # production backlog + Postgres schema/data-dictionary
├─ packages/shared/src/
│  ├─ lib/   format.js (formatCurrency/formatNumber/formatNprShort/iso/parseLocal/addDays/slugify/...)
│  │        validate.js (sanitizeText/isValidEmail/isValidPhone/normalizeVin)  random.js (hash/rng/pick/intBetween/pad2)
│  ├─ ui/    CarImage, VehiclePhoto, Badge, StarRating, HistoryBadges, Logo
│  └─ data/  vehicles.js (builder + lookupSpecs/catalog), real-vehicles.json
├─ apps/web/  (public site, port 5173)
│  ├─ public/_headers   vite.config.js   src/main.jsx (conditional Router)
│  ├─ src/pages/  Home, Listings, VehicleDetail, Report, ReportDetail, SellVehicle, NotFound
│  └─ src/components/  Navbar (VITE_DASHBOARD_URL link), Footer, Layout, SearchBar, VehicleCard,
│                      Paywall(unused), PricingModal, MileageChart, ScrollToTop, RouteFallback
└─ apps/dashboard/  (dealer + admin, port 5174)
   ├─ public/_headers   vite.config.js   src/main.jsx (routes + conditional Router)
   ├─ src/lib/    auth.js, theme.js, chart.js
   ├─ src/store/  DealerStore.jsx, AdminStore.jsx
   ├─ src/data/   dealer.js   (the big data + RBAC + invoicing + platform-store module)
   ├─ src/pages/  Overview, AdminOverview, Inventory, InventoryVehicle, InventoryNew, Service,
   │              ServiceJob, Sales, SaleDetail, Parts, Billing, PrintInvoice, Settings,
   │              AddNewItem, Approvals, admin/{AdminHome,AdminDealerships,AdminDealershipEdit,AdminCatalog,AdminAddItem}
   └─ src/components/  DashboardLayout, Sidebar, AdminLayout, DealerBrand, MetricCard, Drawer,
                       ConfirmDialog, NotificationBell, ServiceDetailEditor, DealerCatalog,
                       CatalogManager, PackageManager, Letterhead, PrintDoc, StatusPill,
                       TimelineFilter, RangeSlider, DetailTable, OnboardingForm
```

### [CHUNK:deploy] GitHub Pages deployment
Tags: deploy, github pages, ci, actions, base, hash router, hosting, urls
Both apps publish to ONE Pages site from `.github/workflows/deploy.yml` (push to `main` auto-deploys):
- Public site → `https://bit-nk.github.io/vehicle-dashboard/` (built with `--base=/vehicle-dashboard/`).
- Dashboard → `https://bit-nk.github.io/vehicle-dashboard/dashboard/` (`--base=/vehicle-dashboard/dashboard/`).
Build env: `VITE_HASH_ROUTER=true` (so both use HashRouter - avoids the per-app 404 problem on
Pages), `VITE_PUBLIC_SITE_URL=/vehicle-dashboard/` (dashboard's "Public site" link),
`VITE_DASHBOARD_URL=/vehicle-dashboard/dashboard/` (web Navbar link). Workflow assembles `_site/`
(web at root, dashboard under `/dashboard/`) + 404.html + .nojekyll, deploys via `actions/deploy-pages`.
Pages source = GitHub Actions (enabled via `gh api … /pages -f build_type=workflow`). Caveat:
Pages ignores `_headers`, so CSP/security headers don't apply there (Cloudflare/Netlify would honor them).

### [CHUNK:run] Run / build commands
Tags: commands, run, dev, build, preview, how-to
Root: `npm install` · `npm run dev` (web :5173) · `npm run dev:dashboard` (dashboard :5174) ·
`npm run build` (web) · `npm run build:dashboard` · `npm run build:all`. Local dev/build use
BrowserRouter + base `/` (clean URLs); the Pages base + HashRouter are only set in CI.

### [CHUNK:web-app] Public site (apps/web)
Tags: public, web, pages, routes, listings, report, paywall, sell
Routes (`apps/web/src/main.jsx`): `/` Home (3-tab search VIN/plate/make-model, featured, value
props) · `/listings` (URL-synced filters: make→model, body, price & odometer dual-thumb
`RangeSlider`, year, fuel [EV/Petrol/Diesel], drivetrain, transmission, seats, color, province,
min NCAP, deal rating, history toggles; sort) · `/vehicle/:id` (photos+SVG, specs, safety,
features, snapshot, dealer) · `/report` + `/report/:vin` (free snapshot + paywalled full report;
`useUnlock` writes VIN to sessionStorage) · `/sell` (VIN-lookup autofill or catalog autofill →
`VS-######` ref) · `*` NotFound.

### [CHUNK:data-vehicles] Vehicle dataset (shared)
Tags: data, vehicles, nhtsa, epa, wikimedia, vehicles.js, real data, localization, npr
`packages/shared/src/data/vehicles.js` builds **20 vehicles** (10 models × 2) from
`real-vehicles.json` (EPA specs, NHTSA recalls + NCAP safety, Wikimedia photos - all real,
re-verified) merged with a deterministic seeded history layer, localized to NPR (`NPR_PER_USD=133`,
`formatCurrency` → `Rs. 1,690,000`), km, km/l, Nepal provinces/dealers, "green sticker" emissions.
Exports include `vehicles`, `getVehicleByVin`, `getVehicleById`, `lookupSpecs`, `catalog`,
`catalogYears`, `segmentByModel`. One unit (`2018-ford-mustang-ecoboost`) is a Rebuilt-title car.

### [CHUNK:shared-lib] Shared utilities
Tags: shared, lib, format, validate, random, helpers, currency, sanitize, formatNprShort
`@shared/lib` (barrel re-exports format/validate/random):
- **format.js**: `formatCurrency` (`Rs. …` - NBSP so "Rs." never wraps off the number),
  `formatNumber`, `formatNprShort` (Nepali units: K / Lakh / Cr / Arab - used on the revenue chart),
  `iso`/`parseLocal`/`addDays` (LOCAL date prims - avoid `new Date(str)` UTC shift), `slugify`,
  `vehicleTitle`, `maskVin`, `dealRating`.
- **validate.js**: `sanitizeText` (strips <>, caps length), `isValidEmail`, `isValidPhone`, `normalizeVin`.
- **random.js**: `hash`, `rng` (seeded), `pick`, `intBetween`, `pad2` (deterministic seed data).

### [CHUNK:dealer-data] dealer.js - data + RBAC + invoicing + platform store
Tags: dealer.js, seed, rbac, permissions, can, cap, invoicing, tax, vat, platform store, catalogs, dealerships
`apps/dashboard/src/data/dealer.js` is the hub. Contains:
- **Tenants/branches/people:** `DEALERSHIPS` (himalayan=Himalayan Auto Group, everest=Everest Motors,
  annapurna=Annapurna Autos; each has `mark`+`accent`), `BRANCHES`, `REPS`, `USERS`,
  `PLATFORM_ADMINS` ([{email:'admin@vinsight.app'}]); helpers `branchById`, `branchesForDealership`,
  `repsForBranch`, `usersForDealership`, `findUser`, `findAdminUser`, `dealershipById`, `allDealerships`,
  `activeDealerships`.
- **Seed collections** (deterministic, anchored to `TODAY`): `inventory`, `sales` (12mo, carry
  buyerName/financeType/down+loan/paymentMethod), `serviceJobs` (40 - curated "today" rows + ~11mo
  history), `followups`, `partsInventory`, `partsOrders`, `PARTS_CATALOG` (+`partBySku`,`PART_CATEGORIES`),
  `SERVICE_TYPES`, `TIME_SLOTS`, `FOLLOWUP_DISPOSITIONS`, `salesInRange`, `monthBuckets`, `segmentByModel`,
  `priceByModel`, `SALE_SEGMENTS`, `LEAD_SOURCES`.
- **RBAC:** `PERMISSIONS` (route prefixes per role), `can(role,path)`, `landingFor(role)` (home route;
  Parts/Service have no `/` so land on their section), `CAPS` + `cap(role,ability)` (editServiceDetails,
  managePartsStock, sellParts, attachPartsToJob, printBilling).
- **Invoicing:** `TAX_RATE=0.10`, `VAT_RATE=0.13`, `dealershipRates(did)`, **`withTaxVat(subtotal,did)`**
  → {subtotal,tax,vat,total,taxRate,vatRate} (tax on subtotal, VAT on subtotal+tax), `nextDocNo`,
  `amountInWords`, `LETTERHEAD`/`letterheadFor`. (There is no `withVat` anymore.)
- **Platform store (localStorage `vinsight:platform:store`):** `readPlatformStore`/`writePlatformStore`,
  `readOnboarding`, `readServiceCatalog`/`readPartsCatalog` (fall back to DEFAULT_*_TEMPLATE),
  `setDealershipAccent`, `setDealershipRates`, `setServiceCatalog`, `setPartsCatalog`, `accentVars`,
  `accentScale`. Catalog/package seeds: `DEFAULT_SERVICE_TEMPLATE`, `DEFAULT_PARTS_TEMPLATE`,
  `DEFAULT_PACKAGES`, `SERVICE_TYPE_NAMES`, `PARTS_CATEGORY_NAMES`, `readPackages`, `buildCatalogsFromPackage`.

### [CHUNK:dealer-store] DealerStore (per-dealership runtime state)
Tags: store, dealerstore, state, sessionStorage, mutations, cart, change request, notifications
`apps/dashboard/src/store/DealerStore.jsx` - React context, persisted per-tenant in sessionStorage
(`vinsight:dealer:store:<did>`). State: `followups, serviceJobs, inventory, partsInventory, partsOrders,
partsCart, salesExtra, saleEdits, repTargets, changeRequests, notifications`. Exposes merged `salesAll`.
Key methods: `updateServiceJob` (queues a `service_edit` change request if completed-before-today),
`setServiceDetails`, `addServiceBooking`, `addVehicle/updateVehicle/removeVehicle`, `createSale`
(stores pre-tax `subtotalNpr=totalNpr=price`), `setRepTarget`, `updateSale`, `adjustPartStock`,
`addPartToInventory`, `updatePart`, cart ops (`addToCart/updateCartLine/removeCartLine/clearCart`),
`checkoutCart`, `cartToJob`, `createPartsOrder`, `updatePartsOrder` (queues `parts_order_edit` if paid),
`payPartsOrder`, `markServiceBillPaid`, `attachPartToJob`, **`requestNewPart`** (queues `parts_add`),
**`decideChangeRequest(id,'approve'|'reject',{reason})`** (applies + notifies), `markNotificationsRead`,
`resetDemo`. Also exports `TYPE_LABEL` for change-request types.

### [CHUNK:admin-store] AdminStore (platform-admin state)
Tags: store, adminstore, platform, onboarding, catalog, packages, users
`apps/dashboard/src/store/AdminStore.jsx` - context persisted in localStorage `vinsight:platform:store`.
State: `onboarding, serviceCatalog, partsCatalog, packages, users` (+ legacy `changeRequests`, no
longer decided here). Methods: `onboardDealership`, `updateOnboarding`, `setOnboardingStatus`;
service catalog `addServiceType/removeServiceType/addServiceSubtype/removeServiceSubtype/loadServiceTemplate`;
parts catalog `addPartCategory/removePartCategory/addPart/removePart/addPartSubtype/removePartSubtype/loadPartsTemplate`;
packages `addPackage`(prepends + returns id)/`updatePackage`/`removePackage`; `addUser`; `serviceCatalogFor`/`partsCatalogFor`.

### [CHUNK:routing-auth-layout] Routing, auth, layouts, theme
Tags: main.jsx, routes, auth, session, layout, sidebar, dashboardlayout, adminlayout, theme, chart
- **`main.jsx`**: `BrowserRouter`/`HashRouter` chosen by `VITE_HASH_ROUTER`. Guards `RequireAuth`/
  `RequireAdmin`/`SigninGate`/`CatchAll`. Dealer routes: `/ /inventory /inventory/new /inventory/:vehicleId
  /service /service/:jobId /sales /sales/:saleId /parts /billing /billing/:docType/:id /add-item /approvals
  /settings`. Admin subtree (under `AdminStoreProvider`+`AdminLayout`): `/admin /admin/dealerships
  /admin/dealerships/:id /admin/catalog /admin/add-item`.
- **`lib/auth.js`**: two sessionStorage keys - `vinsight:dealer:session` + `vinsight:platform:session`;
  `getSession/getAdminSession/signIn(session,isAdmin)/signOut/isAuthed/isPlatformAdmin`.
- **`components/DashboardLayout.jsx`**: shell (accentVars per tenant) + branch filter + search +
  NotificationBell + Public-site link + user menu; redirects `/` → `landingFor(role)` for roles without Overview.
- **`components/Sidebar.jsx`**: nav filtered by `can(role,to)` (Overview/Inventory/Service/Parts/Sales/
  Billing/Add New Item/Approvals/Settings). **`components/AdminLayout.jsx`**: platform nav
  (Dashboard/Dealerships/Catalog/Add Item).
- **`lib/theme.js`**: `getThemePref/setThemePref/applyTheme` (default dark; inverts `--color-ink-*`),
  `getSettings/setSettings` (localStorage `vinsight:settings`). **`lib/chart.js`**: shared recharts
  `chartTip/chartGrid/chartAxis` (imported as tip/grid/axis).

### [CHUNK:pages-dashboard] Dashboard pages - what each does
Tags: pages, overview, inventory, service, sales, parts, billing, settings, approvals, admin
- **Overview.jsx** - role-based metric tiles + follow-ups table (sales/kpi only). Admin returns
  **AdminOverview.jsx** (dealership performance: 6 dept KPIs, revenue-trend AreaChart in Nepali
  units, top models, financing donut, upcoming appts, derived HR; "Requires Approval" card → /approvals).
- **Inventory.jsx** (list + advanced filter), **InventoryVehicle.jsx** (detail page: edit, status,
  SellModal → createSale), **InventoryNew.jsx** (add vehicle).
- **Service.jsx** - 6 KPIs in one row; **Today / All service history** toggle (searchable/sortable);
  queue; delayed; Book service; Request VIN history. **ServiceJob.jsx** - per-job page: confirm →
  **CheckInCard** (owner, time, odometer, re-visit items) → **ServiceProgress** stepper (Check-in →
  In service/Delayed → Done) → ServiceDetailEditor + parts + labour → mark serviced → bill.
- **Sales.jsx** - sub-nav Car Sales / Sales / Sales Team (rep targets + add-sale). **SaleDetail.jsx**
  - sale card (pre-tax) + printed invoice (tax+VAT breakdown).
- **Parts.jsx** - sub-nav Overview / Urgent backorders / Parts inventory / New parts sale; AddStockModal
  (cascade + match→restock w/ current count, no-match→request to admin / admin adds direct); OrdersEditor; PartPicker.
- **Billing.jsx** - 5 cards + filter panel + paid/unpaid; mark paid; print. **PrintInvoice.jsx** +
  **components/PrintDoc.jsx** + **Letterhead.jsx** = the printable bill (the only place tax+VAT show).
- **AddNewItem.jsx** (Admin) - add parts/servicing/users (+ inline category/type add-remove) + Edit-items tab.
- **Approvals.jsx** (Admin) - the dealer-side change-request queue (approve/reject via decideChangeRequest).
- **Settings.jsx** - theme, dashboard prefs, Brand accent (Admin), **Tax & VAT** rates (Admin).
- **admin/** - AdminHome, AdminDealerships(+Edit) (onboard/edit), AdminCatalog (PackageManager + CatalogManager),
  AdminAddItem (dealership selector + 3 forms).

### [CHUNK:components-dashboard] Dashboard component inventory
Tags: components, metriccard, drawer, confirmdialog, notificationbell, statuspill, servicedetaileditor
`MetricCard` (KPI tile: tone, spark, trend, live dot, optional period select; label wraps).
`Drawer` (right slide-over, Esc + scroll-lock). `ConfirmDialog` (custom confirm/prompt replacement,
light backdrop, optional reason). `NotificationBell` (header bell; filters notifications by role).
`StatusPill`/`Badge` (theme-aware `.badge-*` tones). `ServiceDetailEditor` (2-level service cascade +
manual). `DealerCatalog`/`CatalogManager`/`PackageManager` (catalog & onboarding-package editors).
`TimelineFilter`, `RangeSlider`, `DetailTable`, `DealerBrand` (logo → `/`).

### [CHUNK:rbac-tenancy] Multi-tenant + RBAC (demo)
Tags: rbac, tenant, isolation, roles, permissions, security demo
Every record carries `dealershipId`; DealerStore filters all collections to the signed-in tenant
(per-dealership sessionStorage). Login validates the account **within** the chosen dealership
(`findUser`) - can't cross tenants. One **role** per login; `PERMISSIONS`+`can()` gate nav AND routes
(`DashboardLayout` shows NoAccess / redirects). Parts & Service roles have no Overview and no vehicle
Inventory. Sales can VIEW parts but not sell (`sellParts` cap excludes Sales). NOT real security -
full dataset still ships in the bundle; server-side spec (RLS, session claims, matrix) in `docs/TODO.md`.

### [CHUNK:approvals-notifications] Approvals + notifications (dealer-side)
Tags: approvals, change request, notifications, bell, parts_add, service_edit, parts_order_edit
Approvals are owned by the **dealership Admin** (route `/approvals`, Admin-only), NOT the platform
admin (the old platform ApprovalsQueue/AdminApprovals were removed). Change-request types:
`service_edit` (editing a completed-before-today service record), `parts_order_edit` (editing a paid
order), `parts_add` (staff receiving a part not in inventory → request Admin to add it). Created via
`createChangeRequest` in DealerStore; decided via `decideChangeRequest` (applies immediately +
notifies). In-app **notifications** live in DealerStore state, surfaced by `NotificationBell` (Admin
sees approval requests; Parts/Service get "approved/rejected"). Real push/email is specced in `docs/TODO.md`.

### [CHUNK:billing-tax] Tax & VAT - bills only
Tags: tax, vat, billing, invoice, withTaxVat, pre-tax, rates, settings
Tax + VAT are **added only on the printed bill**. Everywhere on the dashboard shows **pre-tax**
totals; inventory item prices are raw (no tax). Bill math (`withTaxVat(subtotal,did)`):
**Total → Tax (default 10%) → VAT (default 13%, on subtotal+tax) → Grand Total**. Rates are
per-dealership, editable in **Settings → Tax & VAT** (`setDealershipRates`/`dealershipRates`,
stored in onboarding). Only `PrintInvoice.jsx` and SaleDetail's printed invoice call `withTaxVat`;
stored `totalNpr` on sales/orders is the pre-tax subtotal.

### [CHUNK:theming-branding] Theme + per-dealership branding
Tags: theme, dark, light, accent, branding, settings
Default **dark** theme (`lib/theme.js` inverts `--color-ink-*`; `.print-sheet`/PrintDoc force light).
Per-dealership **accent** (`DEALERSHIPS[].accent`, or Settings color picker → `setDealershipAccent`)
applied at runtime via `accentVars()` CSS vars on `#dealer-shell` - no Tailwind rebuild. `accentScale(hex)`
builds the 5-stop palette. Status colors use theme-aware `.badge-*` classes in index.css.

### [CHUNK:security] Security posture
Tags: security, csp, headers, sanitize, print, SECURITY.md, TODO.md
Both apps ship `public/_headers` (CSP/HSTS/X-Frame/nosniff/Referrer/COOP) for Netlify/Cloudflare
(ignored by GitHub Pages). All dashboard form text goes through `sanitizeText`/`isValidEmail`/
`isValidPhone`/`normalizeVin`. `PrintDoc` escapes the doc title and sets `script-src 'none'` on its
print popup. Known demo limits (documented, need a backend): full multi-tenant dataset + locked
report data ship in the client bundle; paywall/unlock is sessionStorage. Production model in
`SECURITY.md`; full server backlog (RLS, API, auth, notifications) in `docs/TODO.md`.

### [CHUNK:schema] Database schema
Tags: database, schema, sql, postgres, tables, ddl, data dictionary
`docs/database/schema.sql` (PostgreSQL DDL: enums, PK/FK/unique/index, CHECKs, RLS policies on
tenant tables, Nepal seed) + `docs/database/README.md` (data dictionary, app-field→column map).
Covers reference, identity, vehicle/history, commerce, reports/paywall, and dashboard ops (branches,
sales, service jobs, parts catalog/inventory/orders, follow-ups, change_requests, onboarding). `companies` == dealership/tenant. Money = numeric NPR; distances km. (`docs/` is gitignored.)

### [CHUNK:conventions] Conventions & gotchas
Tags: conventions, gotchas, recharts, dashes, dates, seed, gitignore, author
- **Recharts + React 19 StrictMode**: charts render blank unless every series has
  `isAnimationActive={false}`. Always set it.
- **Typography**: no em/en dashes anywhere - use a plain hyphen `-`; middot `·` is the inline separator.
- **Dates**: use `parseLocal`/`iso` (never `new Date(str)` - UTC shift bug).
- **Seed data is deterministic**; to pick up seed changes in the browser, clear the
  `vinsight:dealer:store:<did>` sessionStorage key (the store hydrates from it).
- **.gitignore**: ignores build output, the root screenshot, `.env`, and all `*.md` EXCEPT
  README.md, CHANGELOG.md, USER_GUIDE.md, MEMORY.md, SECURITY.md (so docs/TODO.md is NOT pushed).
- **Git**: commit author is `nirvikkc@gmail.com`; commits and pushed content carry no co-author or
  tooling attribution trailers; history was squashed to a single clean commit for the public repo.

### [CHUNK:lookup] Where do I change X? (jump index)
Tags: lookup, where, how to, change, index, find
- Tax/VAT rate or default → `dealer.js` TAX_RATE/VAT_RATE + `dealershipRates`; UI in `Settings.jsx`; math in `withTaxVat`.
- Bill layout / what shows on invoices → `pages/PrintInvoice.jsx` + `components/Letterhead.jsx` + `PrintDoc.jsx`.
- A role's allowed sections → `PERMISSIONS` in `dealer.js`; capabilities → `CAPS`.
- Add a nav item → `components/Sidebar.jsx` NAV + a route in `main.jsx` (+ PERMISSIONS).
- Demo login accounts / dealerships → `USERS`/`DEALERSHIPS`/`PLATFORM_ADMINS` in `dealer.js`; login UI `pages/Login.jsx`.
- Seed inventory/sales/service/parts → the IIFE builders in `dealer.js`.
- Service lifecycle / check-in / stepper → `pages/ServiceJob.jsx` (CheckInCard, ServiceProgress).
- Receive-stock match logic → `pages/Parts.jsx` AddStockModal (`related()`).
- Approvals behavior → `DealerStore.jsx` (`createChangeRequest`/`decideChangeRequest`) + `pages/Approvals.jsx`.
- Notifications → `DealerStore.jsx` notifications + `components/NotificationBell.jsx`.
- Theme/accent → `lib/theme.js` + `dealer.js` accentVars/accentScale + `index.css`.
- Deploy / base paths / URLs → `.github/workflows/deploy.yml` + `VITE_*` env + the conditional Router in both `main.jsx`.
- Charts styling → `lib/chart.js`.

### [CHUNK:facts] Quick facts / constants
Tags: facts, constants, numbers, urls
3 dealerships (himalayan/everest/annapurna) · admin `admin@vinsight.app` · any password (demo) ·
TAX_RATE 0.10 / VAT_RATE 0.13 (per-dealership override) · NPR_PER_USD 133 · 20 vehicles (10×2) ·
TODAY-anchored seed · live: bit-nk.github.io/vehicle-dashboard(/dashboard).
