# Getting started

## Prerequisites

- **Node.js 20+** (developed on Node 22)
- npm 10+
- Nothing else — local development uses SQLite, created automatically.

## Installation

```bash
npm install
cp .env.example .env
```

Open `.env` and set a strong `AUTH_SECRET`:

```bash
openssl rand -base64 48
```

Then initialize and seed the database:

```bash
npm run setup     # = prisma generate + prisma db push + seed
npm run dev       # http://localhost:3000
```

The seed creates a small school (see the account table in the
[README](../README.md)) with courses, lessons, quizzes, graded history,
live classes with attendance, email templates and announcements — so every
dashboard has real data on first run.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:./dev.db` for SQLite, or a Postgres URL in production |
| `AUTH_SECRET` | yes | HS256 key for session JWTs. The app refuses to start in production with the placeholder value |
| `SESSION_TTL_HOURS` | no | Session lifetime, default `12` |
| `APP_URL` | no | Public base URL, used inside emails (default `http://localhost:3000`) |
| `ZOOM_ACCOUNT_ID` / `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` | no | Enables automatic Zoom meeting creation ([docs](integrations/zoom.md)). Unset → manual-link mode |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | no | Enables outgoing email ([docs](integrations/email.md)). Unset → emails logged as `SKIPPED` |

## npm scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server with hot reload |
| `npm run build` | Production build (type-checks everything) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint over the whole repo |
| `npm run db:generate` | Regenerate the Prisma client after schema changes |
| `npm run db:push` | Apply `prisma/schema.prisma` to the database |
| `npm run db:seed` | Wipe and re-seed demo data (idempotent) |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run setup` | All of the above bootstrap steps in one command |

## First tour

1. Sign in as **`sarah.thompson@meridian.school`** — a parent with two
   children. Open Ava's report for the score trend, subject averages and
   attendance charts.
2. Sign in as **`ava.thompson@student.meridian.school`** — continue a course,
   open a lesson, take the *Fractions basics quiz* and watch it grade itself.
3. Sign in as **`admin@meridian.school`** — the grading queue contains Ava's
   essay; grade it and watch the student + parent notifications appear.
4. Sign in as **`root@meridian.school`** — check the module registry,
   integration health, settings and the audit trail.
5. Click the moon/sun icon anywhere to switch between the green & white and
   black & white themes.
