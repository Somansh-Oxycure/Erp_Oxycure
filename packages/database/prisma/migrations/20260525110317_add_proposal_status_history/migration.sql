-- CreateTable
CREATE TABLE "proposal_status_history" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL,
    "exited_at" TIMESTAMP(3),
    "duration_ms" BIGINT,
    "changed_by" TEXT NOT NULL,

    CONSTRAINT "proposal_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proposal_status_history_proposal_id_idx" ON "proposal_status_history"("proposal_id");

-- AddForeignKey
ALTER TABLE "proposal_status_history" ADD CONSTRAINT "proposal_status_history_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_status_history" ADD CONSTRAINT "proposal_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
