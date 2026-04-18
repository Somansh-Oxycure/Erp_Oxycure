# Phase 2: Operations Layer — Fulfillment + Vendor/Procurement + Installation + Projects

> **Goal:** Execute orders from confirmation through fulfillment, procurement, and installation
> **Core Question:** *"Can we fulfill orders, manage vendors, and track every installation?"*
> **Prerequisite:** Phase 1 completed and in use

---

## 1. Phase 2 Objectives

1. Fulfill confirmed orders (Pick / Pack / Dispatch)
2. Manage vendor relationships and procurement (Purchase Orders)
3. Track installation lifecycle from dispatch to completion
4. Assign installation teams and schedule work
5. Manage site/project details and requirements
6. Track tasks, checklists, and completion reports
7. Handle installation issues and escalations
8. Provide real-time visibility of field operations

---

## 2. Modules in Phase 2

### Module 7: Product & Inventory Catalog (Phase 1.5 → completes in Phase 2)

#### Features
- [x] Product master list (CRUD)
- [x] Product categories and sub-categories
- [x] Product specifications and pricing
- [x] Basic inventory tracking (stock in/out)
- [x] Bill of Materials (BOM) for installations
- [x] Link products to order line items (replace free text)

#### Data Model: `product_categories`
```
id                  UUID (PK)
name                VARCHAR — required (e.g., "Air Purifiers", "HVAC Systems", "Accessories")
parent_id           UUID (FK → product_categories) — for sub-categories
description         TEXT
is_active           BOOLEAN — default true
sort_order          INTEGER
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `products`
```
id                  UUID (PK)
sku                 VARCHAR — unique stock-keeping unit
name                VARCHAR — required
category_id         UUID (FK → product_categories)
description         TEXT
specifications      JSONB — flexible key-value specs
unit_price          DECIMAL — base selling price
cost_price          DECIMAL — purchase/manufacturing cost
tax_percent         DECIMAL — default GST rate
unit_of_measure     ENUM('piece', 'set', 'kit', 'meter', 'sqft')
is_active           BOOLEAN — default true
requires_installation BOOLEAN — default false
warranty_months     INTEGER — warranty period
hsn_code            VARCHAR — HSN/SAC code for GST
image_url           VARCHAR
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `inventory`
```
id                  UUID (PK)
product_id          UUID (FK → products)
stock_quantity      INTEGER — current stock
reserved_quantity   INTEGER — allocated to orders
min_stock_level     INTEGER — reorder alert threshold
warehouse_location  VARCHAR
last_restocked_at   TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `inventory_transactions`
```
id                  UUID (PK)
product_id          UUID (FK → products)
transaction_type    ENUM('stock_in', 'stock_out', 'reserved', 'released', 'adjustment')
quantity            INTEGER
reference_type      VARCHAR — 'order', 'installation', 'return', 'manual'
reference_id        UUID — order_id / installation_id
notes               TEXT
performed_by        UUID (FK → users)
created_at          TIMESTAMP
```

---

### Module 7.5: Order Fulfillment (Pick / Pack / Dispatch) — NEW

> **Why this module:** After an order is confirmed, products must be picked from inventory,
> packed, and dispatched before installation can begin. This is a distinct logistics step.

#### Features
- [x] Create fulfillment record from confirmed order
- [x] Pick list generation from order items
- [x] Pack verification and package tracking
- [x] Dispatch with transporter/vehicle details
- [x] Delivery confirmation
- [x] Serial number tracking per item
- [x] Inventory auto-deduction on dispatch

#### Fulfillment Lifecycle
```
PENDING → PICKING → PACKING → READY_TO_DISPATCH → DISPATCHED → DELIVERED
                                                                    │
                                                              (→ Installation)
    └── CANCELLED
```

#### Data Model: `order_fulfillments`
```
id                      UUID (PK)
fulfillment_number      VARCHAR — auto-generated (e.g., FUL-2026-0001)
order_id                UUID (FK → orders) — required
status                  ENUM('pending','picking','packing','ready_to_dispatch','dispatched','delivered','cancelled')

-- Picking
picked_by               UUID (FK → users)
picked_at               TIMESTAMP
picking_notes           TEXT

-- Packing
packed_by               UUID (FK → users)
packed_at               TIMESTAMP
package_count           INTEGER
packing_notes           TEXT

