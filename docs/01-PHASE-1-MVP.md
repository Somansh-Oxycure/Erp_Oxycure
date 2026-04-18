# Phase 1: MVP — Leads + Design/Spec + Quotations + Orders + Users

> **Goal:** Start using the system internally ASAP
> **Core Question:** *"Can we track leads, get design specs, create quotations, and convert them to orders properly?"*
> **Estimated Scope:** Foundation of the entire system

---

## 1. Phase 1 Objectives

1. Replace WhatsApp/Excel-based lead tracking with a centralized system
2. Assign and track leads with full accountability
3. Move leads through a defined sales pipeline
4. Enable design team to provide specifications and product recommendations
5. Generate quotations from design specs
6. Convert won leads into orders
7. Establish user roles and basic access control
8. Create an audit trail for every action

---

## 2. Modules in Phase 1

### Module 1: Authentication & User Management

#### Features
- [x] User registration (admin-created only, no self-signup)
- [x] Login / Logout (JWT-based)
- [x] Password reset
- [x] User profile view/edit
- [x] Role assignment (Admin, Manager, Salesperson, Design Engineer)
- [x] Department assignment (Sales, Operations, Service, Admin, Design)
- [x] Active/Inactive toggle (soft disable users)

#### Data Model: `users`
```
id                  UUID (PK)
employee_id         VARCHAR — unique company employee ID
first_name          VARCHAR — required
last_name           VARCHAR — required
email               VARCHAR — unique, required
phone               VARCHAR — required
password_hash       VARCHAR — bcrypt hashed
role                ENUM('admin', 'manager', 'salesperson', 'installer', 'service_engineer', 'design_engineer', 'finance')
department          ENUM('sales', 'operations', 'service', 'admin', 'finance', 'design')
is_active           BOOLEAN — default true
last_login_at       TIMESTAMP
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Screens
| Screen | Access | Actions |
|--------|--------|---------|
| Login Page | Public | Login with email/password |
| User List | Admin, Manager | View all users, filter by role/dept |
| Create User | Admin | Fill form, assign role + department |
| User Profile | Self, Admin | View/edit profile, change password |

#### Business Rules
- Only Admins can create/disable users
- Passwords must be minimum 8 characters
- Failed login attempts: lock after 5 attempts for 15 minutes
- JWT tokens expire in 24 hours
- Every login creates an audit log entry

---

### Module 2: Lead Management

#### Features
- [x] Create lead (manual entry)
- [x] Lead list with filters and search
- [x] Lead detail view
- [x] Assign lead to salesperson
- [x] Update lead status
- [x] Add notes/follow-up comments
- [x] Schedule follow-ups with dates
- [x] Convert lead to customer + order (when Won)
- [x] Mark lead as lost (with reason)
- [x] Request design/spec recommendation from design team

#### Lead Lifecycle
```
                    ┌──────────┐
                    │   NEW    │
                    └────┬─────┘
                         │ (First contact made)
                    ┌────▼──────┐
                    │ CONTACTED │
                    └────┬──────┘
                         │ (Requirement understood, design spec requested)
                    ┌────▼──────┐
                    │ QUALIFIED │
                    └────┬──────┘
                         │ (Quotation created and sent)
                    ┌────▼───┐
                    │ QUOTED  │
                    └────┬────┘
                        / \
                       /   \
              ┌───────▼┐  ┌▼────────┐
              │  WON   │  │  LOST   │
              │(→Order)│  │(+reason)│
              └────────┘  └─────────┘
