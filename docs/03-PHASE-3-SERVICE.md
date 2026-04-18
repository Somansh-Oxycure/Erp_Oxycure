# Phase 3: Service Layer — AMC + Complaints + Service History

> **Goal:** Manage customers after installation — maintenance, complaints, and long-term relationships
> **Core Question:** *"Can we manage customers after installation and ensure recurring revenue through AMC?"*
> **Prerequisite:** Phase 2 completed (installations tracked)

---

## 1. Phase 3 Objectives

1. Track Annual Maintenance Contracts (AMC) with renewal cycles
2. Manage customer complaints and service requests
3. Assign and track service visits by engineers
4. Maintain complete service history per customer/installation
5. Track spare parts usage during service
6. Enable proactive maintenance scheduling
7. Measure service team performance (response time, resolution time)

---

## 2. Modules in Phase 3

### Module 9: AMC (Annual Maintenance Contract) Management

#### Features
- [x] Create AMC from completed installation
- [x] AMC terms: start/end date, visit frequency, coverage
- [x] AMC renewal tracking and reminders
- [x] Auto-schedule preventive maintenance visits
- [x] AMC status lifecycle
- [x] AMC revenue tracking (linked to Phase 4)

#### AMC Lifecycle
```
DRAFT → ACTIVE → EXPIRING_SOON (30 days before) → EXPIRED → RENEWED / NOT_RENEWED
                      │
                      └── CANCELLED (with reason)
```

#### Data Model: `amc_contracts`
```
id                  UUID (PK)
amc_number          VARCHAR — auto-generated (AMC-2026-0001)
customer_id         UUID (FK → customers) — required
installation_id     UUID (FK → installations)
order_id            UUID (FK → orders) — original order

-- Contract Details
contract_type       ENUM('comprehensive', 'non_comprehensive', 'preventive_only', 'on_call')
status              ENUM('draft', 'active', 'expiring_soon', 'expired', 'renewed', 'cancelled')
start_date          DATE — required
end_date            DATE — required
renewal_date        DATE — when to start renewal process

-- Coverage
covered_products    JSONB — list of product IDs and details covered
includes_parts      BOOLEAN — default false (comprehensive = true)
includes_labor      BOOLEAN — default true
visit_frequency     ENUM('monthly', 'quarterly', 'half_yearly', 'yearly', 'on_demand')
max_visits_per_year INTEGER — null = unlimited
visits_used         INTEGER — default 0

-- Financial
contract_value      DECIMAL — total AMC amount
payment_terms       ENUM('upfront', 'quarterly', 'half_yearly', 'monthly')
payment_status      ENUM('pending', 'partial', 'paid') — default 'pending'

-- Terms
terms_and_conditions TEXT
special_conditions  TEXT
exclusions          TEXT — what's NOT covered

-- Renewal
previous_amc_id     UUID (FK → amc_contracts) — for renewal chain
renewed_to_amc_id   UUID (FK → amc_contracts)
cancellation_reason TEXT

assigned_to         UUID (FK → users) — account manager
created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `amc_scheduled_visits`
```
id                  UUID (PK)
amc_id              UUID (FK → amc_contracts)
visit_number        INTEGER — 1, 2, 3... within contract period
scheduled_date      DATE — required
status              ENUM('scheduled', 'completed', 'missed', 'rescheduled', 'cancelled')
service_ticket_id   UUID (FK → service_tickets) — linked when visit happens
notes               TEXT
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Screens
| Screen | Access | Key Actions |
|--------|--------|-------------|
| AMC List | Service, Manager, Admin | View all AMCs, filter by status/expiry |
| Create AMC | Service, Manager, Admin | From installation, set terms |
| AMC Detail | Service, Manager, Admin | View contract, schedule visits, track status |
| Expiring AMCs | Manager, Admin | AMCs expiring in 30/60/90 days |
| AMC Renewal | Service, Manager | Renew existing AMC, link to previous |
| AMC Calendar | Service, Manager | Scheduled visits calendar |

---

### Module 10: Complaint & Service Request Management

#### Features
- [x] Create complaint/service request (customer call, field report)
- [x] Auto-generate service ticket number
- [x] Categorize by type and severity
- [x] Assign to service engineer
- [x] Track SLA (response time, resolution time)
- [x] Service visit recording (diagnosis, action, parts used)
- [x] Customer feedback after resolution
- [x] Escalation workflow
- [x] Link to AMC (check coverage)