-- Dispatch
dispatched_by           UUID (FK → users)
dispatched_at           TIMESTAMP
dispatch_mode           VARCHAR — courier, own vehicle, third-party
tracking_number         VARCHAR
transporter_name        VARCHAR
vehicle_number          VARCHAR
dispatch_notes          TEXT

-- Delivery
delivered_at            TIMESTAMP
delivery_confirmed_by   VARCHAR — receiver name
delivery_notes          TEXT

created_by              UUID (FK → users)
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

#### Data Model: `fulfillment_items`
```
id                  UUID (PK)
fulfillment_id      UUID (FK → order_fulfillments)
order_item_id       UUID (FK → order_items)
product_id          UUID (FK → products)
product_name        VARCHAR
quantity_ordered    INTEGER
quantity_picked     INTEGER
quantity_packed     INTEGER
quantity_dispatched INTEGER
serial_numbers      TEXT[] — array of serial numbers
created_at          TIMESTAMP
```

#### Screens
| Screen | Access | Key Actions |
|--------|--------|-------------|
| Fulfillment Queue | Operations, Manager, Admin | List pending fulfillments |
| Fulfillment Detail | Operations, Manager, Admin | Pick/pack/dispatch workflow |
| Pick List | Operations | Check items from warehouse |
| Dispatch Form | Operations, Manager | Enter transport details |
| Delivery Confirmation | Operations | Mark delivered |

#### Business Rules
- Fulfillment auto-created when order status = `confirmed`
- Picking reduces `reserved_quantity` in inventory
- Dispatch reduces `stock_quantity` in inventory
- Order status auto-updates to `in_progress` when fulfillment starts
- Delivery triggers option to create installation record

---

### Module 7.6: Vendor & Procurement — NEW

> **Why this module:** Oxycure needs to procure components/products from vendors
> when stock is insufficient. Purchase orders track vendor procurement.

#### Features
- [x] Vendor master list (CRUD)
- [x] Create purchase orders to vendors
- [x] Link PO to sales order (demand-driven procurement)
- [x] PO approval workflow
- [x] Track PO receiving (partial/full)
- [x] Vendor performance tracking (lead time, quality)
- [x] Auto-suggest vendors based on product category

#### Data Model: `vendors`
```
id                  UUID (PK)
vendor_code         VARCHAR — auto-generated (e.g., VND-0001)
name                VARCHAR — required
contact_person      VARCHAR
email               VARCHAR
phone               VARCHAR — required
gst_number          VARCHAR
pan_number          VARCHAR
address_line1       VARCHAR
city                VARCHAR
state               VARCHAR
status              ENUM('active', 'inactive', 'blacklisted')
payment_terms       VARCHAR — Net 30, Net 60, etc.
lead_time_days      INTEGER
product_categories  TEXT[] — what they supply
rating              DECIMAL — 0.00 to 5.00
notes               TEXT
created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `purchase_orders`
```
id                  UUID (PK)
po_number           VARCHAR — auto-generated (e.g., PO-2026-0001)
vendor_id           UUID (FK → vendors)
order_id            UUID (FK → orders) — linked sales order
status              ENUM('draft','submitted','approved','ordered','partially_received','received','cancelled')
order_date          DATE
expected_delivery   DATE
subtotal            DECIMAL
tax_amount          DECIMAL
total_amount        DECIMAL
notes               TEXT
approved_by         UUID (FK → users)
approved_at         TIMESTAMP
created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `purchase_order_items`
```
id                  UUID (PK)
purchase_order_id   UUID (FK → purchase_orders)
product_id          UUID (FK → products)
product_name        VARCHAR
quantity_ordered    INTEGER
quantity_received   INTEGER — default 0
unit_price          DECIMAL
tax_percent         DECIMAL — default 18
total_price         DECIMAL
created_at          TIMESTAMP
```

#### Screens
| Screen | Access | Key Actions |
|--------|--------|-------------|
| Vendor List | Operations, Manager, Admin | View/create/edit vendors |
| Vendor Detail | Operations, Manager, Admin | View vendor info, PO history |
| PO List | Operations, Manager, Admin | All purchase orders, filter by status |
| Create PO | Operations, Manager | Add items, select vendor |
| PO Detail | Operations, Manager, Admin | View, receive items, update status |
| PO Approval | Manager, Admin | Approve/reject POs |

#### Business Rules
- PO number auto-generated: `PO-{YEAR}-{SEQUENCE}`
- POs above threshold require manager approval
- Receiving items auto-updates inventory (stock_in transaction)
- Vendor rating calculated from delivery performance
- Inventory check on order → auto-suggest PO if stock insufficient

