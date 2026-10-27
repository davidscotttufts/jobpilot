-- Job URLs store hiring.cafe as hiringcafe.com, and board strings now fold the same alias, so the
-- catalog row moves to that domain. An agent that already reported hiringcafe.com created a
-- second, unlisted row: merge it into the curated one first.
DO $$
DECLARE
  keep TEXT;
  dup TEXT;
BEGIN
  SELECT "id" INTO keep FROM "job_boards" WHERE "domain" = 'hiring.cafe';
  SELECT "id" INTO dup FROM "job_boards" WHERE "domain" = 'hiringcafe.com';
  IF keep IS NULL THEN
    RETURN;
  END IF;

  IF dup IS NOT NULL THEN
    -- Two saved logins for one board would need a person to pick the right password.
    IF EXISTS (
      SELECT 1 FROM "credentials" a
      JOIN "credentials" b ON b."user_id" = a."user_id"
      WHERE a."job_board_id" = keep AND b."job_board_id" = dup
    ) THEN
      RAISE EXCEPTION 'A user has credentials for both hiring.cafe and hiringcafe.com; merge them by hand first';
    END IF;
    UPDATE "credentials" SET "job_board_id" = keep WHERE "job_board_id" = dup;

    DELETE FROM "user_job_boards" d
    WHERE d."job_board_id" = dup
      AND EXISTS (
        SELECT 1 FROM "user_job_boards" k WHERE k."user_id" = d."user_id" AND k."job_board_id" = keep
      );
    UPDATE "user_job_boards" SET "job_board_id" = keep WHERE "job_board_id" = dup;

    UPDATE "applications" SET "board_id" = keep WHERE "board_id" = dup;
    UPDATE "campaigns" SET "board_id" = keep WHERE "board_id" = dup;
    UPDATE "job_listing_sources" SET "board_id" = keep WHERE "board_id" = dup;
    UPDATE "jobs" SET "board_id" = keep WHERE "board_id" = dup;
    UPDATE "pilot_searches" SET "board_id" = keep WHERE "board_id" = dup;

    UPDATE "pilot_runs" SET "subject_id" = keep WHERE "subject_type" = 'board' AND "subject_id" = dup;
    UPDATE "pilot_questions" SET "subject_id" = keep WHERE "subject_type" = 'board' AND "subject_id" = dup;
    UPDATE "pilot_journal_entries" SET "subject_id" = keep WHERE "subject_type" = 'board' AND "subject_id" = dup;

    DELETE FROM "job_boards" WHERE "id" = dup;
  END IF;

  UPDATE "job_boards"
  SET "domain" = 'hiringcafe.com',
      "search_url" = replace("search_url", 'https://hiring.cafe', 'https://hiringcafe.com')
  WHERE "id" = keep;
END $$;
