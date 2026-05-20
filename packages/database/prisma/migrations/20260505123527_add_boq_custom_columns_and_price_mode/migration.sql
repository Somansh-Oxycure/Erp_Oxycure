-- AlterTable
ALTER TABLE "boq_items" ADD COLUMN     "custom_values" JSONB;

-- AlterTable
ALTER TABLE "boq_products" ADD COLUMN     "fixed_price" DECIMAL(12,2),
ADD COLUMN     "price_mode" TEXT NOT NULL DEFAULT 'component';

-- AlterTable
ALTER TABLE "boqs" ADD COLUMN     "custom_columns" JSONB;
