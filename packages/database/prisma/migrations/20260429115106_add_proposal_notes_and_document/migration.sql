/*
  Warnings:

  - You are about to drop the column `notes` on the `proposals` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "proposals" DROP COLUMN "notes",
ADD COLUMN     "document_original_name" TEXT,
ADD COLUMN     "document_url" TEXT;

-- CreateTable
CREATE TABLE "proposal_notes" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proposal_notes_proposal_id_idx" ON "proposal_notes"("proposal_id");

-- AddForeignKey
ALTER TABLE "proposal_notes" ADD CONSTRAINT "proposal_notes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_notes" ADD CONSTRAINT "proposal_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
