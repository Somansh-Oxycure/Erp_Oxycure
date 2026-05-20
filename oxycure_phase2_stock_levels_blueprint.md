# OxyCure ERP — Stock Levels, Alerts & Purchase Orders (Phase 2 Blueprint)

> **Builds on:** Phase 1 — Product Catalog
> **Scope:** Add stock quantities to every product, set reorder thresholds, trigger low-stock alerts, raise purchase orders, and log goods received. No warehouse splitting yet — all stock lives in one default store.

---

## What this phase adds

- Track how many units of each product you have on hand
- Set a minimum stock level (reorder point) per product
- Get notified when any product falls below its minimum
- Raise a purchase order to a supplier
- Mark stock as received and update quantities automatically

---

## How Phase 2 connects to Phase 1

```
products (Phase 1)
    │
    ├── product_specifications (Phase 1)
    │
    ├── stock_levels          ← NEW (Phase 2)
    ├── stock_transactions    ← NEW (Phase 2)
    ├── suppliers             ← NEW (Phase 2)
    ├── purchase_orders       ← NEW (Phase 2)
    ├── purchase_order_items  ← NEW (Phase 2)
    └── alert_rules           ← NEW (Phase 2)
```

---

## New data added to the products table

Two columns are added to the existing `products` table from Phase 1:

```sql
ALTER TABLE products
  ADD COLUMN reorder_point   DECIMAL(10,2) DEFAULT 0,   -- alert fires below this
  ADD COLUMN reorder_qty     DECIMAL(10,2) DEFAULT 0;   -- suggested qty to order
```

---

## New database tables (Phase 2)

### `stock_levels`
One row per product. Holds the current live quantity.

```sql
CREATE TABLE stock_levels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty_on_hand     DECIMAL(10,2) NOT NULL DEFAULT 0,
  qty_reserved    DECIMAL(10,2) NOT NULL DEFAULT 0,  -- committed to a job
  qty_on_order    DECIMAL(10,2) NOT NULL DEFAULT 0,  -- pending PO
  avg_cost        DECIMAL(10,2),                     -- weighted average cost
  last_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(product_id)
);

-- Computed: qty_available = qty_on_hand - qty_reserved
-- This is calculated at query time, not stored
```

### `stock_transactions`
Immutable log of every quantity change. Never updated or deleted.

```sql
CREATE TABLE stock_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID    NOT NULL REFERENCES products(id),
  txn_type      VARCHAR(20) NOT NULL,
                -- 'OPENING'   initial stock entry
                -- 'GRN'       goods received from supplier
                -- 'ADJUSTMENT_IN'   manual positive correction
                -- 'ADJUSTMENT_OUT'  manual negative correction / write-off
  qty           DECIMAL(10,2) NOT NULL,   -- always positive
  direction     CHAR(1) NOT NULL,         -- '+' or '-'
  unit_cost     DECIMAL(10,2),
  reference_id  UUID,                     -- PO id or adjustment id
  notes         TEXT,
  performed_by  UUID    NOT NULL,         -- user id
  txn_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_txn_product   ON stock_transactions(product_id);
CREATE INDEX idx_txn_type      ON stock_transactions(txn_type);
CREATE INDEX idx_txn_at        ON stock_transactions(txn_at);
```

### `suppliers`
Supplier / vendor master.

```sql
CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  contact_name  VARCHAR(100),
  phone         VARCHAR(30),
  email         VARCHAR(150),
  address       TEXT,
  gstin         VARCHAR(20),             -- GST number (India)
  lead_time_days INT DEFAULT 3,          -- typical delivery time
  notes         TEXT,
  status        VARCHAR(20) DEFAULT 'Active',
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### `product_suppliers`
Links products to their preferred suppliers with pricing.

```sql
CREATE TABLE product_suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_sku    VARCHAR(100),       -- supplier's own part number
  unit_price      DECIMAL(10,2),
  min_order_qty   DECIMAL(10,2) DEFAULT 1,
  is_preferred    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(product_id, supplier_id)
);
```

### `purchase_orders`
Header record for each purchase order.

```sql
CREATE TABLE purchase_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number        VARCHAR(50) UNIQUE NOT NULL,  -- e.g. PO-2025-0042
  supplier_id      UUID NOT NULL REFERENCES suppliers(id),
  status           VARCHAR(20) NOT NULL DEFAULT 'Draft',
                   -- Draft → Sent → Partially Received → Received → Cancelled
  expected_date    DATE,
  notes            TEXT,
  total_amount     DECIMAL(12,2),
  created_by       UUID NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status   ON purchase_orders(status);
