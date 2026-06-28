# Changelog

All notable changes to this project are documented here.

## [1.0.0] — 2026-06-27

First complete release of the Vehicle Records platform (front-end demo).

### Public site (VINsight)
- Vehicle listings with search and filters; full vehicle-history reports with a free
  snapshot and a paywalled full report.
- "Sell your vehicle" intake form.
- Nepal localization (NPR, local provinces, makes/models).

### Dealer dashboard
- Multi-tenant dealership isolation with two-mode sign-in (dealership + platform admin)
  and role-based access control.
- Inventory: stock list, advanced filters, detail pages, and status changes.
- Servicing: bookings, vehicle check-in, live queue, work orders, and bill generation.
- Parts: per-branch stock, receive/restock with inventory matching, cascading catalog,
  parts sales, and parts attached to service jobs.
- Sales: car sales, branch targets, and per-rep performance.
- Billing: printable service and parts invoices on plain letterhead.
- Approvals & in-app notifications for new-part requests and edits to completed/paid
  records, handled by the dealership admin.
- Per-dealership branding (logo, accent color) and onboarding packages.

### Platform admin
- Dealership onboarding, service & parts catalog management, onboarding packages, and
  cross-dealership item creation.

### Foundation
- npm-workspaces monorepo (`apps/web`, `apps/dashboard`, `packages/shared`).
- React 19, React Router 7, Vite 6, Tailwind CSS 4, Recharts.
- Light/dark themes; input sanitization on forms; production backlog documented in
  `docs/TODO.md` and `SECURITY.md`.
