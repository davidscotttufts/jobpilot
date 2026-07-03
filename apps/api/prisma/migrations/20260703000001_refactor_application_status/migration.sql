-- Refactor the ATS "stage" model into a proper `status` enum + a generalized
-- ApplicationEvent activity timeline. Data-preserving: existing stage values are
-- collapsed into the simplified 6-value vocabulary and StageEvent history is
-- copied into application_events. Runs BEFORE pluralize_tables, so it operates on
-- the still-singular table names and drops stage_event before the mass rename.

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn');

-- Application: add the enum `status`, backfill from `stage`, drop `stage` + `outcome`.
ALTER TABLE "application" ADD COLUMN "status" "application_status";

UPDATE "application" SET "status" = (
  CASE "stage"
    WHEN 'applied' THEN 'applied'
    WHEN 'recruiter_screen' THEN 'screening'
    WHEN 'assessment' THEN 'screening'
    WHEN 'hiring_manager_screen' THEN 'screening'
    WHEN 'technical_interview' THEN 'interviewing'
    WHEN 'onsite' THEN 'interviewing'
    WHEN 'offer' THEN 'offer'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'withdrawn' THEN 'withdrawn'
    ELSE 'applied'
  END
)::"application_status";

ALTER TABLE "application" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "application" ALTER COLUMN "status" SET DEFAULT 'applied';
ALTER TABLE "application" DROP COLUMN "stage";
ALTER TABLE "application" DROP COLUMN "outcome";

-- CreateTable (born plural)
CREATE TABLE "application_events" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "from_status" "application_status",
    "to_status" "application_status",
    "note" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_events_application_id_created_at_idx" ON "application_events"("application_id", "created_at");

-- AddForeignKey
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate StageEvent history into application_events (kind=status_change; source
-- inferred from the note prefix the old email-driven path wrote).
INSERT INTO "application_events" ("id", "application_id", "kind", "from_status", "to_status", "note", "source", "created_at")
SELECT
  "id",
  "application_id",
  'status_change',
  (CASE "from_stage"
    WHEN 'applied' THEN 'applied'
    WHEN 'recruiter_screen' THEN 'screening'
    WHEN 'assessment' THEN 'screening'
    WHEN 'hiring_manager_screen' THEN 'screening'
    WHEN 'technical_interview' THEN 'interviewing'
    WHEN 'onsite' THEN 'interviewing'
    WHEN 'offer' THEN 'offer'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'withdrawn' THEN 'withdrawn'
    ELSE NULL
  END)::"application_status",
  (CASE "to_stage"
    WHEN 'applied' THEN 'applied'
    WHEN 'recruiter_screen' THEN 'screening'
    WHEN 'assessment' THEN 'screening'
    WHEN 'hiring_manager_screen' THEN 'screening'
    WHEN 'technical_interview' THEN 'interviewing'
    WHEN 'onsite' THEN 'interviewing'
    WHEN 'offer' THEN 'offer'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'withdrawn' THEN 'withdrawn'
    ELSE 'applied'
  END)::"application_status",
  "note",
  (CASE WHEN "note" LIKE 'From email:%' THEN 'email' ELSE 'manual' END),
  "occurred_at"
FROM "stage_event";

-- DropTable
DROP TABLE "stage_event";

-- EmailMessage: rename applied_stage -> applied_status and remap its values.
ALTER TABLE "email_message" RENAME COLUMN "applied_stage" TO "applied_status";

UPDATE "email_message" SET "applied_status" = (
  CASE "applied_status"
    WHEN 'recruiter_screen' THEN 'screening'
    WHEN 'assessment' THEN 'screening'
    WHEN 'hiring_manager_screen' THEN 'screening'
    WHEN 'technical_interview' THEN 'interviewing'
    WHEN 'onsite' THEN 'interviewing'
    ELSE "applied_status"
  END
) WHERE "applied_status" IS NOT NULL;
