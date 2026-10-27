-- Run payloads are parsed with the task schemas, which gained job.apply's jobTitle and
-- board.diagnose's jobBoardId; backfill the runs stored before them. Each step skips rows that
-- already carry the field.
UPDATE "pilot_runs" r
SET "payload" = jsonb_set(r."payload", '{jobTitle}', to_jsonb(j."title"))
FROM "jobs" j
WHERE r."task_type" = 'job.apply'
  AND NOT (r."payload" ? 'jobTitle')
  AND j."campaign_id" = r."payload" ->> 'campaignId'
  AND j."key" = r."payload" ->> 'jobKey';

-- The job was deleted with its campaign: no title left to recover.
UPDATE "pilot_runs"
SET "payload" = jsonb_set("payload", '{jobTitle}', '""')
WHERE "task_type" = 'job.apply' AND NOT ("payload" ? 'jobTitle');

-- board_ids already rekeyed these runs' subject_id to the board's id.
UPDATE "pilot_runs" r
SET "payload" = jsonb_set(r."payload", '{jobBoardId}', to_jsonb(b."id"))
FROM "job_boards" b
WHERE r."task_type" = 'board.diagnose'
  AND NOT (r."payload" ? 'jobBoardId')
  AND b."id" = r."subject_id";

UPDATE "pilot_runs" r
SET "payload" = jsonb_set(r."payload", '{jobBoardId}', to_jsonb(b."id"))
FROM "job_boards" b
WHERE r."task_type" = 'board.diagnose'
  AND NOT (r."payload" ? 'jobBoardId')
  AND b."domain" = r."payload" ->> 'board';

-- A board string no catalog row matches: keep the old subject so the payload still parses.
UPDATE "pilot_runs"
SET "payload" = jsonb_set("payload", '{jobBoardId}', to_jsonb("subject_id"))
WHERE "task_type" = 'board.diagnose' AND NOT ("payload" ? 'jobBoardId');