---

### Module 8: Installation & Project Management

#### Features
- [x] Create installation project from order
- [x] Site survey details and requirements
- [x] Installation team assignment
- [x] Installation scheduling (date/time)
- [x] Installation checklist and tasks
- [x] Status tracking with milestones
- [x] Completion report with sign-off
- [x] Issue/blocker tracking
- [x] Installation photos (document upload)
- [x] Material/equipment tracking per installation

#### Installation Lifecycle
```
CREATED → SITE_SURVEY → SCHEDULED → IN_PROGRESS → TESTING → COMPLETED → SIGNED_OFF
    │                                     │                        │
    │                                     │                        └── (→ Phase 3: AMC)
    │                                     │
    │                                     └── ON_HOLD (blocker/issue)
    │
    └── CANCELLED
```

#### Data Model: `installations`
```
id                  UUID (PK)
installation_number VARCHAR — auto-generated (e.g., INS-2026-0001)
order_id            UUID (FK → orders) — required
customer_id         UUID (FK → customers)
status              ENUM('created', 'site_survey', 'scheduled', 'in_progress', 'testing', 'completed', 'signed_off', 'on_hold', 'cancelled')

-- Site Details
site_name           VARCHAR — e.g., "Apollo Hospital, Ward 3"
site_address        TEXT
site_contact_name   VARCHAR
site_contact_phone  VARCHAR
site_type           ENUM('hospital', 'clinic', 'office', 'residential', 'industrial', 'other')
site_notes          TEXT

-- Survey Details
survey_date         DATE
survey_done_by      UUID (FK → users)
survey_notes        TEXT
site_ready          BOOLEAN — is site ready for installation?
site_requirements   TEXT — power, space, access requirements

-- Scheduling
scheduled_start     TIMESTAMP
scheduled_end       TIMESTAMP
actual_start        TIMESTAMP
actual_end          TIMESTAMP

-- Team
team_lead_id        UUID (FK → users)
priority            ENUM('low', 'medium', 'high', 'urgent') — default 'medium'

-- Completion
completion_notes    TEXT
customer_sign_off   BOOLEAN — default false
sign_off_date       DATE
signed_off_by       VARCHAR — customer name who signed

-- Hold/Cancel
hold_reason         TEXT
cancel_reason       TEXT

created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `installation_team_members`
```
id                  UUID (PK)
installation_id     UUID (FK → installations)
user_id             UUID (FK → users)
role                ENUM('team_lead', 'installer', 'helper', 'supervisor')
assigned_at         TIMESTAMP
removed_at          TIMESTAMP
created_at          TIMESTAMP
```

#### Data Model: `installation_tasks`
```
id                  UUID (PK)
installation_id     UUID (FK → installations)
title               VARCHAR — required
description         TEXT
status              ENUM('pending', 'in_progress', 'completed', 'skipped', 'blocked')
is_mandatory        BOOLEAN — default true
assigned_to         UUID (FK → users)
due_date            DATE
completed_at        TIMESTAMP
completed_by        UUID (FK → users)
sort_order          INTEGER
notes               TEXT
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `installation_issues`
```
id                  UUID (PK)
installation_id     UUID (FK → installations)
issue_number        VARCHAR — auto-generated (ISS-2026-0001)
title               VARCHAR — required
description         TEXT
severity            ENUM('low', 'medium', 'high', 'critical')
status              ENUM('open', 'in_progress', 'resolved', 'closed', 'escalated')
reported_by         UUID (FK → users)
assigned_to         UUID (FK → users)
resolution          TEXT
resolved_at         TIMESTAMP
resolved_by         UUID (FK → users)
escalated_to        UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `installation_materials`
```
id                  UUID (PK)
installation_id     UUID (FK → installations)
product_id          UUID (FK → products)
quantity_planned    INTEGER
quantity_used       INTEGER
notes               TEXT
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Default Installation Checklist Template
When an installation is created, auto-populate these tasks:
```
1. Site survey completed
2. Materials procured and verified
3. Equipment transported to site
4. Power supply verified
5. Mounting/placement done
6. Electrical connections completed
7. System powered on
8. Initial testing done
9. Calibration completed
10. Final testing and quality check
11. Customer walkthrough/training
12. Customer sign-off obtained
13. Site cleanup done
14. Documentation handed over
```

