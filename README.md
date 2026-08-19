# Meridian LMS

A modern, modular learning management system for **K-10 education** — courses,
lessons, activities, Zoom live classes, customizable email and rich family
analytics, with dedicated portals for **students, parents, admins and a super
admin**.

Built with Next.js (App Router), TypeScript, Prisma and Tailwind CSS, and
organized as **self-contained domain modules** (a Frappe-inspired architecture,
without Frappe).

---

## Highlights

| Area | What you get |
| --- | --- |
| **Four portals** | Student, Parent, Admin and Super Admin — each with its own navigation, permissions and dashboard |
| **Curriculum tree** | Subjects → Courses (per grade, KG-10) → Chapters → Lessons (article / video / PDF / interactive) |
| **Activities** | Quizzes (MCQ, true/false, short answer) with instant auto-grading + assignments/projects with a manual grading queue and feedback |
| **Family graph** | A parent can have **multiple children**; a child can have multiple guardians |
| **Parent analytics** | Per-child score trends, subject averages, course progress, attendance donut, learning time and full result history |
| **Live classes** | Zoom Server-to-Server OAuth integration (auto-created meetings) with a manual-link fallback, one-click join and automatic attendance (present / late / absent) |
| **Communications** | Database-backed, editable email templates with `{{variables}}`, test-send, delivery log, announcements (by role or grade) and in-app notifications |
| **Platform control** | Module registry, runtime settings, immutable audit trail, integration health |
| **Dual themes** | Minimal **green & white** ("meadow") and **black & white** ("mono") themes, SSR-safe, one-click toggle |
| **Security** | bcrypt (cost 12), HS256 JWT in httpOnly cookies, edge middleware + server guards (defense in depth), central RBAC matrix, login rate limiting, anti-enumeration, XSS-safe markdown, security headers, audit logging |

## Quick start

```bash
git clone <this-repo> && cd meridian
npm install
cp .env.example .env          # set AUTH_SECRET (openssl rand -base64 48)
npm run setup                 # prisma generate + db push + seed demo data
npm run dev                   # http://localhost:3000
```

### Demo accounts (password for all: `Passw0rd!`)

| Role | Email | Notes |
| --- | --- | --- |
| Super Admin | `root@meridian.school` | Full platform control |
| Admin | `admin@meridian.school` | Curriculum, users, grading, comms |
| Parent | `sarah.thompson@meridian.school` | **Two children** (Ava G4, Liam G2) |
| Parent | `david.chen@meridian.school` | One child (Emma G4) |
| Student | `ava.thompson@student.meridian.school` | Grade 4, seeded history |

## Documentation

Detailed docs live in [`docs/`](docs/):

- [Getting started](docs/getting-started.md) — install, environment, scripts
- [Architecture](docs/architecture.md) — layers, module system, request lifecycle
- [Data model](docs/data-model.md) — every table and relationship (with diagram)
- [Modules](docs/modules.md) — the eight domain modules in depth
- [Roles & permissions](docs/roles-and-permissions.md) — the RBAC matrix
- [API reference](docs/api-reference.md) — every `/api/v1` endpoint
- [Security](docs/security.md) — threat model and hardening checklist
- [Security audit](docs/security-audit.md) — findings, fixes and residual risks
- [Graph navigation](docs/graph-navigation.md) — InfraNodus graph plugin for in-file navigation
- [Theming](docs/theming.md) — design tokens and the two themes
- [Zoom integration](docs/integrations/zoom.md) — S2S OAuth setup + manual mode
- [Email integration](docs/integrations/email.md) — SMTP, templates, variables
- [Deployment](docs/deployment.md) — Postgres, production hardening, scaling

Working on the codebase with an AI agent (or joining as a new contributor)?
Start with [`AGENTS.md`](AGENTS.md) — a condensed map of the architecture,
conventions, security invariants and gotchas.

## Repository layout

```
prisma/           schema.prisma + seed.ts (demo data)
src/
  middleware.ts   edge auth + security headers
  lib/            db client, auth (session/rbac/guards), api helpers, rate limit, audit, markdown
  modules/        Frappe-style domain modules (auth, users, curriculum, activities,
                  enrollment, live-classes, communications, analytics, platform)
  app/
    api/v1/       REST route handlers (thin wrappers over module services)
    student/      student portal
    parent/       parent portal (+ per-child analytics)
    admin/        admin portal (users, courses, grading, live classes, email, announcements)
    superadmin/   super admin portal (admins, modules, settings, audit)
  components/     UI primitives, layout shell, charts
docs/             detailed documentation
```

## Tech stack

- **Next.js 16** (App Router, server components, route handlers, edge middleware)
- **TypeScript** end to end, **zod** validation at every API boundary
- **Prisma 6** — SQLite for zero-config dev, Postgres-ready for production
- **Tailwind CSS 4** with CSS-variable design tokens (two themes)
- **jose** (JWT), **bcryptjs**, **nodemailer**, **recharts**

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run setup` | Generate client, push schema, seed demo data |
| `npm run db:seed` | Re-seed demo data (idempotent) |
| `npm run db:studio` | Prisma Studio database browser |
| `npm run lint` | ESLint |

## License

MIT — use it, fork it, run a school on it.
