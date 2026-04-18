# OXYCURE ERP — Business Process Flows

> **Version:** 1.0
> **Created:** April 2026
> **Purpose:** Visual reference of all business processes and their interactions

---

## 1. Core Business Flow (Backbone)

This is the end-to-end lifecycle of every deal at Oxycure:

```mermaid
flowchart TB
    A["Lead"] --> B["Qualification"]
    B --> C["Design / Spec Recommendation"]
    C --> D["Quotation"]
    D --> E["Order"]
    E --> IM["Inventory Check / Vendor Selection"]
    IM --> OF["Order Fulfillment"]
    OF --> FB["Final Billing"]
    FB --> SV["Service / AMC"]
    SV --> CL["Closure"]
```

### Stage Descriptions

| Stage | Owner | What Happens | Output |
|-------|-------|-------------|--------|
| Lead | Sales | New prospect enters the system | Lead record created |
| Qualification | Sales | Contact, understand requirement, assess fit | Lead marked as Qualified |
| Design / Spec Recommendation | Design Team | Analyze requirement, recommend product/configuration | Design spec document |
| Quotation | Sales + Design | Create formal quotation with specs and pricing | Quotation PDF |
| Order | Sales | Customer accepts quotation → order confirmed | Order created |
| Inventory Check / Vendor Selection | Operations | Check stock, procure from vendors if needed | Materials ready |
| Order Fulfillment | Operations | Pick, Pack, Dispatch + Installation (if applicable) | Product delivered/installed |
| Final Billing | Finance | Generate invoice, track payment | Invoice + Payment |
| Service / AMC | Service | Post-delivery support, maintenance contracts | Service history |
| Closure | All | Order fully paid, service active, customer satisfied | Complete lifecycle |

---

## 2. Primary Flows (Detailed)

### Flow 1: Lead → Order (Sales)

```mermaid
flowchart TB
    L1["New Lead Created"] --> L2["Assign to Salesperson"]
    L2 --> L3["Contact + Requirement Capture"]
    L3 --> L4["Site Inspection (if needed)"]
    L4 --> L5["Design Team: Specs + Recommendation"]
    L5 --> L6["Quotation Created"]
    L6 --> L7["Negotiation"]
    L7 --> L8["Converted to Order"]
```

**Key Data at Each Step:**

| Step | Data Captured |
|------|--------------|
| New Lead | Customer info, source, product type (Air Purifier / Moscure / Industrial), estimated value |
| Contact | Requirement notes, follow-up dates, site details |
| Site Inspection | Site photos, dimensions, power availability, environment notes |
| Design/Spec | Product configuration, specifications, recommended solution, BOM |
| Quotation | Line items, pricing, taxes, terms, validity |
| Negotiation | Revised pricing, discount approvals, competitor notes |
| Order | Confirmed items, delivery timeline, payment terms |

---

### Flow 2: Order → Execution (Operations)

```mermaid
flowchart TB
    O1["Order Created"] --> O2["Assigned to Operations Team"]
    O2 --> OIM["Inventory Check + Procurement"]
    OIM --> OF1["Order Fulfillment (Pick/Pack/Dispatch)"]
    OF1 --> O3["Installation Scheduled"]
    O3 --> O4["Team Assigned"]
    O4 --> O5["Installation Done"]
    O5 --> O6["Client Confirmation"]
    O6 --> OB["Final Billing Triggered"]
```

**Key Data at Each Step:**

| Step | Data Captured |
|------|--------------|
| Assigned to Ops | Operations manager, priority |
| Inventory Check | Stock availability, vendor quotes, procurement timeline |
| Fulfillment | Pick list, packing details, dispatch info, courier/transport |
| Installation Scheduled | Date, time, site address, access instructions |
| Team Assigned | Engineers, team lead, required tools/equipment |
| Installation Done | Checklist completed, photos, testing results |
| Client Confirmation | Customer sign-off, handover documents |
| Billing Triggered | Invoice generation initiated |

---

### Flow 3: Service / AMC

```mermaid
flowchart TB
    subgraph SR["Service Request (Reactive)"]
        S1["Service Request Raised"] --> S2["Assigned to Technician"]
        S2 --> S3["Visit Scheduled"]
        S3 --> S4["Service Completed"]
        S4 --> S5["Report Submitted"]
    end

    subgraph AMC["AMC (Planned / Preventive)"]
        A1["AMC Contract Active"] --> A2["Auto Scheduled Visits"]
        A2 --> A3["Service Logs Maintained"]
    end
```

**Two Modes:**
- **Reactive:** Customer raises complaint/request → technician dispatched → resolved
- **Proactive (AMC):** Scheduled preventive maintenance → auto-generated visits → service logs

---

### Flow 4: Payment (Finance)

```mermaid
flowchart TB
    B1["Final Billing Triggered"] --> B2["Final Invoice Generated"]
    B2 --> B3["Payment Pending"]
    B3 --> B4["Payment Received (Partial / Full)"]
    B4 --> B5["Payment Verified"]
```

**Payment Terms Tracking:**
- Advance payment at order confirmation
- Progress payments during fulfillment/installation
- Final payment on completion + billing
- AMC payments (recurring)

---

### Flow 5: Inventory (Phase 2)

```mermaid
flowchart TB
    I1["Product Added"] --> I2["Stock Updated"]
    I2 --> I3["Allocated to Order"]
    I3 --> I4["Deducted on Installation"]
```

