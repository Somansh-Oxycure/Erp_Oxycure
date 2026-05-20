# OxyCure ERP — Product Catalog (Phase 1 Blueprint)

> **Scope:** A simple product catalog to add, view, filter, and manage HVAC products and their specifications. No stock movement tracking yet — just the master record of what you carry.

---

## What this phase covers

- Add and manage products (AC units, filters, pipes, refrigerants, tools, etc.)
- Store detailed specifications per product type
- Filter and search the product list
- Keep a clean record of each product

---

## Product data model

### Core fields (every product)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Auto-generated primary key |
| `product_code` | String | Unique code e.g. `AC-SPLIT-1.5T` |
| `name` | String | Full product name |
| `brand` | String | e.g. Daikin, Voltas, Blue Star |
| `category` | Enum | See categories below |
| `sub_category` | String | e.g. Split AC → Inverter Split AC |
| `unit_of_measure` | Enum | Pcs / Kg / Ltr / Mtr / Set |
| `description` | Text | Free-text description |
| `image_url` | String | Product photo (optional) |
| `status` | Enum | Active / Discontinued / Draft |
| `created_at` | Timestamp | Auto |
| `updated_at` | Timestamp | Auto |

---

### Product categories

```
HVAC Equipment
  ├── Split AC
  ├── Cassette AC
  ├── Ducted AC
  ├── Window AC
  ├── VRF / VRV Systems
  ├── Air Handling Units (AHU)
  └── Chillers

Consumables & Refrigerants
  ├── Refrigerants (R-22, R-32, R-410A, R-134A …)
  ├── Compressor Oil
  └── Cleaning Chemicals

Piping & Fittings
  ├── Copper Pipes
  ├── PVC Pipes
  ├── Insulation
  └── Fittings & Connectors

Filters
  ├── Panel Filters
  ├── HEPA Filters
  ├── Pre-filters
  └── Carbon Filters

Electrical Components
  ├── Capacitors
  ├── Contactors
  ├── PCB Boards
  ├── Thermostats
  └── Wiring & Cable

Tools & Equipment
  ├── Manifold Gauges
  ├── Vacuum Pumps
  ├── Leak Detectors
  └── Hand Tools

Spare Parts
  ├── Compressors
  ├── Motors (Fan / Blower)
  ├── Expansion Valves
  └── Heat Exchangers
```

---

### Specifications (per category)

Specifications are stored as structured key-value pairs alongside each product, so you can always add new fields without touching the database schema.

#### Split / Cassette / Window AC

| Spec | Example |
|---|---|
| Capacity (Ton) | 1.0 / 1.5 / 2.0 / 2.5 |
| Star Rating | 3★ / 5★ |
| Inverter | Yes / No |
| Refrigerant Type | R-32 / R-410A |
| Power Supply | 230V / 415V |
| Indoor Dimensions (mm) | 845 × 295 × 210 |
| Outdoor Dimensions (mm) | 780 × 540 × 290 |
| Warranty (years) | 1 / 5 / 10 |
| Noise Level (dB) | 32 |
| ISEER Rating | 4.5 |

#### Refrigerants

| Spec | Example |
|---|---|
| Refrigerant Type | R-410A |
| Cylinder Size | 11.3 kg |
| GWP (Global Warming Potential) | 2088 |
| Has Expiry | Yes |
| Expiry Date | 2027-06 |
| Pressure (bar) | 24.8 |

#### Copper Pipes

| Spec | Example |
|---|---|
| Outer Diameter (mm) | 6.35 / 9.52 / 12.7 |
| Wall Thickness (mm) | 0.7 / 0.8 |
| Length per coil (mtr) | 15 / 30 |
| Grade | ACR / Medical |

#### Filters

| Spec | Example |
|---|---|
| Filter Type | HEPA / Panel / Carbon |
| Dimensions (mm) | 592 × 592 × 96 |
| MERV Rating | 13 |
| Micron Rating | 0.3 |
| Airflow (m³/hr) | 1800 |
| Filter Efficiency (%) | 99.97 |
| Compatible Models | Daikin AHU Series |

#### Compressors / Spare Parts

| Spec | Example |
|---|---|
| Compatible Brand | Daikin / Voltas |
| Compatible Model | FTKF50TV16U |
| Part Number | 2YCA9445A |
| Voltage | 230V |
| Refrigerant Compatible | R-32 |
| Power (HP) | 1.5 |
| Warranty | 12 months |

---

## Database tables (Phase 1)

### `products`
Holds the core record for every product.

