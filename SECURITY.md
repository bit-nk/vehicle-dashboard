# Security

Security posture for **our own** application. (We do not scrape, probe, or replicate
any third-party service's security - all data here comes from open/government APIs and
openly-licensed sources; see `packages/shared/src/data/`.)

## ⚠️ Known limitation - report paywall is client-side only

The "full vehicle history report" paywall is **not real security yet**, because the public
site is a static SPA with no backend:

- When a report is locked, `ReportDetail` renders only a **skeleton** (`LockedReport`) and the
  real report sections are **not mounted in the DOM** - so they can't be read by inspecting the
  page or scraping the rendered HTML. This is an improvement, not a guarantee.
- **However**, the underlying mock dataset is still **bundled into the client JavaScript**
  (`packages/shared/src/data/`), and the unlock state is `sessionStorage` only. A determined user
  can recover locked data from the JS bundle. **Treat all data here as demo/simulated and public.**

**Production requirement (tracked in `docs/TODO.md`):** serve the full report from an
authenticated/paid backend endpoint, gated on the `report_unlocks` table; never send locked
fields to the browser at all. Free snapshot = public; full `history` = server-gated. This is the
single most important item before any real launch.

## Public site (`apps/web`) - current

The public site is a static SPA with no secrets and no first-party backend, so the
attack surface is small. What we do:

| Control | Where | Notes |
|---|---|---|
| Content-Security-Policy | `apps/web/vite.config.js` (build-only meta) + `apps/web/public/_headers` | Locks sources to self + Google Fonts + Wikimedia images. Not applied in dev (would break HMR). |
| HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP | `apps/web/public/_headers` | Set at the edge (static hosts can't set these from HTML). |
| Input validation / sanitization | `packages/shared/src/lib/validate.js` | VIN normalized to `[A-HJ-NPR-Z0-9]{17}`, plate/text stripped + length-capped before routing. |
| Safe external links | `VehiclePhoto` credit links | `rel="noreferrer noopener"`, `target="_blank"`. |
| No inline event handlers / `dangerouslySetInnerHTML` | throughout | React escapes by default; CSP `script-src 'self'` blocks injected inline scripts. |

### Deploying the headers
The `_headers` file works as-is on Netlify and Cloudflare Pages. For nginx:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://upload.wikimedia.org; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), camera=(), microphone=(), payment=()" always;
```

## Dashboard (`apps/dashboard`) - design for the planned second app

The dashboard ships edge security headers (`apps/dashboard/public/_headers`, mirroring the
public site: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, COOP). The print
popup carries its own `script-src 'none'` CSP and HTML-escapes the document title. These are
client-side hardening only - the dashboard still needs a proper backend security model:

The dashboard has real auth (customer logins + company logins) and real data, so it needs
a proper backend security model. Recommended baseline:

**Authentication**
- Server-issued session cookies: `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict` for the company console). No tokens in `localStorage`.
- Password hashing with Argon2id (or bcrypt cost ≥ 12); enforce rate-limited login + account lockout/backoff.
- TOTP/WebAuthn MFA for company accounts (they see all customers).

**Authorization (the critical part - two very different audiences)**
- Role-based access: `customer` sees only their own vehicles/records; `company_*` roles (sales, service, admin) see org data.
- Enforce tenant scoping on **every** query server-side (e.g., `WHERE customer_id = :session_customer_id`). Never trust an ID from the client.
- Separate the customer portal and company console by route + policy; least-privilege per company role.

**Transport & API**
- HTTPS only + HSTS; CSRF tokens (double-submit or `SameSite` + per-request token) on state-changing requests.
- Validate/normalize all input server-side (reuse `@shared/lib/validate`); parameterized queries / ORM to prevent SQLi.
- Per-IP and per-account rate limiting on auth and report endpoints; audit log for company actions on customer data.

**Data & secrets**
- Secrets in env/secret manager, never in the repo. Encrypt PII at rest; minimize what the client receives (don't ship full records then hide with CSS - gate server-side).
- The paywall in `apps/web` is a client-side demo (`sessionStorage`); a real paywall must gate the data **server-side** so locked fields are never sent to the browser.

## Reporting
This is a demo project. For a production deployment, add a `security.txt` and a disclosure contact.
