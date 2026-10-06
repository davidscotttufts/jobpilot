-- Rename the run outcome enum; a run the host closes without a result is cancelled
ALTER TYPE "pilot_claim_outcome" RENAME TO "pilot_run_outcome";
ALTER TYPE "pilot_run_outcome" RENAME VALUE 'abandoned' TO 'cancelled';

-- Drop the observation journal kind: nothing writes it, and Postgres cannot drop an enum value in place
DELETE FROM "pilot_journal_entries" WHERE "kind" = 'observation';
ALTER TYPE "pilot_journal_kind" RENAME TO "pilot_journal_kind_old";
CREATE TYPE "pilot_journal_kind" AS ENUM ('cycle', 'action', 'question', 'system', 'digest', 'correction');
ALTER TABLE "pilot_journal_entries"
  ALTER COLUMN "kind" TYPE "pilot_journal_kind" USING "kind"::text::"pilot_journal_kind";
DROP TYPE "pilot_journal_kind_old";

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
UPDATE "pilot_runs" SET "task_type" = 'search.setup', "subject_id" = 'setup' WHERE "task_type" = 'strategy.bootstrap';
UPDATE "pilot_runs" SET "task_type" = 'campaign.tune' WHERE "task_type" = 'campaign.strategyReview';
UPDATE "pilot_runs" SET "task_type" = 'promotion.draft' WHERE "task_type" = 'promo.compose';
UPDATE "pilot_runs" SET "task_type" = 'promotion.post' WHERE "task_type" = 'promo.post';
UPDATE "pilot_runs" SET "task_type" = 'board.diagnose' WHERE "task_type" = 'board.health';

-- Renamed payload keys
UPDATE "pilot_runs"
SET "payload" = ("payload" - 'probeJob') || jsonb_build_object('testJob', "payload" -> 'probeJob')
WHERE "payload" ? 'probeJob';

-- Renamed detail type; the server dedupes campaign tunes on it
UPDATE "pilot_journal_entries"
SET "detail" = jsonb_set("detail", '{type}', '"tune"')
WHERE "detail" ->> 'type' = 'strategyReview';

-- The snapshot embeds the old task list shape; drop it so the server rebuilds on the next refresh.
UPDATE "pilot_states"
SET "task_list_version" = NULL,
    "task_list_built_at" = NULL,
    "task_list_expires_at" = NULL,
    "task_list_snapshot" = NULL;

-- The posting's structured summary is the job brief; "digest" now means only the morning journal entry.
ALTER TABLE "jobs" RENAME COLUMN "digest" TO "brief";

-- Run payloads embed the job's brief for job.apply
UPDATE "pilot_runs"
SET "payload" = ("payload" - 'digest') || jsonb_build_object('brief', "payload" -> 'digest')
WHERE "payload" ? 'digest';

-- Token usage the host measures per cycle, attached to the run that cycle started
ALTER TABLE "pilot_runs" ADD COLUMN "model" TEXT,
ADD COLUMN "input_tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "output_tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "cache_read_tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "cache_write_tokens" INTEGER NOT NULL DEFAULT 0;

-- The agent keys a question only when its answer is a reusable fact
ALTER TABLE "pilot_questions" ADD COLUMN "answer_key" TEXT;

CREATE TABLE "profile_answers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profile_answers_user_id_key_key" ON "profile_answers"("user_id", "key");

ALTER TABLE "profile_answers" ADD CONSTRAINT "profile_answers_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Idle checks no longer journal; the state row holds the next wake instead
ALTER TABLE "pilot_states" ADD COLUMN "next_wake_at" TIMESTAMP(3);

UPDATE "pilot_states" AS s
SET "next_wake_at" = latest."created_at" + make_interval(secs => (latest."detail" ->> 'sleepSeconds')::int)
FROM (
  SELECT DISTINCT ON ("user_id") "user_id", "created_at", "detail"
  FROM "pilot_journal_entries"
  WHERE "kind" = 'cycle'
  ORDER BY "user_id", "created_at" DESC, "id" DESC
) AS latest
WHERE latest."user_id" = s."user_id"
  AND jsonb_typeof(latest."detail" -> 'sleepSeconds') = 'number';

DELETE FROM "pilot_journal_entries" WHERE "kind" = 'cycle' AND "detail" ->> 'status' = 'empty';