```

#### Data Model: `leads`
```
id                  UUID (PK)
lead_number         VARCHAR — auto-generated (e.g., LD-2026-0001)
first_name          VARCHAR — required
last_name           VARCHAR
email               VARCHAR
phone               VARCHAR — required
alternate_phone     VARCHAR
company_name        VARCHAR — for B2B leads
designation         VARCHAR
address_line1       VARCHAR
address_line2       VARCHAR
city                VARCHAR — required
state               VARCHAR — required
pincode             VARCHAR
source              ENUM('website', 'referral', 'walk_in', 'cold_call', 'social_media', 'exhibition', 'partner', 'other')
source_detail       VARCHAR — e.g., "referred by Dr. Sharma"
status              ENUM('new', 'contacted', 'qualified', 'quoted', 'won', 'lost')
lost_reason         VARCHAR — required when status = lost
priority            ENUM('low', 'medium', 'high', 'urgent') — default 'medium'
assigned_to         UUID (FK → users) — salesperson
estimated_value     DECIMAL — approximate deal value
product_interest    VARCHAR — what product they're interested in
product_type        ENUM('air_purifier', 'moscure', 'industrial_solution', 'hvac', 'other') — product category
requirement_notes   TEXT — detailed requirement
site_inspection_needed BOOLEAN — default false
design_spec_id      UUID (FK → design_specifications) — linked design spec
next_follow_up_date DATE
converted_at        TIMESTAMP
converted_by        UUID (FK → users)
customer_id         UUID (FK → customers) — populated on win
created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `lead_notes`
```
id                  UUID (PK)
lead_id             UUID (FK → leads)
note                TEXT — required
note_type           ENUM('general', 'follow_up', 'meeting', 'call', 'status_change', 'site_inspection', 'design_review')
created_by          UUID (FK → users)
created_at          TIMESTAMP
```

#### Data Model: `lead_follow_ups`
```
id                  UUID (PK)
lead_id             UUID (FK → leads)
scheduled_date      DATE — required
scheduled_time      TIME
description         TEXT — what to follow up about
status              ENUM('pending', 'completed', 'missed', 'rescheduled')
outcome             TEXT — what happened
completed_at        TIMESTAMP
assigned_to         UUID (FK → users)
created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Screens
| Screen | Access | Key Actions |
|--------|--------|-------------|
| Lead List | Sales, Manager, Admin | View leads, filter by status/assignee/date/source, search by name/phone |
| Create Lead | Sales, Manager, Admin | Fill lead form, auto-assign or manual assign |
| Lead Detail | Sales (own), Manager, Admin | View full info, update status, add notes, schedule follow-up |
| Assign Lead | Manager, Admin | Select salesperson, add assignment note |
| Request Design Spec | Sales, Manager, Admin | Request design/spec recommendation for qualified lead |
| Convert Lead | Sales (own), Manager, Admin | Confirm win, create customer record, create order |
| My Leads | Salesperson | View only assigned leads, filter by status |
| Today's Follow-ups | Salesperson | List of follow-ups due today |

#### Business Rules
- Lead number auto-generated: `LD-{YEAR}-{SEQUENCE}`
- Phone number is mandatory (primary contact method)
- New leads default to status = `new`
- Lead status flow: `new → contacted → qualified → quoted → won / lost`
- Assignment is tracked separately (assigned_to field) and does NOT change lead status
- Only the assigned salesperson or managers can update a lead
- Moving to `qualified` requires: requirement captured + product type selected
- Moving to `quoted` requires: at least one quotation created
- Moving to `won` requires: accepted quotation, creates customer + order
- Lost leads must have a reason (can happen from any status after `contacted`)
- Follow-ups past due date are flagged
- Duplicate check on phone number — warn if exists
- Every status change creates an audit log + a note entry

---

### Module 3: Customer Management

#### Features
- [x] Auto-created when lead is converted
- [x] Customer list with search
- [x] Customer detail view (all orders, history)
- [x] Edit customer details
- [x] Customer timeline (interactions, orders, notes)

#### Data Model: `customers`
```
id                  UUID (PK)
customer_number     VARCHAR — auto-generated (e.g., CUS-2026-0001)
first_name          VARCHAR — required
last_name           VARCHAR
email               VARCHAR
phone               VARCHAR — required, unique
alternate_phone     VARCHAR
company_name        VARCHAR
designation         VARCHAR
gst_number          VARCHAR
address_line1       VARCHAR
address_line2       VARCHAR
city                VARCHAR — required
state               VARCHAR — required
pincode             VARCHAR
customer_type       ENUM('individual', 'business', 'hospital', 'clinic', 'government', 'other')
lead_id             UUID (FK → leads) — source lead
created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Business Rules
- One lead = One customer (on conversion)
- Customer can have multiple orders
- Phone must be unique across customers
- Customer number auto-generated: `CUS-{YEAR}-{SEQUENCE}`

