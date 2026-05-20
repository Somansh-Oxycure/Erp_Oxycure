# Oxycure ERP — Pre-Deployment Checklist

> Work through every section top-to-bottom before going live.
> Items marked **BLOCKING** must be done. Others are strongly recommended.

---

## 1. Code Cleanup (do first)

- [x] **[BLOCKING]** Delete `apps/api/src/leads/` — confirmed absent, already clean.
- [x] **[BLOCKING]** Delete `apps/api/src/opportunities/` — confirmed absent, already clean.
- [x] Delete `apps/web/src/app/(dashboard)/pipeline/page.tsx` — confirmed absent, already clean.
- [ ] Audit all `TODO` / `FIXME` / `console.log` in both apps and remove them.
- [ ] Verify `apps/api/scripts/generate-proposal-template.js` is still needed or remove it.
- [ ] Check `apps/templates/` and `apps/api/templates/` for stale Word/DOCX templates that are no longer referenced.
- [ ] Remove `products-export-2026-05-08.csv`, `products-export-2026-05-09.csv`, `stock-export-2026-05-09.csv` from the project root — these are local data dumps and should not be in the repo.

---

## 2. Security Hardening — BLOCKING

- [ ] **[BLOCKING]** Change all hardcoded credentials in `docker-compose.yml`:
  - `POSTGRES_PASSWORD: oxycure_secret_2026` → use a 24+ char random password
  - `POSTGRES_USER` / `POSTGRES_DB` → keep but document
  - Redis `--requirepass oxycure_redis_2026` → use a strong random password
  - **Never commit real production passwords to git**
- [ ] **[BLOCKING]** Generate cryptographically strong `JWT_SECRET` (minimum 64 chars): `openssl rand -base64 64`
- [ ] **[BLOCKING]** Generate cryptographically strong `JWT_REFRESH_SECRET` — must be different from `JWT_SECRET`
- [ ] **[BLOCKING]** Generate strong `NEXTAUTH_SECRET`: `openssl rand -base64 32`
- [ ] Confirm Swagger UI is disabled in production — check `apps/api/src/main.ts`: it should only mount `/api/docs` when `NODE_ENV !== 'production'`
- [ ] Review rate-limiting values in `app.module.ts`: currently 10 req/sec short, 100 req/min long. Adjust if needed.
- [ ] Confirm `helmet()` is applied globally in `main.ts` ✅ (it is — verify headers in browser after deploy)
- [ ] Ensure `bcryptjs` rounds ≥ 10 in `auth.service.ts`
- [ ] Add `POSTGRES_SSL=true` / `?sslmode=require` to `DATABASE_URL` if using a hosted DB (Render, Railway, Supabase)

---

## 3. Environment Files

### API (`apps/api/.env`)
Create this file (never commit it — it should be in `.gitignore`):
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/oxycure_erp?schema=public
JWT_SECRET=<64-char-random>
JWT_EXPIRY=15m
JWT_REFRESH_SECRET=<64-char-random-different>
JWT_REFRESH_EXPIRY=7d
FRONTEND_URL=https://<your-domain.com>
```

### Frontend (`apps/web/.env.local` for local, `.env.production` for build)
```
NEXT_PUBLIC_API_URL=https://<your-api-domain.com>/api
NEXTAUTH_SECRET=<32-char-random>
NEXTAUTH_URL=https://<your-domain.com>
```

- [x] Create `apps/api/.env` with dev values — exists with docker-compose credentials
- [x] Create `apps/web/.env.local` with dev values — exists pointing to localhost:3001
- [x] Verify both `.env` files are in `.gitignore` — confirmed in root `.gitignore`
- [ ] Add a `.env.example` (already exists at root — keep it updated)

---

## 4. Database

- [x] **[BLOCKING]** Migrations are up to date — `prisma migrate dev` confirmed `Already in sync`
- [x] **[BLOCKING]** Seed run successfully — 5 users + units created
- [ ] Verify all 31 models are created with `npx prisma db pull` and inspect
- [ ] Confirm `ReferenceCounter` table exists (required for auto-number generation on Proposals, Tickets, POs)
- [ ] Test the DB connection from the production server before starting the API
- [ ] Enable automated DB backups on your hosting provider (daily minimum)

---

## 5. Redis

- [ ] Determine if Redis is actually used by the NestJS app. Currently `docker-compose.yml` includes Redis but there is **no `@nestjs/bull`, `ioredis`, or `cache-manager` dependency** in `apps/api/package.json`.
  - If NOT used → remove the `redis` service from `docker-compose.yml` to simplify the stack
  - If it WILL be used → add `ioredis` or `@nestjs/cache-manager` as a dependency and configure it
- [ ] If keeping Redis, update Redis password in production config

---

## 6. File Uploads (Proposals)

- [ ] Proposals use `multer` for file uploads, stored in `apps/api/uploads/`. In production this local folder won't persist across deploys or container restarts.
  - **Option A (quick)**: Mount the uploads folder as a Docker volume
  - **Option B (recommended)**: Migrate to cloud storage (AWS S3, Cloudflare R2, or Supabase Storage) using `@aws-sdk/client-s3` + `multer-s3`
- [ ] Ensure `apps/api/uploads/` is listed in `.gitignore` (check now)
- [ ] Test proposal download/view after deploy to confirm static file serving works

---

## 7. Build Verification

Run these locally before deploying to confirm no TypeScript/build errors:

```bash
# From monorepo root
npm run build            # builds all apps via Turborepo

