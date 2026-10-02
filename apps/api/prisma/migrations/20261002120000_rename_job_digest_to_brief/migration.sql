-- The posting's structured summary is the job brief; "digest" now means only the morning journal entry.
ALTER TABLE "jobs" RENAME COLUMN "digest" TO "brief";

-- Run payloads embed the job's brief for job.apply
UPDATE "pilot_runs"
SET "payload" = ("payload" - 'digest') || jsonb_build_object('brief', "payload" -> 'digest')
WHERE "payload" ? 'digest';
