# Phase 5: Intelligence Layer — Dashboards + KPIs + Reports + Notifications

> **Goal:** Turn data into decisions — real-time visibility, alerts, and actionable insights
> **Core Question:** *"Can we see the health of our business at a glance and get alerted before problems escalate?"*
> **Prerequisite:** Phases 1-4 operational (data flowing through all modules)

---

## 1. Phase 5 Objectives

1. Role-specific dashboards with real-time KPIs
2. Comprehensive reporting across all modules
3. Notification and alert system (in-app + email)
4. Document management (centralized file storage)
5. Data export and scheduled reports
6. Predictive insights (basic)

---

## 2. Modules in Phase 5

### Module 15: Dashboards & KPIs

#### Executive Dashboard (Admin / Owner)
```
┌─────────────────────────────────────────────────────────────────────┐
│  OXYCURE ERP — Executive Overview                    [Apr 2026]    │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│  Revenue     │  Orders      │  Active AMCs │  Open Tickets         │
│  ₹42.5L MTD  │  18 this mo  │  145         │  12 (3 SLA breach)   │
├──────────────┴──────────────┴──────────────┴────────────────────────┤
│                                                                     │
│  📈 Revenue Trend (12 months)           📊 Lead Funnel              │
│  [Line Chart]                          [Funnel Chart]              │
│                                                                     │
│  🏗️ Installation Pipeline              💰 Overdue Payments          │
│  [Stacked Bar]                         [Table: Top 10]             │
│                                                                     │
│  👥 Team Performance                   ⚠️ Alerts                    │
│  [Table: Salesperson → Conversions]    - 5 AMCs expiring this week │
│                                        - 3 SLA breaches today      │
│                                        - ₹8.2L overdue > 30 days  │
└─────────────────────────────────────────────────────────────────────┘
```

#### Sales Dashboard (Manager / Salesperson)
| KPI | Description |
|-----|------------|
| Leads this month | Count by source, status |
| Conversion rate | Leads converted / Total leads |
| Pipeline value | Total value of open opportunities |
| Avg deal cycle | Days from lead to order |
| Quotations sent vs accepted | Acceptance rate |
| Top salesperson | By conversions + revenue |
| Follow-ups due today | Count + list |
| Lost leads analysis | Top reasons for losing |

#### Operations Dashboard (Operations Manager)
| KPI | Description |
|-----|------------|
| Active installations | Count by status |
| Installations this month | Completed vs in-progress |
| Avg installation time | Days from scheduling to completion |
| Pending site surveys | Count |
| Open issues | By severity |
| Team utilization | Installers and their current load |
| Overdue installations | Past scheduled end date |
| Inventory low stock | Items below threshold |

#### Service Dashboard (Service Manager)
| KPI | Description |
|-----|------------|
| Open tickets | By severity, by engineer |
| SLA compliance rate | % tickets within SLA |
| Avg response time | Hours from report to first response |
| Avg resolution time | Hours from report to resolution |
| AMCs expiring soon | 30/60/90 day windows |
| Customer satisfaction | Avg rating from feedback |
| Repeat complaints | Customers with 3+ tickets |
| Service revenue | From chargeable visits |

#### Finance Dashboard (Finance / Admin)
| KPI | Description |
|-----|------------|
| Monthly revenue | Invoiced amount |
| Cash collected | Payments received this month |
| Outstanding receivables | Total unpaid invoices |
| Overdue amount | Past due date |
| Aging report | 0-30, 31-60, 61-90, 90+ days |
| Top debtors | Customers with highest dues |
| Expense summary | By category, by month |
| Profit per order | Revenue - expenses (basic) |

---

### Module 16: Reports Engine

#### Standard Reports

**Sales Reports:**
- Lead Source Analysis (which source brings most leads)
- Lead Status Report (pipeline snapshot)
- Salesperson Performance Report
- Conversion Funnel Report (stage-by-stage drop-off)
- Quotation Analysis (sent vs accepted vs rejected)
- Revenue by Product (which products sell most)
- Revenue by Region (city/state breakdown)
- Monthly/Quarterly Sales Trend