---

### Module 3.5: Design / Spec Recommendation (NEW — Core to Oxycure)

> **Why this is in MVP:** Oxycure sells technical products (air purifiers, industrial solutions).
> Customers need product specifications and configuration recommendations before
> they can evaluate a quotation. This step is NOT optional — it's core to the sales process.

#### Features
- [x] Create design specification for a qualified lead
- [x] Design team reviews requirement and recommends product configuration
- [x] Attach technical specs (product model, configuration, BOM)
- [x] Site inspection notes (dimensions, power, environment)
- [x] Design spec approval workflow (design team → sales → customer)
- [x] Link design spec to quotation (specs become quotation line items)

#### Design Spec Lifecycle
```
REQUESTED → IN_PROGRESS → COMPLETED → APPROVED → LINKED_TO_QUOTATION
                                         │
                                    REVISION_NEEDED
```

#### Data Model: `design_specifications`
```
id                  UUID (PK)
spec_number         VARCHAR — auto-generated (e.g., DSG-2026-0001)
lead_id             UUID (FK → leads) — required
customer_id         UUID (FK → customers) — null until lead is won
status              ENUM('requested', 'in_progress', 'completed', 'approved', 'revision_needed')

-- Requirement Input
product_type        ENUM('air_purifier', 'moscure', 'industrial_solution', 'hvac', 'other')
requirement_summary TEXT — what the customer needs
site_area_sqft      DECIMAL — space to be covered
site_type           VARCHAR — hospital, clinic, office, factory, etc.
site_environment    TEXT — pollution level, dust, humidity, etc.
power_availability  VARCHAR — single phase, three phase, voltage
special_requirements TEXT — noise constraints, aesthetic needs, etc.

-- Site Inspection
site_inspection_done BOOLEAN — default false
site_inspection_date DATE
site_inspection_by  UUID (FK → users)
site_inspection_notes TEXT
site_photos_url     VARCHAR — link to uploaded photos

-- Design Output
recommended_products JSONB — [{product_name, model, quantity, unit_price, specs}]
configuration_notes TEXT — how products should be arranged/installed
technical_specs     TEXT — detailed technical specification
bom_items           JSONB — Bill of Materials [{item, qty, cost}]
estimated_cost      DECIMAL — total estimated cost

-- Approval
designed_by         UUID (FK → users) — design engineer
reviewed_by         UUID (FK → users) — manager/senior
approved_at         TIMESTAMP
revision_notes      TEXT — why revision needed

quotation_id        UUID (FK → quotations) — linked after quotation created
created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Screens
| Screen | Access | Key Actions |
|--------|--------|-------------|
| Design Spec List | Design, Sales, Manager, Admin | View all specs, filter by status/product type |
| Request Design Spec | Sales, Manager | From qualified lead, fill requirement |
| Design Spec Detail | Design, Sales (own lead), Manager, Admin | View/edit spec, add recommendations |
| Work on Spec | Design Engineer | Add product recommendations, BOM, technical details |
| Approve Spec | Manager, Admin | Review and approve or request revision |
| My Design Queue | Design Engineer | Specs assigned to me, prioritized |

#### Business Rules
- Design spec can only be created for leads in `qualified` status or later
- Moving a lead from `qualified` → `quoted` requires an approved design spec
- Design spec `recommended_products` feed directly into quotation line items
- Multiple revisions allowed (revision history tracked in audit log)
- Design engineer assignment is tracked (designed_by field)

---

### Module 4: Sales Pipeline

#### Features
- [x] Visual pipeline view (Kanban-style)
- [x] Drag-and-drop stage changes
- [x] Deal tracking with values
- [x] Quotation generation (basic)
- [x] Pipeline filtering by salesperson, date range, value

#### Sales Pipeline Stages
```
PROSPECT → DISCOVERY → PROPOSAL → NEGOTIATION → CLOSED_WON / CLOSED_LOST
```

#### Data Model: `opportunities`
```
id                  UUID (PK)
opportunity_number  VARCHAR — auto-generated (e.g., OPP-2026-0001)
lead_id             UUID (FK → leads) — source lead
customer_id         UUID (FK → customers) — null until conversion
title               VARCHAR — descriptive title
stage               ENUM('prospect', 'discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost')
deal_value          DECIMAL — estimated total value
probability         INTEGER — 0-100%
expected_close_date DATE
actual_close_date   DATE
lost_reason         VARCHAR
assigned_to         UUID (FK → users)
notes               TEXT
created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `quotations`
```
id                  UUID (PK)
quotation_number    VARCHAR — auto-generated (e.g., QT-2026-0001)
opportunity_id      UUID (FK → opportunities)
customer_id         UUID (FK → customers)
lead_id             UUID (FK → leads)
valid_until         DATE
subtotal            DECIMAL
tax_amount          DECIMAL
discount_amount     DECIMAL
total_amount        DECIMAL
status              ENUM('draft', 'sent', 'accepted', 'rejected', 'expired')
terms_and_conditions TEXT
notes               TEXT
created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `quotation_items`
```
id                  UUID (PK)
quotation_id        UUID (FK → quotations)
product_name        VARCHAR — free text in Phase 1 (linked to products in Phase 1.5)
description         TEXT
quantity            INTEGER
unit_price          DECIMAL
discount_percent    DECIMAL — default 0
tax_percent         DECIMAL — default 18 (GST)
total_price         DECIMAL — computed
sort_order          INTEGER
created_at          TIMESTAMP
```

#### Screens
| Screen | Access | Key Actions |
|--------|--------|-------------|
| Pipeline Board | Sales, Manager, Admin | Kanban view, drag stages, filter |
| Opportunity Detail | Sales (own), Manager, Admin | View/edit opportunity, create quotation |
| Create Quotation | Sales, Manager, Admin | Add items, set terms, preview |
| Quotation Preview | Sales, Manager, Admin | View PDF-style, download/share |
| Quotation List | Sales, Manager, Admin | All quotations, filter by status |

---

### Module 5: Order Management

#### Features
- [x] Create order from converted lead / accepted quotation
- [x] Order list with filters
- [x] Order detail view
- [x] Order status tracking
- [x] Basic product line items
- [x] Order timeline

#### Order Lifecycle
```
CREATED → CONFIRMED → IN_PROGRESS → COMPLETED
    │                        │
    │                        └── (Phase 2: Fulfillment + Installation)
    │
    └── CANCELLED
