/*
  Warnings:

  - You are about to drop the `design_specifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "design_specifications" DROP CONSTRAINT "design_specifications_created_by_fkey";

-- DropForeignKey
ALTER TABLE "design_specifications" DROP CONSTRAINT "design_specifications_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "design_specifications" DROP CONSTRAINT "design_specifications_designed_by_fkey";

-- DropForeignKey
ALTER TABLE "design_specifications" DROP CONSTRAINT "design_specifications_quotation_id_fkey";

-- DropForeignKey
ALTER TABLE "design_specifications" DROP CONSTRAINT "design_specifications_reviewed_by_fkey";

-- DropForeignKey
ALTER TABLE "design_specifications" DROP CONSTRAINT "design_specifications_site_inspection_by_fkey";

-- DropForeignKey
ALTER TABLE "design_specifications" DROP CONSTRAINT "design_specifications_ticket_id_fkey";

-- DropTable
DROP TABLE "design_specifications";

-- DropEnum
DROP TYPE "DesignSpecStatus";