```

### `purchase_order_items`
Line items on each purchase order.

```sql
CREATE TABLE purchase_order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id         UUID        NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id    UUID        NOT NULL REFERENCES products(id),
  qty_ordered   DECIMAL(10,2) NOT NULL,
  qty_received  DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit_price    DECIMAL(10,2),
  total_price   DECIMAL(12,2) GENERATED ALWAYS AS (qty_ordered * unit_price) STORED,
  notes         TEXT
);

CREATE INDEX idx_poi_po      ON purchase_order_items(po_id);
CREATE INDEX idx_poi_product ON purchase_order_items(product_id);
```

### `alert_rules`
Configurable rules that decide when and how to alert.

```sql
CREATE TABLE alert_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name           VARCHAR(100) NOT NULL,
  rule_type           VARCHAR(30)  NOT NULL,
                      -- 'LOW_STOCK'   qty_available <= reorder_point
                      -- 'REORDER'     escalation if LOW_STOCK unacknowledged
                      -- 'EXPIRY'      N days before expiry date
                      -- 'OVERSTOCK'   qty_on_hand > max_stock_level
  product_id          UUID REFERENCES products(id),   -- NULL = applies to all
  category            VARCHAR(100),                   -- NULL = applies to all
  threshold_value     DECIMAL(10,2),                  -- qty or days
  notify_channels     TEXT[] NOT NULL DEFAULT '{"in_app"}',
                      -- 'in_app', 'email', 'whatsapp'
  notify_user_ids     UUID[],
  auto_create_po      BOOLEAN DEFAULT FALSE,
  escalate_after_hrs  INT DEFAULT 24,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### `alert_logs`
Every time an alert fires, a row is written here.

```sql
CREATE TABLE alert_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id       UUID NOT NULL REFERENCES alert_rules(id),
  product_id    UUID NOT NULL REFERENCES products(id),
  triggered_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  alert_message TEXT,
  status        VARCHAR(20) DEFAULT 'Open',  -- Open / Acknowledged / Resolved
  resolved_at   TIMESTAMP,
  resolved_by   UUID
);

CREATE INDEX idx_alert_log_product ON alert_logs(product_id);
CREATE INDEX idx_alert_log_status  ON alert_logs(status);
```

---

## Business logic — how quantities work

```
qty_available = qty_on_hand - qty_reserved

Alert fires when:
  qty_available <= products.reorder_point

On GRN received:
  stock_levels.qty_on_hand  += qty_received
  stock_levels.qty_on_order -= qty_received
  INSERT INTO stock_transactions (type='GRN', direction='+', ...)

On manual adjustment (add):
  stock_levels.qty_on_hand  += qty
  INSERT INTO stock_transactions (type='ADJUSTMENT_IN', direction='+', ...)

On manual adjustment (remove / write-off):
  stock_levels.qty_on_hand  -= qty
  INSERT INTO stock_transactions (type='ADJUSTMENT_OUT', direction='-', ...)

On PO created:
  stock_levels.qty_on_order += qty_ordered   (per line item)

On PO cancelled:
  stock_levels.qty_on_order -= qty_ordered   (reverse)
```

---

## Alert engine — how it works

The alert engine runs as a background job (cron) every 15 minutes and also fires instantly on every stock-level update.

```
Every transaction that changes qty_on_hand:
  └── Re-evaluate all active alert_rules for that product
        └── If rule condition is met AND no open alert_log exists:
              ├── INSERT alert_log (status = 'Open')
              ├── Send notification to notify_channels
              └── If auto_create_po = TRUE:
                    └── Create draft PO to preferred supplier

Every day at 08:00 (cron):
  └── Scan all products with has_expiry = TRUE
        └── For each batch nearing expiry:
              └── Fire EXPIRY alert if within threshold days
```

### Alert notification content

**Low stock — in-app**
```
⚠️  R-410A Refrigerant (1 kg) is low
    On hand: 3 units  |  Reorder point: 5 units
    [View Product]  [Create PO]
```

