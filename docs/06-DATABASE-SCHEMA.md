# Database Schema Blueprint — All Phases

> **Database:** PostgreSQL
> **Naming Convention:** snake_case, plural table names
> **Primary Keys:** UUID (uuid_generate_v4())
> **Timestamps:** All tables have created_at, updated_at
> **Soft Deletes:** Use is_active / status fields, never hard delete business data

---

## Complete Entity Relationship Overview

```
                    ┌──────────┐
                    │  USERS   │
                    └────┬─────┘
                         │ (assigned_to, created_by, etc.)
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
┌────▼─────┐      ┌─────▼─────┐      ┌──────▼───────┐
│  LEADS   │      │OPPORTUNITIES│     │  AUDIT_LOGS  │
└────┬─────┘      └─────┬─────┘      └──────────────┘
     │ (won)            │
     │    ┌─────────────┘
     │    │
     ├────▼──────────────────┐
     │                       │
┌────▼──────────────┐  ┌─────▼─────┐
│DESIGN_SPECIFICATIONS│ │QUOTATIONS │
└────┬──────────────┘  └─────┬─────┘
     │                       │
     │    ┌──────────────────┘
     │    │
┌────▼────▼──┐
│ CUSTOMERS  │
└────┬───────┘
     │
┌────▼───────┐
│   ORDERS   │
└────┬───────┘
     │
     ├──────────────────────┬──────────────────┐
     │                      │                  │
┌────▼──────────┐    ┌──────▼────────┐  ┌──────▼────────┐
│  FULFILLMENT  │    │ INSTALLATIONS │  │   INVOICES    │
│(Pick/Pack/    │    └──────┬────────┘  └──────┬────────┘
│ Dispatch)     │          │                   │
└───────────────┘          │                   │
                     ├── inst_team_members      │
                     ├── inst_tasks              ├── invoice_items
                     ├── inst_issues             │
                     ├── inst_materials          ├──────────────┐
                     │                           │              │
               ┌─────▼───────────┐        ┌─────▼─────┐  ┌─────▼────┐
               │ AMC_CONTRACTS   │        │ PAYMENTS  │  │ EXPENSES │
               └─────┬───────────┘        └───────────┘  └──────────┘
                     │
                     ├── amc_scheduled_visits
                     │
               ┌─────▼─────────────┐
               │ SERVICE_TICKETS   │
               └─────┬─────────────┘
                     │
                     ├── service_visits
                     │    └── service_parts_usage
                     │
┌────────────────────▼──┐
│   PRODUCTS            │
├───────────────────────┤
│   INVENTORY           │
│   INV_TRANSACTIONS    │
├───────────────────────┤
│   VENDORS             │
│   PURCHASE_ORDERS     │
│   PO_ITEMS            │
└───────────────────────┘

Cross-cutting:
├── notifications
├── notification_preferences
├── documents
├── report_templates
└── company_settings
```

---

## Table Definitions (SQL-Ready)

### Phase 1 Tables

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM (
    'admin', 'manager', 'salesperson', 'design_engineer', 'installer', 'service_engineer', 'finance'
);

CREATE TYPE department AS ENUM (
    'sales', 'operations', 'service', 'admin', 'finance', 'design'
);

CREATE TYPE lead_status AS ENUM (
    'new', 'contacted', 'qualified', 'quoted', 'won', 'lost'
);

CREATE TYPE lead_source AS ENUM (
    'website', 'referral', 'walk_in', 'cold_call', 'social_media',
    'exhibition', 'partner', 'other'
);

CREATE TYPE lead_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE note_type AS ENUM ('general', 'follow_up', 'meeting', 'call', 'status_change', 'site_inspection', 'design_review');

CREATE TYPE follow_up_status AS ENUM ('pending', 'completed', 'missed', 'rescheduled');

CREATE TYPE customer_type AS ENUM (
    'individual', 'business', 'hospital', 'clinic', 'government', 'other'
);

CREATE TYPE opportunity_stage AS ENUM (
    'prospect', 'discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
);

CREATE TYPE quotation_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');

CREATE TYPE order_status AS ENUM (
    'created', 'confirmed', 'in_progress',
    'completed', 'cancelled'
);

CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid');

CREATE TYPE audit_action AS ENUM (
    'create', 'update', 'delete', 'status_change', 'assign', 'login', 'logout'
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     VARCHAR(50) UNIQUE NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL,
    department      department NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    last_login_at   TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_number         VARCHAR(20) UNIQUE NOT NULL,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100),
    email               VARCHAR(255),
    phone               VARCHAR(20) NOT NULL,
    alternate_phone     VARCHAR(20),
    company_name        VARCHAR(255),
    designation         VARCHAR(100),
    address_line1       VARCHAR(255),
    address_line2       VARCHAR(255),
    city                VARCHAR(100) NOT NULL,
    state               VARCHAR(100) NOT NULL,
    pincode             VARCHAR(10),
    source              lead_source NOT NULL,
    source_detail       VARCHAR(255),
    status              lead_status DEFAULT 'new',
    lost_reason         VARCHAR(500),
    priority            lead_priority DEFAULT 'medium',
    assigned_to         UUID REFERENCES users(id),
    estimated_value     DECIMAL(12, 2),
    product_interest    VARCHAR(500),
    product_type        VARCHAR(100), -- air_purifier, moscure, industrial_solution, hvac, other
    requirement_notes   TEXT,
    site_inspection_needed BOOLEAN DEFAULT false,
    design_spec_id      UUID, -- FK added after design_specifications table
    next_follow_up_date DATE,
    converted_at        TIMESTAMP WITH TIME ZONE,
    converted_by        UUID REFERENCES users(id),
    customer_id         UUID, -- FK added after customers table
    created_by          UUID REFERENCES users(id) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_next_follow_up ON leads(next_follow_up_date);

