-- Rename the run outcome enum
ALTER TYPE "pilot_claim_outcome" RENAME TO "pilot_run_outcome";

-- Rename the observation journal kind
ALTER TYPE "pilot_journal_kind" RENAME VALUE 'observation' TO 'hint';

-- Rename the claims table to runs
ALTER TABLE "pilot_claims" RENAME TO "pilot_runs";

-- Rename PK + FK constraints (RENAME CONSTRAINT also renames the backing pkey index)
ALTER TABLE "pilot_runs" RENAME CONSTRAINT "pilot_claims_pkey" TO "pilot_runs_pkey";
ALTER TABLE "pilot_runs" RENAME CONSTRAINT "pilot_claims_user_id_fkey" TO "pilot_runs_user_id_fkey";

-- Rename columns
ALTER TABLE "pilot_runs" RENAME COLUMN "kind" TO "task_type";
ALTER TABLE "pilot_runs" RENAME COLUMN "granted_at" TO "started_at";
ALTER TABLE "pilot_runs" RENAME COLUMN "released_at" TO "finished_at";

ALTER TABLE "pilot_states" RENAME COLUMN "agenda_version" TO "task_list_version";
ALTER TABLE "pilot_states" RENAME COLUMN "agenda_generated_at" TO "task_list_built_at";
ALTER TABLE "pilot_states" RENAME COLUMN "agenda_expires_at" TO "task_list_expires_at";
ALTER TABLE "pilot_states" RENAME COLUMN "agenda_snapshot" TO "task_list_snapshot";

-- Rename secondary indexes to the names Prisma expects for the new @@map and columns
ALTER INDEX "pilot_claims_user_id_expires_at_idx" RENAME TO "pilot_runs_user_id_expires_at_idx";
ALTER INDEX "pilot_claims_user_id_subject_type_subject_id_idx" RENAME TO "pilot_runs_user_id_subject_type_subject_id_idx";
ALTER INDEX "pilot_claims_released_at_idx" RENAME TO "pilot_runs_finished_at_idx";

-- Renamed task types, so run history keeps damping the same subjects
UPDATE "pilot_runs" SET "task_type" = 'queue.score' WHERE "task_type" = 'queue.drain';
UPDATE "pilot_runs" SET "task_type" = 'strategy.setup', "subject_id" = 'setup' WHERE "task_type" = 'strategy.bootstrap';
UPDATE "pilot_runs" SET "task_type" = 'promotion.draft' WHERE "task_type" = 'promo.compose';
UPDATE "pilot_runs" SET "task_type" = 'promotion.post' WHERE "task_type" = 'promo.post';
UPDATE "pilot_runs" SET "task_type" = 'board.diagnose' WHERE "task_type" = 'board.health';

-- Renamed payload keys
UPDATE "pilot_runs"
SET "payload" = ("payload" - 'probeJob') || jsonb_build_object('testJob', "payload" -> 'probeJob')
WHERE "payload" ? 'probeJob';
UPDATE "pilot_runs"
SET "payload" = ("payload" - 'releaseNote') || jsonb_build_object('finishNote', "payload" -> 'releaseNote')
WHERE "payload" ? 'releaseNote';

-- The snapshot embeds the old task list shape; drop it so the server rebuilds on the next refresh.
UPDATE "pilot_states"
SET "task_list_version" = NULL,
    "task_list_built_at" = NULL,
    "task_list_expires_at" = NULL,
    "task_list_snapshot" = NULL;
