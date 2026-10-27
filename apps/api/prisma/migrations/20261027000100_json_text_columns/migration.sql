-- JSON kept in TEXT columns becomes jsonb (structured lists) or text[] (string lists). The old
-- reader showed unparseable or non-array text as an empty list, so the conversion does the same.
-- USING cannot hold a subquery, hence the two helpers, dropped at the end.
CREATE FUNCTION "jobpilot_text_to_jsonb_array"(value TEXT) RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  parsed JSONB;
BEGIN
  parsed := value::jsonb;
  IF jsonb_typeof(parsed) = 'array' THEN
    RETURN parsed;
  END IF;
  RETURN '[]'::jsonb;
EXCEPTION WHEN others THEN
  RETURN '[]'::jsonb;
END $$;

CREATE FUNCTION "jobpilot_text_to_text_array"(value TEXT) RETURNS TEXT[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(array_agg(element), ARRAY[]::TEXT[])
  FROM jsonb_array_elements_text("jobpilot_text_to_jsonb_array"(value)) AS element
$$;

ALTER TABLE "upwork_proposals" ALTER COLUMN "screening_answers" DROP DEFAULT,
  ALTER COLUMN "screening_answers" TYPE JSONB USING "jobpilot_text_to_jsonb_array"("screening_answers"),
  ALTER COLUMN "screening_answers" SET DEFAULT '[]';

ALTER TABLE "upwork_profiles" ALTER COLUMN "current_portfolio" DROP DEFAULT,
  ALTER COLUMN "current_portfolio" TYPE JSONB USING "jobpilot_text_to_jsonb_array"("current_portfolio"),
  ALTER COLUMN "current_portfolio" SET DEFAULT '[]',
  ALTER COLUMN "suggested_portfolio" DROP DEFAULT,
  ALTER COLUMN "suggested_portfolio" TYPE JSONB USING "jobpilot_text_to_jsonb_array"("suggested_portfolio"),
  ALTER COLUMN "suggested_portfolio" SET DEFAULT '[]',
  ALTER COLUMN "current_skills" DROP DEFAULT,
  ALTER COLUMN "current_skills" TYPE TEXT[] USING "jobpilot_text_to_text_array"("current_skills"),
  ALTER COLUMN "current_skills" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "suggested_skills" DROP DEFAULT,
  ALTER COLUMN "suggested_skills" TYPE TEXT[] USING "jobpilot_text_to_text_array"("suggested_skills"),
  ALTER COLUMN "suggested_skills" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "users" ALTER COLUMN "preferred_locations" DROP DEFAULT,
  ALTER COLUMN "preferred_locations" TYPE TEXT[] USING "jobpilot_text_to_text_array"("preferred_locations"),
  ALTER COLUMN "preferred_locations" SET DEFAULT ARRAY[]::TEXT[];

DROP FUNCTION "jobpilot_text_to_text_array"(TEXT);
DROP FUNCTION "jobpilot_text_to_jsonb_array"(TEXT);