-- ============================================================
-- LEAD NOTES
-- ============================================================
CREATE TABLE lead_notes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
    note            TEXT NOT NULL,
    note_type       note_type DEFAULT 'general',
    created_by      UUID REFERENCES users(id) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lead_notes_lead_id ON lead_notes(lead_id);

-- ============================================================
-- LEAD FOLLOW-UPS
-- ============================================================
CREATE TABLE lead_follow_ups (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
    scheduled_date  DATE NOT NULL,
    scheduled_time  TIME,
    description     TEXT,
    status          follow_up_status DEFAULT 'pending',
    outcome         TEXT,
    completed_at    TIMESTAMP WITH TIME ZONE,
    assigned_to     UUID REFERENCES users(id),
    created_by      UUID REFERENCES users(id) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_follow_ups_lead_id ON lead_follow_ups(lead_id);
CREATE INDEX idx_follow_ups_scheduled_date ON lead_follow_ups(scheduled_date);
CREATE INDEX idx_follow_ups_status ON lead_follow_ups(status);
CREATE INDEX idx_follow_ups_assigned_to ON lead_follow_ups(assigned_to);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_number VARCHAR(20) UNIQUE NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100),
    email           VARCHAR(255),
    phone           VARCHAR(20) NOT NULL UNIQUE,
    alternate_phone VARCHAR(20),
    company_name    VARCHAR(255),
    designation     VARCHAR(100),
    gst_number      VARCHAR(20),
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100) NOT NULL,
    pincode         VARCHAR(10),
    customer_type   customer_type DEFAULT 'individual',
    lead_id         UUID REFERENCES leads(id),
    created_by      UUID REFERENCES users(id) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add FK from leads to customers
ALTER TABLE leads ADD CONSTRAINT fk_leads_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_customer_type ON customers(customer_type);
CREATE INDEX idx_customers_city ON customers(city);

