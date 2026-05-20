-- AlterTable
ALTER TABLE "boq_template_components" ADD COLUMN     "size" TEXT,
ALTER COLUMN "unit" DROP NOT NULL;