#### Screens
| Screen | Access | Key Actions |
|--------|--------|-------------|
| Installation List | Ops, Manager, Admin | View all installations, filter by status/team/date |
| Create Installation | Ops, Manager, Admin | From order, fill site details |
| Installation Detail | Ops Team, Manager, Admin | Full view, update status, manage tasks |
| Site Survey Form | Ops Team, Manager | Fill survey details, mark site readiness |
| Schedule Installation | Manager, Admin | Set dates, assign team |
| Task Checklist | Installer, Team Lead | Check off tasks, add notes |
| Issue Tracker | Ops Team, Manager, Admin | Log issues, track resolution |
| Completion Report | Team Lead, Manager | Fill report, get sign-off |
| My Installations | Installer | View assigned installations |
| Installation Calendar | Manager, Admin | Calendar view of all scheduled installations |

---

## 3. Phase 2 User Flows

### Flow 1: Order → Installation Project
```
1. Order status changes to "confirmed"
2. Manager creates Installation from order
3. System pre-fills customer and order details
4. Manager enters site information
5. Installation created with status = "created"
6. Default checklist auto-populated
```

### Flow 2: Site Survey
```
1. Manager assigns surveyor
2. Surveyor visits site
3. Fills survey form: requirements, readiness, notes
4. Marks site as ready/not ready
5. If not ready → lists requirements
6. If ready → status moves to "scheduled"
```

### Flow 3: Installation Execution
```
1. Manager assigns team (lead + installers)
2. Sets schedule (start/end dates)
3. Team lead starts installation → status = "in_progress"
4. Team checks off tasks one by one
5. Any issue → creates issue ticket
6. Issue resolved → continues
7. All mandatory tasks done → status = "testing"
8. Testing passed → status = "completed"
9. Customer sign-off → status = "signed_off"
10. Order status updated to "delivered"
```

### Flow 4: Issue Handling
```
1. Installer encounters blocker
2. Creates issue: "No 3-phase power available"
3. Severity: High
4. Team lead assigned to resolve
5. Installation → "on_hold" if critical
6. Issue resolved → installation resumes
7. If unresolvable → escalate to manager
```

---

## 4. Phase 2 API Endpoints

### Products
```
GET    /api/products                       — List products
POST   /api/products                       — Create product
GET    /api/products/:id                   — Product detail
PATCH  /api/products/:id                   — Update product
GET    /api/products/categories             — List categories
POST   /api/products/categories             — Create category
GET    /api/products/:id/inventory          — Stock info
```

### Inventory
```
POST   /api/inventory/stock-in             — Add stock
POST   /api/inventory/stock-out            — Remove stock
GET    /api/inventory/low-stock            — Low stock alerts
GET    /api/inventory/transactions          — Transaction history
```

### Installations
```
GET    /api/installations                   — List installations
POST   /api/installations                   — Create from order
GET    /api/installations/:id               — Detail
PATCH  /api/installations/:id               — Update
PATCH  /api/installations/:id/status        — Change status
POST   /api/installations/:id/survey        — Submit survey
PATCH  /api/installations/:id/schedule      — Set schedule
GET    /api/installations/:id/tasks         — List tasks
POST   /api/installations/:id/tasks         — Add task
PATCH  /api/installations/:id/tasks/:tid    — Update task
GET    /api/installations/:id/team          — List team
POST   /api/installations/:id/team          — Add member
DELETE /api/installations/:id/team/:uid     — Remove member
GET    /api/installations/:id/issues        — List issues
POST   /api/installations/:id/issues        — Create issue
PATCH  /api/installations/:id/issues/:iid   — Update issue
GET    /api/installations/:id/materials     — List materials
POST   /api/installations/:id/materials     — Add material
POST   /api/installations/:id/sign-off      — Customer sign-off
GET    /api/installations/my                — My installations
GET    /api/installations/calendar          — Calendar view
```

---

## 5. Phase 2 Acceptance Criteria

- [ ] Products can be created and managed with categories
- [ ] Basic inventory tracking works (stock in/out)
- [ ] Installation project created from order
- [ ] Site survey can be recorded
- [ ] Installation team can be assigned
- [ ] Installation can be scheduled with dates
- [ ] Default checklist auto-populates
- [ ] Tasks can be checked off by team
- [ ] Issues can be logged, assigned, and resolved
- [ ] Materials tracked per installation
- [ ] Customer sign-off captured
- [ ] Installation calendar view works
- [ ] All status transitions logged to audit trail
- [ ] Order status updates when installation completes

---

*Phase 2 bridges the gap between "sold" and "delivered." This is where operational efficiency lives.*
