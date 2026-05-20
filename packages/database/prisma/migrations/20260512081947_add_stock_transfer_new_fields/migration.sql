/*
  Warnings:

  - You are about to drop the column `custom_values` on the `boq_items` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('active', 'discontinued', 'draft');

-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM ('pcs', 'kg', 'ltr', 'mtr', 'set', 'box', 'roll');

-- CreateEnum
CREATE TYPE "StockTxnType" AS ENUM ('opening', 'grn', 'adjustment_in', 'adjustment_out');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('TRANSFER_OUT', 'TRANSFER_IN');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('draft', 'sent', 'partially_received', 'received', 'cancelled');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "AlertRuleType" AS ENUM ('low_stock', 'reorder', 'expiry', 'overstock');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('open', 'acknowledged', 'resolved');

-- AlterTable
ALTER TABLE "boq_items" DROP COLUMN "custom_values";

-- AlterTable
ALTER TABLE "boq_products" ADD COLUMN     "charges" JSONB,
ADD COLUMN     "custom_values" JSONB;

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parent_id" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category_id" TEXT,
    "sub_category" TEXT,
    "unit_of_measure" "UnitOfMeasure" NOT NULL DEFAULT 'pcs',
    "description" TEXT,
    "image_url" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'active',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_specifications" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "spec_key" TEXT NOT NULL,
    "spec_value" TEXT NOT NULL,
    "spec_unit" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_levels" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "qty_on_hand" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "qty_on_order" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "avg_cost" DECIMAL(10,2),
    "last_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transactions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "txn_type" "StockTxnType" NOT NULL,
    "qty" DECIMAL(10,2) NOT NULL,
    "direction" TEXT NOT NULL,
    "unit_cost" DECIMAL(10,2),
    "reference_id" TEXT,
    "notes" TEXT,
    "performed_by" TEXT NOT NULL,
    "txn_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "lead_time_days" INTEGER NOT NULL DEFAULT 3,
    "notes" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_suppliers" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "supplier_sku" TEXT,
    "unit_price" DECIMAL(10,2),
    "min_order_qty" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "po_number" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'draft',
    "expected_date" DATE,
    "notes" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "po_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "qty_ordered" DECIMAL(10,2) NOT NULL,
    "qty_received" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(10,2),
    "total_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "rule_name" TEXT NOT NULL,
    "rule_type" "AlertRuleType" NOT NULL,
    "product_id" TEXT,
    "category_id" TEXT,
    "threshold_value" DECIMAL(10,2),
    "notify_channels" TEXT[] DEFAULT ARRAY['in_app']::TEXT[],
    "notify_user_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "auto_create_po" BOOLEAN NOT NULL DEFAULT false,
    "escalate_after_hrs" INTEGER NOT NULL DEFAULT 24,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_logs" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alert_message" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'open',
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,

    CONSTRAINT "alert_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "transfer_type" "TransferType" NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
    "transfer_number" TEXT NOT NULL,
    "party_name" TEXT NOT NULL,
    "party_gst_number" TEXT,
    "party_address" TEXT,
    "bill_number" TEXT,
    "bill_date" TIMESTAMP(3),
    "place_of_supply" TEXT,
    "po_number" TEXT,
    "contact_number" TEXT,
    "transporter_name" TEXT,
    "vehicle_number" TEXT,
    "e_way_bill_number" TEXT,
    "shipped_to_name" TEXT,
    "shipped_to_address" TEXT,
    "shipped_to_gst" TEXT,
    "transfer_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "additional_charges" JSONB,
    "created_by" TEXT NOT NULL,
    "confirmed_by" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" TEXT NOT NULL,
    "transfer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "qty_requested" DECIMAL(12,3) NOT NULL,
    "qty_fulfilled" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(12,2),
    "notes" TEXT,
    "qty_on_hand_at_time" DECIMAL(12,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_slug_key" ON "product_categories"("slug");

-- CreateIndex
CREATE INDEX "product_categories_parent_id_idx" ON "product_categories"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_product_code_key" ON "products"("product_code");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_brand_idx" ON "products"("brand");

-- CreateIndex
CREATE INDEX "product_specifications_product_id_idx" ON "product_specifications"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_product_id_key" ON "stock_levels"("product_id");

-- CreateIndex
CREATE INDEX "stock_transactions_product_id_idx" ON "stock_transactions"("product_id");

-- CreateIndex
CREATE INDEX "stock_transactions_txn_type_idx" ON "stock_transactions"("txn_type");

-- CreateIndex
CREATE INDEX "stock_transactions_txn_at_idx" ON "stock_transactions"("txn_at");

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");

-- CreateIndex
CREATE INDEX "product_suppliers_product_id_idx" ON "product_suppliers"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_suppliers_product_id_supplier_id_key" ON "product_suppliers"("product_id", "supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_order_items_po_id_idx" ON "purchase_order_items"("po_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_product_id_idx" ON "purchase_order_items"("product_id");

-- CreateIndex
CREATE INDEX "alert_rules_is_active_idx" ON "alert_rules"("is_active");

-- CreateIndex
CREATE INDEX "alert_logs_product_id_idx" ON "alert_logs"("product_id");

-- CreateIndex
CREATE INDEX "alert_logs_status_idx" ON "alert_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_transfer_number_key" ON "stock_transfers"("transfer_number");

-- CreateIndex
CREATE INDEX "stock_transfers_transfer_type_idx" ON "stock_transfers"("transfer_type");

-- CreateIndex
CREATE INDEX "stock_transfers_status_idx" ON "stock_transfers"("status");

-- CreateIndex
CREATE INDEX "stock_transfers_transfer_date_idx" ON "stock_transfers"("transfer_date");

-- CreateIndex
CREATE INDEX "stock_transfers_created_by_idx" ON "stock_transfers"("created_by");

-- CreateIndex
CREATE INDEX "stock_transfer_items_transfer_id_idx" ON "stock_transfer_items"("transfer_id");

-- CreateIndex
CREATE INDEX "stock_transfer_items_product_id_idx" ON "stock_transfer_items"("product_id");

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_logs" ADD CONSTRAINT "alert_logs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "alert_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_logs" ADD CONSTRAINT "alert_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_logs" ADD CONSTRAINT "alert_logs_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
