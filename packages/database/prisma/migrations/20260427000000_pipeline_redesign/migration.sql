-- Pipeline Redesign Migration
-- Simplifies OpportunityStage enum from 6 stages to 4:
--   prospect, discovery, negotiation, proposal, closed_won, closed_lost
--   → design, proposal, closed_won, closed_lost
-- Stage mapping: prospect/discovery → design, negotiation → proposal

BEGIN;

-- 1. Create replacement enum
CREATE TYPE "OpportunityStage_new" AS ENUM ('design', 'proposal', 'closed_won', 'closed_lost');

-- 2. Drop default to allow column type change
ALTER TABLE "opportunities" ALTER COLUMN "stage" DROP DEFAULT;

-- 3. Convert column to text so we can remap values
ALTER TABLE "opportunities" ALTER COLUMN "stage" TYPE TEXT;

-- 4. Remap old stage values
UPDATE "opportunities" SET "stage" = CASE "stage"
  WHEN 'prospect'    THEN 'design'
  WHEN 'discovery'   THEN 'design'
  WHEN 'negotiation' THEN 'proposal'
  ELSE "stage"
END;

-- 5. Cast column to new enum
ALTER TABLE "opportunities"
  ALTER COLUMN "stage" TYPE "OpportunityStage_new"
  USING "stage"::"OpportunityStage_new";

-- 6. Drop old enum and rename new one
DROP TYPE "OpportunityStage";
ALTER TYPE "OpportunityStage_new" RENAME TO "OpportunityStage";

-- 7. Restore default
ALTER TABLE "opportunities"
  ALTER COLUMN "stage" SET DEFAULT 'design'::"OpportunityStage";

COMMIT;