#### Service Ticket Lifecycle
```
OPEN → ASSIGNED → IN_PROGRESS → AWAITING_PARTS → RESOLVED → CLOSED
          │                           │                │
          │                           │                └── REOPENED (if issue recurs)
          │                           │
          └── ESCALATED ──────────────┘
```

#### Data Model: `service_tickets`
```
id                  UUID (PK)
ticket_number       VARCHAR — auto-generated (SRV-2026-0001)
customer_id         UUID (FK → customers) — required
installation_id     UUID (FK → installations) — which installation
amc_id              UUID (FK → amc_contracts) — null if no AMC
order_id            UUID (FK → orders) — original order

-- Ticket Details
ticket_type         ENUM('complaint', 'preventive_maintenance', 'breakdown', 'installation_issue', 'general_inquiry')
category            ENUM('product_defect', 'performance_issue', 'noise', 'filter_replacement', 'electrical', 'physical_damage', 'software', 'other')
subject             VARCHAR — required, brief description
description         TEXT — detailed description
severity            ENUM('low', 'medium', 'high', 'critical')
priority            ENUM('low', 'medium', 'high', 'urgent')
status              ENUM('open', 'assigned', 'in_progress', 'awaiting_parts', 'resolved', 'closed', 'reopened', 'escalated')

-- SLA Tracking
reported_at         TIMESTAMP — when customer reported
first_response_at   TIMESTAMP — when first acknowledged
resolution_at       TIMESTAMP — when marked resolved
closed_at           TIMESTAMP — when customer confirms
sla_response_hours  INTEGER — target response time
sla_resolution_hours INTEGER — target resolution time
sla_breached        BOOLEAN — default false

-- Assignment
assigned_to         UUID (FK → users) — service engineer
escalated_to        UUID (FK → users) — manager/senior
escalation_reason   TEXT

-- Coverage
is_under_amc        BOOLEAN — is this covered by AMC?
is_under_warranty   BOOLEAN — is product still under warranty?
is_chargeable       BOOLEAN — will customer be charged?
estimated_cost      DECIMAL — if chargeable

-- Resolution
diagnosis           TEXT
resolution_summary  TEXT
root_cause          TEXT
parts_replaced      JSONB — [{product_id, quantity, serial_number}]

-- Feedback
customer_rating     INTEGER — 1-5
customer_feedback   TEXT

reported_by         UUID (FK → users)
created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `service_visits`
```
id                  UUID (PK)
ticket_id           UUID (FK → service_tickets) — required
visit_number        INTEGER — 1, 2, 3... per ticket
engineer_id         UUID (FK → users)

-- Visit Details
visit_date          DATE
visit_start_time    TIMESTAMP
visit_end_time      TIMESTAMP
travel_time_minutes INTEGER

-- Work Done
observations        TEXT
work_performed      TEXT
parts_used          JSONB — [{product_id, quantity, serial_number}]
parts_cost          DECIMAL
labor_cost          DECIMAL

-- Status
status              ENUM('scheduled', 'in_progress', 'completed', 'cancelled')
outcome             ENUM('resolved', 'partially_resolved', 'requires_followup', 'requires_parts', 'cannot_resolve')
follow_up_required  BOOLEAN — default false
follow_up_notes     TEXT

-- Sign-off
customer_present    BOOLEAN
customer_sign_name  VARCHAR
customer_feedback   TEXT

created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `service_parts_usage`
```
id                  UUID (PK)
service_visit_id    UUID (FK → service_visits)
product_id          UUID (FK → products) — spare part
quantity            INTEGER
unit_cost           DECIMAL
total_cost          DECIMAL
serial_number       VARCHAR — if applicable
is_warranty_claim   BOOLEAN — default false
notes               TEXT
created_at          TIMESTAMP
```

#### SLA Configuration
```
| Severity | Response Time | Resolution Time |
|----------|--------------|-----------------|
| Critical | 2 hours      | 8 hours         |
| High     | 4 hours      | 24 hours        |
| Medium   | 8 hours      | 48 hours        |
| Low      | 24 hours     | 72 hours        |
```

#### Screens
| Screen | Access | Key Actions |
|--------|--------|-------------|
| Ticket List | Service, Manager, Admin | View all tickets, filter by status/severity/engineer |
| Create Ticket | Service, Sales, Manager, Admin | Log new complaint/request |
| Ticket Detail | Service (assigned), Manager, Admin | Full view, update, assign, escalate |
| Service Visit Form | Service Engineer | Record visit details, parts used |
| My Tickets | Service Engineer | View assigned tickets |
| SLA Dashboard | Manager, Admin | Track SLA compliance, breaches |
| Customer Service History | Service, Manager | All tickets/visits for a customer |
| Escalated Tickets | Manager, Admin | View escalated items |

