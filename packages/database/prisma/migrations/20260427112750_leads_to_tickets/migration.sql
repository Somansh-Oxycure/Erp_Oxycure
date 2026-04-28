/*
  Warnings:

  - You are about to drop the column `lead_id` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `lead_id` on the `design_specifications` table. All the data in the column will be lost.
  - You are about to drop the column `lead_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `opportunity_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `lead_id` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `opportunity_id` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the `lead_follow_ups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lead_notes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `leads` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `opportunities` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[ticket_id]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ticket_id` to the `design_specifications` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('new', 'contacted', 'site_inspection', 'design_review', 'quoted', 'won', 'lost');

-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('website', 'referral', 'walk_in', 'cold_call', 'social_media', 'exhibition', 'partner', 'other');

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "design_specifications" DROP CONSTRAINT "design_specifications_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "lead_follow_ups" DROP CONSTRAINT "lead_follow_ups_assigned_to_fkey";

-- DropForeignKey
ALTER TABLE "lead_follow_ups" DROP CONSTRAINT "lead_follow_ups_created_by_fkey";

-- DropForeignKey
ALTER TABLE "lead_follow_ups" DROP CONSTRAINT "lead_follow_ups_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "lead_notes" DROP CONSTRAINT "lead_notes_created_by_fkey";

-- DropForeignKey
ALTER TABLE "lead_notes" DROP CONSTRAINT "lead_notes_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_assigned_to_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_converted_by_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_created_by_fkey";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_assigned_to_fkey";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_created_by_fkey";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_opportunity_id_fkey";

-- DropForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_opportunity_id_fkey";

-- DropIndex
DROP INDEX "customers_lead_id_key";

-- DropIndex
DROP INDEX "design_specifications_lead_id_idx";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "lead_id",
ADD COLUMN     "ticket_id" TEXT;

-- AlterTable
ALTER TABLE "design_specifications" DROP COLUMN "lead_id",
ADD COLUMN     "ticket_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "lead_id",
DROP COLUMN "opportunity_id",
ADD COLUMN     "ticket_id" TEXT;

-- AlterTable
ALTER TABLE "quotations" DROP COLUMN "lead_id",
DROP COLUMN "opportunity_id",
ADD COLUMN     "ticket_id" TEXT;

-- DropTable
DROP TABLE "lead_follow_ups";

-- DropTable
DROP TABLE "lead_notes";

-- DropTable
DROP TABLE "leads";

-- DropTable
DROP TABLE "opportunities";

-- DropEnum
DROP TYPE "LeadSource";

-- DropEnum
DROP TYPE "LeadStatus";

-- DropEnum
DROP TYPE "OpportunityStage";

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");

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
CREATE UNIQUE INDEX "customers_ticket_id_key" ON "customers"("ticket_id");

-- CreateIndex
CREATE INDEX "design_specifications_ticket_id_idx" ON "design_specifications"("ticket_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
