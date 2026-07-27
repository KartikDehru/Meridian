# Security

Meridian is built for schools, which means minors' data. Security is layered
rather than bolted on.

## Authentication

- **Password storage**: bcrypt with cost factor 12 (`src/lib/auth/password.ts`).
- **Password policy**: minimum 8 characters with letters and digits, enforced
  at every account-creation entry point (zod + `passwordPolicyError`).
- **Sessions**: HS256 JWTs signed with `AUTH_SECRET`, carried in an
  **httpOnly, SameSite=Lax cookie** (`Secure` in production). JavaScript can
  never read the token; SameSite=Lax plus JSON-only, custom-header-free
  mutations mitigates CSRF for this same-origin app.
- **Expiry**: 12 h by default (`SESSION_TTL_HOURS`).
- **Production guard**: the app throws on boot if `AUTH_SECRET` is still the
  placeholder value in production.

## Brute force & enumeration

- **Rate limiting**: `POST /api/v1/auth/login` allows 10 requests per 5
  minutes per IP (fixed-window, in-memory). The limiter is behind a small
  interface — swap in Redis for multi-instance deployments.
- **Anti-enumeration**: login failures return one uniform message and a
  bcrypt compare runs even when the email doesn't exist, keeping response
  timing constant-shape.
- **Failed logins are audited** (`auth.login_failed` with IP).

## Authorization (three layers)

1. **Edge middleware** — role-checks the portal path, 401s anonymous API
   calls, and applies security headers to every response.
2. **Server guards** — `requireRole` in every portal layout/page,
   `requirePermission` in every API handler, resolved against the central
   RBAC matrix (`src/lib/auth/rbac.ts`).
3. **Ownership checks** — services scope data to the caller: parents through
   `ParentChildLink` (`assertParentOfStudent`), students through
   `Enrollment`, attempt submission through attempt ownership.

Sensitive data never leaks by shape either: students receive questions with
the `correctAnswer` field stripped; non-admins never receive Zoom `startUrl`.

## Input handling

- **All** API bodies are parsed with zod schemas; failures return `422` with
  field-level details and never reach business logic.
- IDs are opaque cuids; no numeric enumeration.
- Lesson markdown is rendered by an **escape-first renderer**
  (`src/lib/markdown.ts`): all HTML is entity-escaped before a small
  whitelist of markdown constructs is applied, so stored content cannot become
  stored XSS.
- React escapes everything else by default; the only `dangerouslySetInnerHTML`
  in the app consumes the sanitized renderer above.

## Transport & headers

Middleware sets on every response:

- `X-Frame-Options: DENY` (clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

Run behind HTTPS in production (see [deployment.md](deployment.md)) and add
HSTS at the proxy.

## Auditability

Every sensitive operation writes an append-only `AuditLog` row: actor, dotted
action name, entity, JSON metadata and IP. The super admin can filter the
trail in the UI (`/superadmin/audit`) or via `GET /api/v1/audit-logs`. Audit
writes are fire-safe: a logging failure never breaks the user's request.

## Secrets

- Secrets (DB URL, `AUTH_SECRET`, SMTP, Zoom) live **only** in environment
  variables — never in the database, never in the repo (`.env` is gitignored;
  `.env.example` documents the shape).
- Runtime `Setting` rows are non-secret display/behavior values only.

## Known trade-offs & hardening checklist for production

- [ ] Replace the in-memory rate limiter with a Redis-backed one when running
      more than one instance.
- [ ] Add HSTS and TLS termination at the reverse proxy.
- [ ] Consider short-lived sessions + refresh rotation if you need instant
      revocation (stateless JWTs remain valid until expiry; disabling a user
      blocks new logins immediately but not in-flight sessions).
- [ ] Add a Content-Security-Policy tuned to your video-embed origins.
- [ ] Point `DATABASE_URL` at Postgres with TLS and least-privilege
      credentials.
- [ ] Rotate `AUTH_SECRET` on a schedule (invalidates all sessions).
- [ ] The npm audit findings in this repo are confined to **dev-only** eslint
      tooling (transitive `minimatch`/`brace-expansion`); no runtime
      dependency is affected.