# Or individually:
cd apps/api && npx nest build
cd apps/web && npx next build
```

- [x] **[BLOCKING]** `npx nest build` completes without errors
- [x] **[BLOCKING]** `npx next build` completes without errors — fixed `useSearchParams` Suspense boundary on `/login`
- [ ] Fix any TypeScript errors reported during build
- [ ] Verify `prisma generate` is run before the API build (add to build script if missing)

---

## 8. Reverse Proxy / HTTPS

For production, run both apps behind Nginx or Caddy:

- [ ] Install Nginx/Caddy on the server or configure in Docker
- [ ] Configure SSL certificate (Let's Encrypt / Cloudflare)
- [ ] Route `/api/*` → `localhost:3001`
- [ ] Route `/*` → `localhost:3000` (Next.js)
- [ ] Enable HTTP → HTTPS redirect
- [ ] Set `FRONTEND_URL` in API env to the real HTTPS domain
- [ ] Set `NEXT_PUBLIC_API_URL` to the HTTPS API URL

Sample Nginx location block:
```nginx
location /api/ {
  proxy_pass http://localhost:3001;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}
```

---

## 9. Docker / Production Setup

- [ ] Decide on deployment strategy:
  - **Option A**: Docker Compose on a VPS (DigitalOcean, Hetzner, etc.)
  - **Option B**: Platform-as-a-Service (Render, Railway, Fly.io)
  - **Option C**: Kubernetes (overkill for MVP)
- [ ] Write `Dockerfile` for the API (`apps/api/Dockerfile`)
- [ ] Write `Dockerfile` for the Web (`apps/web/Dockerfile`)
- [ ] Update `docker-compose.yml` to include `api` and `web` services (currently only DB + Redis)
- [ ] Add `HEALTHCHECK` instruction to API Dockerfile
- [ ] Configure container restart policy: `restart: unless-stopped`
- [ ] Set resource limits (memory/CPU) for containers

---

## 10. Logging & Monitoring

- [ ] Replace all `console.log` / `console.error` in the API with NestJS `Logger` service
- [ ] Configure log levels per environment (`LOG_LEVEL=info` for prod, `debug` for dev)
- [ ] Set up centralized log collection (options: Loki + Grafana, Datadog, Papertrail)
- [ ] Add error tracking (Sentry is free tier — install `@sentry/nestjs` and `@sentry/nextjs`)
- [ ] Configure uptime monitoring (Better Uptime, UptimeRobot — free)

---

## 11. Health Check Endpoint

- [x] Add a `/api/health` endpoint to the NestJS app that returns `{ status: 'ok', timestamp, version }` — added at `apps/api/src/health/health.controller.ts`.

---

## 12. Backup Module

- [ ] Test the `backup` module (`apps/api/src/backup/`) — understand what it backs up and where
- [ ] Configure backup destination (should be external, not local disk)
- [ ] Verify backup download endpoint is admin-only

---

## 13. Admin User & Initial Data

- [ ] Verify the seed creates at least one admin user with a **changed** password (not a default)
- [ ] Create initial Units of Measure data (pcs, kg, ltr, mtr, set, box, roll)
- [ ] Create initial Product Categories
- [ ] Document the admin login credentials securely (password manager, not in code)

---

## 14. Final Pre-Launch Checks

- [ ] Run a full smoke test (see TEST-PLAN.md) on the staging environment
- [ ] Verify all sidebar navigation links work
- [ ] Verify login → JWT → refresh token flow works end-to-end
- [ ] Confirm role-based access: salesperson cannot access `/users` or `/settings/boq-templates`
- [ ] Check browser console for errors on every main page
- [ ] Test on mobile (responsive design check)
- [ ] Verify CORS does not block API calls from the frontend domain
- [ ] Check the Network tab: all API calls returning `200`/`201`, none returning `500`
- [ ] Confirm file uploads work (create a proposal with a file)
- [ ] Confirm proposal document download works (DOCX generation)

---

## Summary Scorecard

| Category | Items | Status |
|----------|-------|--------|
| Code Cleanup | 7 | ⬜ |
| Security | 9 | ⬜ |
| Environment | 5 | ⬜ |
| Database | 6 | ⬜ |
| Redis | 2 | ⬜ |
| File Uploads | 3 | ⬜ |
| Build | 5 | ⬜ |
| HTTPS/Proxy | 7 | ⬜ |
| Docker | 6 | ⬜ |
| Logging & Monitoring | 5 | ⬜ |
| Health Check | 1 | ⬜ |
| Backup | 3 | ⬜ |
| Initial Data | 3 | ⬜ |
| Final Checks | 10 | ⬜ |
| **TOTAL** | **72** | |
