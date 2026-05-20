-- Migration: add_boq_products
-- Introduces BoQProduct as an intermediate layer between BoQ and BoQItem,
-- allowing multiple products (from different templates) per BoQ.

-- ─── Step 1: Create boq_products table ──────────────────────────────────────
CREATE TABLE "boq_products" (
    "id"          TEXT NOT NULL,
    "boq_id"      TEXT NOT NULL,
    "template_id" TEXT,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "sort_order"  INTEGER NOT NULL DEFAULT 0,
    "subtotal"    DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boq_products_pkey" PRIMARY KEY ("id")
);

-- ─── Step 2: Migrate existing BoQs — create one product per BoQ ─────────────
-- We use boq.id as the product.id so that boq_items.boq_id maps trivially.
INSERT INTO "boq_products" ("id", "boq_id", "template_id", "name", "sort_order", "subtotal", "created_at")
SELECT
    b.id,
    b.id,
    b.template_id,
    COALESCE(t.name, 'Custom Items'),
    0,
    b.total_amount,
    NOW()
FROM "boqs" b
LEFT JOIN "boq_templates" t ON t.id = b.template_id;

-- ─── Step 3: Add boq_product_id column to boq_items ─────────────────────────
ALTER TABLE "boq_items" ADD COLUMN "boq_product_id" TEXT;

-- ─── Step 4: Fill boq_product_id — maps to the product we just created ──────
-- Since product.id = boq.id (see step 2), boq_items.boq_id is the product id.
UPDATE "boq_items" SET "boq_product_id" = "boq_id";

-- ─── Step 5: Make boq_product_id non-nullable ────────────────────────────────
ALTER TABLE "boq_items" ALTER COLUMN "boq_product_id" SET NOT NULL;

-- ─── Step 6: Drop old FK and boq_id column from boq_items ───────────────────
ALTER TABLE "boq_items" DROP CONSTRAINT "boq_items_boq_id_fkey";
ALTER TABLE "boq_items" DROP COLUMN "boq_id";

-- ─── Step 7: Remove template_id from boqs ───────────────────────────────────
ALTER TABLE "boqs" DROP CONSTRAINT IF EXISTS "boqs_template_id_fkey";
ALTER TABLE "boqs" DROP COLUMN "template_id";

-- ─── Step 8: Add indexes ─────────────────────────────────────────────────────
CREATE INDEX "boq_products_boq_id_idx" ON "boq_products"("boq_id");
CREATE INDEX "boq_items_boq_product_id_idx" ON "boq_items"("boq_product_id");

-- ─── Step 9: Add foreign key constraints ─────────────────────────────────────
ALTER TABLE "boq_products" ADD CONSTRAINT "boq_products_boq_id_fkey"
    FOREIGN KEY ("boq_id") REFERENCES "boqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "boq_products" ADD CONSTRAINT "boq_products_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "boq_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_boq_product_id_fkey"
    FOREIGN KEY ("boq_product_id") REFERENCES "boq_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
