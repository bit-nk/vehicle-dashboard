-- =====================================================================
-- Vehicle Records - Database Schema (PostgreSQL 15+)
-- =====================================================================
-- Single source of truth for building the real database. Covers BOTH apps:
--   • apps/web        - public vehicle-history + listings site
--   • apps/dashboard  - customer logins + company console (planned)
--
-- Conventions
--   • Currency: Nepali Rupees (NPR). Money = numeric(14,2), currency char(3) DEFAULT 'NPR'.
--   • Distance: kilometres (integer). Fuel economy: km/l. CO2: g/km.
--   • Locations: Nepal provinces + cities (NO US states / ZIP / mpg / USD).
--   • PKs: uuid DEFAULT gen_random_uuid(). Timestamps: timestamptz DEFAULT now().
--   • All money/units are localized; nothing US-only is stored.
--
-- Run order: extensions → enums → reference → identity → vehicles → history
--            → commerce → reports/paywall → dashboard ops → audit.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email/vin

-- ---------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------
CREATE TYPE body_style       AS ENUM ('SUV','Sedan','Truck','Coupe','Hatchback','Minivan','Wagon');
CREATE TYPE fuel_type        AS ENUM ('Gasoline','Diesel','Hybrid','Electric','CNG','LPG');
CREATE TYPE drivetrain       AS ENUM ('FWD','RWD','AWD','4WD');
CREATE TYPE title_brand      AS ENUM ('Clean','Rebuilt','Written-off','Reconditioned');
CREATE TYPE primary_use      AS ENUM ('Personal','Lease','Commercial','Government');
CREATE TYPE owner_type       AS ENUM ('Personal','Lease (Personal)','Commercial fleet','Government');
CREATE TYPE accident_severity AS ENUM ('Minor Damage','Moderate Damage','Severe Damage','Totaled');
CREATE TYPE recall_status    AS ENUM ('Open - action recommended','Remedy available');
CREATE TYPE listing_status   AS ENUM ('draft','active','reserved','sold','withdrawn');
CREATE TYPE user_role        AS ENUM ('customer','company_admin','company_sales','company_service','company_finance');
CREATE TYPE order_status     AS ENUM ('pending','paid','failed','refunded');
CREATE TYPE payment_provider AS ENUM ('esewa','khalti','imepay','connectips','bank_transfer','cash');
CREATE TYPE acquisition_kind AS ENUM ('import','trade_in','auction','consignment','local_purchase');
-- service workflow states (reconciled with the dashboard's booking -> completion flow)
CREATE TYPE service_job_status AS ENUM ('requested','confirmed','in_progress','awaiting_parts','completed','invoiced','cancelled');
CREATE TYPE followup_channel AS ENUM ('call','sms','email','whatsapp','visit');
CREATE TYPE followup_status  AS ENUM ('pending','scheduled','done','missed','cancelled');
-- operational state of a physical stock item (distinct from marketplace listing_status)
CREATE TYPE stock_status    AS ENUM ('in_stock','reserved','in_service','sold');

-- =====================================================================
-- REFERENCE / LOOKUP
-- =====================================================================
CREATE TABLE provinces (
  id          smallint PRIMARY KEY,             -- 1..7
  name        text NOT NULL UNIQUE,             -- 'Bagmati', 'Gandaki', ...
  code        text NOT NULL UNIQUE              -- short label used on plates
);

CREATE TABLE cities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  province_id smallint NOT NULL REFERENCES provinces(id),
  UNIQUE (name, province_id)
);
CREATE INDEX idx_cities_province ON cities(province_id);

CREATE TABLE makes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE              -- 'Toyota', 'Honda', ...
);

CREATE TABLE models (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id     uuid NOT NULL REFERENCES makes(id) ON DELETE CASCADE,
  name        text NOT NULL,                    -- 'RAV4', 'Civic', ...
  body_style  body_style,
  UNIQUE (make_id, name)
);
CREATE INDEX idx_models_make ON models(make_id);

-- =====================================================================
-- IDENTITY  (customers + company staff for the dashboard)
-- =====================================================================
CREATE TABLE companies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  pan_vat     text,                             -- Nepal PAN/VAT registration no.
  province_id smallint REFERENCES provinces(id),
  city_id     uuid REFERENCES cities(id),
  phone       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE NOT NULL,
  phone         text,                           -- +977 …
  password_hash text NOT NULL,                  -- Argon2id
  full_name     text NOT NULL,
  role          user_role NOT NULL DEFAULT 'customer',
  company_id    uuid REFERENCES companies(id) ON DELETE SET NULL,  -- NULL for customers
  mfa_enabled   boolean NOT NULL DEFAULT false,
  mfa_secret    text,
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- company staff must belong to a company; customers must not
  CONSTRAINT staff_have_company CHECK (
    (role = 'customer' AND company_id IS NULL) OR
    (role <> 'customer' AND company_id IS NOT NULL)
  )
);
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,             -- store hash, never the raw token
  ip          inet,
  user_agent  text,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- =====================================================================
