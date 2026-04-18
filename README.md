# Oxycure ERP — Phase 1

A full-stack ERP system for Oxycure, built with Next.js, NestJS, Prisma, and PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TanStack Query, Framer Motion, Tailwind CSS |
| Backend | NestJS 10, Passport JWT, Swagger |
| Database | PostgreSQL 16 + Prisma 5 ORM |
| Cache | Redis 7 |
| Auth | JWT (httpOnly cookies) + Refresh token rotation |
| Dev | Turborepo monorepo, npm workspaces |

---

## Prerequisites

- Node.js 18+
- Docker Desktop (for PostgreSQL & Redis)
- npm 9+

---

## Quick Start

### 1. Clone & install dependencies

```bash
cd "Oxycure_ERP"
npm install
```

### 2. Start the database

```bash
npm run docker:up
```

This starts PostgreSQL on port `5432` and Redis on port `6379`.

### 3. Set up environment

```bash
# Copy and edit env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env   # (already created)
```

Verify `apps/api/.env`:
```env
DATABASE_URL="postgresql://oxycure:oxycure_secret_2026@localhost:5432/oxycure_erp"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
FRONTEND_URL="http://localhost:3000"
REDIS_URL="redis://:oxycure_redis_2026@localhost:6379"
PORT=3001
```

Verify `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 4. Run database migrations & seed

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start the development servers

```bash
npm run dev
```

This starts:
- **API**: http://localhost:3001
- **Web**: http://localhost:3000
- **Swagger**: http://localhost:3001/api/docs

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@oxycure.com | Admin@2026 |
| Manager | manager@oxycure.com | Manager@2026 |
| Salesperson | salesperson@oxycure.com | Sales@2026 |
| Design Engineer | design@oxycure.com | Design@2026 |

---

## Project Structure

```
Oxycure_ERP/
├── apps/
│   ├── api/              # NestJS backend
│   │   └── src/
│   │       ├── auth/     # JWT auth with refresh tokens
│   │       ├── leads/    # Core leads management
│   │       ├── customers/
│   │       ├── quotations/
│   │       ├── orders/
│   │       └── users/
│   └── web/              # Next.js frontend
│       └── src/
│           ├── app/      # App Router pages
│           ├── components/
│           │   ├── layout/   # Sidebar, TopBar
│           │   └── leads/    # Leads page components
│           ├── lib/      # API client, utilities
│           └── stores/   # Zustand state
├── packages/
│   └── database/         # Prisma schema + seed
├── docker-compose.yml
└── turbo.json
```

---

## Available Scripts

```bash
npm run dev          # Start all apps in dev mode
npm run build        # Build all apps
npm run docker:up    # Start PostgreSQL + Redis
npm run docker:down  # Stop containers
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database with sample data
npm run db:studio    # Open Prisma Studio (DB GUI)
```

---

## Key Features (Phase 1)

- **Lead Management**: Full CRUD, status tracking (New → Contacted → Qualified → Quoted → Won/Lost)
- **Role-based Access**: Admin, Manager, Salesperson, Design Engineer
- **Premium Leads Page**: Stats cards, distribution bar, status filters, rich table, slide-over detail panel, 3-step create dialog
- **Lead Conversion**: Convert qualified lead → Customer + Order (atomic transaction)
- **Notes & Follow-ups**: Track communication history per lead
- **Customers**: Auto-created on lead conversion
- **Quotations & Orders**: Basic creation and status tracking
- **Audit Logging**: All changes tracked with user + timestamp
- **Account Security**: 5 failed attempts → 15-minute lockout

---

## API Documentation

Swagger UI is available at: http://localhost:3001/api/docs

All endpoints require JWT authentication (passed via httpOnly cookie automatically).