**Low stock — WhatsApp / email**
```
Hi [Name], this is an OxyCure stock alert.

Product  : R-410A Refrigerant (1 kg)
Code     : RF-410A-1K
On hand  : 3 units
Minimum  : 5 units

A draft PO has been created automatically.
Please review and approve it in OxyCure ERP.
```

---

## UI pages added in Phase 2

### 1. Stock overview page

```
OxyCure ERP  >  Stock  >  Stock Overview

[ Search... ]  [Category ▾]  [Alert status ▾]  [+ Adjust Stock]

┌──────────────────────────────────────────────────────────────┐
│ Product            │ On Hand │ Reserved │ Available │ Min │ Status   │
├──────────────────────────────────────────────────────────────┤
│ Daikin 1.5T AC     │   12    │    2     │    10     │  3  │ ● OK      │
│ R-410A Refrig 1kg  │    3    │    0     │     3     │  5  │ ⚠ Low     │
│ HEPA Filter 592mm  │    0    │    0     │     0     │  5  │ ✕ Out     │
│ Copper Pipe 9.52   │   45    │    0     │    45     │ 10  │ ● OK      │
└──────────────────────────────────────────────────────────────┘
```

**Status badge rules:**

| Badge | Condition |
|---|---|
| ● OK | qty_available > reorder_point |
| ⚠ Low | qty_available > 0 AND qty_available <= reorder_point |
| ✕ Out of stock | qty_available = 0 |
| 📦 On order | qty_on_order > 0 |

### 2. Product stock detail (extends Phase 1 product page)

Adds a new **Stock** tab inside the product detail view:

```
[ Info ]  [ Specifications ]  [ Stock ]   ← new tab

Stock tab shows:
  On hand     :  3 units
  Reserved    :  0 units
  Available   :  3 units
  On order    :  20 units (PO-2025-0042, expected 12 Jun)
  Reorder at  :  5 units
  Reorder qty :  20 units
  Avg cost    :  ₹ 3,200 / unit

  [ + Adjust Stock ]   [ Raise PO ]

  Transaction history
  ─────────────────────────────────────────
  12 May 2025  GRN        +20   PO-2025-0038  Raju
  02 May 2025  ADJ OUT     -2   Write-off     Anil
  15 Apr 2025  GRN        +10   PO-2025-0031  Raju
```

### 3. Stock adjustment form

```
Adjust Stock — R-410A Refrigerant (1 kg)

  Type        ( ) Add stock    ( ) Remove / Write-off
  Quantity    [ 5          ]
  Reason      [ Dropdown   ]   ← Physical count / Damaged / Expired / Other
  Notes       [ text       ]
  Date        [ today      ]

  Current qty : 3 units
  After adj   : 8 units  (calculated live)

  [ Cancel ]   [ Save Adjustment ]
```

### 4. Suppliers page

```
OxyCure ERP  >  Stock  >  Suppliers

[ + Add Supplier ]

┌─────────────────────────────────────────────────┐
│ Supplier        │ Contact       │ Lead time │ Status │
├─────────────────────────────────────────────────┤
│ HVAC Traders    │ 98xxxxxxxx    │ 3 days    │ Active │
│ Cool Parts Co.  │ 91xxxxxxxx    │ 5 days    │ Active │
└─────────────────────────────────────────────────┘
```

### 5. Purchase orders page

```
OxyCure ERP  >  Stock  >  Purchase Orders

[ + New PO ]  [Status ▾]  [Supplier ▾]

┌──────────────────────────────────────────────────────┐
│ PO Number     │ Supplier      │ Items │ Total  │ Status    │
├──────────────────────────────────────────────────────┤
│ PO-2025-0042  │ HVAC Traders  │  3    │ ₹14,400 │ Sent      │
│ PO-2025-0041  │ Cool Parts    │  1    │ ₹ 3,200 │ Received  │
│ PO-2025-0040  │ HVAC Traders  │  2    │ ₹ 8,100 │ Draft     │
└──────────────────────────────────────────────────────┘
```

### 6. PO detail / receive goods