-- VEHICLES  (one row per physical vehicle, keyed by VIN)
-- =====================================================================
CREATE TABLE vehicles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vin             citext UNIQUE NOT NULL,        -- 17-char, validated [A-HJ-NPR-Z0-9]{17}
  make_id         uuid NOT NULL REFERENCES makes(id),
  model_id        uuid NOT NULL REFERENCES models(id),
  model_year      smallint NOT NULL,
  trim            text,
  body_style      body_style NOT NULL,
  -- powertrain (real spec data)
  engine          text,                          -- '2.5L 4-cyl' / 'Dual Motor Electric'
  displacement_l  numeric(4,1),
  cylinders       smallint,
  transmission    text,
  drivetrain      drivetrain,
  fuel_type       fuel_type NOT NULL,
  kmpl_city       numeric(4,1),                  -- NULL for EV
  kmpl_hwy        numeric(4,1),
  co2_gpkm        smallint,                      -- grams per km; 0 for EV
  seats           smallint,
  size_class      text,                          -- size/segment class, e.g. 'Small Sport Utility Vehicle'
  -- appearance
  exterior_color  text,
  exterior_color_hex text,                       -- '#5d6066' (for UI swatch / SVG fallback)
  interior_color  text,
  -- registration
  primary_use     primary_use NOT NULL DEFAULT 'Personal',
  current_title_brand title_brand NOT NULL DEFAULT 'Clean',
  registered_province_id smallint REFERENCES provinces(id),
  open_recall     boolean NOT NULL DEFAULT false,
  emissions_required boolean NOT NULL DEFAULT true,  -- vehicle-level: subject to green-sticker testing
  theft_check_result text,                       -- e.g. 'No theft or total-loss record found'
  last_reported_on date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vin_format CHECK (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  CONSTRAINT model_year_range CHECK (model_year BETWEEN 1950 AND 2100)
);
CREATE INDEX idx_vehicles_make_model ON vehicles(make_id, model_id);
CREATE INDEX idx_vehicles_year ON vehicles(model_year);
CREATE INDEX idx_vehicles_body ON vehicles(body_style);

-- Links a customer (user) to vehicles they own - powers the customer portal.
CREATE TABLE customer_vehicles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id  uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  is_current  boolean NOT NULL DEFAULT true,
  linked_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, vehicle_id)
);
CREATE INDEX idx_custveh_user ON customer_vehicles(user_id);
CREATE INDEX idx_custveh_vehicle ON customer_vehicles(vehicle_id);

CREATE TABLE vehicle_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url         text NOT NULL,
  thumb_url   text,
  source_url  text,                              -- attribution: link to source page
  license     text,                              -- 'CC0', 'CC BY-SA 4.0', ...
  license_url text,                              -- link to the license deed
  author      text,                              -- required for CC-BY / CC-BY-SA
  is_primary  boolean NOT NULL DEFAULT false,
  sort_order  smallint NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_photos_vehicle ON vehicle_photos(vehicle_id);
CREATE UNIQUE INDEX uq_photo_primary ON vehicle_photos(vehicle_id) WHERE is_primary;

-- Features / options (one row per feature; e.g. 'Bluetooth', 'Tow Package').
CREATE TABLE vehicle_features (
  vehicle_id  uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  feature     text NOT NULL,
  PRIMARY KEY (vehicle_id, feature)
);

-- Crash-test safety ratings (NCAP-style; program-agnostic so non-US programs fit).
CREATE TABLE vehicle_safety_ratings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  program       text NOT NULL DEFAULT 'NCAP',
  overall       smallint CHECK (overall BETWEEN 1 AND 5),
  frontal_crash smallint CHECK (frontal_crash BETWEEN 1 AND 5),
  side_crash    smallint CHECK (side_crash BETWEEN 1 AND 5),
  rollover      smallint CHECK (rollover BETWEEN 1 AND 5),
  UNIQUE (vehicle_id, program)
);

-- Manufacturer recalls (defect is global; US admin identifiers intentionally omitted).
CREATE TABLE recalls (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  component       text NOT NULL,
  summary         text,
  consequence     text,                          -- safety risk if not repaired (global)
  remedy          text,                          -- localized: how to get the fix in Nepal
  authorized_dealer text,                         -- Nepal distributor handling the repair
  status          recall_status NOT NULL DEFAULT 'Open - action recommended',
  reported_on     date,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_recalls_vehicle ON recalls(vehicle_id);

-- =====================================================================
-- VEHICLE HISTORY  (the paywalled report content)
-- =====================================================================
CREATE TABLE ownership_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  owner_seq     smallint NOT NULL,               -- 1,2,3 …
  owner_type    owner_type NOT NULL DEFAULT 'Personal',
  province_id   smallint REFERENCES provinces(id),
  purchased_on  date,
  duration_years smallint,
  est_km_per_year integer,
  last_odometer_km integer,
  UNIQUE (vehicle_id, owner_seq)
);
CREATE INDEX idx_ownership_vehicle ON ownership_records(vehicle_id);

