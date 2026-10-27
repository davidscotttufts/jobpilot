-- Boards users added before domains were normalized kept what they typed ("https://www.jobserve.com/gb",
-- "www.glassdoor.com"). The resolver matches exact bare hosts, so board_ids linked everything to a
-- new clean row and left these as duplicates holding only users' board links. Fold each into its
-- clean twin, or rename it in place when it has none.
DO $$
DECLARE
  legacy RECORD;
  twin TEXT;
BEGIN
  FOR legacy IN
    SELECT "id", "name", "search_url", split_part(
      regexp_replace(regexp_replace(lower(trim("domain")), '^[a-z]+://', ''), '^www\.', ''), '/', 1
    ) AS "clean"
    FROM "job_boards"
    WHERE "domain" <> split_part(
      regexp_replace(regexp_replace(lower(trim("domain")), '^[a-z]+://', ''), '^www\.', ''), '/', 1
    )
    ORDER BY "listed" DESC, "created_at"
  LOOP
    SELECT "id" INTO twin FROM "job_boards" WHERE "domain" = legacy."clean";
    IF twin IS NULL THEN
      UPDATE "job_boards" SET "domain" = legacy."clean" WHERE "id" = legacy."id";
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM "credentials" a JOIN "credentials" b ON b."user_id" = a."user_id"
      WHERE a."job_board_id" = legacy."id" AND b."job_board_id" = twin
    ) THEN
      RAISE EXCEPTION 'A user has logins for both % and its twin; merge them by hand first', legacy."clean";
    END IF;
    UPDATE "credentials" SET "job_board_id" = twin WHERE "job_board_id" = legacy."id";

    DELETE FROM "user_job_boards" d
    WHERE d."job_board_id" = legacy."id"
      AND EXISTS (
        SELECT 1 FROM "user_job_boards" k WHERE k."user_id" = d."user_id" AND k."job_board_id" = twin
      );
    UPDATE "user_job_boards" SET "job_board_id" = twin WHERE "job_board_id" = legacy."id";

    UPDATE "applications" SET "board_id" = twin WHERE "board_id" = legacy."id";
    UPDATE "campaigns" SET "board_id" = twin WHERE "board_id" = legacy."id";
    UPDATE "job_listing_sources" SET "board_id" = twin WHERE "board_id" = legacy."id";
    UPDATE "jobs" SET "board_id" = twin WHERE "board_id" = legacy."id";
    UPDATE "pilot_searches" SET "board_id" = twin WHERE "board_id" = legacy."id";
    UPDATE "pilot_runs" SET "subject_id" = twin WHERE "subject_type" = 'board' AND "subject_id" = legacy."id";
    UPDATE "pilot_questions" SET "subject_id" = twin WHERE "subject_type" = 'board' AND "subject_id" = legacy."id";
    UPDATE "pilot_journal_entries" SET "subject_id" = twin WHERE "subject_type" = 'board' AND "subject_id" = legacy."id";

    DELETE FROM "job_boards" WHERE "id" = legacy."id";
    -- A twin board_ids created is named by its domain; the name a user typed reads better.
    UPDATE "job_boards"
    SET "name" = CASE WHEN legacy."name" ~ '://|^www\.' THEN "name" ELSE legacy."name" END,
        "search_url" = coalesce("search_url", legacy."search_url")
    WHERE "id" = twin AND "name" = "domain" AND NOT "listed";
  END LOOP;
END $$;
