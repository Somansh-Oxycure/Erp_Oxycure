# Phase 4: Finance Layer — Payments + Invoicing + Expenses

> **Goal:** Track every rupee — incoming, outgoing, and pending
> **Core Question:** *"Can we track all payments, generate invoices, and see our financial position in real time?"*
> **Prerequisite:** Phase 1-3 operational (orders, installations, AMCs exist)

---

## 1. Phase 4 Objectives

1. Track payments against orders, AMCs, and service charges
2. Generate GST-compliant invoices and proforma invoices
3. Track pending dues and overdue payments
4. Record expenses (operational, travel, materials)
5. Basic profit/loss visibility per order
6. Payment reminders and overdue alerts
7. Multiple payment method support (cash, UPI, bank transfer, cheque)

---

## 2. Modules in Phase 4

### Module 11: Invoice Management

#### Features
- [x] Generate invoice from order / AMC / service ticket
- [x] Proforma invoice (before payment)
- [x] Tax invoice (after payment confirmation)
- [x] Credit note (for refunds/adjustments)
- [x] GST-compliant format (CGST, SGST, IGST)
- [x] Auto-calculate taxes based on state (intra/inter-state)
- [x] Invoice PDF generation and download
- [x] Invoice numbering (financial year based)
- [x] Invoice status tracking

#### Invoice Lifecycle
```
DRAFT → SENT → PARTIALLY_PAID → PAID → VOID
                                         │
                                    CREDIT_NOTE_ISSUED
```

#### Data Model: `invoices`
```
id                  UUID (PK)
invoice_number      VARCHAR — auto-generated (INV-2526-0001) — financial year based
invoice_type        ENUM('proforma', 'tax_invoice', 'credit_note')
status              ENUM('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void', 'cancelled')

-- Linked Entity (one of these will be set)
order_id            UUID (FK → orders)
amc_id              UUID (FK → amc_contracts)
service_ticket_id   UUID (FK → service_tickets)
reference_type      ENUM('order', 'amc', 'service') — which entity

-- Customer
customer_id         UUID (FK → customers) — required
billing_name        VARCHAR
billing_address     TEXT
billing_gst         VARCHAR — customer GST number
billing_state       VARCHAR — for CGST/SGST vs IGST determination

-- Company Details (from settings)
company_name        VARCHAR
company_address     TEXT
company_gst         VARCHAR
company_state       VARCHAR
company_pan         VARCHAR

-- Dates
invoice_date        DATE — required
due_date            DATE — required
sent_at             TIMESTAMP

-- Amounts
subtotal            DECIMAL — before tax
discount_amount     DECIMAL — total discount
taxable_amount      DECIMAL — subtotal - discount
cgst_amount         DECIMAL — Central GST
sgst_amount         DECIMAL — State GST
igst_amount         DECIMAL — Integrated GST (inter-state)
total_tax           DECIMAL — cgst + sgst + igst
total_amount        DECIMAL — taxable + total_tax
amount_paid         DECIMAL — default 0
balance_due         DECIMAL — total - paid

-- Terms
payment_terms       TEXT — e.g., "Net 30 days"
notes               TEXT
terms_and_conditions TEXT
bank_details        TEXT — for bank transfer

-- Credit Note
original_invoice_id UUID (FK → invoices) — for credit notes
credit_reason       TEXT

created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `invoice_items`
```
id                  UUID (PK)
invoice_id          UUID (FK → invoices)
product_id          UUID (FK → products) — null for custom line items
description         VARCHAR — required
hsn_code            VARCHAR — HSN/SAC code
quantity            DECIMAL
unit_price          DECIMAL
discount_percent    DECIMAL — default 0
taxable_amount      DECIMAL — (qty * unit_price) - discount
gst_percent         DECIMAL — e.g., 18
cgst_percent        DECIMAL — e.g., 9
sgst_percent        DECIMAL — e.g., 9
igst_percent        DECIMAL — e.g., 18 (for inter-state)
cgst_amount         DECIMAL
sgst_amount         DECIMAL
igst_amount         DECIMAL
total_amount        DECIMAL
sort_order          INTEGER
created_at          TIMESTAMP
```

---

### Module 12: Payment Management

#### Features
- [x] Record payment against invoice
- [x] Multiple payment methods
- [x] Partial payment support
- [x] Payment receipt generation
- [x] Overdue payment tracking
- [x] Payment history per customer
- [x] Advance payment / deposit tracking
- [x] Refund recording
- [x] Payment reconciliation

#### Data Model: `payments`
```
id                  UUID (PK)
payment_number      VARCHAR — auto-generated (PAY-2526-0001)
invoice_id          UUID (FK → invoices) — can be null for advance payments
customer_id         UUID (FK → customers) — required
payment_type        ENUM('incoming', 'refund')