CREATE TABLE accident_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  occurred_on   date,
  event_type    text,                            -- 'Accident reported', 'Damage reported'
  severity      accident_severity NOT NULL,      -- Minor/Moderate/Severe Damage, or Totaled
  damage_location text,                          -- impact area: 'Front','Rear','Left side',...
  point_of_impact text,
  airbags_deployed boolean,
  structural_damage boolean,                     -- structural/frame damage reported
  driveable     text,                            -- 'Vehicle reported driveable','Towed from scene','Not driveable - towed'
  source        text,                            -- 'Police report','Insurance record','Repair facility'
  estimated_damage_npr numeric(14,2),            -- estimated repair / loss value
  city_id       uuid REFERENCES cities(id),
  province_id   smallint REFERENCES provinces(id),
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_accidents_vehicle ON accident_records(vehicle_id);

CREATE TABLE service_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  serviced_on   date NOT NULL,
  odometer_km   integer,
  provider      text,                            -- service facility / dealer name
  service_type  text,                            -- 'Maintenance','Repair','Inspection'
  source        text,                            -- 'Service facility reported','Dealer reported',...
  invoice_no    text,                            -- repair-order / invoice number
  advisor       text,                            -- service advisor / technician
  items         jsonb NOT NULL DEFAULT '[]',     -- line items: ['Oil change','Tyre rotation']
  labour_cost_npr numeric(14,2),
  parts_cost_npr  numeric(14,2),
  total_npr       numeric(14,2),
  next_service_due_km integer,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_vehicle ON service_records(vehicle_id);

CREATE TABLE title_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  recorded_on   date NOT NULL,
  province_id   smallint REFERENCES provinces(id),
  event         text NOT NULL,                   -- 'Registered - new vehicle', …
  title_brand   title_brand
);
CREATE INDEX idx_title_vehicle ON title_records(vehicle_id);

CREATE TABLE odometer_readings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  reading_year  smallint NOT NULL,
  odometer_km   integer NOT NULL,
  source        text,
  UNIQUE (vehicle_id, reading_year)
);

CREATE TABLE liens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  has_lien      boolean NOT NULL DEFAULT false,
  lender        text,                            -- Nepali bank / co-op / finance
  opened_on     date,
  status        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_liens_vehicle ON liens(vehicle_id);

-- Nepal emission test ("green sticker").
CREATE TABLE emission_tests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  tested_on     date NOT NULL,
  result        text NOT NULL,                   -- 'Pass - green sticker issued'
  station       text,
  province_id   smallint REFERENCES provinces(id)
);
CREATE INDEX idx_emission_vehicle ON emission_tests(vehicle_id);

CREATE TABLE warranties (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id           uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  basic_terms          text,                     -- '3 yr / 100,000 km'
  powertrain_terms     text,
  basic_expires_on     date,
  powertrain_expires_on date
);

-- =====================================================================
-- COMMERCE  (dealers + marketplace listings)
-- =====================================================================
CREATE TABLE dealers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid REFERENCES companies(id) ON DELETE SET NULL,
  name          text NOT NULL,
  city_id       uuid REFERENCES cities(id),
  province_id   smallint REFERENCES provinces(id),
  phone         text,
  email         text,                            -- where availability enquiries are sent
  rating        numeric(2,1) CHECK (rating BETWEEN 0 AND 5),
  reviews_count integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dealers_province ON dealers(province_id);

CREATE TABLE listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  dealer_id       uuid REFERENCES dealers(id) ON DELETE SET NULL,
  price_npr       numeric(14,2) NOT NULL,
  market_value_npr numeric(14,2),
  currency        char(3) NOT NULL DEFAULT 'NPR',
  odometer_km     integer NOT NULL,
  status          listing_status NOT NULL DEFAULT 'active',
  city_id         uuid REFERENCES cities(id),
  province_id     smallint REFERENCES provinces(id),
  listed_on       date NOT NULL DEFAULT current_date,
  sold_on         date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_positive CHECK (price_npr >= 0)
);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_price ON listings(price_npr);
CREATE INDEX idx_listings_vehicle ON listings(vehicle_id);
CREATE INDEX idx_listings_odometer ON listings(odometer_km);
CREATE INDEX idx_listings_province ON listings(province_id);
-- Hot path: active listings sorted/ranged by price. Lets the planner range-scan the
-- common "browse active inventory by price" query without touching sold/withdrawn rows.
CREATE INDEX idx_listings_status_price ON listings(status, price_npr);

-- Faceted-search support: the listings filter intersects many vehicle attributes. These
-- single-column indexes let Postgres bitmap-AND them (or a search engine facet them) at
-- scale instead of a full scan. See docs/TODO.md "Search & filtering at scale".
-- (make_id is already covered by the composite idx_vehicles_make_model above;
--  body_style by idx_vehicles_body above.)
CREATE INDEX idx_vehicles_model ON vehicles(model_id);
CREATE INDEX idx_vehicles_fuel ON vehicles(fuel_type);
CREATE INDEX idx_vehicles_drivetrain ON vehicles(drivetrain);
CREATE INDEX idx_vehicles_make_year ON vehicles(make_id, model_year);

