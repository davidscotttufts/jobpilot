-- Board strings become job_boards foreign keys; credential scopes become a kind. The
-- resolver's matching (host, parent domains, bare name + .com) is TypeScript, so
-- scripts/link-boards.ts runs first against the old schema: it creates any missing catalog rows,
-- merges credentials that resolve to the same board, and fills "board_links" (raw string ->
-- job_boards.id). This migration then only joins on it.

-- A fresh database never ran the script and has no rows to link.
CREATE TABLE IF NOT EXISTS "board_links" ("raw" TEXT PRIMARY KEY, "job_board_id" TEXT NOT NULL);

-- Refuse to drop a board string the script did not link: nothing below has run yet.
DO $$
BEGIN
  IF EXISTS (
    SELECT b FROM (
      SELECT "board" AS b FROM "jobs"
      UNION SELECT "board" FROM "applications"
      UNION SELECT "board" FROM "job_listing_sources"
      UNION SELECT "board" FROM "pilot_searches"
      UNION SELECT "config" ->> 'board' FROM "campaigns"
      UNION SELECT "scope" FROM "credentials" WHERE "scope" NOT IN ('default', '2captcha', 'capsolver')
    ) AS raw
    WHERE trim(b) <> '' AND b NOT IN (SELECT "raw" FROM "board_links")
  ) THEN
    RAISE EXCEPTION 'Unlinked board strings: run scripts/link-boards.ts --apply first';
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "credential_kind" AS ENUM ('board', 'default', 'service');

-- CreateEnum
CREATE TYPE "service_provider" AS ENUM ('two_captcha', 'capsolver');

-- Board foreign keys
ALTER TABLE "applications" ADD COLUMN "board_id" TEXT;
ALTER TABLE "campaigns" ADD COLUMN "board_id" TEXT;
ALTER TABLE "job_listing_sources" ADD COLUMN "board_id" TEXT;
ALTER TABLE "jobs" ADD COLUMN "board_id" TEXT;
ALTER TABLE "pilot_searches" ADD COLUMN "board_id" TEXT;

UPDATE "applications" t SET "board_id" = l."job_board_id" FROM "board_links" l WHERE l."raw" = t."board";
UPDATE "job_listing_sources" t SET "board_id" = l."job_board_id" FROM "board_links" l WHERE l."raw" = t."board";
UPDATE "jobs" t SET "board_id" = l."job_board_id" FROM "board_links" l WHERE l."raw" = t."board";
UPDATE "pilot_searches" t SET "board_id" = l."job_board_id" FROM "board_links" l WHERE l."raw" = t."board";
UPDATE "campaigns" t SET "board_id" = l."job_board_id" FROM "board_links" l WHERE l."raw" = t."config" ->> 'board';
UPDATE "campaigns" SET "config" = "config" - 'board' WHERE "config" ? 'board';

-- board.diagnose runs were keyed by the board string; key them by id so the cooldown holds.
UPDATE "pilot_runs" t SET "subject_id" = l."job_board_id" FROM "board_links" l
WHERE t."subject_type" = 'board' AND l."raw" = t."subject_id";
UPDATE "pilot_questions" t SET "subject_id" = l."job_board_id" FROM "board_links" l
WHERE t."subject_type" = 'board' AND l."raw" = t."subject_id";
UPDATE "pilot_journal_entries" t SET "subject_id" = l."job_board_id" FROM "board_links" l
WHERE t."subject_type" = 'board' AND l."raw" = t."subject_id";

DROP INDEX "job_listing_sources_board_listing_id_idx";
ALTER TABLE "applications" DROP COLUMN "board";
ALTER TABLE "job_listing_sources" DROP COLUMN "board";
ALTER TABLE "jobs" DROP COLUMN "board";
ALTER TABLE "pilot_searches" DROP COLUMN "board";

CREATE INDEX "applications_board_id_idx" ON "applications"("board_id");
CREATE INDEX "campaigns_board_id_idx" ON "campaigns"("board_id");
CREATE INDEX "job_listing_sources_board_id_listing_id_idx" ON "job_listing_sources"("board_id", "listing_id");
CREATE INDEX "jobs_board_id_idx" ON "jobs"("board_id");
CREATE INDEX "pilot_searches_board_id_idx" ON "pilot_searches"("board_id");

ALTER TABLE "applications" ADD CONSTRAINT "applications_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "job_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "job_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "job_listing_sources" ADD CONSTRAINT "job_listing_sources_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "job_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "job_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pilot_searches" ADD CONSTRAINT "pilot_searches_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "job_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Credentials: scope -> kind + job_board_id | provider
ALTER TABLE "credentials"
ADD COLUMN "kind" "credential_kind",
ADD COLUMN "job_board_id" TEXT,
ADD COLUMN "provider" "service_provider";

UPDATE "credentials" SET "kind" = 'default' WHERE "scope" = 'default';
UPDATE "credentials" SET "kind" = 'service', "provider" = 'two_captcha' WHERE "scope" = '2captcha';
UPDATE "credentials" SET "kind" = 'service', "provider" = 'capsolver' WHERE "scope" = 'capsolver';
UPDATE "credentials" t SET "kind" = 'board', "job_board_id" = l."job_board_id" FROM "board_links" l
WHERE t."kind" IS NULL AND l."raw" = t."scope";
-- Only an empty scope is left, which never resolved to a login.
DELETE FROM "credentials" WHERE "kind" IS NULL;

DROP INDEX "credentials_user_id_scope_key";
ALTER TABLE "credentials" DROP COLUMN "scope";
ALTER TABLE "credentials" ALTER COLUMN "kind" SET NOT NULL;

CREATE UNIQUE INDEX "credentials_user_id_job_board_id_key" ON "credentials"("user_id", "job_board_id");
CREATE UNIQUE INDEX "credentials_user_id_provider_key" ON "credentials"("user_id", "provider");
-- One default per user; Prisma cannot express a partial unique index.
CREATE UNIQUE INDEX "credentials_user_id_default_key" ON "credentials"("user_id") WHERE "kind" = 'default';

ALTER TABLE "credentials" ADD CONSTRAINT "credentials_job_board_id_fkey" FOREIGN KEY ("job_board_id") REFERENCES "job_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- board.diagnose payloads gained jobBoardId; drop snapshots so the server rebuilds on the next refresh.
UPDATE "pilot_states"
SET "task_list_version" = NULL,
    "task_list_built_at" = NULL,
    "task_list_expires_at" = NULL,
    "task_list_snapshot" = NULL;

DROP TABLE "board_links";
