-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "bank_account_number" TEXT,
ADD COLUMN     "bank_branch" TEXT,
ADD COLUMN     "bank_ifsc_code" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "cancelled_cheque_url" TEXT,
ADD COLUMN     "pan" TEXT;