CREATE TABLE favorites (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

-- Buyer "check availability" enquiries sent to a dealer/seller. The public site
-- composes a mailto: today; the dashboard reads/answers these leads server-side.
CREATE TABLE leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  listing_id    uuid REFERENCES listings(id) ON DELETE SET NULL,
  dealer_id     uuid REFERENCES dealers(id) ON DELETE SET NULL,
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,  -- nullable: guest enquiry
  name          text NOT NULL,
  email         text NOT NULL,
  phone         text,
  message       text,
  channel       text NOT NULL DEFAULT 'availability_enquiry',
  status        text NOT NULL DEFAULT 'new',     -- new / contacted / closed
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_dealer ON leads(dealer_id);
CREATE INDEX idx_leads_vehicle ON leads(vehicle_id);

-- "Sell your vehicle" intake. If the VIN matches a known vehicle, specs/history are
-- pulled from `vehicles`; otherwise the seller supplies make/model/year (specs auto-
-- filled from the catalog) plus the condition fields below. The dashboard reviews
-- these and promotes accepted ones into `vehicles` + `listings`.
CREATE TABLE seller_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vin             citext,                          -- may be null / unknown
  matched_vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,  -- set when VIN was on record
  make            text NOT NULL,
  model           text NOT NULL,
  model_year      smallint NOT NULL,
  trim            text,
  -- specs (auto-filled from catalog; stored as submitted)
  body_style      text,
  engine          text,
  transmission    text,
  drivetrain      text,
  fuel_type       text,
  seats           smallint,
  -- seller-supplied condition & history
  odometer_km     integer NOT NULL,
  owners          smallint,
  had_accidents   boolean NOT NULL DEFAULT false,
  accident_count  smallint,
  worst_damage    text,                            -- 'Minor Damage'..'Totaled'
  serviced        boolean,
  service_count   smallint,
  title_brand     title_brand DEFAULT 'Clean',
  exterior_color  text,
  -- listing + contact
  asking_price_npr numeric(14,2) NOT NULL,
  province_id     smallint REFERENCES provinces(id),
  city            text,
  description     text,
  seller_name     text NOT NULL,
  seller_email    text NOT NULL,
  seller_phone    text,
  status          text NOT NULL DEFAULT 'pending', -- pending / approved / listed / rejected
  reference_no    text,                            -- shown to the seller (e.g. VS-123456)
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_submissions_status ON seller_submissions(status);
CREATE INDEX idx_submissions_vin ON seller_submissions(vin);

-- =====================================================================
-- REPORTS / PAYWALL
-- =====================================================================
CREATE TABLE report_products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,            -- 'single','triple','unlimited'
  name          text NOT NULL,
  price_npr     numeric(14,2) NOT NULL,
  currency      char(3) NOT NULL DEFAULT 'NPR',
  report_credits integer,                        -- NULL = unlimited
  validity_days integer NOT NULL DEFAULT 30,
  is_active     boolean NOT NULL DEFAULT true
);

CREATE TABLE report_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,  -- nullable: guest checkout
  product_id    uuid NOT NULL REFERENCES report_products(id),
  amount_npr    numeric(14,2) NOT NULL,
  currency      char(3) NOT NULL DEFAULT 'NPR',
  status        order_status NOT NULL DEFAULT 'pending',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user ON report_orders(user_id);

CREATE TABLE payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES report_orders(id) ON DELETE CASCADE,
  provider      payment_provider NOT NULL,       -- eSewa / Khalti / IME Pay / ConnectIPS …
  amount_npr    numeric(14,2) NOT NULL,
  currency      char(3) NOT NULL DEFAULT 'NPR',
  status        order_status NOT NULL DEFAULT 'pending',
  txn_ref       text,                            -- gateway transaction id
  paid_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_order ON payments(order_id);

-- A report unlock entitles a user to a vehicle's full report until expiry.
-- The server MUST gate the full report on a row here (never client-side only).
CREATE TABLE report_unlocks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  order_id      uuid REFERENCES report_orders(id) ON DELETE SET NULL,
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  unlocked_at   timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz,
  UNIQUE (user_id, vehicle_id)
);
CREATE INDEX idx_unlocks_user ON report_unlocks(user_id);

-- =====================================================================
-- DASHBOARD OPS  (company console: import → sell → service → follow-up)
-- =====================================================================
-- How a company acquired a vehicle into inventory (import is the common case in Nepal).
CREATE TABLE vehicle_acquisitions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id      uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  kind            acquisition_kind NOT NULL,
  source_country  text,                          -- e.g. 'Japan','India' for imports
  customs_ref     text,                          -- Nepal customs / DoTM reference
  landed_cost_npr numeric(14,2),                 -- purchase + duty + freight
  acquired_on     date NOT NULL,
  created_by      uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_acq_company ON vehicle_acquisitions(company_id);
CREATE INDEX idx_acq_vehicle ON vehicle_acquisitions(vehicle_id);

CREATE TABLE sales_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id      uuid NOT NULL REFERENCES vehicles(id),
  listing_id      uuid REFERENCES listings(id) ON DELETE SET NULL,
  buyer_user_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  buyer_name      text,
  buyer_phone     text,
  sale_price_npr  numeric(14,2) NOT NULL,
  currency        char(3) NOT NULL DEFAULT 'NPR',
  salesperson_id  uuid REFERENCES users(id),
  sold_on         date NOT NULL DEFAULT current_date,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_company ON sales_transactions(company_id);