-- Payment Details
amount              DECIMAL — required
payment_date        DATE — required
payment_method      ENUM('cash', 'upi', 'bank_transfer', 'cheque', 'card', 'online', 'other')
payment_reference   VARCHAR — UTR number, cheque number, transaction ID

-- Bank Details (for bank transfers / cheques)
bank_name           VARCHAR
cheque_number       VARCHAR
cheque_date         DATE
transaction_id      VARCHAR

-- Status
status              ENUM('pending', 'confirmed', 'failed', 'reversed')
confirmed_by        UUID (FK → users)
confirmed_at        TIMESTAMP

-- Advance Payment
is_advance          BOOLEAN — default false
advance_for         ENUM('order', 'amc', 'service') — if advance
advance_reference_id UUID — order_id / amc_id / service_ticket_id

notes               TEXT
receipt_url         VARCHAR — generated receipt PDF path
created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### Data Model: `payment_allocations`
```
id                  UUID (PK)
payment_id          UUID (FK → payments)
invoice_id          UUID (FK → invoices)
amount              DECIMAL — portion allocated to this invoice
created_at          TIMESTAMP
```

---

### Module 13: Expense Tracking

#### Features
- [x] Record operational expenses
- [x] Categorize expenses
- [x] Link expenses to orders/installations/service tickets
- [x] Expense approval workflow (submit → approve → reimburse)
- [x] Receipt upload
- [x] Monthly expense reports

#### Data Model: `expenses`
```
id                  UUID (PK)
expense_number      VARCHAR — auto-generated (EXP-2526-0001)
category            ENUM('travel', 'materials', 'tools', 'fuel', 'food', 'accommodation', 'communication', 'office', 'other')

-- Details
description         VARCHAR — required
amount              DECIMAL — required
expense_date        DATE — required
vendor_name         VARCHAR

-- Linked Entity
reference_type      ENUM('order', 'installation', 'service_ticket', 'general')
reference_id        UUID — linked entity ID

-- Approval
status              ENUM('submitted', 'approved', 'rejected', 'reimbursed')
submitted_by        UUID (FK → users) — who incurred the expense
approved_by         UUID (FK → users)
approved_at         TIMESTAMP
rejection_reason    TEXT
reimbursed_at       TIMESTAMP

-- Receipt
receipt_url         VARCHAR — uploaded receipt image/PDF

notes               TEXT
created_by          UUID (FK → users)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

### Module 14: Company Settings (Finance-related)

#### Data Model: `company_settings`
```
id                  UUID (PK)
company_name        VARCHAR
company_address     TEXT
company_phone       VARCHAR
company_email       VARCHAR
company_website     VARCHAR
company_gst         VARCHAR — GSTIN
company_pan         VARCHAR
company_state       VARCHAR — for GST calculation
company_state_code  VARCHAR — 2-digit state code
company_logo_url    VARCHAR
bank_name           VARCHAR
bank_account_number VARCHAR
bank_ifsc           VARCHAR
bank_branch         VARCHAR
invoice_prefix      VARCHAR — default 'INV'
invoice_terms       TEXT — default payment terms
invoice_notes       TEXT — default notes on invoices
financial_year_start INTEGER — month (1=Jan, 4=Apr)
updated_by          UUID (FK → users)
updated_at          TIMESTAMP
```

---

## 3. Phase 4 User Flows

### Flow 1: Order → Invoice → Payment
```
1. Order confirmed (from Phase 1)
2. Finance creates invoice from order
3. System pre-fills items, customer, amounts
4. GST auto-calculated (intra-state: CGST+SGST, inter-state: IGST)
5. Invoice status = "draft"
6. Review and send → status = "sent"
7. Customer makes partial payment (UPI)
8. Record payment → link to invoice
9. Invoice status = "partially_paid"
10. Customer pays remaining (bank transfer)
11. Record payment → Invoice status = "paid"
12. Order payment_status updated to "paid"
```

### Flow 2: AMC Invoice (Recurring)
```
1. AMC activated
2. Based on payment_terms (quarterly):
   - System flags: "AMC invoice due for Q1"