---

## 3. Phase 3 User Flows

### Flow 1: AMC Creation (Post-Installation)
```
1. Installation completed and signed off
2. Manager creates AMC from installation
3. Sets: type, duration, frequency, coverage, value
4. AMC status = "active"
5. System auto-generates scheduled visit dates
6. E.g., Quarterly AMC → 4 scheduled visits created
```

### Flow 2: Preventive Maintenance Visit
```
1. Scheduled visit date approaches
2. Manager assigns service engineer
3. Engineer visits site
4. Records: observations, work done, parts replaced
5. Customer sign-off
6. Visit marked as completed
7. AMC visits_used counter incremented
```

### Flow 3: Customer Complaint
```
1. Customer calls with complaint
2. Support creates service ticket
3. System checks: AMC active? Warranty valid?
4. Ticket assigned to service engineer
5. SLA clock starts
6. Engineer visits site → records diagnosis
7. If parts needed → status = "awaiting_parts"
8. Parts received → engineer returns
9. Issue fixed → status = "resolved"
10. Customer confirms → status = "closed"
11. Customer gives rating/feedback
```

### Flow 4: AMC Renewal
```
1. AMC enters "expiring_soon" (30 days before end)
2. Alert shown on manager dashboard
3. Manager contacts customer for renewal
4. If renewed → new AMC created, linked to previous
5. If not renewed → AMC expires, logged
6. Service becomes chargeable for this customer
```

### Flow 5: Escalation
```
1. SLA breach detected (no response in target time)
2. Ticket auto-flagged as SLA breached
3. Manager sees escalation on dashboard
4. Can reassign or escalate to senior engineer
5. Escalation logged in ticket history
```

---

## 4. Phase 3 API Endpoints

### AMC
```
GET    /api/amc                              — List AMCs
POST   /api/amc                              — Create AMC
GET    /api/amc/:id                           — Detail
PATCH  /api/amc/:id                           — Update
PATCH  /api/amc/:id/status                    — Change status
POST   /api/amc/:id/renew                     — Renew AMC
GET    /api/amc/:id/scheduled-visits           — List scheduled visits
GET    /api/amc/expiring                      — Expiring soon
GET    /api/amc/customer/:customerId          — AMCs for a customer
```

### Service Tickets
```
GET    /api/service-tickets                    — List tickets
POST   /api/service-tickets                    — Create ticket
GET    /api/service-tickets/:id                — Detail
PATCH  /api/service-tickets/:id                — Update
PATCH  /api/service-tickets/:id/assign         — Assign engineer
PATCH  /api/service-tickets/:id/status         — Change status
PATCH  /api/service-tickets/:id/escalate       — Escalate
POST   /api/service-tickets/:id/feedback       — Customer feedback
GET    /api/service-tickets/my                 — My tickets
GET    /api/service-tickets/sla-breaches       — SLA breaches
GET    /api/service-tickets/customer/:id       — Customer's tickets
```

### Service Visits
```
GET    /api/service-tickets/:id/visits         — List visits
POST   /api/service-tickets/:id/visits         — Record visit
GET    /api/service-visits/:id                 — Visit detail
PATCH  /api/service-visits/:id                 — Update visit
POST   /api/service-visits/:id/parts           — Add parts used
POST   /api/service-visits/:id/sign-off        — Customer sign-off
```

---

## 5. Phase 3 Acceptance Criteria

- [ ] AMC can be created from completed installation
- [ ] AMC tracks contract type, duration, coverage, and value
- [ ] Scheduled visits auto-generated based on frequency
- [ ] AMC renewal workflow works (link to previous)
- [ ] Expiring AMC alerts visible on dashboard
- [ ] Service tickets can be created for complaints/requests
- [ ] Tickets assigned to service engineers
- [ ] SLA tracking works (response + resolution time)
- [ ] SLA breach flagging works
- [ ] Service visits recorded with parts usage
- [ ] Customer sign-off captured on visits
- [ ] Customer feedback/rating collected
- [ ] Escalation workflow functional
- [ ] Complete service history visible per customer
- [ ] AMC coverage check on ticket creation (auto-detect)
- [ ] Warranty check on ticket creation
- [ ] Parts usage deducted from inventory (links to Phase 2)

---

*Phase 3 is where recurring revenue lives. AMC management done right = predictable income + happy customers.*
