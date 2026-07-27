# Deployment

Meridian is a standard Next.js app — anything that runs Node 20+ can host it
(a VM with a reverse proxy, Docker, Vercel, Railway, Fly.io, …).

## 1. Switch to Postgres

SQLite is for development. For production:

1. Edit `prisma/schema.prisma`:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Set `DATABASE_URL="postgresql://user:pass@host:5432/meridian?sslmode=require"`.
3. Apply the schema:

   ```bash
   npx prisma generate
   npx prisma db push          # or set up `prisma migrate` for versioned migrations
   ```

The schema uses no SQLite-specific features (JSON payloads are stored as
strings), so no model changes are needed. For long-lived production databases
prefer `prisma migrate dev` / `prisma migrate deploy` over `db push` so schema
changes are versioned.

## 2. Environment

```bash
DATABASE_URL="postgresql://…"
AUTH_SECRET="$(openssl rand -base64 48)"   # mandatory; app refuses placeholder in prod
SESSION_TTL_HOURS=12
APP_URL="https://lms.yourschool.org"
# optional integrations
ZOOM_ACCOUNT_ID=… ZOOM_CLIENT_ID=… ZOOM_CLIENT_SECRET=…
SMTP_HOST=… SMTP_PORT=587 SMTP_USER=… SMTP_PASSWORD=… SMTP_FROM=…
```

## 3. Build & run

```bash
npm ci
npx prisma generate
npm run build
npm start                     # serves on PORT (default 3000)
```

Create the first super admin by running the seed against production **once**
(then change the passwords), or insert a user row manually with a bcrypt hash.

## 4. Reverse proxy

Terminate TLS at nginx/Caddy/your platform and forward to the app. Add HSTS:

```
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
```

The app already sets `X-Frame-Options`, `nosniff`, `Referrer-Policy` and
`Permissions-Policy` itself. Session cookies are `Secure` automatically when
`NODE_ENV=production`.

## 5. Docker (example)

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "start"]
```

Run schema sync (`npx prisma db push` or `prisma migrate deploy`) as a release
step, not at container boot.

## 6. Scaling notes

- The app is stateless except for the **in-memory login rate limiter**; with
  more than one instance, swap it for a Redis-backed limiter (same interface,
  `src/lib/rate-limit.ts`).
- Sessions are JWTs — no shared session store needed.
- Heavy reads (parent analytics, platform stats) are simple indexed queries;
  Postgres handles thousands of students comfortably. Add read replicas or
  caching only when metrics say so.
- Email and Zoom calls are fire-and-forget or request-scoped; for very large
  grades consider moving notification fan-out to a queue.

## 7. Backups & operations

- Back up Postgres (e.g. `pg_dump` nightly + WAL archiving).
- The audit log grows append-only — archive old rows periodically if needed.
- Monitor `/api/v1/health` for liveness.