```

#### Data Model: `orders`
```
id                  UUID (PK)
order_number        VARCHAR — auto-generated (e.g., ORD-2026-0001)
customer_id         UUID (FK → customers) — required
lead_id             UUID (FK → leads) — source lead
opportunity_id      UUID (FK → opportunities) — source opportunity
quotation_id        UUID (FK → quotations) — source quotation
design_spec_id      UUID (FK → design_specifications) — linked design spec
status              ENUM('created', 'confirmed', 'in_progress', 'completed', 'cancelled')
order_date          DATE — required
expected_delivery   DATE
actual_delivery     DATE
subtotal            DECIMAL
tax_amount          DECIMAL
discount_amount     DECIMAL
total_amount        DECIMAL
payment_status      ENUM('pending', 'partial', 'paid') — default 'pending'
delivery_address    TEXT
site_address        TEXT — installation site (may differ from delivery)
special_instructions TEXT
cancelled_reason    VARCHAR
assigned_to         UUID (FK → users) — account manager
created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `order_items`
```
id                  UUID (PK)
order_id            UUID (FK → orders)
product_name        VARCHAR — free text in Phase 1
description         TEXT
quantity            INTEGER
unit_price          DECIMAL
discount_percent    DECIMAL
tax_percent         DECIMAL
total_price         DECIMAL
sort_order          INTEGER
created_at          TIMESTAMP
```

