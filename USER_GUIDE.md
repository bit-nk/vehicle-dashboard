# VINsight - User Guide

VINsight is two connected products that share one data and design layer:

- **Public site** - a vehicle-history & used-car listings site for buyers (Carfax-style).
- **Dealer dashboard** - a multi-tenant operations console for dealerships, plus a
  platform-admin console for the VINsight team.

**Live demo**
- Public site: https://bit-nk.github.io/vehicle-dashboard/
- Dashboard: https://bit-nk.github.io/vehicle-dashboard/dashboard/

> This is a demonstration build. There is no backend - all data is simulated and stored in
> your browser, and **any password works**. Nothing you enter leaves your device.

---

## 1. Getting in (login)

There are three ways to use VINsight:

| You are… | Where | How to sign in |
|---|---|---|
| **A buyer / public visitor** | Public site | No login. Just browse. |
| **Dealership staff** | Dashboard → **Dealership** tab | Pick your dealership, click a **role chip** (or type a work email), enter any password. |
| **VINsight platform team** | Dashboard → **Admin** tab | Email `admin@vinsight.app`, any password. |

**Dealership sign-in, step by step**
1. Open the dashboard and make sure the **Dealership** toggle is selected.
2. Choose your dealership: **Himalayan Auto Group**, **Everest Motors**, or **Annapurna Autos**.
3. Click one of the **demo role chips** (Admin, Sales, Service, Parts, …) - it fills a matching
   account - or type any registered work email.
4. Enter any password and **Sign in**. You land on the home view your role is allowed to see.

**Platform-admin sign-in**
- Switch to the **Admin** toggle, use `admin@vinsight.app`, any password → you arrive at `/admin`.

You can hop between the two products anytime: the dashboard header has a **Public site** button,
and the public site's navbar has a **Dashboard** link.

---

## 2. The public site

The consumer-facing site for researching and buying used vehicles (Nepal-localized, prices in NPR).

- **Home** - search by **VIN**, **license plate**, or **make & model**; featured listings and value props.
- **Listings** - browse inventory with filters (make, body type, price range, mileage, fuel,
  drivetrain, accident/owner history) and sorting. Filters are reflected in the URL so a search
  can be shared.
- **Vehicle detail** - photos, full specs and features, a history snapshot, and the selling
  dealer's card.
- **Vehicle history report** - a **free snapshot** (owners, accidents, service count, title,
  recalls) with the **full report behind a paywall**: a blurred teaser opens a pricing dialog;
  "unlocking" reveals ownership, accident, service, title, odometer, recall, lien and emissions
  history. (Demo unlock is per-session.)
- **Sell your vehicle** - an intake form for owners to list a car.

---

## 3. The dealer dashboard

Each dealership sees **only its own** branches, inventory, customers and records. What appears in
the left navigation depends on your **role**.

### Roles & access at a glance

| Role | Sees |
|---|---|
| **Admin** | Everything - Overview, Inventory, Service, Parts, Sales, Billing, Add New Item, Approvals, Settings |
| **Sales** | Overview, Inventory, Sales, Parts (view only), Settings |
| **Finance / Account / Cashier** | Overview, Sales, Billing, Settings (+ Inventory for Finance/Account) |
| **Service** | Service, Parts (view), Billing, Settings - *no Overview, no vehicle Inventory* |
| **Parts** | Parts, Service (read-only), Billing, Settings - *no Overview, no vehicle Inventory* |

A top **branch filter** scopes most screens to a single branch or "All Branches".

### Overview (Admin)
The dealership performance dashboard: department KPIs (car sales, servicing, parts, available
parts, finance, HR), a **monthly sales & service revenue trend** (in Nepali units - thousand /
lakh / crore / arab), top-selling models, financing mix, upcoming appointments, and an HR
snapshot. A **"Requires Approval"** card appears here when staff requests are waiting.

### Inventory
The vehicle stock list with advanced filters (status, make, year, price/odometer ranges). Click a
vehicle for its **detail page** - edit details, change status (in stock / in service / reserved /
sold), or **Sell** it (records buyer, finance type, salesperson). "Add vehicle" creates new stock.

### Service
The servicing operations console. A **Today / All service history** toggle switches between the
live picture and the complete record of every job the dealership has done (searchable, sortable).

- **KPIs** - Today's Appointments, Awaiting Arrival, Currently In Bay, Delayed Servicing, Vehicles
  Serviced, Vehicles Ready.