**Procurement Sub-flow:**
```mermaid
flowchart TB
    P1["Inventory Check for Order"] --> P2{"Stock Available?"}
    P2 -- Yes --> P3["Reserve Stock"]
    P2 -- No --> P4["Select Vendor"]
    P4 --> P5["Create Purchase Order"]
    P5 --> P6["Goods Received"]
    P6 --> P7["Stock Updated"]
    P7 --> P3
```

---

## 3. Supporting Flows

### User & Role Management

```mermaid
flowchart TB
    U1["Admin Creates User"] --> U2["Assign Role"]
    U2 --> U3["Role Defines Permissions"]
```

**Roles:**
| Role | Departments | Access Level |
|------|------------|-------------|
| Admin | All | Full system control |
| Sales | Sales | Leads, quotations, orders |
| Operations | Operations | Fulfillment, installations, inventory |
| Technician | Service | Service tickets, AMC visits |
| Accounts | Finance | Invoices, payments, expenses |

### Reporting

```mermaid
flowchart TB
    R1["Data Collected"] --> R2["Dashboard"]
    R2 --> R3["Filters (date, team, product)"]
    R3 --> R4["Insights"]
```

---

## 4. UI Structure (Sidebar Navigation)

```mermaid
flowchart TB
    D["Dashboard"] --> L["Leads"]
    L --> O["Orders"]
    O --> I["Inventory"]
    I --> OF["Fulfillment"]
    OF --> B["Billing & Payments"]
    B --> S["Service"]
    S --> U["Users"]
```

### Screen Map

| Section | Key Screens |
|---------|------------|
| **Dashboard** | Executive overview, role-specific KPIs, alerts |
| **Leads** | Lead list, lead detail, create lead, pipeline board, design specs |
| **Orders** | Order list, order detail, create order, order timeline |
| **Inventory** | Product catalog, stock levels, low stock alerts, vendors |
| **Fulfillment** | Fulfillment queue, pick/pack, dispatch tracking, installations |
| **Billing & Payments** | Invoices, payments, overdue, expenses |
| **Service** | Tickets, AMC contracts, scheduled visits, service history |
| **Users** | User list, roles, permissions, activity logs |

---

## 5. Status Systems

### Lead Status

```mermaid
flowchart LR
    subgraph LS["Lead Status"]
        LN["New"] --> LC["Contacted"]
        LC --> LQ["Qualified"]
        LQ --> LQT["Quoted"]
        LQT --> LW["Won"]
        LQT --> LL["Lost"]
    end
```

| Status | Meaning | Trigger |
|--------|---------|---------|
| **New** | Just entered the system | Lead created |
| **Contacted** | Salesperson made first contact | First call/meeting logged |
| **Qualified** | Requirement understood, genuine opportunity | Requirement captured + design spec requested |
| **Quoted** | Quotation sent to customer | Quotation created and sent |
| **Won** | Customer accepted, order created | Lead converted to order |
| **Lost** | Deal did not close | Lost reason recorded |

### Order Status

```mermaid
flowchart LR
    subgraph OS["Order Status"]
        OC["Created"] --> OCF["Confirmed"]
        OCF --> OIP["In Progress"]
        OIP --> OD["Completed"]
    end
```

| Status | Meaning | Trigger |
|--------|---------|---------|
| **Created** | Order record created from won lead | Lead conversion |
| **Confirmed** | Customer confirmed, advance received (if applicable) | Payment/confirmation received |
| **In Progress** | Fulfillment/installation underway | Operations team starts work |
| **Completed** | Delivered/installed and signed off | Customer sign-off |

### Service Status

```mermaid
flowchart LR
    subgraph SS["Service Status"]
        SP["Pending"] --> SSCH["Scheduled"]
        SSCH --> SC["Completed"]
    end
```

---

## 6. Design Principle

```mermaid
flowchart TB
    M["Move things between stages"] --> V["Visibility"]
    M --> A["Accountability"]
```

> **Every entity in the system moves through defined stages.**
> At each stage, someone is responsible, and everyone can see the current state.

---

## 7. MVP Scope (Phase 1)

```mermaid
flowchart TB
    ML["Lead"] --> MD["Design / Spec Recommendation"]
    MD --> MQ["Quotation"]
    MQ --> MO["Order"]
```

The MVP focuses on the **sales backbone** — from first contact to confirmed order.
Design/Spec Recommendation is included because it's core to Oxycure's sales process
(customers need technical specifications before they can evaluate a quotation).

### What MVP Answers
- Can we capture every lead without leakage?
- Can the design team provide specs efficiently?
- Can we generate quotations from specs?
- Can we track which leads become orders?
- Do we have full accountability at every stage?

---

## 8. Cross-Flow Touchpoints

| From Flow | To Flow | Trigger | Data Passed |
|-----------|---------|---------|-------------|
| Lead → Order | Order → Execution | Lead status = Won | Customer, products, specs, quotation |
| Order → Execution | Payment | Installation complete + sign-off | Order total, billing address, payment terms |
| Order → Execution | Service/AMC | Installation signed off | Installation details, warranty dates, products |
| Payment | Closure | Full payment received | Payment confirmation |
| Service/AMC | Payment | Chargeable service completed | Service cost, parts used |
| Inventory | Order → Execution | Stock allocated/procured | Available stock, vendor info |

---

*This document is the "map" of Oxycure's business. Every feature we build should trace back to one of these flows.*