#### Screens
| Screen | Access | Key Actions |
|--------|--------|-------------|
| Order List | Sales, Manager, Admin | View orders, filter by status/customer/date |
| Create Order | Sales, Manager, Admin | From quotation or manual entry |
| Order Detail | Sales (own), Manager, Admin | View full order, update status, view timeline |
| My Orders | Salesperson | View only own orders |

#### Business Rules
- Order number auto-generated: `ORD-{YEAR}-{SEQUENCE}`
- Order created only from won lead or accepted quotation
- Cancellation requires a reason
- Every status change logs to audit trail
- Payment status computed from payment records (Phase 4)

---

### Module 6: Audit & Activity Log (Cross-Phase — Start in Phase 1)

#### Data Model: `audit_logs`
```
id                  UUID (PK)
entity_type         VARCHAR — 'lead', 'order', 'customer', 'user', etc.
entity_id           UUID — ID of the affected record
action              ENUM('create', 'update', 'delete', 'status_change', 'assign', 'login', 'logout')
field_changed       VARCHAR — which field was changed (for updates)
old_value           TEXT — previous value
new_value           TEXT — new value
description         VARCHAR — human-readable description
performed_by        UUID (FK → users)
ip_address          VARCHAR
created_at          TIMESTAMP
```

#### Business Rules
- Every create, update, delete, and status change is logged
- Audit logs are append-only (never updated or deleted)
- Accessible to Admin and Manager roles only
- Retained for minimum 7 years

---

## 3. Phase 1 User Flows

### Flow 1: Lead Creation & Assignment
```
1. Salesperson/Manager opens "Create Lead" form
2. Fills: Name, Phone, City, Source, Product Interest, Product Type
3. System auto-generates lead number (LD-2026-0001)
4. System checks for duplicate phone → warns if exists
5. Lead saved with status = "new"
6. Manager opens lead → clicks "Assign"
7. Selects salesperson from dropdown
8. Lead assigned_to updated (status stays "new")
9. Audit log: "Lead LD-2026-0001 assigned to John by Manager"
```

### Flow 2: Lead Follow-up & Qualification
```
1. Salesperson sees "Today's Follow-ups" on dashboard
2. Opens lead → Makes call
3. Adds note: "Spoke with client, needs 2 air purifiers for hospital"
4. Updates status to "contacted"
5. Schedules next follow-up: +3 days
6. After detailed requirement capture → Sets product_type, site_inspection_needed
7. Updates status to "qualified"
8. Requests design/spec recommendation from design team
9. Sets estimated value: ₹2,50,000
```

### Flow 3: Design Spec → Quotation → Order
```
1. Design engineer opens qualified lead's design spec request
2. Reviews requirement, performs site inspection if needed
3. Creates design spec with product recommendations + BOM
4. Submits for review → spec status = "completed"
5. Manager reviews and approves → spec status = "approved"
6. Salesperson opens approved design spec
7. Clicks "Create Quotation from Spec"
8. System pre-fills quotation items from spec's recommended_products
9. Salesperson adjusts pricing, adds terms → sends quotation
10. Lead status = "quoted"
11. Customer accepts → Quotation status = "accepted"
12. Salesperson creates Order from quotation
13. System creates Customer record (auto-populated from lead)
14. Lead status = "won"
15. Order status = "created"
```

---

## 4. Phase 1 Dashboard (Simple)

**For Salesperson:**
- My open leads count (by status)
- Today's follow-ups
- My recent orders
- Quick actions: Create Lead, View My Leads

**For Manager:**
- Total leads this month
- Leads by status (bar chart)
- Unassigned leads count (alert)
- Team performance (leads per salesperson)
- Recent conversions

**For Admin:**
- All of Manager view
- User management quick access
- System health indicators

---

## 5. Phase 1 API Endpoints Summary

### Auth
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh-token
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Users
```
GET    /api/users                    — List users (admin/manager)
POST   /api/users                    — Create user (admin)
GET    /api/users/:id                — Get user detail
PATCH  /api/users/:id                — Update user
PATCH  /api/users/:id/toggle-active  — Enable/disable user
GET    /api/users/me                 — Current user profile
```

