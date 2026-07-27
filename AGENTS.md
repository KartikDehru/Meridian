# AGENTS.md — orientation guide for coding agents

This file gives AI coding agents (and new humans) the fastest possible mental
model of this repository. Read this before making changes.

## What this repo is

**Meridian LMS** — a K-10 learning management system. One Next.js 16 App
Router application containing four role portals (student, parent, admin,
super admin), a REST API, and a modular service layer. TypeScript everywhere,
Prisma ORM, Tailwind 4, zod validation.

## Commands you will need

```bash
npm run setup        # prisma generate + db push + seed (bootstrap everything)
npm run dev          # dev server on :3000
npm run build        # production build — ALSO the strictest type check; run before finishing
npm run lint         # eslint; must pass
npx tsc --noEmit     # fast type check without building
npm run db:seed      # wipe + reseed demo data (idempotent)
npm run db:studio    # browse the SQLite db
```

Demo logins (password `Passw0rd!`): `root@meridian.school` (super admin),
`admin@meridian.school` (admin), `sarah.thompson@meridian.school` (parent of
two children), `ava.thompson@student.meridian.school` (student).

## Architecture in one paragraph

Requests hit **edge middleware** (`src/middleware.ts` — session cookie +
portal role check + security headers), then either a **page** (server
component that calls module services directly for reads) or an **API route**
(`src/app/api/v1/**` — thin handler: `requirePermission` → zod `parseBody` →
service call → JSON envelope). All business logic lives in
**`src/modules/*/service.ts`**. Only services (and trivial page reads) touch
Prisma. Client components mutate exclusively through `/api/v1` using the
`api()` helper in `src/lib/client.ts`, then call `router.refresh()`.

## File map

| Path | What lives there |
| --- | --- |
| `prisma/schema.prisma` | Entire data model (SQLite dev; Postgres-compatible). JSON payloads are stored as **strings** — parse with `parseJson` from `src/lib/utils.ts` |
| `prisma/seed.ts` | Demo school. Update it when you add models so dashboards stay populated |
| `src/middleware.ts` | Edge auth, portal→role map, public API list, security headers |
| `src/lib/db.ts` | Prisma singleton (`db`) |
| `src/lib/auth/session.ts` | JWT mint/verify, cookie names (`meridian_session`) |
| `src/lib/auth/rbac.ts` | **The permission matrix** — single source of truth for who can do what |
| `src/lib/auth/guard.ts` | `requireRole` (pages, redirects) / `requirePermission` + `apiSession` (APIs, throws) |
| `src/lib/api.ts` | `handler()` wrapper, `ok()`/`fail()` envelope, `parseBody()` (zod), typed errors |
| `src/lib/rate-limit.ts` | In-memory fixed-window limiter (login uses it) |
| `src/lib/audit.ts` | `audit()` — call it from services for every sensitive mutation |
| `src/lib/markdown.ts` | Escape-first markdown renderer (the only sanctioned path to `dangerouslySetInnerHTML`) |
| `src/lib/utils.ts` | `gradeName` (0 = KG, 1-10 = grades), `slugify`, date formatting, `parseJson` |
| `src/modules/registry.ts` | Module manifest (rendered at `/superadmin/modules`) — register new modules here |
| `src/modules/*/service.ts` | Business logic + zod schemas per domain |
| `src/app/api/v1/**` | REST handlers — keep them thin |
| `src/app/{student,parent,admin,superadmin}/` | Portals; each `layout.tsx` calls `requireRole` and renders `AppShell` with its nav |
| `src/components/ui/primitives.tsx` | `Card`, `Badge`, `Table`, `StatCard`, `PageHeader`, `ProgressBar`, `Avatar`, `EmptyState` — use these, don't reinvent |
| `src/components/ui/icons.tsx` | Inline SVG icon set (add paths here; no icon libraries) |
| `src/components/charts/charts.tsx` | recharts wrappers (client) using theme CSS variables |
| `src/app/globals.css` | Design tokens for both themes (`:root` = green/white "meadow", `[data-theme="mono"]` = black/white) |
| `docs/` | Human documentation — keep it in sync with behavior changes |