CREATE INDEX idx_sales_vehicle ON sales_transactions(vehicle_id);

CREATE TABLE service_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id      uuid NOT NULL REFERENCES vehicles(id),
  customer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  odometer_km     integer,
  status          service_job_status NOT NULL DEFAULT 'open',
  complaint       text,
  work_done       text,
  parts           jsonb NOT NULL DEFAULT '[]',
  labor_cost_npr  numeric(14,2),
  parts_cost_npr  numeric(14,2),
  total_npr       numeric(14,2),
  assigned_to     uuid REFERENCES users(id),
  opened_on       date NOT NULL DEFAULT current_date,
  closed_on       date,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_company ON service_jobs(company_id);
CREATE INDEX idx_jobs_vehicle ON service_jobs(vehicle_id);
CREATE INDEX idx_jobs_status ON service_jobs(status);

CREATE TABLE customer_followups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  vehicle_id      uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  channel         followup_channel NOT NULL,
  status          followup_status NOT NULL DEFAULT 'scheduled',
  reason          text,                          -- 'service due','insurance renewal',…
  notes           text,
  due_on          date,
  completed_at    timestamptz,
  assigned_to     uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_followups_company ON customer_followups(company_id);
CREATE INDEX idx_followups_due ON customer_followups(due_on);

-- =====================================================================
-- AUDIT  (who did what - important for company access to customer data)
-- =====================================================================
CREATE TABLE audit_logs (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action        text NOT NULL,                   -- 'login','view_report','update_listing',…
  entity        text,                            -- table/resource name
  entity_id     text,
  meta          jsonb NOT NULL DEFAULT '{}',
  ip            inet,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- =====================================================================
-- DEALER ERP / DASHBOARD  (normalized backing for apps/dashboard)
-- =====================================================================
-- NOTE: `companies` IS the dealership (the tenant). Each dealership has many branches;
-- all operational rows are scoped by company_id (tenant) AND branch_id. This section
-- adds the entities the dashboard produces and back-fills branch/role FKs on the
-- existing ops tables, then enables row-level security. Run after all CREATE TABLEs above.

-- Branches of a dealership (the dashboard's BRANCHES).
CREATE TABLE branches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,  -- tenant
  name          text NOT NULL,
  city_id       uuid REFERENCES cities(id),
  province_id   smallint REFERENCES provinces(id),
  monthly_target_units smallint,                 -- default branch sales target / month
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);
CREATE INDEX idx_branches_company ON branches(company_id);

-- Period-aware branch sales targets (avoids hard-coding a single monthly number).
CREATE TABLE branch_sales_targets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  period_month  date NOT NULL,                   -- first day of the target month
  target_units  smallint NOT NULL,
  UNIQUE (branch_id, period_month)
);

-- Sales reps (branch-scoped sellers; optionally linked to a user account).
CREATE TABLE sales_reps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id     uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  name          text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_reps_branch ON sales_reps(branch_id);

-- Physical stock items (the dashboard's inventory). Operational status lives here,
-- separate from marketplace `listings.status`.
CREATE TABLE stock_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id     uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id),
  stock_no      text NOT NULL,
  status        stock_status NOT NULL DEFAULT 'in_stock',
  landed_cost_npr numeric(14,2),                 -- dealer cost incl. import duty/freight
  source_kind   acquisition_kind,
  source_detail text,                            -- e.g. 'Import - Japan'
  arrived_on    date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, stock_no)
);
CREATE INDEX idx_stock_company ON stock_items(company_id);
CREATE INDEX idx_stock_branch ON stock_items(branch_id);
CREATE INDEX idx_stock_status ON stock_items(status);

-- Bookable service slot templates (which times a branch offers).
CREATE TABLE service_slot_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  slot_time     text NOT NULL,                   -- '09:00'
  weekday       smallint,                        -- 0-6, NULL = every day
  is_active     boolean NOT NULL DEFAULT true,
  UNIQUE (branch_id, slot_time, weekday)
);

-- Shared customer/contact identity (registered users OR walk-ins).
CREATE TABLE contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,  -- NULL for walk-ins
  name          text NOT NULL,
  phone         text,
  email         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_company ON contacts(company_id);

-- RBAC: roles + per-section permission matrix (replaces the 5-value user_role enum).
CREATE TABLE roles (
  code          text PRIMARY KEY,                -- 'Admin','Sales','Finance','HR',...
  name          text NOT NULL,
  description   text
);
CREATE TABLE role_permissions (
  role_code     text NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  section       text NOT NULL,                   -- 'overview','inventory','service','sales','finance','hr'
  can_view      boolean NOT NULL DEFAULT false,
  can_edit      boolean NOT NULL DEFAULT false,
  PRIMARY KEY (role_code, section)
);

