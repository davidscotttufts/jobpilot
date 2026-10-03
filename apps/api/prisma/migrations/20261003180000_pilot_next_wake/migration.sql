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
