-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'salesperson', 'installer', 'service_engineer', 'design_engineer', 'finance');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('sales', 'operations', 'service', 'admin', 'finance', 'design');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('new', 'contacted', 'site_inspection', 'design_review', 'quoted', 'won', 'lost');

-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('direct_enquiry', 'website', 'referral', 'walk_in', 'cold_call', 'social_media', 'exhibition', 'partner', 'other');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('air_purifier', 'moscure', 'industrial_solution', 'hvac', 'other');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('general', 'follow_up', 'meeting', 'call', 'status_change', 'site_inspection', 'design_review');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('pending', 'completed', 'missed', 'rescheduled');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('individual', 'business', 'hospital', 'clinic', 'government', 'other');

-- CreateEnum
CREATE TYPE "DesignSpecStatus" AS ENUM ('requested', 'in_progress', 'completed', 'approved', 'revision_needed');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('created', 'confirmed', 'in_progress', 'completed', 'cancelled', 'on_hold');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "department" "Department" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "customer_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "alternate_phone" TEXT,
    "company_name" TEXT,
    "designation" TEXT,
    "gst_number" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT,
    "customer_type" "CustomerType" NOT NULL DEFAULT 'individual',
    "ticket_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_counters" (
    "id" TEXT NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "reference_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client_location" TEXT,
    "region" TEXT,
    "phone" TEXT NOT NULL,
    "alternate_phone" TEXT,
    "email" TEXT,
    "project_name" TEXT,
    "project_location" TEXT,
    "consultant_name" TEXT,
    "consultant_location" TEXT,
    "architect_name" TEXT,
    "architect_location" TEXT,
    "approve_make" TEXT,
    "product_type" "ProductType",
    "estimated_value" DECIMAL(12,2),
    "requirement_notes" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'new',
    "priority" "Priority" NOT NULL DEFAULT 'medium',
    "source" "TicketSource" NOT NULL DEFAULT 'other',
    "source_detail" TEXT,
    "lost_reason" TEXT,
    "next_follow_up_date" DATE,
    "site_inspection_needed" BOOLEAN NOT NULL DEFAULT false,
    "converted_at" TIMESTAMP(3),
    "converted_by" TEXT,
    "assigned_to" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_notes" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "NoteType" NOT NULL DEFAULT 'general',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_follow_ups" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'pending',
    "outcome" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_specifications" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "status" "DesignSpecStatus" NOT NULL DEFAULT 'requested',
    "product_type" "ProductType" NOT NULL,
    "requirement_summary" TEXT,
    "site_area_sqft" DECIMAL(10,2),
    "site_type" TEXT,
    "site_environment" TEXT,
    "power_availability" TEXT,
    "special_requirements" TEXT,
    "site_inspection_done" BOOLEAN NOT NULL DEFAULT false,
    "site_inspection_date" DATE,
    "site_inspection_by" TEXT,
    "site_inspection_notes" TEXT,
    "site_photos_url" TEXT,
    "recommended_products" JSONB,
    "configuration_notes" TEXT,
    "technical_specs" TEXT,
    "bom_items" JSONB,
    "estimated_cost" DECIMAL(12,2),
    "designed_by" TEXT,
    "reviewed_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "revision_notes" TEXT,
    "quotation_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "customer_id" TEXT NOT NULL,
    "valid_until" DATE,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "QuotationStatus" NOT NULL DEFAULT 'draft',
    "terms_and_conditions" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'draft',
    "valid_until" DATE,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "terms_and_conditions" TEXT,
    "notes" TEXT,
    "next_follow_up_date" DATE,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_follow_ups" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'pending',
    "outcome" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposal_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_items" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "total_price" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "total_price" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "quotation_id" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'created',
    "total_amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "expected_delivery_date" DATE,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_status_history" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL,
    "exited_at" TIMESTAMP(3),
    "duration_ms" BIGINT,
    "changed_by" TEXT NOT NULL,

    CONSTRAINT "ticket_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "changes" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_number_key" ON "customers"("customer_number");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_ticket_id_key" ON "customers"("ticket_id");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_reference_id_key" ON "tickets"("reference_id");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_assigned_to_idx" ON "tickets"("assigned_to");

-- CreateIndex
CREATE INDEX "tickets_priority_idx" ON "tickets"("priority");

-- CreateIndex
CREATE INDEX "tickets_phone_idx" ON "tickets"("phone");

-- CreateIndex
CREATE INDEX "tickets_created_at_idx" ON "tickets"("created_at");

-- CreateIndex
CREATE INDEX "ticket_notes_ticket_id_idx" ON "ticket_notes"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_follow_ups_ticket_id_idx" ON "ticket_follow_ups"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_follow_ups_scheduled_at_idx" ON "ticket_follow_ups"("scheduled_at");

-- CreateIndex
CREATE INDEX "ticket_follow_ups_status_idx" ON "ticket_follow_ups"("status");

-- CreateIndex
CREATE INDEX "design_specifications_ticket_id_idx" ON "design_specifications"("ticket_id");

-- CreateIndex
CREATE INDEX "design_specifications_status_idx" ON "design_specifications"("status");

-- CreateIndex
CREATE INDEX "quotations_customer_id_idx" ON "quotations"("customer_id");

-- CreateIndex
CREATE INDEX "quotations_status_idx" ON "quotations"("status");

-- CreateIndex
CREATE INDEX "proposals_ticket_id_idx" ON "proposals"("ticket_id");

-- CreateIndex
CREATE INDEX "proposals_status_idx" ON "proposals"("status");

-- CreateIndex
CREATE INDEX "proposal_follow_ups_proposal_id_idx" ON "proposal_follow_ups"("proposal_id");

-- CreateIndex
CREATE INDEX "proposal_follow_ups_scheduled_at_idx" ON "proposal_follow_ups"("scheduled_at");

-- CreateIndex
CREATE INDEX "proposal_follow_ups_status_idx" ON "proposal_follow_ups"("status");

-- CreateIndex
CREATE INDEX "proposal_items_proposal_id_idx" ON "proposal_items"("proposal_id");

-- CreateIndex
CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items"("quotation_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "ticket_status_history_ticket_id_idx" ON "ticket_status_history"("ticket_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_converted_by_fkey" FOREIGN KEY ("converted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_notes" ADD CONSTRAINT "ticket_notes_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_notes" ADD CONSTRAINT "ticket_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_follow_ups" ADD CONSTRAINT "ticket_follow_ups_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_follow_ups" ADD CONSTRAINT "ticket_follow_ups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_specifications" ADD CONSTRAINT "design_specifications_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_specifications" ADD CONSTRAINT "design_specifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_specifications" ADD CONSTRAINT "design_specifications_designed_by_fkey" FOREIGN KEY ("designed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_specifications" ADD CONSTRAINT "design_specifications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_specifications" ADD CONSTRAINT "design_specifications_site_inspection_by_fkey" FOREIGN KEY ("site_inspection_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_specifications" ADD CONSTRAINT "design_specifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_specifications" ADD CONSTRAINT "design_specifications_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_follow_ups" ADD CONSTRAINT "proposal_follow_ups_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_follow_ups" ADD CONSTRAINT "proposal_follow_ups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_status_history" ADD CONSTRAINT "ticket_status_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_status_history" ADD CONSTRAINT "ticket_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
