# OXYCURE ERP — Master Blueprint & System Architecture

> **Version:** 1.0
> **Created:** April 2026
> **Status:** Planning Phase
> **Owner:** Oxycure Team

---

## 1. Executive Summary

Oxycure ERP is a centralized, real-time enterprise resource planning system designed to manage the **complete business lifecycle** of Oxycure's air purification and medical equipment business:

```
Lead → Qualification → Design/Spec → Quotation → Order → Fulfillment → Installation → Billing → Service/AMC → Closure
```

### Problem Statement
Currently, business operations are fragmented across:
- WhatsApp conversations (untrackable)
- Excel sheets (no real-time visibility)
- Phone calls (no audit trail)
- Human memory (single point of failure)

### Solution
A **single source of truth** that replaces all fragmented systems with a unified platform providing:
- Complete lead-to-revenue tracking
- Real-time operational visibility
- Data-driven decision making
- Accountability at every level

---

## 2. System Vision

> *"To create a centralized, real-time system that tracks every customer, every order, and every service activity from first contact to long-term maintenance — enabling zero-leak operations and data-driven growth."*

### Success Metrics (North Stars)
| Metric | Target |
|--------|--------|
| Lead leakage | 0% (no lost leads) |
| Order visibility | 100% real-time status |
| Payment collection gap | < 5 days overdue |
| Service response time | < 24 hours |
| Data-driven decisions | 100% (no guesswork) |

---

## 3. Core Modules Overview

| # | Module | Phase | Priority |
|---|--------|-------|----------|
| 1 | User & Role Management | Phase 1 | Critical |
| 2 | Lead Management | Phase 1 | Critical |
| 3 | Design / Spec Recommendation | Phase 1 | Critical |
| 4 | Sales Pipeline & Quotations | Phase 1 | Critical |
| 5 | Customer Management | Phase 1 | Critical |
| 6 | Order Management | Phase 1 | Critical |
| 7 | Product & Inventory Catalog | Phase 1.5 | High |
| 8 | Order Fulfillment (Pick/Pack/Dispatch) | Phase 2 | High |
| 9 | Vendor & Procurement | Phase 2 | High |
| 10 | Installation & Operations | Phase 2 | High |
| 11 | Site/Project Management | Phase 2 | High |
| 12 | Service & Maintenance | Phase 3 | High |
| 13 | AMC Management | Phase 3 | High |
| 14 | Payments & Invoicing | Phase 4 | High |
| 15 | Expense Tracking | Phase 4 | Medium |
| 16 | Dashboard & Analytics | Phase 5 | Medium |
| 17 | Notifications & Alerts | Phase 5 | Medium |
| 18 | Document Management | Phase 5 | Medium |
| 19 | Audit & Activity Logs | Cross-phase | Critical |

---

## 4. Development Phases — Summary

```
Phase 1: MVP (Foundation)        — Leads + Design/Spec + Quotations + Orders + Users
Phase 1.5: Product Catalog       — Products + Basic Inventory
Phase 2: Operations Layer        — Fulfillment + Vendor/Procurement + Installation + Projects
Phase 3: Service Layer           — AMC + Complaints + Service History
Phase 4: Finance Layer           — Payments + Invoices + Expense Tracking
Phase 5: Intelligence Layer      — Dashboards + KPIs + Reports + Notifications
Phase 6: Automation & Scale      — Workflows + Integrations + Mobile App
```

### Phase Dependency Chain
```
Phase 1 (MVP)
    └── Phase 1.5 (Product Catalog)
         ├── Phase 2 (Operations)
         │    └── Phase 3 (Service)
         │         └── Phase 4 (Finance)
         │              └── Phase 5 (Intelligence)
         │                   └── Phase 6 (Automation)
         └── Phase 4 (Finance) [can start in parallel with Phase 2/3]
```

---

