# Roles & permissions

Meridian has four roles, each with its own portal. Access control is enforced
in **three layers** (defense in depth):

1. **Edge middleware** — checks the session cookie's role claim against the
   portal being requested; unauthenticated API calls get `401` JSON.
2. **Server guards** — every layout/page calls `requireRole(...)`; every API
   handler calls `requirePermission("<module>.<action>")`.
3. **Ownership checks in services** — e.g. a parent's analytics query is
   scoped through `ParentChildLink`, a student's attempt requires enrollment.

The single source of truth is the matrix in
[`src/lib/auth/rbac.ts`](../src/lib/auth/rbac.ts).

## Portals

| Role | Portal | Purpose |
| --- | --- | --- |
| `STUDENT` | `/student` | Learn: courses, lessons, activities, live classes, announcements |
| `PARENT` | `/parent` | Follow every linked child: scores, progress, attendance |
| `ADMIN` | `/admin` | Operate the school: users, curriculum, grading, live classes, email, announcements |
| `SUPER_ADMIN` | `/superadmin` **and** `/admin` | Everything an admin can, plus admin management, settings, modules and the audit trail |

## Permission matrix

| Permission | STUDENT | PARENT | ADMIN | SUPER_ADMIN |
| --- | :-: | :-: | :-: | :-: |
| `curriculum.read` | ✅ | — | ✅ | ✅ |
| `activities.attempt` | ✅ | — | — | — |
| `live-classes.read` | ✅ | ✅ | ✅ | ✅ |
| `analytics.own-children` | — | ✅ | — | — |
| `users.read` / `users.manage` | — | — | ✅ | ✅ |
| `curriculum.manage` | — | — | ✅ | ✅ |
| `activities.grade` | — | — | ✅ | ✅ |
| `enrollment.manage` | — | — | ✅ | ✅ |
| `live-classes.manage` | — | — | ✅ | ✅ |
| `analytics.platform` | — | — | ✅ | ✅ |
| `email.manage` | — | — | ✅ | ✅ |
| `announcements.manage` | — | — | ✅ | ✅ |
| `admins.manage` | — | — | — | ✅ |
| `settings.manage` | — | — | — | ✅ |
| `audit.read` | — | — | — | ✅ |

## Notable scoping rules (beyond the matrix)

- **Students** only see **published** courses/lessons/activities, only for
  courses they are **enrolled** in, and only live classes for **their grade**.
  Question answer keys are stripped from their API responses.
- **Parents** can only read analytics for students linked to them via
  `ParentChildLink` — any other profile id returns `404`.
- **Admins** can create students and parents; only a **super admin** can
  create admin accounts (`admins.manage`), and super-admin accounts can only
  be created by seeding/ops.
- The Zoom `startUrl` (host key) is only returned to admins/super admins.

## Adding a permission

1. Add the literal to the `Permission` union in `src/lib/auth/rbac.ts`.
2. Grant it to the right roles in the `MATRIX`.
3. Call `requirePermission("your.permission")` in the route handler.
4. Document it here and in the module registry.