-- ============================================================
-- OPPORTUNITIES
-- ============================================================
CREATE TABLE opportunities (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_number  VARCHAR(20) UNIQUE NOT NULL,
    lead_id             UUID REFERENCES leads(id),
    customer_id         UUID REFERENCES customers(id),
    title               VARCHAR(255) NOT NULL,
    stage               opportunity_stage DEFAULT 'prospect',
    deal_value          DECIMAL(12, 2),
    probability         INTEGER CHECK (probability >= 0 AND probability <= 100),
    expected_close_date DATE,
    actual_close_date   DATE,
    lost_reason         VARCHAR(500),
    assigned_to         UUID REFERENCES users(id),
    notes               TEXT,
    created_by          UUID REFERENCES users(id) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_assigned_to ON opportunities(assigned_to);

-- ============================================================
-- QUOTATIONS
-- ============================================================
CREATE TABLE quotations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number    VARCHAR(20) UNIQUE NOT NULL,
    opportunity_id      UUID REFERENCES opportunities(id),
    customer_id         UUID REFERENCES customers(id),
    lead_id             UUID REFERENCES leads(id),
    valid_until         DATE,
    subtotal            DECIMAL(12, 2) DEFAULT 0,
    tax_amount          DECIMAL(12, 2) DEFAULT 0,
    discount_amount     DECIMAL(12, 2) DEFAULT 0,
    total_amount        DECIMAL(12, 2) DEFAULT 0,
    status              quotation_status DEFAULT 'draft',
    terms_and_conditions TEXT,
    notes               TEXT,
    created_by          UUID REFERENCES users(id) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_customer_id ON quotations(customer_id);

-- ============================================================
-- QUOTATION ITEMS
-- ============================================================
CREATE TABLE quotation_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id    UUID REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
    product_name    VARCHAR(255) NOT NULL,
    description     TEXT,
    quantity        INTEGER NOT NULL DEFAULT 1,
    unit_price      DECIMAL(12, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    tax_percent     DECIMAL(5, 2) DEFAULT 18,
    total_price     DECIMAL(12, 2) NOT NULL,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quotation_items_quotation_id ON quotation_items(quotation_id);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number        VARCHAR(20) UNIQUE NOT NULL,
    customer_id         UUID REFERENCES customers(id) NOT NULL,
    lead_id             UUID REFERENCES leads(id),
    opportunity_id      UUID REFERENCES opportunities(id),
    quotation_id        UUID REFERENCES quotations(id),
    design_spec_id      UUID, -- FK added after design_specifications table
    status              order_status DEFAULT 'created',
    order_date          DATE NOT NULL,
    expected_delivery   DATE,
    actual_delivery     DATE,
    subtotal            DECIMAL(12, 2) DEFAULT 0,
    tax_amount          DECIMAL(12, 2) DEFAULT 0,
    discount_amount     DECIMAL(12, 2) DEFAULT 0,
    total_amount        DECIMAL(12, 2) DEFAULT 0,
    payment_status      payment_status DEFAULT 'pending',
    delivery_address    TEXT,
    site_address        TEXT,
    special_instructions TEXT,
    cancelled_reason    VARCHAR(500),
    assigned_to         UUID REFERENCES users(id),
    created_by          UUID REFERENCES users(id) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_order_date ON orders(order_date);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_name    VARCHAR(255) NOT NULL,
    description     TEXT,
    quantity        INTEGER NOT NULL DEFAULT 1,
    unit_price      DECIMAL(12, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    tax_percent     DECIMAL(5, 2) DEFAULT 18,
    total_price     DECIMAL(12, 2) NOT NULL,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    action          audit_action NOT NULL,
    field_changed   VARCHAR(100),
    old_value       TEXT,
    new_value       TEXT,
    description     VARCHAR(500),
    performed_by    UUID REFERENCES users(id),
    ip_address      VARCHAR(45),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- ============================================================
-- DESIGN SPECIFICATIONS (Core to Oxycure sales process)
-- ============================================================
CREATE TYPE design_spec_status AS ENUM (
    'requested', 'in_progress', 'completed', 'approved', 'revision_needed'
);

CREATE TABLE design_specifications (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spec_number             VARCHAR(20) UNIQUE NOT NULL,
    lead_id                 UUID REFERENCES leads(id) NOT NULL,
    customer_id             UUID REFERENCES customers(id),
    status                  design_spec_status DEFAULT 'requested',

    -- Requirement Input
    product_type            VARCHAR(100), -- air_purifier, moscure, industrial_solution, hvac, other
    requirement_summary     TEXT,
    site_area_sqft          DECIMAL(10, 2),
    site_type               VARCHAR(100), -- hospital, clinic, office, factory
    site_environment        TEXT,
    power_availability      VARCHAR(100),
    special_requirements    TEXT,

    -- Site Inspection
    site_inspection_done    BOOLEAN DEFAULT false,
    site_inspection_date    DATE,
    site_inspection_by      UUID REFERENCES users(id),
    site_inspection_notes   TEXT,

    -- Design Output
    recommended_products    JSONB, -- [{product_name, model, quantity, unit_price, specs}]
    configuration_notes     TEXT,
    technical_specs         TEXT,
    bom_items               JSONB, -- [{item, qty, cost}]
    estimated_cost          DECIMAL(12, 2),

    -- Approval
    designed_by             UUID REFERENCES users(id),
    reviewed_by             UUID REFERENCES users(id),
    approved_at             TIMESTAMP WITH TIME ZONE,
    revision_notes          TEXT,

    quotation_id            UUID REFERENCES quotations(id),
    created_by              UUID REFERENCES users(id) NOT NULL,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_design_specs_status ON design_specifications(status);
CREATE INDEX idx_design_specs_lead_id ON design_specifications(lead_id);
CREATE INDEX idx_design_specs_designed_by ON design_specifications(designed_by);

-- Add FK from leads to design_specifications
ALTER TABLE leads ADD CONSTRAINT fk_leads_design_spec
    FOREIGN KEY (design_spec_id) REFERENCES design_specifications(id);

-- Add FK from orders to design_specifications
ALTER TABLE orders ADD CONSTRAINT fk_orders_design_spec
    FOREIGN KEY (design_spec_id) REFERENCES design_specifications(id);
```

### Phase 2 Tables

```sql
-- ============================================================
-- PHASE 2 ENUMS
-- ============================================================
CREATE TYPE installation_status AS ENUM (
    'created', 'site_survey', 'scheduled', 'in_progress',
    'testing', 'completed', 'signed_off', 'on_hold', 'cancelled'
);

CREATE TYPE site_type AS ENUM (
    'hospital', 'clinic', 'office', 'residential', 'industrial', 'other'
);

CREATE TYPE task_status AS ENUM (
    'pending', 'in_progress', 'completed', 'skipped', 'blocked'
);

CREATE TYPE issue_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE issue_status AS ENUM (
    'open', 'in_progress', 'resolved', 'closed', 'escalated'
);

CREATE TYPE unit_of_measure AS ENUM ('piece', 'set', 'kit', 'meter', 'sqft');

CREATE TYPE inventory_transaction_type AS ENUM (
    'stock_in', 'stock_out', 'reserved', 'released', 'adjustment'
);

CREATE TYPE fulfillment_status AS ENUM (
    'pending', 'picking', 'packing', 'ready_to_dispatch',
    'dispatched', 'delivered', 'cancelled'
);

CREATE TYPE purchase_order_status AS ENUM (
    'draft', 'submitted', 'approved', 'ordered',
    'partially_received', 'received', 'cancelled'
);

CREATE TYPE vendor_status AS ENUM ('active', 'inactive', 'blacklisted');

-- ============================================================
-- PRODUCT CATEGORIES
-- ============================================================
CREATE TABLE product_categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    parent_id   UUID REFERENCES product_categories(id),
    description TEXT,
    is_active   BOOLEAN DEFAULT true,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku                     VARCHAR(50) UNIQUE NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    category_id             UUID REFERENCES product_categories(id),
    description             TEXT,
    specifications          JSONB,
    unit_price              DECIMAL(12, 2) NOT NULL,
    cost_price              DECIMAL(12, 2),
    tax_percent             DECIMAL(5, 2) DEFAULT 18,
    unit_of_measure         unit_of_measure DEFAULT 'piece',
    is_active               BOOLEAN DEFAULT true,
    requires_installation   BOOLEAN DEFAULT false,
    warranty_months         INTEGER,
    hsn_code                VARCHAR(20),
    image_url               VARCHAR(500),
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);

-- ============================================================
-- INVENTORY
-- ============================================================
CREATE TABLE inventory (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id          UUID REFERENCES products(id) UNIQUE NOT NULL,
    stock_quantity      INTEGER DEFAULT 0,
    reserved_quantity   INTEGER DEFAULT 0,
    min_stock_level     INTEGER DEFAULT 0,
    warehouse_location  VARCHAR(100),
    last_restocked_at   TIMESTAMP WITH TIME ZONE,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INVENTORY TRANSACTIONS
-- ============================================================
CREATE TABLE inventory_transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id          UUID REFERENCES products(id) NOT NULL,
    transaction_type    inventory_transaction_type NOT NULL,
    quantity            INTEGER NOT NULL,
    reference_type      VARCHAR(50),
    reference_id        UUID,
    notes               TEXT,
    performed_by        UUID REFERENCES users(id),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inv_trans_product ON inventory_transactions(product_id);
CREATE INDEX idx_inv_trans_type ON inventory_transactions(transaction_type);

-- ============================================================
-- VENDORS
-- ============================================================
CREATE TABLE vendors (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_code         VARCHAR(20) UNIQUE NOT NULL,
    name                VARCHAR(255) NOT NULL,
    contact_person      VARCHAR(200),
    email               VARCHAR(255),
    phone               VARCHAR(20) NOT NULL,
    alternate_phone     VARCHAR(20),
    gst_number          VARCHAR(20),
    pan_number          VARCHAR(20),
    address_line1       VARCHAR(255),
    address_line2       VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(100),
    pincode             VARCHAR(10),
    status              vendor_status DEFAULT 'active',
    payment_terms       VARCHAR(100),  -- Net 30, Net 60, etc.
    lead_time_days      INTEGER,       -- avg days to deliver
    product_categories  TEXT[],        -- what categories they supply
    rating              DECIMAL(3, 2), -- 0.00 to 5.00
    notes               TEXT,
    created_by          UUID REFERENCES users(id) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_city ON vendors(city);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
CREATE TABLE purchase_orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number           VARCHAR(20) UNIQUE NOT NULL,
    vendor_id           UUID REFERENCES vendors(id) NOT NULL,
    order_id            UUID REFERENCES orders(id),       -- linked to sales order
    status              purchase_order_status DEFAULT 'draft',
    order_date          DATE,
    expected_delivery   DATE,
    actual_delivery     DATE,
    subtotal            DECIMAL(12, 2) DEFAULT 0,
    tax_amount          DECIMAL(12, 2) DEFAULT 0,
    total_amount        DECIMAL(12, 2) DEFAULT 0,
    delivery_address    TEXT,
    notes               TEXT,
    approved_by         UUID REFERENCES users(id),
    approved_at         TIMESTAMP WITH TIME ZONE,
    created_by          UUID REFERENCES users(id) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX idx_po_order_id ON purchase_orders(order_id);

-- ============================================================
-- PURCHASE ORDER ITEMS
-- ============================================================
CREATE TABLE purchase_order_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id   UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
    product_id          UUID REFERENCES products(id),
    product_name        VARCHAR(255) NOT NULL,
    description         TEXT,
    quantity_ordered    INTEGER NOT NULL,
    quantity_received   INTEGER DEFAULT 0,
    unit_price          DECIMAL(12, 2) NOT NULL,
    tax_percent         DECIMAL(5, 2) DEFAULT 18,
    total_price         DECIMAL(12, 2) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_po_items_po ON purchase_order_items(purchase_order_id);

-- ============================================================
-- ORDER FULFILLMENT (Pick / Pack / Dispatch)
-- ============================================================
CREATE TABLE order_fulfillments (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fulfillment_number      VARCHAR(20) UNIQUE NOT NULL,
    order_id                UUID REFERENCES orders(id) NOT NULL,
    status                  fulfillment_status DEFAULT 'pending',

    -- Picking
    picked_by               UUID REFERENCES users(id),
    picked_at               TIMESTAMP WITH TIME ZONE,
    picking_notes           TEXT,

    -- Packing
    packed_by               UUID REFERENCES users(id),
    packed_at               TIMESTAMP WITH TIME ZONE,
    package_count           INTEGER,
    packing_notes           TEXT,

    -- Dispatch
    dispatched_by           UUID REFERENCES users(id),
    dispatched_at           TIMESTAMP WITH TIME ZONE,
    dispatch_mode           VARCHAR(100),   -- courier, own vehicle, third-party
    tracking_number         VARCHAR(100),
    transporter_name        VARCHAR(200),
    vehicle_number          VARCHAR(50),
    dispatch_notes          TEXT,

    -- Delivery
    delivered_at            TIMESTAMP WITH TIME ZONE,
    delivery_confirmed_by   VARCHAR(200),   -- receiver name
    delivery_notes          TEXT,

    created_by              UUID REFERENCES users(id) NOT NULL,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fulfillment_status ON order_fulfillments(status);
CREATE INDEX idx_fulfillment_order ON order_fulfillments(order_id);

-- ============================================================
-- FULFILLMENT ITEMS
-- ============================================================
CREATE TABLE fulfillment_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fulfillment_id      UUID REFERENCES order_fulfillments(id) ON DELETE CASCADE NOT NULL,
    order_item_id       UUID REFERENCES order_items(id),
    product_id          UUID REFERENCES products(id),
    product_name        VARCHAR(255) NOT NULL,
    quantity_ordered    INTEGER NOT NULL,
    quantity_picked     INTEGER DEFAULT 0,
    quantity_packed     INTEGER DEFAULT 0,
    quantity_dispatched INTEGER DEFAULT 0,
    serial_numbers      TEXT[], -- serial numbers if tracked
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fulfillment_items_fulfillment ON fulfillment_items(fulfillment_id);

-- ============================================================
-- INSTALLATIONS
-- ============================================================
CREATE TABLE installations (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    installation_number     VARCHAR(20) UNIQUE NOT NULL,
    order_id                UUID REFERENCES orders(id) NOT NULL,
    customer_id             UUID REFERENCES customers(id) NOT NULL,
    status                  installation_status DEFAULT 'created',

    -- Site
    site_name               VARCHAR(255),
    site_address            TEXT,
    site_contact_name       VARCHAR(200),
    site_contact_phone      VARCHAR(20),
    site_type               site_type,
    site_notes              TEXT,

    -- Survey
    survey_date             DATE,
    survey_done_by          UUID REFERENCES users(id),
    survey_notes            TEXT,
    site_ready              BOOLEAN,
    site_requirements       TEXT,

    -- Schedule
    scheduled_start         TIMESTAMP WITH TIME ZONE,
    scheduled_end           TIMESTAMP WITH TIME ZONE,
    actual_start            TIMESTAMP WITH TIME ZONE,
    actual_end              TIMESTAMP WITH TIME ZONE,

    -- Team
    team_lead_id            UUID REFERENCES users(id),
    priority                lead_priority DEFAULT 'medium',

    -- Completion
    completion_notes        TEXT,
    customer_sign_off       BOOLEAN DEFAULT false,
    sign_off_date           DATE,
    signed_off_by           VARCHAR(200),

    -- Hold/Cancel
    hold_reason             TEXT,
    cancel_reason           TEXT,

    created_by              UUID REFERENCES users(id) NOT NULL,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_installations_status ON installations(status);
CREATE INDEX idx_installations_order_id ON installations(order_id);
CREATE INDEX idx_installations_customer_id ON installations(customer_id);
CREATE INDEX idx_installations_scheduled ON installations(scheduled_start);

-- ============================================================
-- INSTALLATION TEAM MEMBERS
-- ============================================================
CREATE TABLE installation_team_members (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    installation_id     UUID REFERENCES installations(id) ON DELETE CASCADE NOT NULL,
    user_id             UUID REFERENCES users(id) NOT NULL,
    role                VARCHAR(50) NOT NULL, -- 'team_lead', 'installer', 'helper', 'supervisor'
    assigned_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    removed_at          TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inst_team_installation ON installation_team_members(installation_id);

-- ============================================================
-- INSTALLATION TASKS
-- ============================================================
CREATE TABLE installation_tasks (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    installation_id     UUID REFERENCES installations(id) ON DELETE CASCADE NOT NULL,
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    status              task_status DEFAULT 'pending',
    is_mandatory        BOOLEAN DEFAULT true,
    assigned_to         UUID REFERENCES users(id),
    due_date            DATE,
    completed_at        TIMESTAMP WITH TIME ZONE,
    completed_by        UUID REFERENCES users(id),
    sort_order          INTEGER DEFAULT 0,
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inst_tasks_installation ON installation_tasks(installation_id);
CREATE INDEX idx_inst_tasks_status ON installation_tasks(status);

-- ============================================================
-- INSTALLATION ISSUES
-- ============================================================
CREATE TABLE installation_issues (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    installation_id     UUID REFERENCES installations(id) ON DELETE CASCADE NOT NULL,
    issue_number        VARCHAR(20) UNIQUE NOT NULL,
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    severity            issue_severity DEFAULT 'medium',
    status              issue_status DEFAULT 'open',
    reported_by         UUID REFERENCES users(id),
    assigned_to         UUID REFERENCES users(id),
    resolution          TEXT,
    resolved_at         TIMESTAMP WITH TIME ZONE,
    resolved_by         UUID REFERENCES users(id),
    escalated_to        UUID REFERENCES users(id),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inst_issues_installation ON installation_issues(installation_id);
CREATE INDEX idx_inst_issues_status ON installation_issues(status);

-- ============================================================
-- INSTALLATION MATERIALS
-- ============================================================
CREATE TABLE installation_materials (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    installation_id     UUID REFERENCES installations(id) ON DELETE CASCADE NOT NULL,
    product_id          UUID REFERENCES products(id) NOT NULL,
    quantity_planned    INTEGER DEFAULT 0,
    quantity_used       INTEGER DEFAULT 0,
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inst_materials_installation ON installation_materials(installation_id);
```

### Phase 3 Tables

```sql
-- ============================================================
-- PHASE 3 ENUMS
-- ============================================================
CREATE TYPE amc_contract_type AS ENUM (
    'comprehensive', 'non_comprehensive', 'preventive_only', 'on_call'
);

CREATE TYPE amc_status AS ENUM (
    'draft', 'active', 'expiring_soon', 'expired', 'renewed', 'cancelled'
);

CREATE TYPE visit_frequency AS ENUM (
    'monthly', 'quarterly', 'half_yearly', 'yearly', 'on_demand'
);

CREATE TYPE amc_visit_status AS ENUM (
    'scheduled', 'completed', 'missed', 'rescheduled', 'cancelled'
);

CREATE TYPE ticket_type AS ENUM (
    'complaint', 'preventive_maintenance', 'breakdown',
    'installation_issue', 'general_inquiry'
);

CREATE TYPE ticket_category AS ENUM (
    'product_defect', 'performance_issue', 'noise', 'filter_replacement',
    'electrical', 'physical_damage', 'software', 'other'
);

CREATE TYPE ticket_status AS ENUM (
    'open', 'assigned', 'in_progress', 'awaiting_parts',
    'resolved', 'closed', 'reopened', 'escalated'
);

CREATE TYPE service_visit_status AS ENUM (
    'scheduled', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE visit_outcome AS ENUM (
    'resolved', 'partially_resolved', 'requires_followup',
    'requires_parts', 'cannot_resolve'
);

-- ============================================================
-- AMC CONTRACTS
-- ============================================================
CREATE TABLE amc_contracts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amc_number          VARCHAR(20) UNIQUE NOT NULL,
    customer_id         UUID REFERENCES customers(id) NOT NULL,
    installation_id     UUID REFERENCES installations(id),
    order_id            UUID REFERENCES orders(id),
    contract_type       amc_contract_type NOT NULL,
    status              amc_status DEFAULT 'draft',
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    renewal_date        DATE,
    covered_products    JSONB,
    includes_parts      BOOLEAN DEFAULT false,
    includes_labor      BOOLEAN DEFAULT true,
    visit_frequency     visit_frequency,
    max_visits_per_year INTEGER,
    visits_used         INTEGER DEFAULT 0,
    contract_value      DECIMAL(12, 2),
    payment_terms       VARCHAR(50),
    payment_status      payment_status DEFAULT 'pending',
    terms_and_conditions TEXT,
    special_conditions  TEXT,
    exclusions          TEXT,
    previous_amc_id     UUID REFERENCES amc_contracts(id),
    renewed_to_amc_id   UUID REFERENCES amc_contracts(id),
    cancellation_reason TEXT,
    assigned_to         UUID REFERENCES users(id),
    created_by          UUID REFERENCES users(id) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_amc_status ON amc_contracts(status);
CREATE INDEX idx_amc_customer ON amc_contracts(customer_id);
CREATE INDEX idx_amc_end_date ON amc_contracts(end_date);

-- ============================================================
-- AMC SCHEDULED VISITS
-- ============================================================
CREATE TABLE amc_scheduled_visits (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amc_id              UUID REFERENCES amc_contracts(id) ON DELETE CASCADE NOT NULL,
    visit_number        INTEGER NOT NULL,
    scheduled_date      DATE NOT NULL,
    status              amc_visit_status DEFAULT 'scheduled',
    service_ticket_id   UUID, -- FK added after service_tickets
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_amc_visits_amc ON amc_scheduled_visits(amc_id);
CREATE INDEX idx_amc_visits_date ON amc_scheduled_visits(scheduled_date);

-- ============================================================
-- SERVICE TICKETS
-- ============================================================
CREATE TABLE service_tickets (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number       VARCHAR(20) UNIQUE NOT NULL,
    customer_id         UUID REFERENCES customers(id) NOT NULL,
    installation_id     UUID REFERENCES installations(id),
    amc_id              UUID REFERENCES amc_contracts(id),
    order_id            UUID REFERENCES orders(id),
    ticket_type         ticket_type NOT NULL,
    category            ticket_category,
    subject             VARCHAR(255) NOT NULL,
    description         TEXT,
    severity            issue_severity DEFAULT 'medium',
    priority            lead_priority DEFAULT 'medium',
    status              ticket_status DEFAULT 'open',
    reported_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_response_at   TIMESTAMP WITH TIME ZONE,
    resolution_at       TIMESTAMP WITH TIME ZONE,
    closed_at           TIMESTAMP WITH TIME ZONE,
    sla_response_hours  INTEGER,
    sla_resolution_hours INTEGER,
    sla_breached        BOOLEAN DEFAULT false,
    assigned_to         UUID REFERENCES users(id),
    escalated_to        UUID REFERENCES users(id),
    escalation_reason   TEXT,
    is_under_amc        BOOLEAN DEFAULT false,
    is_under_warranty   BOOLEAN DEFAULT false,
    is_chargeable       BOOLEAN DEFAULT false,
    estimated_cost      DECIMAL(12, 2),
    diagnosis           TEXT,
    resolution_summary  TEXT,
    root_cause          TEXT,
    parts_replaced      JSONB,
    customer_rating     INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_feedback   TEXT,
    reported_by         UUID REFERENCES users(id),
    created_by          UUID REFERENCES users(id) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add FK from amc_scheduled_visits to service_tickets
ALTER TABLE amc_scheduled_visits ADD CONSTRAINT fk_amc_visit_ticket
    FOREIGN KEY (service_ticket_id) REFERENCES service_tickets(id);

CREATE INDEX idx_tickets_status ON service_tickets(status);
CREATE INDEX idx_tickets_customer ON service_tickets(customer_id);
CREATE INDEX idx_tickets_assigned ON service_tickets(assigned_to);
CREATE INDEX idx_tickets_severity ON service_tickets(severity);
CREATE INDEX idx_tickets_sla_breached ON service_tickets(sla_breached);

-- ============================================================
-- SERVICE VISITS
-- ============================================================
CREATE TABLE service_visits (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id           UUID REFERENCES service_tickets(id) ON DELETE CASCADE NOT NULL,
    visit_number        INTEGER NOT NULL,
    engineer_id         UUID REFERENCES users(id),
    visit_date          DATE,
    visit_start_time    TIMESTAMP WITH TIME ZONE,
    visit_end_time      TIMESTAMP WITH TIME ZONE,
    travel_time_minutes INTEGER,
    observations        TEXT,
    work_performed      TEXT,
    parts_used          JSONB,
    parts_cost          DECIMAL(12, 2) DEFAULT 0,
    labor_cost          DECIMAL(12, 2) DEFAULT 0,
    status              service_visit_status DEFAULT 'scheduled',
    outcome             visit_outcome,
    follow_up_required  BOOLEAN DEFAULT false,
    follow_up_notes     TEXT,
    customer_present    BOOLEAN,
    customer_sign_name  VARCHAR(200),
    customer_feedback   TEXT,
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_service_visits_ticket ON service_visits(ticket_id);
CREATE INDEX idx_service_visits_engineer ON service_visits(engineer_id);

-- ============================================================
-- SERVICE PARTS USAGE
-- ============================================================
CREATE TABLE service_parts_usage (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_visit_id    UUID REFERENCES service_visits(id) ON DELETE CASCADE NOT NULL,
    product_id          UUID REFERENCES products(id) NOT NULL,
    quantity            INTEGER NOT NULL DEFAULT 1,
    unit_cost           DECIMAL(12, 2),
    total_cost          DECIMAL(12, 2),
    serial_number       VARCHAR(100),
    is_warranty_claim   BOOLEAN DEFAULT false,
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_parts_usage_visit ON service_parts_usage(service_visit_id);
```

### Phase 4 Tables

```sql
-- ============================================================
-- PHASE 4 ENUMS
-- ============================================================
CREATE TYPE invoice_type AS ENUM ('proforma', 'tax_invoice', 'credit_note');

CREATE TYPE invoice_status AS ENUM (
    'draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void', 'cancelled'
);

CREATE TYPE invoice_reference_type AS ENUM ('order', 'amc', 'service');

CREATE TYPE payment_type AS ENUM ('incoming', 'refund');

CREATE TYPE payment_method AS ENUM (
    'cash', 'upi', 'bank_transfer', 'cheque', 'card', 'online', 'other'
);

CREATE TYPE payment_record_status AS ENUM ('pending', 'confirmed', 'failed', 'reversed');

CREATE TYPE expense_category AS ENUM (
    'travel', 'materials', 'tools', 'fuel', 'food',
    'accommodation', 'communication', 'office', 'other'
);

CREATE TYPE expense_status AS ENUM ('submitted', 'approved', 'rejected', 'reimbursed');

CREATE TYPE expense_reference_type AS ENUM ('order', 'installation', 'service_ticket', 'general');

-- ============================================================
-- COMPANY SETTINGS
-- ============================================================
CREATE TABLE company_settings (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name            VARCHAR(255),
    company_address         TEXT,
    company_phone           VARCHAR(20),
    company_email           VARCHAR(255),
    company_website         VARCHAR(255),
    company_gst             VARCHAR(20),
    company_pan             VARCHAR(20),
    company_state           VARCHAR(100),
    company_state_code      VARCHAR(5),
    company_logo_url        VARCHAR(500),
    bank_name               VARCHAR(255),
    bank_account_number     VARCHAR(50),
    bank_ifsc               VARCHAR(20),
    bank_branch             VARCHAR(255),
    invoice_prefix          VARCHAR(10) DEFAULT 'INV',
    invoice_terms           TEXT,
    invoice_notes           TEXT,
    financial_year_start    INTEGER DEFAULT 4, -- April
    updated_by              UUID REFERENCES users(id),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE invoices (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number      VARCHAR(20) UNIQUE NOT NULL,
    invoice_type        invoice_type NOT NULL,
    status              invoice_status DEFAULT 'draft',
    order_id            UUID REFERENCES orders(id),
    amc_id              UUID REFERENCES amc_contracts(id),
    service_ticket_id   UUID REFERENCES service_tickets(id),
    reference_type      invoice_reference_type,
    customer_id         UUID REFERENCES customers(id) NOT NULL,
    billing_name        VARCHAR(255),
    billing_address     TEXT,
    billing_gst         VARCHAR(20),
    billing_state       VARCHAR(100),
    company_name        VARCHAR(255),
    company_address     TEXT,
    company_gst         VARCHAR(20),
    company_state       VARCHAR(100),
    company_pan         VARCHAR(20),
    invoice_date        DATE NOT NULL,
    due_date            DATE NOT NULL,
    sent_at             TIMESTAMP WITH TIME ZONE,
    subtotal            DECIMAL(12, 2) DEFAULT 0,
    discount_amount     DECIMAL(12, 2) DEFAULT 0,
    taxable_amount      DECIMAL(12, 2) DEFAULT 0,
    cgst_amount         DECIMAL(12, 2) DEFAULT 0,
    sgst_amount         DECIMAL(12, 2) DEFAULT 0,
    igst_amount         DECIMAL(12, 2) DEFAULT 0,
    total_tax           DECIMAL(12, 2) DEFAULT 0,
    total_amount        DECIMAL(12, 2) DEFAULT 0,
    amount_paid         DECIMAL(12, 2) DEFAULT 0,
    balance_due         DECIMAL(12, 2) DEFAULT 0,
    payment_terms       TEXT,
    notes               TEXT,
    terms_and_conditions TEXT,
    bank_details        TEXT,
    original_invoice_id UUID REFERENCES invoices(id),
    credit_reason       TEXT,
    created_by          UUID REFERENCES users(id) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_type ON invoices(invoice_type);

-- ============================================================
-- INVOICE ITEMS
-- ============================================================
CREATE TABLE invoice_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id      UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    product_id      UUID REFERENCES products(id),
    description     VARCHAR(500) NOT NULL,
    hsn_code        VARCHAR(20),
    quantity        DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price      DECIMAL(12, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    taxable_amount  DECIMAL(12, 2),
    gst_percent     DECIMAL(5, 2) DEFAULT 18,
    cgst_percent    DECIMAL(5, 2),
    sgst_percent    DECIMAL(5, 2),
    igst_percent    DECIMAL(5, 2),
    cgst_amount     DECIMAL(12, 2) DEFAULT 0,
    sgst_amount     DECIMAL(12, 2) DEFAULT 0,
    igst_amount     DECIMAL(12, 2) DEFAULT 0,
    total_amount    DECIMAL(12, 2) NOT NULL,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number      VARCHAR(20) UNIQUE NOT NULL,
    invoice_id          UUID REFERENCES invoices(id),
    customer_id         UUID REFERENCES customers(id) NOT NULL,
    payment_type        payment_type DEFAULT 'incoming',
    amount              DECIMAL(12, 2) NOT NULL,
    payment_date        DATE NOT NULL,
    payment_method      payment_method NOT NULL,
    payment_reference   VARCHAR(255),
    bank_name           VARCHAR(255),
    cheque_number       VARCHAR(50),
    cheque_date         DATE,
    transaction_id      VARCHAR(255),
    status              payment_record_status DEFAULT 'pending',
    confirmed_by        UUID REFERENCES users(id),
    confirmed_at        TIMESTAMP WITH TIME ZONE,
    is_advance          BOOLEAN DEFAULT false,
    advance_for         VARCHAR(50),
    advance_reference_id UUID,
    notes               TEXT,
    receipt_url         VARCHAR(500),
    created_by          UUID REFERENCES users(id) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- ============================================================
-- PAYMENT ALLOCATIONS
-- ============================================================
CREATE TABLE payment_allocations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id      UUID REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
    invoice_id      UUID REFERENCES invoices(id) NOT NULL,
    amount          DECIMAL(12, 2) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_alloc_payment ON payment_allocations(payment_id);
CREATE INDEX idx_payment_alloc_invoice ON payment_allocations(invoice_id);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE expenses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number      VARCHAR(20) UNIQUE NOT NULL,
    category            expense_category NOT NULL,
    description         VARCHAR(500) NOT NULL,
    amount              DECIMAL(12, 2) NOT NULL,
    expense_date        DATE NOT NULL,
    vendor_name         VARCHAR(255),
    reference_type      expense_reference_type DEFAULT 'general',
    reference_id        UUID,
    status              expense_status DEFAULT 'submitted',
    submitted_by        UUID REFERENCES users(id) NOT NULL,
    approved_by         UUID REFERENCES users(id),
    approved_at         TIMESTAMP WITH TIME ZONE,
    rejection_reason    TEXT,
    reimbursed_at       TIMESTAMP WITH TIME ZONE,
    receipt_url         VARCHAR(500),
    notes               TEXT,
    created_by          UUID REFERENCES users(id) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_submitted_by ON expenses(submitted_by);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
```

### Phase 5 Tables

```sql
-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) NOT NULL,
    type            VARCHAR(100) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    message         TEXT,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    channel         VARCHAR(20) DEFAULT 'in_app',
    is_read         BOOLEAN DEFAULT false,
    read_at         TIMESTAMP WITH TIME ZONE,
    email_sent      BOOLEAN DEFAULT false,
    email_sent_at   TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE notification_preferences (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES users(id) NOT NULL,
    notification_type   VARCHAR(100) NOT NULL,
    in_app_enabled      BOOLEAN DEFAULT true,
    email_enabled       BOOLEAN DEFAULT true,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    category        VARCHAR(50),
    file_name       VARCHAR(255) NOT NULL,
    file_path       VARCHAR(500) NOT NULL,
    file_size       INTEGER,
    mime_type       VARCHAR(100),
    description     TEXT,
    version         INTEGER DEFAULT 1,
    uploaded_by     UUID REFERENCES users(id) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);

-- ============================================================
-- REPORT TEMPLATES
-- ============================================================
CREATE TABLE report_templates (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(255) NOT NULL,
    report_type         VARCHAR(100) NOT NULL,
    filters             JSONB,
    schedule            VARCHAR(20) DEFAULT 'none',
    schedule_recipients JSONB,
    last_generated_at   TIMESTAMP WITH TIME ZONE,
    created_by          UUID REFERENCES users(id) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Sequence Number Generation

For auto-generated numbers (LD-2026-0001, ORD-2026-0001, etc.):

```sql
CREATE TABLE sequence_counters (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) UNIQUE NOT NULL,  -- 'lead', 'order', 'customer', etc.
    prefix      VARCHAR(10) NOT NULL,          -- 'LD', 'ORD', 'CUS', etc.
    year        INTEGER NOT NULL,
    counter     INTEGER DEFAULT 0,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(entity_type, year)
);

-- Insert initial counters
INSERT INTO sequence_counters (entity_type, prefix, year) VALUES
('lead', 'LD', 2026),
('customer', 'CUS', 2026),
('opportunity', 'OPP', 2026),
('quotation', 'QT', 2026),
('order', 'ORD', 2026),
('installation', 'INS', 2026),
('issue', 'ISS', 2026),
('amc', 'AMC', 2026),
('service_ticket', 'SRV', 2026),
('invoice', 'INV', 2526),  -- Financial year: 2025-26
('payment', 'PAY', 2526),
('expense', 'EXP', 2526);
```

---

## Table Count Summary

| Phase | Tables | New Enums |
|-------|--------|-----------|
| Phase 1 | 10 | 12 |
| Phase 2 | 8 | 6 |
| Phase 3 | 5 | 9 |
| Phase 4 | 7 | 8 |
| Phase 5 | 4 | 0 |
| Utility | 1 (sequences) | 0 |
| **Total** | **35** | **35** |

---

*This schema is designed to be built incrementally. Phase 1 tables first, then add Phase 2 tables without breaking existing ones.*
