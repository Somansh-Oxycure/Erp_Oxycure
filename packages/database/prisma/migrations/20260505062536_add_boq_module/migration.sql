-- CreateEnum
CREATE TYPE "BoQStatus" AS ENUM ('draft', 'final', 'archived');

-- CreateTable
CREATE TABLE "boq_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boq_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_template_components" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "default_qty" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "boq_template_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boqs" (
    "id" TEXT NOT NULL,
    "boq_number" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "template_id" TEXT,
    "status" "BoQStatus" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "prepared_by" TEXT NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boq_items" (
    "id" TEXT NOT NULL,
    "boq_id" TEXT NOT NULL,
    "template_component_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "is_included" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "boq_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "boq_templates_code_key" ON "boq_templates"("code");

-- CreateIndex
CREATE INDEX "boq_templates_is_active_idx" ON "boq_templates"("is_active");

-- CreateIndex
CREATE INDEX "boq_template_components_template_id_idx" ON "boq_template_components"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "boqs_boq_number_key" ON "boqs"("boq_number");

-- CreateIndex
CREATE UNIQUE INDEX "boqs_proposal_id_key" ON "boqs"("proposal_id");

-- CreateIndex
CREATE INDEX "boqs_proposal_id_idx" ON "boqs"("proposal_id");

-- CreateIndex
CREATE INDEX "boqs_status_idx" ON "boqs"("status");

-- CreateIndex
CREATE INDEX "boq_items_boq_id_idx" ON "boq_items"("boq_id");

-- AddForeignKey
ALTER TABLE "boq_template_components" ADD CONSTRAINT "boq_template_components_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "boq_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boqs" ADD CONSTRAINT "boqs_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boqs" ADD CONSTRAINT "boqs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "boq_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boqs" ADD CONSTRAINT "boqs_prepared_by_fkey" FOREIGN KEY ("prepared_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_boq_id_fkey" FOREIGN KEY ("boq_id") REFERENCES "boqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_items" ADD CONSTRAINT "boq_items_template_component_id_fkey" FOREIGN KEY ("template_component_id") REFERENCES "boq_template_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;