## 5. Technology Stack (Recommended)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Backend** | NestJS (Node.js + TypeScript) | Enterprise-grade, modular, scalable |
| **Database** | PostgreSQL | Relational integrity, JSON support, mature |
| **ORM** | TypeORM / Prisma | Type-safe database access |
| **Frontend** | Next.js + React | SSR, fast, component-based |
| **UI Library** | Shadcn/UI + Tailwind CSS | Clean, customizable, fast development |
| **Auth** | JWT + Role-based (RBAC) | Stateless, scalable |
| **File Storage** | S3 / MinIO | Documents, photos, reports |
| **Cache** | Redis | Session, frequently accessed data |
| **Deployment** | Docker + Railway / AWS | Containerized, reproducible |
| **CI/CD** | GitHub Actions | Automated testing and deployment |

---

## 6. Additional Recommendations (Beyond Your Outline)

### 6.1 Audit & Activity Logging (Cross-Phase)
Every action in the system should be logged:
- Who did what, when, to which record
- Critical for accountability and dispute resolution
- **Implement from Day 1** — retrofitting is painful

### 6.2 Customer Management (Phase 1)
You mentioned leads and orders but a **dedicated customer entity** is missing:
- A lead converts to a customer
- A customer can have multiple orders
- Customer history (all interactions, orders, complaints) in one view

### 6.3 Product & Inventory Catalog (Phase 1.5)
Before Phase 2 (installation), you need:
- Product master list (air purifiers, systems, accessories)
- SKUs, pricing tiers
- Basic stock tracking
- Bill of Materials (BOM) for installations

### 6.4 Document Management (Phase 5)
- Quotation PDFs
- Installation photos
- Signed agreements
- AMC contracts
- Invoices
- Centralized, searchable, linked to entities

### 6.5 Notification System (Phase 5)
- Follow-up reminders for salespeople
- Overdue payment alerts for finance
- AMC renewal reminders
- Installation schedule notifications
- Escalation alerts for managers

### 6.6 Workflow Automation (Phase 6)
- Auto-assign leads by region/round-robin
- Auto-create follow-up tasks
- Auto-escalate overdue items
- Auto-send AMC renewal reminders

### 6.7 Integration Points (Phase 6)
- **WhatsApp Business API** — Send notifications, receive leads
- **Tally / accounting software** — Sync invoices
- **Google Maps** — Site location tracking
- **Email** — Automated communications
- **Website** — Lead capture form → ERP

### 6.8 Mobile Responsiveness (Cross-Phase)
Field teams (installers, service engineers) need mobile access:
- Responsive web initially
- PWA (Progressive Web App) for Phase 5+
- Native app consideration for Phase 6

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Response time | < 500ms for all pages |
| Uptime | 99.5% |
| Data backup | Daily automated backups |
| Security | HTTPS, encrypted passwords, role-based access |
| Concurrent users | Support 50+ simultaneous users |
| Data retention | Minimum 7 years |
| Browser support | Chrome, Edge, Safari (latest 2 versions) |

---

## 8. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Scope creep | Strict phase boundaries, MVP-first approach |
| User adoption resistance | Involve end users early, simple UI, training |
| Data migration from Excel | Plan migration scripts, validate data |
| Single developer dependency | Document everything, use conventions |
| Database schema changes | Use migrations from Day 1 |
| Performance degradation | Index critical queries, pagination everywhere |

---

## 9. Documentation Index

| Document | Path |
|----------|------|
| Phase 1: MVP Spec | `docs/01-PHASE-1-MVP.md` |
| Phase 2: Operations Spec | `docs/02-PHASE-2-OPERATIONS.md` |
| Phase 3: Service Spec | `docs/03-PHASE-3-SERVICE.md` |
| Phase 4: Finance Spec | `docs/04-PHASE-4-FINANCE.md` |
| Phase 5: Intelligence Spec | `docs/05-PHASE-5-INTELLIGENCE.md` |
| Database Schema Blueprint | `docs/06-DATABASE-SCHEMA.md` |
| API Routes Blueprint | `docs/07-API-ROUTES.md` |
| Roles & Permissions Matrix | `docs/08-ROLES-PERMISSIONS.md` |
| Business Process Flows | `docs/09-BUSINESS-FLOWS.md` |

---

*This is a living document. Update as decisions are made and phases are completed.*