```sql
CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code     VARCHAR(50)  UNIQUE NOT NULL,
  name             VARCHAR(255) NOT NULL,
  brand            VARCHAR(100),
  category         VARCHAR(100) NOT NULL,
  sub_category     VARCHAR(100),
  unit_of_measure  VARCHAR(20)  NOT NULL DEFAULT 'Pcs',
  description      TEXT,
  image_url        TEXT,
  status           VARCHAR(20)  NOT NULL DEFAULT 'Active',
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

### `product_specifications`
Stores flexible key-value specs so each category can have its own fields without extra columns.

```sql
CREATE TABLE product_specifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  spec_key    VARCHAR(100) NOT NULL,   -- e.g. "Capacity (Ton)"
  spec_value  TEXT         NOT NULL,   -- e.g. "1.5"
  spec_unit   VARCHAR(30),             -- e.g. "Ton", "mm", "kg"
  sort_order  INT          DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_specs_product ON product_specifications(product_id);
```

### `product_categories`
A lookup table so categories stay consistent across the app.

```sql
CREATE TABLE product_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) UNIQUE NOT NULL,
  parent_id    UUID REFERENCES product_categories(id),
  description  TEXT,
  sort_order   INT DEFAULT 0
);
```

---

## UI page — Product catalog

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  OxyCure ERP  >  Stock  >  Product Catalog                  │
├─────────────────────────────────────────────────────────────┤
│  [ Search products... ]   [Category ▾]  [Brand ▾]           │
│  [Status ▾]  [+ Add Product]                                │
├─────────────────────────────────────────────────────────────┤
│  Showing 124 products                          [Grid | List] │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │ [photo]   │  │ [photo]   │  │ [photo]   │              │
│  │ Daikin    │  │ R-410A    │  │ HEPA      │              │
│  │ 1.5T AC   │  │ Refrigerant│ │ Filter    │              │
│  │ Split     │  │           │  │ 592×592   │              │
│  │ AC-DK-015 │  │ RF-410A   │  │ FL-HEPA-1 │              │
│  │ ● Active  │  │ ● Active  │  │ ● Active  │              │
│  │ [View]    │  │ [View]    │  │ [View]    │              │
│  └───────────┘  └───────────┘  └───────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### Filter options

| Filter | Options |
|---|---|
| Search | Product name, code, brand (full-text) |
| Category | All categories from the tree |
| Brand | Dynamic list from existing products |
| Status | Active / Discontinued / Draft |

### Product detail view (drawer or page)

When a product is clicked, show:

1. **Header** — Name, code, category, brand, status badge
2. **Specifications** — All key-value specs in a clean table
3. **Description** — Full text
4. **Photo** — If uploaded
5. **Action buttons** — Edit, Duplicate, Change status

---

## Add / Edit product form

```
Step 1 — Basic info
  • Product name        [text field]
  • Product code        [text field, auto-suggest]
  • Category            [dropdown]
  • Sub-category        [dropdown, filtered by category]
  • Brand               [text field with autocomplete]
  • Unit of measure     [dropdown: Pcs / Kg / Ltr / Mtr / Set]
  • Status              [Active / Draft / Discontinued]
  • Description         [textarea]
  • Photo               [file upload, optional]

Step 2 — Specifications
  • Dynamically show the spec template for the selected category
  • Allow adding custom specs with [+ Add Spec] button
  • Each spec row: Key | Value | Unit
```

---

## Filters sidebar (optional — for more advanced filtering later)

```
Category
  ☑ HVAC Equipment (42)
  ☑ Refrigerants (18)
  ☐ Filters (31)
  ☐ Piping (16)
  ☐ Spare Parts (17)

Brand
  ☑ Daikin
  ☑ Voltas
  ☐ Blue Star
  ☐ Carrier

Status
  ● Active
  ○ Discontinued
  ○ Draft
```

---

## Phase 1 — What is NOT included (yet)

The following will be added in Phase 2 and beyond:

- Stock quantities and levels
- Warehouse / location tracking
- Purchase orders
- Stock in / out transactions
- Alerts and low-stock reminders
- Supplier management
- Pricing and cost tracking

---

## What to build next (Phase 2 preview)

Once the product catalog is stable, Phase 2 will add:

1. **Stock levels** — Add `qty_on_hand` per product
2. **Reorder point** — Set minimum stock threshold per product
3. **Low-stock alerts** — Notify when quantity falls below threshold
4. **Purchase orders** — Order more stock from suppliers
5. **Goods receipt** — Log stock coming in

---

*Blueprint prepared for OxyCure ERP — Stock Management Module, Phase 1*