### Design Specifications
```
GET    /api/design-specs             — List design specs (filtered)
POST   /api/design-specs             — Request design spec (from lead)
GET    /api/design-specs/:id          — Detail
PATCH  /api/design-specs/:id          — Update spec
PATCH  /api/design-specs/:id/status   — Change status
GET    /api/design-specs/:id/quotation — Get linked quotation
POST   /api/design-specs/:id/create-quotation — Create quotation from spec
GET    /api/design-specs/my            — My assigned specs (design team)
GET    /api/design-specs/pending       — Specs awaiting review
```

### Leads
```
GET    /api/leads                    — List leads (filtered)
POST   /api/leads                    — Create lead
GET    /api/leads/:id                — Get lead detail
PATCH  /api/leads/:id                — Update lead
PATCH  /api/leads/:id/assign         — Assign lead
PATCH  /api/leads/:id/status         — Update status
POST   /api/leads/:id/convert        — Convert lead
GET    /api/leads/:id/notes          — Get lead notes
POST   /api/leads/:id/notes          — Add note
GET    /api/leads/:id/follow-ups     — Get follow-ups
POST   /api/leads/:id/follow-ups     — Schedule follow-up
PATCH  /api/leads/:id/follow-ups/:fid — Update follow-up
GET    /api/leads/my                 — My assigned leads
GET    /api/leads/today-followups    — Today's follow-ups
GET    /api/leads/duplicates/:phone  — Check duplicate
```

### Customers
```
GET    /api/customers                — List customers
GET    /api/customers/:id            — Customer detail
PATCH  /api/customers/:id            — Update customer
GET    /api/customers/:id/orders     — Customer's orders
GET    /api/customers/:id/timeline   — Customer timeline
```

### Opportunities
```
GET    /api/opportunities            — List pipeline
POST   /api/opportunities            — Create opportunity
GET    /api/opportunities/:id        — Detail
PATCH  /api/opportunities/:id        — Update
PATCH  /api/opportunities/:id/stage  — Change stage
```

### Quotations
```
GET    /api/quotations               — List quotations
POST   /api/quotations               — Create quotation
GET    /api/quotations/:id           — Detail
PATCH  /api/quotations/:id           — Update
PATCH  /api/quotations/:id/status    — Change status
GET    /api/quotations/:id/pdf       — Download PDF
```

### Orders
```
GET    /api/orders                   — List orders
POST   /api/orders                   — Create order
GET    /api/orders/:id               — Order detail
PATCH  /api/orders/:id               — Update order
PATCH  /api/orders/:id/status        — Change status
GET    /api/orders/:id/timeline      — Order timeline
GET    /api/orders/my                — My orders
```

---

## 6. Phase 1 Acceptance Criteria

Phase 1 is **DONE** when:

- [ ] Admin can create users with roles
- [ ] Users can login/logout securely
- [ ] Salespeople can create and view leads
- [ ] Managers can assign leads to salespeople
- [ ] Leads can be tracked through the full lifecycle (new → contacted → qualified → quoted → won/lost)
- [ ] Design specs can be requested for qualified leads
- [ ] Design team can create product recommendations and BOMs
- [ ] Design specs can be approved and converted to quotations
- [ ] Follow-ups can be scheduled and tracked
- [ ] Notes can be added to leads
- [ ] Leads can be converted to customers + orders (on win with approved spec)
- [ ] Basic quotation with line items can be generated
- [ ] Orders can be created and status tracked
- [ ] Duplicate phone check works
- [ ] Audit trail captures all changes
- [ ] Dashboard shows basic stats for each role
- [ ] All screens are accessible with correct role permissions

---

## 7. What Phase 1 Does NOT Include

- Product catalog (→ Phase 1.5)
- Installation tracking (→ Phase 2)
- Service/AMC (→ Phase 3)
- Payment tracking (→ Phase 4)
- Fancy charts/reports (→ Phase 5)
- Email/WhatsApp notifications (→ Phase 6)
- File uploads (→ Phase 5)
- Mobile app (→ Phase 6)
- Automation rules (→ Phase 6)

---

*Phase 1 is the foundation. Everything else builds on top of this. Get this right.*
