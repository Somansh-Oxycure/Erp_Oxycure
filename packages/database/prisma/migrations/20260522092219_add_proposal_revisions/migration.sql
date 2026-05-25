-- AlterTable
ALTER TABLE "proposals" ADD COLUMN     "parent_proposal_id" TEXT,
ADD COLUMN     "revision_number" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "proposals_parent_proposal_id_idx" ON "proposals"("parent_proposal_id");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_parent_proposal_id_fkey" FOREIGN KEY ("parent_proposal_id") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