-- ---- back-fill branch / rep / role FKs + booking columns on existing ops tables ----
ALTER TABLE users                ADD COLUMN role_code text REFERENCES roles(code);  -- supersedes user_role enum for staff
ALTER TABLE vehicle_acquisitions ADD COLUMN branch_id uuid REFERENCES branches(id);
ALTER TABLE vehicle_acquisitions ADD COLUMN stock_item_id uuid REFERENCES stock_items(id);
ALTER TABLE sales_transactions   ADD COLUMN branch_id uuid REFERENCES branches(id);
ALTER TABLE sales_transactions   ADD COLUMN rep_id uuid REFERENCES sales_reps(id);
ALTER TABLE sales_transactions   ADD COLUMN stock_item_id uuid REFERENCES stock_items(id);
ALTER TABLE leads                ADD COLUMN branch_id uuid REFERENCES branches(id);
ALTER TABLE seller_submissions   ADD COLUMN kmpl_city numeric(4,1);
ALTER TABLE seller_submissions   ADD COLUMN kmpl_hwy  numeric(4,1);

-- service_jobs: support bookings (slot), walk-in/unknown-VIN customers, and completion data
ALTER TABLE service_jobs ALTER COLUMN vehicle_id DROP NOT NULL;       -- allow 'VIN unknown' bookings
ALTER TABLE service_jobs ADD COLUMN branch_id uuid REFERENCES branches(id);
ALTER TABLE service_jobs ADD COLUMN stock_item_id uuid REFERENCES stock_items(id);
ALTER TABLE service_jobs ADD COLUMN contact_id uuid REFERENCES contacts(id);
ALTER TABLE service_jobs ADD COLUMN customer_name text;               -- inline fallback for walk-ins
ALTER TABLE service_jobs ADD COLUMN customer_phone text;
ALTER TABLE service_jobs ADD COLUMN vehicle_label text;               -- '2021 Toyota RAV4' when no vehicle_id
ALTER TABLE service_jobs ADD COLUMN slot_date date;
ALTER TABLE service_jobs ADD COLUMN slot_time text;
ALTER TABLE service_jobs ADD COLUMN requested_services jsonb NOT NULL DEFAULT '[]';
ALTER TABLE service_jobs ADD COLUMN notes text;
ALTER TABLE service_jobs ADD COLUMN completed_on date;
-- one active booking per branch + slot
CREATE UNIQUE INDEX uq_service_slot ON service_jobs (branch_id, slot_date, slot_time)
  WHERE status NOT IN ('completed','cancelled');
CREATE INDEX idx_jobs_branch ON service_jobs(branch_id);

ALTER TABLE customer_followups ADD COLUMN branch_id uuid REFERENCES branches(id);
ALTER TABLE customer_followups ADD COLUMN contact_id uuid REFERENCES contacts(id);
ALTER TABLE customer_followups ADD COLUMN customer_name text;
ALTER TABLE customer_followups ADD COLUMN customer_phone text;
CREATE INDEX idx_sales_branch ON sales_transactions(branch_id);
CREATE INDEX idx_followups_branch ON customer_followups(branch_id);

-- =====================================================================
-- MAINTENANCE CATALOG + SERVICE CHECKLIST  (drives the "Start servicing" form)
-- =====================================================================
-- Reference catalog (global, NOT tenant-scoped). Generalized common-knowledge
-- maintenance items; make/model-specific schedules can be layered via applies_to_make.
CREATE TABLE maintenance_categories (
  id    serial PRIMARY KEY,
  name  text NOT NULL UNIQUE,            -- 'Engine & oil', 'Brakes', 'Tyres & suspension', ...
  sort  int  NOT NULL DEFAULT 0
);
CREATE TABLE maintenance_items (
  id                serial PRIMARY KEY,
  category_id       int NOT NULL REFERENCES maintenance_categories(id),
  name              text NOT NULL,        -- 'Engine oil & filter replacement', ...
  applies_to_make   text,                 -- NULL = general/all makes; else brand-specific
  interval_km       int,                  -- recommended service interval (km), nullable
  interval_months   int,                  -- recommended service interval (months), nullable
  UNIQUE (category_id, name, applies_to_make)
);

-- Per-job results: what the technician actually ticked/recorded. Tenant-scoped.
CREATE TABLE service_checklist_results (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES companies(id),
  service_job_id       uuid NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
  maintenance_item_id  int REFERENCES maintenance_items(id),
  item_label           text NOT NULL,     -- denormalized label (survives catalog edits)
  performed            boolean NOT NULL DEFAULT true,
  parts_cost_npr       numeric(12,2) NOT NULL DEFAULT 0,
  labour_cost_npr      numeric(12,2) NOT NULL DEFAULT 0,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_job ON service_checklist_results(service_job_id);
CREATE INDEX idx_checklist_company ON service_checklist_results(company_id);

-- Cross-dealership VIN history import: request another dealership's records with
-- owner consent. Approval/transfer is enforced server-side, never client-side.
CREATE TYPE vin_share_status AS ENUM ('pending','approved','denied','expired');
CREATE TABLE vin_share_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_company_id uuid NOT NULL REFERENCES companies(id),
  source_company_id     uuid REFERENCES companies(id),   -- NULL = any dealership in network
  vin                   varchar(17) NOT NULL,
  owner_consent         boolean NOT NULL DEFAULT false,
  status                vin_share_status NOT NULL DEFAULT 'pending',
  requested_by          uuid REFERENCES users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  resolved_at           timestamptz
);
CREATE INDEX idx_vinshare_requester ON vin_share_requests(requesting_company_id);
CREATE INDEX idx_vinshare_vin ON vin_share_requests(vin);

