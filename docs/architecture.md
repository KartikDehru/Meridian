# Architecture

Meridian is a single Next.js application organized in strict layers around a
**module system** inspired by Frappe: every domain capability is a
self-contained module with its own models, services, permissions and routes —
but implemented with plain TypeScript instead of a metaframework.

## Layers

```
┌────────────────────────────────────────────────────────────┐
│  UI  (src/app/{student,parent,admin,superadmin}, components)│
│  · server components read via module services directly     │
│  · client components mutate via /api/v1 fetch calls        │
├────────────────────────────────────────────────────────────┤
│  API  (src/app/api/v1/**)                                  │
│  · thin route handlers: guard → zod parse → service → JSON │
├────────────────────────────────────────────────────────────┤
│  Modules  (src/modules/**)                                 │
│  · all business logic, validation schemas, side effects    │
│  · auth, users, curriculum, activities, enrollment,        │
│    live-classes, communications, analytics, platform       │
├────────────────────────────────────────────────────────────┤
│  Core  (src/lib/**)                                        │
│  · prisma client, sessions, RBAC, guards, rate limiting,   │
│    audit writer, api envelope helpers, markdown renderer   │
├────────────────────────────────────────────────────────────┤
│  Data  (prisma/schema.prisma)                              │
│  · SQLite in dev, Postgres in production                   │
└────────────────────────────────────────────────────────────┘
```

**Rule of thumb:** route handlers and pages never contain business logic; they
authenticate, validate and delegate to a module service. Services are the only
layer that touches Prisma (plus a handful of trivial page-level reads).

## The module system

`src/modules/registry.ts` is the manifest: for each module it declares a name,
description, owned models, permissions and API routes. The Super Admin
"Modules" screen renders this registry directly, so the platform is
self-describing. Adding a capability means:

1. Create `src/modules/<name>/service.ts` with zod schemas + functions.
2. Add thin route handlers under `src/app/api/v1/...`.
3. Declare permissions in `src/lib/auth/rbac.ts` and add them to the matrix.
4. Register the module in `src/modules/registry.ts`.
5. Build UI pages that call the service (reads) and the API (writes).

See [modules.md](modules.md) for what each existing module does.

## Request lifecycle

### Page request

1. **Edge middleware** (`src/middleware.ts`) verifies the session JWT and
   checks that the cookie's role claim may enter the portal
   (`/student`, `/parent`, `/admin`, `/superadmin`). Wrong/missing sessions are
   redirected to `/login`. Security headers are applied to every response.
2. The **portal layout** calls `requireRole(...)` again on the server —
   middleware is a fast-path filter, never the only check.
3. The **page** (server component) loads data through module services and
   renders. Ownership checks (e.g. "is this my child?") happen here too.

### API request

1. Middleware rejects unauthenticated `/api/v1` calls with `401 JSON`
   (except `auth/login` and `health`).
2. The route handler wraps everything in `handler()` (uniform error mapping)
   and calls `requirePermission("<module>.<action>")`, which resolves the
   session and consults the RBAC matrix.
3. Bodies are parsed with **zod** (`parseBody`) — invalid input returns `422`
   with field-level details.
4. The module service runs the business logic, writes an **audit log** entry
   for sensitive operations, and may trigger side effects (notifications,
   templated emails).
5. Responses share one envelope: `{ ok: true, data }` or
   `{ ok: false, error: { message, details? } }`.

## Sessions

- Login (`POST /api/v1/auth/login`) verifies credentials with bcrypt and mints
  an **HS256 JWT** (`jose`) carrying `sub`, `role`, `name`, `email`.
- The token lives in an **httpOnly, SameSite=Lax cookie** (`meridian_session`),
  `Secure` in production; JavaScript can never read it.
- Sessions are **stateless**: verification is a signature check, no DB hit —
  fast at the edge. Expiry defaults to 12 h (`SESSION_TTL_HOURS`).
- Logout clears the cookie and records an audit entry.

## Performance notes

- Server components fetch data directly from services — no client-side
  waterfalls for reads; most pages render with 1-3 aggregate queries.
- Aggregations (`childStats`, `platformStats`) batch their queries with
  `Promise.all` and do the math in memory.
- The Prisma client is a dev-hot-reload-safe singleton.
- Charts (recharts) are the only heavyweight client bundles and are isolated
  in `src/components/charts`, loaded only on analytics pages.
- The icon set is hand-rolled inline SVG — no icon library in the bundle.

## Design decisions

| Decision | Why |
| --- | --- |
| One Next.js app instead of separate API + SPA | Fewer moving parts, shared types, server components remove read APIs, single deploy |
| Stateless JWT sessions | No session table lookups; middleware runs at the edge |
| Services as the only business-logic layer | UI and API stay thin; logic is testable and reusable |
| SQLite dev / Postgres prod | Zero-config onboarding without sacrificing production readiness |
| JSON-string columns for `options`, `answers`, `variables`, `meta` | Keeps the schema portable across SQLite and Postgres (SQLite has no native JSON type in Prisma) |
| Manual fallback for Zoom / SMTP | The full product is demoable with zero external credentials |
