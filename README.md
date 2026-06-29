# Vehicle Records — VINsight

A vehicle-history and dealership-operations platform for the Nepali market, built as a
modern web monorepo. It pairs a **public vehicle-history site** (Carfax-style report
lookups) with a **multi-tenant dealer dashboard** that runs a dealership's day-to-day
operations — inventory, servicing, parts, sales, and billing.

> **Demo build.** This repository is a front-end demonstration. There is no backend yet:
> all data is simulated and stored in the browser. See [SECURITY.md](SECURITY.md) for the
> security posture and what must move server-side (API, database, auth, RBAC) before production.

---

## What's inside

**VINsight (public site)** — `apps/web`
- Search and browse vehicle listings with rich history reports.
- Free snapshot + paywalled full report (ownership, accidents, service, title, odometer,
  recalls, emissions).
- "Sell your vehicle" intake form.
- Nepal-localized: NPR pricing, local provinces and makes/models.

**Dealer Dashboard** — `apps/dashboard`
- **Multi-tenant**: each dealership sees only its own branches, inventory, and customers.
- **Role-based access** (Admin, Sales, Service, Parts, Finance, HR, …) — navigation and
  actions are gated per role.
- **Inventory** — vehicle stock with advanced filters, detail pages, and status changes.
- **Servicing** — bookings, vehicle check-in, a live service queue, work orders, and
  bill generation.
- **Parts** — per-branch stock, receive/restock, a cascading parts catalog, parts sales,
  and attaching parts to a service job.
- **Sales** — car sales, branch targets, and per-rep performance.
- **Billing** — service and parts invoices with printable, plain letterhead documents.
- **Approvals & notifications** — staff requests (new parts, edits to completed or paid
  records) route to the dealership Admin for approval, with in-app notifications.
- **Per-dealership branding** — logo, accent color, and onboarding packages.

**Platform Admin (VINsight team)** — within `apps/dashboard` at `/admin`
- Onboard dealerships, manage service & parts catalogs and onboarding packages, and add
  items on behalf of any dealership.

---

## Tech stack

- **React 19** + **React Router 7**
- **Vite 6** (multi-app, shared package via the `@shared` alias)
- **Tailwind CSS 4** (design tokens, light/dark themes)
- **Recharts** for dashboards (lazy-loaded)
- **npm workspaces** monorepo

---

## Repository layout

```
.
├── apps/
│   ├── web/          # VINsight public site             (@vinsight/web)
│   └── dashboard/    # Dealer + platform-admin app       (@vinsight/dashboard)
├── packages/
│   └── shared/       # Shared lib, UI, and seed data     (@vinsight/shared)
├── docs/             # Production backlog & schema notes
├── SECURITY.md       # Security posture & production requirements
└── CHANGELOG.md
```

---

## Getting started

**Prerequisites:** Node.js 18+ and npm 9+.

```bash
# 1. Install (workspaces — run once at the repo root)
npm install

# 2a. Run the public site         → http://localhost:5173
npm run dev

# 2b. Run the dealer dashboard    → http://localhost:5174
npm run dev:dashboard
```

Build for production:

```bash
npm run build           # public site
npm run build:dashboard # dashboard
npm run build:all       # both
```

---

## Signing in (demo)

The dashboard has two sign-in modes. **Any password works** in the demo.

- **Dealership** — pick a dealership (Himalayan Auto Group, Everest Motors, or Annapurna
  Autos), then click a role chip to fill a demo account, or type a work email. Each role
  lands on the section it is allowed to see.
- **Admin** — sign in as the platform team with `admin@vinsight.app` to reach `/admin`.

The dashboard links to the public site (top-right "Public site"), and the public site
links back to the dashboard.

---

## Documentation

- [USER_GUIDE.md](USER_GUIDE.md) — end-user guide: login instructions and how each module
  (public site + dashboard) works.
- [SECURITY.md](SECURITY.md) — security posture and what must move server-side (API,
  database, RBAC enforcement, schema, and the production backlog) before this is
  production-safe.

---

## License

Proprietary. See [LICENSE](LICENSE). **Not for redistribution.**