```
PO-2025-0042  |  HVAC Traders  |  Status: Sent

Product               Ordered   Received   Unit Price   Total
─────────────────────────────────────────────────────────────
R-410A Refrig 1kg       20         0        ₹3,200     ₹64,000
HEPA Filter 592mm       10         0        ₹1,800     ₹18,000
Copper Pipe 9.52 15m     5         0        ₹1,400      ₹7,000
                                                    ─────────
                                          Total:    ₹89,000

[ Mark as Sent ]   [ Receive Goods ▾ ]
```

When "Receive Goods" is clicked, a form opens letting you enter the received qty per line item, which then auto-creates GRN transactions and updates stock_levels.

### 7. Alerts page

```
OxyCure ERP  >  Stock  >  Alerts

[ All ]  [ Open ]  [ Acknowledged ]  [ Resolved ]

┌───────────────────────────────────────────────────────────┐
│ ⚠  R-410A Refrigerant (1 kg) — LOW STOCK                  │
│    Available: 3 units  |  Minimum: 5 units                │
│    Triggered: 12 May 2025, 10:32 AM                       │
│    [ Acknowledge ]   [ Raise PO ]   [ View Product ]      │
├───────────────────────────────────────────────────────────┤
│ ✕  HEPA Filter 592mm — OUT OF STOCK                       │
│    Available: 0 units  |  Minimum: 5 units                │
│    Triggered: 10 May 2025, 08:15 AM  |  Draft PO created  │
│    [ Acknowledge ]   [ View PO ]   [ View Product ]       │
└───────────────────────────────────────────────────────────┘
```

---

## Alert settings page

```
OxyCure ERP  >  Stock  >  Alert Settings

[ + New Alert Rule ]

┌─────────────────────────────────────────────────────────────────┐
│ Rule Name        │ Type       │ Applies to         │ Threshold │ Channels     │
├─────────────────────────────────────────────────────────────────┤
│ Global low stock │ LOW_STOCK  │ All products       │ Reorder pt│ In-app, Email│
│ Refrigerant expiry│ EXPIRY    │ Refrigerants cat.  │ 30 days   │ WhatsApp     │
│ Compressor reorder│ REORDER   │ Spare Parts cat.   │ 48 hrs    │ In-app       │
└─────────────────────────────────────────────────────────────────┘
```

---

## API endpoints (Phase 2)

### Stock levels
```
GET    /api/stock                      List all products with stock levels
GET    /api/stock/:productId           Stock detail for one product
POST   /api/stock/:productId/adjust    Create a manual adjustment
```

### Transactions
```
GET    /api/stock/:productId/transactions    Transaction history for a product
```

### Suppliers
```
GET    /api/suppliers           List suppliers
POST   /api/suppliers           Create supplier
PUT    /api/suppliers/:id       Update supplier
DELETE /api/suppliers/:id       Soft delete
```

### Purchase orders
```
GET    /api/purchase-orders            List POs
POST   /api/purchase-orders            Create PO (manual or auto)
GET    /api/purchase-orders/:id        PO detail
PUT    /api/purchase-orders/:id        Update PO (status, notes)
POST   /api/purchase-orders/:id/receive   Mark goods received (updates stock)
```

### Alerts
```
GET    /api/alerts                     List all alert logs
GET    /api/alerts/open                Open alerts only
PUT    /api/alerts/:id/acknowledge     Mark alert as acknowledged
PUT    /api/alerts/:id/resolve         Mark alert as resolved
GET    /api/alert-rules                List alert rules
POST   /api/alert-rules                Create alert rule
PUT    /api/alert-rules/:id            Update rule
DELETE /api/alert-rules/:id            Delete rule
```

---

## Phase 2 — What is NOT included (yet)

These move to Phase 3 and beyond:

- Multiple warehouses / locations
- Van stock tracking per technician
- Stock reserved for specific jobs / work orders
- Batch and serial number tracking
- Supplier price comparison
- Stock valuation reports
- ABC analysis

---

## What to build next (Phase 3 preview)

1. **Multiple warehouses** — Separate stock per store, branch, and technician van
2. **Job / work order linkage** — Reserve and issue stock against a job
3. **Batch & serial tracking** — Track individual units of expensive equipment
4. **Supplier comparison** — Compare prices across suppliers before raising a PO
5. **Stock reports** — Valuation, slow-moving items, consumption trends

---

*Blueprint prepared for OxyCure ERP — Stock Management Module, Phase 2*
*Depends on: Phase 1 — Product Catalog*
