# Security audit report

**Date:** 2026-07-27 · **Scope:** full repository at the time of the initial
platform build · **Auditor:** automated + manual review during development

## Methodology

1. **Dependency audit** — `npm audit` for runtime (`--omit=dev`) and dev
   dependency trees.
2. **Manual code review** of every trust boundary: middleware, guards, all
   `/api/v1` route handlers, module services, template rendering, markdown
   rendering, cookie/session handling.
3. **Dynamic testing** against the production build with `curl` for each
   role: authentication, cross-role access, cross-family access, information
   exposure and rate limiting.
4. **Secret scan** — verified no `.env`, credentials or tokens exist anywhere
   in git history (`.env` is gitignored; only `.env.example` is committed).

---

## Dependency findings

| ID | Severity | Package | Issue | Resolution |
| --- | --- | --- | --- | --- |
| DEP-1 | High | `postcss` (transitive via `next`) | XSS via unescaped `</style>`, sourceMappingURL file-read advisories | **Fixed** — npm `overrides` pins `postcss@^8.5.23`; build verified |
| DEP-2 | High | `sharp` (transitive via `next`) | Inherited libvips CVEs | **Fixed** — npm `overrides` pins `sharp@^0.35.3` (the app does not process user images, so exposure was minimal anyway) |
| DEP-3 | High (dev-only) | `brace-expansion`/`minimatch` via `eslint`, `eslint-config-next` | ReDoS/DoS in lint tooling | **Accepted** — dev-time only, never shipped or executed in production; the upstream "fix" requires a breaking eslint major |

**Result:** `npm audit --omit=dev` reports **0 vulnerabilities**.

## Application findings (all fixed)

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| AUTHZ-1 | Medium | `GET /api/v1/courses/:id` let an authenticated **student** fetch the full content tree of unpublished courses and courses they were not enrolled in (the UI checked enrollment, the raw API did not) | Handler now returns `404` for students unless the course is published **and** the caller is enrolled (`isStudentEnrolled`) |
| AUTHZ-2 | Medium | `GET /api/v1/activities/:id` let a student read question prompts/options of unpublished or unenrolled activities (answer keys were already stripped) | Same published + enrollment gate as AUTHZ-1 |
| AUTHZ-3 | Low | `POST /api/v1/lessons/:id/progress` recorded progress for arbitrary lessons — a data-integrity issue that could skew parent/admin analytics | `recordLessonProgress` now verifies enrollment in the lesson's course |
| AUTHZ-4 | Low | `GET /api/v1/live-classes` returned `joinUrl`/`passcode` to students in list responses, allowing them to join meetings while bypassing attendance capture | List responses now strip join credentials for non-admins; students must use `POST /live-classes/:id/join`, which records attendance |
| INJ-1 | Low | Email template variable substitution did not escape values — user-controlled data (e.g. a student name containing markup) could inject HTML into parent emails | `renderTemplate` now HTML-escapes every substituted value; template HTML itself remains admin-authored and trusted |

Each fix was re-verified dynamically (unenrolled course/activity → 404,
unenrolled progress → 404, student list contains no join URLs while the join
endpoint still works, admin responses unchanged).

## Controls verified as working

- Uniform login errors + constant-shape bcrypt compare (no account
  enumeration by message or timing); failed logins audited with IP.
- Login rate limiting returns `429` after 10 requests / 5 min / IP.
- Cross-portal navigation redirects (`/admin` as student → `/login?error=forbidden`);
  unauthenticated API calls → `401` JSON; role-mismatched API calls → `403`.
- Parents cannot read another family's child (`404` via `ParentChildLink` scoping).
- Students never receive `correctAnswer` fields or Zoom `startUrl`.
- Attempt submission requires enrollment + a published activity and rejects
  double submission.
- Session cookie is `httpOnly`, `SameSite=Lax`, `Secure` in production;
  JWT is HS256 with a mandatory non-placeholder secret in production.
- Security headers (`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`) present on every response.
- Lesson markdown rendering is escape-first (stored XSS not possible);
  the only `dangerouslySetInnerHTML` consumes that sanitizer.
- All API bodies validated with zod (`422` with field details); IDs are
  opaque cuids.
- Sensitive operations write append-only audit entries.

## Residual risks (accepted & documented)

| Risk | Why accepted | Mitigation path |
| --- | --- | --- |
| Stateless JWTs stay valid until expiry after a user is disabled | No per-request DB hit; disabling blocks new logins immediately | Shorten `SESSION_TTL_HOURS`, or add a token-version check / denylist if instant revocation is required |
| In-memory rate limiter is per-process | Single-node deployments are the default | Swap for Redis behind the same interface (`src/lib/rate-limit.ts`) when scaling out |
| `x-forwarded-for` is trusted for IP-keyed rate limiting | Correct behind a proxy; direct exposure could allow header spoofing | Terminate at a proxy that overwrites the header (standard practice) |
| No Content-Security-Policy header yet | Needs tuning for video-embed origins (YouTube etc.) | Add CSP at the proxy or in middleware before production |
| Admins can author arbitrary HTML in email templates | Admin-trusted by design | Keep `email.manage` restricted to staff |

## Re-running the audit

```bash
npm audit --omit=dev        # runtime dependencies (expect: 0)
npm audit                   # includes dev tooling
npm run lint && npx tsc --noEmit && npm run build
```

For the dynamic checks, follow the curl recipes in
[docs/api-reference.md](api-reference.md) and the checklist in
[docs/security.md](security.md).