## Conventions (follow these)

1. **New endpoint** = permission check + zod schema + service function + thin
   route handler. Never put Prisma queries or business rules in a route file.
2. **New permission**: add the literal to the `Permission` union and the
   `MATRIX` in `src/lib/auth/rbac.ts`, then `requirePermission(...)` in the
   handler. Update `docs/roles-and-permissions.md`.
3. **New module**: `src/modules/<name>/service.ts`, register it in
   `src/modules/registry.ts`, document in `docs/modules.md`.
4. **Styling**: semantic token classes only (`bg-surface`, `text-muted`,
   `border-border`, `bg-primary`, `bg-primary-soft`, `text-danger`, …). Never
   hard-code colors — both themes must keep working. Check any UI change in
   both themes (toggle = moon/sun button; cookie `meridian_theme`).
5. **Reads in server components, writes via API.** Client components use
   `api()` from `src/lib/client.ts` and `router.refresh()` after mutations.
6. **Audit every sensitive mutation** from the service with `audit({...})`
   using dotted action names (`module.verb_object`).
7. **Notifications/emails** are side effects fired from services
   (`notify(...)`, `void sendTemplatedEmail(...)` — fire-and-forget so mail
   never blocks a request).
8. Commit messages follow `feat:` / `fix:` / `docs:` / `chore:` prefixes.

## Security invariants — do not break these

- Students may only access **published** content in courses they are
  **enrolled** in; enforce it in APIs, not just pages (see
  `isStudentEnrolled` in `src/modules/enrollment/service.ts`).
- Question `correctAnswer` and Zoom `startUrl` must never reach student
  responses; live-class **list** responses hide `joinUrl` from students
  (attendance is captured by the `/join` endpoint).
- Parents reach child data **only** through `ParentChildLink`
  (`assertParentOfStudent`).
- Only super admins create admin accounts (`admins.manage`).
- All user-controlled strings that enter HTML go through the markdown
  sanitizer or React escaping; email template variables are escaped in
  `renderTemplate`.
- Never weaken the middleware matcher, cookie flags or password hashing.
- Secrets stay in env vars; never write them to the DB, the repo, or logs.

See `docs/security.md` and `docs/security-audit.md` for the full picture.

## Gotchas

- **SQLite + Prisma**: `options`, `answers`, `variables`, `meta` are JSON
  **strings** — always `JSON.stringify` on write and `parseJson` on read.
- `gradeLevel` is `0..10` where **0 = Kindergarten**; display with
  `gradeName()` / `gradeShort()`.
- `passScore` is **absolute points** (not a percentage) relative to `maxScore`.
- Route handler `params` is a **Promise** (Next 16) — `const { id } = await params;`.
- `searchParams` in pages is also a Promise.
- Ordered lists (chapters, lessons, questions) use `sortOrder` assigned as
  `last + 1` on create.
- The Prisma client is generated — run `npm run db:generate` after schema
  changes, `npm run db:push` to apply, and update `prisma/seed.ts`.
- ESLint here enforces React Compiler purity rules: no `Date.now()` in render
  without an eslint-disable comment, no `setState` directly inside effects.
- `npm run build` is the gate: it type-checks pages/route signatures more
  strictly than `tsc` alone.

## How to smoke-test like the CI of this repo

```bash
npm run build && npm run start &   # or use tmux
curl -s -c jar -X POST localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@meridian.school","password":"Passw0rd!"}'
curl -s -b jar localhost:3000/api/v1/analytics/platform | head -c 200
```

Login as each role and hit the four portals (`/student`, `/parent`, `/admin`,
`/superadmin`) — every page should return 200 for its own role and redirect
for others.