-- =====================================================================
-- PARTS DEPARTMENT + BILLING  (parts catalog, stock, orders, line items)
-- =====================================================================
-- Master SKU list (global reference, NOT tenant-scoped).
CREATE TABLE parts_catalog (
  sku             text PRIMARY KEY,
  name            text NOT NULL,
  category        text NOT NULL,
  oem_number      text,
  hs_code         text,                     -- Nepal customs/VAT invoice
  unit            text NOT NULL DEFAULT 'pc',
  list_price_npr  numeric(12,2) NOT NULL DEFAULT 0
);
-- Which catalog parts fulfil which maintenance/service item (drives "request part").
CREATE TABLE part_service_items (
  sku             text REFERENCES parts_catalog(sku),
  service_item    text NOT NULL,            -- matches the service-item taxonomy name
  PRIMARY KEY (sku, service_item)
);

-- Per-dealership parts stock (tenant + branch scoped).
CREATE TABLE parts_inventory (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id),
  branch_id       uuid NOT NULL REFERENCES branches(id),
  sku             text NOT NULL REFERENCES parts_catalog(sku),
  qty_on_hand     int NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  reorder_level   int NOT NULL DEFAULT 5,
  unit_price_npr  numeric(12,2) NOT NULL DEFAULT 0,   -- dealership's own price
  bin_location    text,
  UNIQUE (company_id, branch_id, sku)
);
CREATE INDEX idx_partsinv_company ON parts_inventory(company_id);

-- Parts order / counter sale (taken / requested / paid). May attach to an active job.
CREATE TYPE parts_order_status AS ENUM ('requested','taken','paid','cancelled');
CREATE TABLE parts_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id),
  branch_id       uuid REFERENCES branches(id),
  service_job_id  uuid REFERENCES service_jobs(id),   -- set if for an active job
  customer_name   text,
  customer_phone  text,
  vin             varchar(17),
  status          parts_order_status NOT NULL DEFAULT 'requested',
  subtotal_npr    numeric(12,2) NOT NULL DEFAULT 0,
  vat_npr         numeric(12,2) NOT NULL DEFAULT 0,    -- VAT @ 13%
  total_npr       numeric(12,2) NOT NULL DEFAULT 0,
  payment_method  text,                                -- Cash | Card | Bank Transfer
  created_by_role text,                                -- Parts | Service (RBAC audit)
  created_on      date NOT NULL DEFAULT current_date,
  paid_on         date
);
CREATE INDEX idx_partsorders_company ON parts_orders(company_id);
CREATE TABLE parts_order_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parts_order_id  uuid NOT NULL REFERENCES parts_orders(id) ON DELETE CASCADE,
  sku             text NOT NULL REFERENCES parts_catalog(sku),
  qty             int NOT NULL CHECK (qty > 0),
  unit_price_npr  numeric(12,2) NOT NULL,
  line_total_npr  numeric(12,2) NOT NULL
);

-- Structured servicing detail from the full-page form (one row per taxonomy item).
CREATE TABLE service_job_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id),
  service_job_id  uuid NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
  item_name       text NOT NULL,            -- service-item taxonomy name
  category        text,
  field_values    jsonb NOT NULL DEFAULT '{}',  -- {label: value} captured per item
  note            text
);
CREATE INDEX idx_jobitems_job ON service_job_items(service_job_id);

-- Parts attached to a service job by the Parts dept (feeds combined billing).
CREATE TABLE service_job_parts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id),
  service_job_id  uuid NOT NULL REFERENCES service_jobs(id) ON DELETE CASCADE,
  sku             text NOT NULL REFERENCES parts_catalog(sku),
  qty             int NOT NULL CHECK (qty > 0),
  unit_price_npr  numeric(12,2) NOT NULL,
  line_total_npr  numeric(12,2) NOT NULL,
  added_by_role   text,                     -- Parts | Service
  parts_order_id  uuid REFERENCES parts_orders(id)
);
CREATE INDEX idx_jobparts_job ON service_job_parts(service_job_id);

-- customer_followups: record a DISPOSITION instead of silently marking "serviced".
CREATE TYPE followup_disposition AS ENUM ('serviced_here','service_not_required','customer_declined','done_elsewhere','rescheduled','unreachable');
ALTER TABLE customer_followups ADD COLUMN disposition followup_disposition;
ALTER TABLE customer_followups ADD COLUMN disposition_on date;

