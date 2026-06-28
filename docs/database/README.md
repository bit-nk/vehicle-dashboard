# Database

The real database design for Vehicle Records. **`schema.sql`** is the source of truth
(PostgreSQL 15+ DDL - every table, key, column, index, enum). This file is the map.

## Conventions
- **Currency:** Nepali Rupees. Money columns are `numeric(14,2)` with `currency char(3) DEFAULT 'NPR'`.
- **Distance:** kilometres (`integer`). **Fuel economy:** km/l. **CO₂:** g/km.
- **Geography:** Nepal `provinces` (seeded) + `cities`. No US states / ZIP / mpg / USD.
- **PKs:** `uuid` (`gen_random_uuid()`), except `audit_logs` (bigint identity).
- **Auth:** passwords hashed (Argon2id); sessions store a token **hash**, never the raw token.

## Table groups

| Group | Tables |
|---|---|
| Reference | `provinces`, `cities`, `makes`, `models` |
| Identity | `companies`, `users`, `sessions`, `customer_vehicles` |
| Vehicle | `vehicles`, `vehicle_photos`, `vehicle_safety_ratings`, `recalls` |
| History (paywalled) | `ownership_records`, `accident_records`, `service_records`, `title_records`, `odometer_readings`, `liens`, `emission_tests`, `warranties` |
| Commerce | `dealers`, `listings`, `favorites` |
| Reports / paywall | `report_products`, `report_orders`, `payments`, `report_unlocks` |
| Dashboard ops | `vehicle_acquisitions`, `sales_transactions`, `service_jobs`, `customer_followups` |
| Dealer ERP (dashboard) | `branches`, `branch_sales_targets`, `sales_reps`, `stock_items`, `service_slot_templates`, `contacts`, `roles`, `role_permissions` |
| Audit | `audit_logs` |

**Dealer dashboard mapping:** `companies` = the **dealership** (tenant). `branches` belong to a
dealership; `stock_items` is the inventory (status/stock_no/landed cost/branch), `sales_reps` back the
rep leaderboard, `branch_sales_targets` hold period targets, `service_jobs` gained booking columns
(slot_date/slot_time/requested_services/completed_on/notes/walk-in customer), `roles`+`role_permissions`
hold the RBAC matrix, and every ops table carries `branch_id`. **Row-Level Security** policies (bottom of
`schema.sql`) enforce tenant isolation server-side via `app.dealership_id`.

## Key relationships
- `vehicles` is the hub: every history/photo/safety/recall row FKs to it via `vehicle_id`.
- `users.role` splits the two audiences: `customer` (own data, `company_id` NULL) vs `company_*` staff (`company_id` set). A CHECK enforces this.
- `customer_vehicles` links a customer to the vehicles they own → customer portal.
- `report_unlocks` is the **server-side paywall gate**: the full report is served only if a non-expired unlock row exists. (In `apps/web` today this is a client-side `sessionStorage` demo; the DB models the real thing.)
- Dashboard lifecycle: `vehicle_acquisitions` (import) → `listings` → `sales_transactions` → `service_jobs` → `customer_followups`.

## How the current app data maps to columns

The demo dataset in `packages/shared/src/data/vehicles.js` maps cleanly:

| App field (vehicle object) | Table.column |
|---|---|
| `vin`, `year`, `trim`, `bodyStyle` | `vehicles.vin`, `.model_year`, `.trim`, `.body_style` |
| `engine`, `transmission`, `drivetrain`, `fuelType` | `vehicles.engine`, `.transmission`, `.drivetrain`, `.fuel_type` |
| `kmplCity`, `kmplHwy`, `co2gkm`, `seats` | `vehicles.kmpl_city`, `.kmpl_hwy`, `.co2_gpkm`, `.seats` |
| `exteriorColor`, `colorHex`, `interiorColor` | `vehicles.exterior_color`, `.exterior_color_hex`, `.interior_color` |
| `epaClass` | `vehicles.size_class` |
| `features[]` | `vehicle_features.feature` (one row each) |
| `price`, `marketValue` | `listings.price_npr`, `.market_value_npr` |
| `mileage` | `listings.odometer_km` |
| `location.city/province`, `dealer` | `cities`, `provinces`, `dealers` |
| `photo.{thumbUrl,fullUrl,sourceUrl,license,licenseUrl,author}` | `vehicle_photos.*` |
| `history.theftCheck` | `vehicles.theft_check_result` |
| `history.emissions.required` | `vehicles.emissions_required` |
| `safety.{overall,frontalCrash,sideCrash,rollover}` | `vehicle_safety_ratings.*` |
| `history.recalls[]` | `recalls.*` |
| `history.ownership[]` | `ownership_records.*` |
| `history.accidentRecords[]` | `accident_records.*` |
| `history.serviceRecords[]` | `service_records.*` |
| `history.titleRecords[]` | `title_records.*` |
| `history.odometer[]` | `odometer_readings.*` |
| `history.lien` | `liens.*` |
| `history.emissions` | `emission_tests.*` |
| `history.warranty` | `warranties.*` |

## Notes for going live
- Payment providers in the `payment_provider` enum are Nepal gateways (eSewa, Khalti, IME Pay, ConnectIPS) + bank transfer / cash.
- Add an exchange-rate or `prices` table if you ever store original-currency import costs alongside NPR.
- `audit_logs` should capture every company-staff access to customer data (privacy).
- See `../../SECURITY.md` for the auth/RBAC model these tables assume.