- **Book a service** - capture customer, vehicle, branch, date/time slot, and the requested services.
- **Request VIN history** - pull another dealership's records for a vehicle (with owner consent).
- **A service job's lifecycle** (open any job):
  1. **Confirm booking** (requested → confirmed).
  2. **Vehicle check-in** - the owner confirms drop-off; you log the check-in time, odometer, and
     re-visit the services to perform (pulled from the booking).
  3. **Start servicing** - auto-fetches the checked-in items; add more as needed. A live
     **progress tracker** shows *Check-in → In service (or Delayed) → Done*.
  4. **Mark serviced** - records labour + parts, generates the bill, and logs to the vehicle's history.

### Parts
Per-branch parts operations, with a sub-navigation: **Overview**, **Urgent backorders**, **Parts
inventory**, **New parts sale**.

- **Receive stock** - pick a part via the Category → Part → Type cascade. If it already exists at
  that branch, you see **how many are in stock** and can restock it. If the part (or that specific
  type) **isn't** stocked, you can request your **Admin to add it** (a brand-new part needs
  approval); an Admin can add it directly.
- **New parts sale** - build a cart, then **checkout** (records a paid order) or **attach the cart
  to an active service job** so it bills through that job.
- **Orders** - review/edit open orders, mark them paid, and print.
- Stock, sales and the parts catalog are all per-dealership.

### Sales
A sub-navigation of **Car Sales** (revenue & units, trends, financing/segment mix), **Sales** (the
list of individual vehicle sales - click one for its detail & printable bill), and **Sales Team**
(per-rep units, revenue, targets, and an email-progress action). Admins/managers can set a rep's
**target** (revenue or units).

### Billing
Service and parts billing in one place: cards for Service Billed, Service Unpaid, Paid Parts,
Unpaid Parts and Total Billed, a filter panel (search, date range, payment status), and Paid /
Unpaid views. **Mark paid** records who collected payment. **Print** produces a clean letterhead
document.

> **Tax & VAT:** the dashboard shows **pre-tax** totals everywhere. Tax and VAT are added **only on
> the printed bill**, shown as a clear breakdown: **Total → Tax (10%) → VAT (13%) → Grand Total**
> (VAT applies to total + tax). Item prices are always shown without tax. Rates are configurable
> per dealership in **Settings**.

### Approvals (Admin)
Some actions need the **dealership Admin's** sign-off and are queued here: edits to **completed
service records**, edits to **paid bills / parts orders**, and **new-part requests** from staff.
Approve or reject each (rejections can carry a reason). Approving a new-part request adds it to the
dealership's inventory. The header **bell** notifies the Admin of new requests, and notifies the
requesting staff when their item is approved.

### Add New Item (Admin)
Two tabs:
- **Add new item** - add parts to inventory (add/remove categories inline), create servicing items
  (add/remove service types), and create system users. For a **Staff** access level you also pick
  a staff type (Service / Parts / HR / Sales).
- **Edit items** - search and rename your service types & parts catalog, and edit stocked parts.

### Settings
- **Appearance** - Light / Dark / System theme.
- **Dashboard preferences** - revenue chart, live tiles, sidebar default, table density, landing page.
- **Brand accent** (Admin) - your dealership's accent color, applied across the dashboard and bills.
- **Tax & VAT** (Admin) - the Tax % and VAT % used on bills (defaults: **10%** and **13%**).

---

## 4. Platform admin (VINsight team)

Signing in via the **Admin** tab opens the platform console at `/admin`:

- **Dashboard** - overview of all dealerships.
- **Dealerships** - onboard a new dealership (name, branding/logo, contact, package) or edit an
  existing one; activate/deactivate.
- **Catalog & packages** - edit the onboarding **packages** (which service types & parts
  categories each includes; add/remove/rename) and manage each dealership's service & parts catalogs.
- **Add Item** - add parts, servicing items, or users **for any dealership** (pick the dealership
  at the top).

Change-request **approvals are handled by each dealership's own Admin** (in the dealer dashboard),
not by the platform team.

---

## 5. Good to know

- **Demo data** is deterministic and lives in your browser; signing in as different roles/dealerships
  shows different, isolated data. Clearing site data resets everything.
- **Any password** is accepted in the demo.
- The production security model (real auth, server-enforced tenant isolation & RBAC, API + database)
  is documented in [SECURITY.md](SECURITY.md).