-- =====================================================================
-- ROW-LEVEL SECURITY  (tenant isolation - enforce, never trust the client)
-- =====================================================================
-- Each request sets app.dealership_id from the authenticated session (e.g.
--   SET app.dealership_id = '<uuid>';  -- from the verified session, NOT client input
-- ). Every tenant-owned table then restricts rows to that dealership. This is the
-- real boundary the dashboard's client-side scoping only simulates.
-- Apply to ALL tenant tables; representative policies shown (repeat for each):
ALTER TABLE branches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_reps            ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_acquisitions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_followups    ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_checklist_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE vin_share_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_inventory           ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_job_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_job_parts         ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON branches             USING (company_id = current_setting('app.dealership_id')::uuid);
CREATE POLICY tenant_isolation ON sales_reps           USING (company_id = current_setting('app.dealership_id')::uuid);
CREATE POLICY tenant_isolation ON stock_items          USING (company_id = current_setting('app.dealership_id')::uuid);
CREATE POLICY tenant_isolation ON contacts             USING (company_id = current_setting('app.dealership_id')::uuid);
CREATE POLICY tenant_isolation ON vehicle_acquisitions USING (company_id = current_setting('app.dealership_id')::uuid);
CREATE POLICY tenant_isolation ON sales_transactions   USING (company_id = current_setting('app.dealership_id')::uuid);
CREATE POLICY tenant_isolation ON service_jobs         USING (company_id = current_setting('app.dealership_id')::uuid);
CREATE POLICY tenant_isolation ON customer_followups   USING (company_id = current_setting('app.dealership_id')::uuid);
CREATE POLICY tenant_isolation ON service_checklist_results USING (company_id = current_setting('app.dealership_id')::uuid);
CREATE POLICY tenant_isolation ON parts_inventory   USING (company_id = current_setting('app.dealership_id')::uuid);
CREATE POLICY tenant_isolation ON parts_orders       USING (company_id = current_setting('app.dealership_id')::uuid);
CREATE POLICY tenant_isolation ON service_job_items  USING (company_id = current_setting('app.dealership_id')::uuid);
CREATE POLICY tenant_isolation ON service_job_parts  USING (company_id = current_setting('app.dealership_id')::uuid);
-- parts_catalog / part_service_items are global reference data (no RLS).
-- parts_order_lines inherits isolation via its parts_orders FK.
-- vin_share_requests: a dealership sees requests it raised OR ones targeting it (for approval).
CREATE POLICY tenant_isolation ON vin_share_requests   USING (
  requesting_company_id = current_setting('app.dealership_id')::uuid
  OR source_company_id  = current_setting('app.dealership_id')::uuid);
-- branch_sales_targets / role_permissions inherit isolation via their parent FKs.
-- maintenance_categories / maintenance_items are global reference data (no RLS).

-- =====================================================================
-- SEED - Nepal provinces (the 7 provinces)
-- =====================================================================
INSERT INTO provinces (id, name, code) VALUES
  (1,'Koshi','KOS'), (2,'Madhesh','MAD'), (3,'Bagmati','BAG'),
  (4,'Gandaki','GAN'), (5,'Lumbini','LUM'), (6,'Karnali','KAR'),
  (7,'Sudurpashchim','SUD')
ON CONFLICT (id) DO NOTHING;

-- Roles (dealership org-chart roles used by the dashboard).
INSERT INTO roles (code, name) VALUES
  ('Admin','Administrator'), ('Sales','Sales'), ('Finance','Finance'), ('Account','Accounts'),
  ('Cashier','Cashier'), ('Service','Service'), ('Parts','Parts'), ('Customer Care','Customer Care'),
  ('Marketing','Marketing'), ('Logistic','Logistics'), ('HR','Human Resources'), ('customer','Customer')
ON CONFLICT (code) DO NOTHING;

-- Permission matrix (mirrors apps/dashboard PERMISSIONS / CAPS / can()). view = section visible,
-- edit = can mutate. Parts reaches 'service' read-only (can_edit=false); Service can edit service.
INSERT INTO role_permissions (role_code, section, can_view, can_edit) VALUES
  ('Admin','overview',true,true),  ('Admin','inventory',true,true), ('Admin','service',true,true), ('Admin','sales',true,true), ('Admin','parts',true,true), ('Admin','billing',true,true),
  ('Sales','overview',true,false), ('Sales','inventory',true,false),('Sales','sales',true,true),
  ('Finance','overview',true,false),('Finance','inventory',true,false),('Finance','sales',true,false),('Finance','billing',true,true),
  ('Account','overview',true,false),('Account','inventory',true,false),('Account','sales',true,false),('Account','billing',true,true),
  ('Cashier','overview',true,false),('Cashier','sales',true,false),('Cashier','billing',true,true),
  ('Service','overview',true,false),('Service','inventory',true,false),('Service','service',true,true),('Service','parts',true,true),('Service','billing',true,true),
  ('Parts','overview',true,false),('Parts','inventory',true,false),('Parts','service',true,false),('Parts','parts',true,true),('Parts','billing',true,true),
  ('Customer Care','overview',true,false),('Customer Care','service',true,false),
  ('Marketing','overview',true,false),('Marketing','sales',true,false),
  ('Logistic','overview',true,false),('Logistic','inventory',true,false),
  ('HR','overview',true,false)
ON CONFLICT (role_code, section) DO NOTHING;