3. Finance creates invoice for AMC
4. Sent to customer
5. Payment received → recorded
6. Next quarter → repeat
```

### Flow 3: Service Charge Invoice
```
1. Service ticket resolved (non-AMC customer)
2. Engineer records parts used + labor
3. Finance creates invoice from service ticket
4. Parts cost + labor cost + GST
5. Sent to customer
6. Payment tracked
```

### Flow 4: Expense Submission
```
1. Installer travels to site → incurs fuel expense
2. Submits expense: ₹500 fuel, links to installation
3. Uploads fuel receipt photo
4. Manager reviews → approves
5. Finance → reimburses
6. Expense tracked against that installation
```

### Flow 5: Overdue Payment Follow-up
```
1. Invoice due_date passes without full payment
2. Invoice auto-marked as "overdue"
3. Appears on finance dashboard
4. Finance/sales contacts customer
5. Payment received → status updated
```

---

## 4. Phase 4 API Endpoints

### Invoices
```
GET    /api/invoices                         — List invoices
POST   /api/invoices                         — Create invoice
GET    /api/invoices/:id                     — Detail
PATCH  /api/invoices/:id                     — Update
PATCH  /api/invoices/:id/status              — Change status (send, void)
GET    /api/invoices/:id/pdf                 — Download PDF
POST   /api/invoices/:id/credit-note         — Create credit note
GET    /api/invoices/overdue                 — Overdue invoices
GET    /api/invoices/customer/:id            — Customer's invoices
GET    /api/invoices/summary                 — Revenue summary
```

### Payments
```
GET    /api/payments                         — List payments
POST   /api/payments                         — Record payment
GET    /api/payments/:id                     — Detail
PATCH  /api/payments/:id                     — Update
PATCH  /api/payments/:id/confirm             — Confirm payment
GET    /api/payments/:id/receipt              — Download receipt
GET    /api/payments/customer/:id            — Customer's payments
GET    /api/payments/pending                 — Pending/unconfirmed
```

### Expenses
```
GET    /api/expenses                         — List expenses
POST   /api/expenses                         — Submit expense
GET    /api/expenses/:id                     — Detail
PATCH  /api/expenses/:id                     — Update
PATCH  /api/expenses/:id/approve             — Approve
PATCH  /api/expenses/:id/reject              — Reject
PATCH  /api/expenses/:id/reimburse           — Mark reimbursed
GET    /api/expenses/pending-approval        — Awaiting approval
GET    /api/expenses/my                      — My expenses
GET    /api/expenses/report                  — Expense report (date range)
```

### Company Settings
```
GET    /api/settings/company                 — Get settings
PATCH  /api/settings/company                 — Update settings
```

---

## 5. GST Calculation Logic

```
IF customer_state == company_state:
    // Intra-state: Split GST equally
    CGST = taxable_amount * (gst_rate / 2) / 100
    SGST = taxable_amount * (gst_rate / 2) / 100
    IGST = 0
ELSE:
    // Inter-state: Full IGST
    CGST = 0
    SGST = 0
    IGST = taxable_amount * gst_rate / 100

total_tax = CGST + SGST + IGST
total = taxable_amount + total_tax
```

---

## 6. Phase 4 Acceptance Criteria

- [ ] Invoice generated from order, AMC, or service ticket
- [ ] GST calculation correct (CGST/SGST for intra-state, IGST for inter-state)
- [ ] Invoice PDF downloadable with proper format
- [ ] Proforma invoice supported
- [ ] Credit notes can be issued
- [ ] Payments recorded with multiple methods
- [ ] Partial payments supported
- [ ] Payment linked to invoice → auto-updates balance
- [ ] Overdue invoices flagged automatically
- [ ] Advance payments tracked
- [ ] Expenses can be submitted with receipts
- [ ] Expense approval workflow works
- [ ] Company settings configurable (GST, bank, logo)
- [ ] Financial year-based invoice numbering
- [ ] All financial actions logged in audit trail

---

*Phase 4 makes money visible. No more "who owes what?" confusion. Every rupee tracked, every invoice generated, every payment recorded.*
