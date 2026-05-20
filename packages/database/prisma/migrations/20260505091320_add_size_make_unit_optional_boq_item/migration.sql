-- AlterTable
ALTER TABLE "boq_items" ADD COLUMN     "size" TEXT,
ALTER COLUMN "unit" DROP NOT NULL;