**Operations Reports:**
- Installation Status Report
- Installation Timeline Report (on-time vs delayed)
- Team Utilization Report
- Material Usage Report
- Issue Resolution Report
- Inventory Stock Report
- Inventory Movement Report

**Service Reports:**
- SLA Compliance Report
- Ticket Volume Report (daily/weekly/monthly)
- Engineer Performance Report
- AMC Renewal Report
- Customer Satisfaction Report
- Parts Consumption Report
- Warranty Claims Report
- Repeat Complaint Report

**Finance Reports:**
- Revenue Report (monthly/quarterly/yearly)
- Collection Report
- Aging Report (receivables)
- Invoice Register
- Payment Register
- Expense Report (by category, by department)
- GST Report (CGST, SGST, IGST breakdowns)
- Profit & Loss Summary (basic)
- Customer Ledger (all transactions per customer)

#### Report Features
- [x] Date range filtering (custom, MTD, QTD, YTD)
- [x] Export to CSV and Excel
- [x] Export to PDF
- [x] Schedule recurring reports (weekly/monthly email)
- [x] Save report configurations as templates
- [x] Drill-down capability (click chart → see details)

#### Data Model: `report_templates`
```
id                  UUID (PK)
name                VARCHAR — required
report_type         VARCHAR — which report
filters             JSONB — saved filter configuration
schedule            ENUM('none', 'daily', 'weekly', 'monthly')
schedule_recipients JSONB — [{user_id, email}]
last_generated_at   TIMESTAMP
created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

### Module 17: Notification & Alert System

#### Notification Types
| Category | Event | Recipients | Channel |
|----------|-------|-----------|---------|
| **Lead** | New lead assigned | Salesperson | In-app, Email |
| **Lead** | Follow-up due today | Salesperson | In-app |
| **Lead** | Follow-up overdue | Salesperson + Manager | In-app, Email |
| **Lead** | Lead unattended 48h | Manager | In-app, Email |
| **Sales** | Quotation accepted | Salesperson | In-app |
| **Sales** | Quotation expired | Salesperson | In-app |
| **Order** | New order created | Operations | In-app |
| **Order** | Order status changed | Sales + Customer | In-app |
| **Install** | Installation scheduled | Install team | In-app, Email |
| **Install** | Installation overdue | Ops Manager | In-app, Email |
| **Install** | Issue reported | Team Lead + Manager | In-app |
| **Service** | New ticket created | Service Engineer | In-app, Email |
| **Service** | SLA about to breach | Engineer + Manager | In-app, Email |
| **Service** | SLA breached | Manager | In-app, Email |
| **Service** | Ticket escalated | Escalated-to user | In-app, Email |
| **AMC** | AMC expiring in 30 days | Account Manager | In-app, Email |
| **AMC** | AMC expired | Manager | In-app |
| **Finance** | Payment received | Finance | In-app |
| **Finance** | Invoice overdue | Finance + Sales | In-app, Email |
| **Finance** | Expense pending approval | Manager | In-app |
| **System** | Daily summary digest | Manager, Admin | Email |
| **System** | Weekly performance report | Admin | Email |

#### Data Model: `notifications`
```
id                  UUID (PK)
user_id             UUID (FK → users) — recipient
type                VARCHAR — notification type key
title               VARCHAR — short title
message             TEXT — detailed message
entity_type         VARCHAR — 'lead', 'order', 'ticket', etc.
entity_id           UUID — linked entity
channel             ENUM('in_app', 'email', 'both')
is_read             BOOLEAN — default false
read_at             TIMESTAMP
email_sent          BOOLEAN — default false
email_sent_at       TIMESTAMP
created_at          TIMESTAMP
```

#### Data Model: `notification_preferences`
```
id                  UUID (PK)
user_id             UUID (FK → users)
notification_type   VARCHAR — type key
in_app_enabled      BOOLEAN — default true
email_enabled       BOOLEAN — default true
updated_at          TIMESTAMP
```

#### Screens
| Screen | Access | Key Actions |
|--------|--------|-------------|
| Notification Bell (Header) | All | View count, dropdown of recent |
| Notification Center | All | Full list, mark read, filter by type |
| Notification Preferences | All | Toggle on/off per type per channel |

---

### Module 18: Document Management

#### Features
- [x] Upload documents against any entity (lead, order, installation, etc.)
- [x] Document categorization
- [x] Secure file storage (S3/MinIO)
- [x] Preview support (images, PDFs)
- [x] Version tracking
- [x] Access control (only entity viewers can see documents)

#### Data Model: `documents`
```
id                  UUID (PK)
entity_type         VARCHAR — 'lead', 'order', 'installation', 'customer', 'service_ticket', 'amc', 'expense'
entity_id           UUID — linked entity
category            ENUM('quotation', 'invoice', 'contract', 'photo', 'report', 'receipt', 'agreement', 'certificate', 'other')
file_name           VARCHAR — original filename
file_path           VARCHAR — storage path (S3 key)
file_size           INTEGER — bytes
mime_type           VARCHAR — e.g., 'application/pdf', 'image/jpeg'
description         TEXT
version             INTEGER — default 1
uploaded_by         UUID (FK → users)
created_at          TIMESTAMP
```

---

## 3. Phase 5 API Endpoints

### Dashboard
```
GET    /api/dashboard/executive              — Executive overview
GET    /api/dashboard/sales                  — Sales KPIs
GET    /api/dashboard/operations             — Operations KPIs
GET    /api/dashboard/service                — Service KPIs
GET    /api/dashboard/finance                — Finance KPIs
GET    /api/dashboard/my                     — Personal dashboard
```

### Reports
```
GET    /api/reports/leads/source-analysis     — Lead source report
GET    /api/reports/leads/conversion-funnel   — Funnel analysis
GET    /api/reports/sales/performance         — Salesperson performance
GET    /api/reports/sales/revenue             — Revenue report
GET    /api/reports/operations/installations  — Installation report
GET    /api/reports/operations/inventory      — Stock report
GET    /api/reports/service/sla              — SLA compliance
GET    /api/reports/service/satisfaction     — Customer satisfaction
GET    /api/reports/finance/aging            — Aging report
GET    /api/reports/finance/gst             — GST report
GET    /api/reports/finance/pnl             — Profit & Loss
GET    /api/reports/finance/customer-ledger/:id — Customer ledger
GET    /api/reports/custom                   — Custom report with filters
POST   /api/reports/templates                — Save report template
GET    /api/reports/templates                — List saved templates
POST   /api/reports/export                   — Export (CSV/Excel/PDF)
POST   /api/reports/schedule                 — Schedule recurring report
```

### Notifications
```
GET    /api/notifications                    — My notifications
GET    /api/notifications/unread-count       — Unread count
PATCH  /api/notifications/:id/read           — Mark as read
POST   /api/notifications/mark-all-read      — Mark all as read
GET    /api/notifications/preferences        — My preferences
PATCH  /api/notifications/preferences        — Update preferences
```

### Documents
```
POST   /api/documents                        — Upload document
GET    /api/documents/:id                    — Get document metadata
GET    /api/documents/:id/download           — Download file
DELETE /api/documents/:id                    — Delete document
GET    /api/documents/entity/:type/:id       — Documents for an entity
```

---

## 4. Phase 5 Acceptance Criteria

- [ ] Role-specific dashboards load with real-time data
- [ ] All KPIs calculate correctly
- [ ] Charts render properly (line, bar, funnel, pie)
- [ ] Date range filtering works on all dashboards
- [ ] At least 15 standard reports are available
- [ ] Reports export to CSV, Excel, and PDF
- [ ] Report scheduling works (email delivery)
- [ ] In-app notifications appear in real time
- [ ] Email notifications sent for critical events
- [ ] Users can configure notification preferences
- [ ] Documents can be uploaded against any entity
- [ ] Document preview works for images and PDFs
- [ ] Access control enforced on documents
- [ ] Dashboard loads within 3 seconds
- [ ] Reports generate within 10 seconds

---

*Phase 5 transforms raw data into business intelligence. This is where leadership gets confident decision-making power.*
