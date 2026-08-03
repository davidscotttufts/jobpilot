-- Data migration: the digest key `techStack` became `skills` (profession-neutral scoring).
-- `pg_input_is_valid` skips malformed digest rows, which exist by design (the service tolerates them).
UPDATE "jobs"
SET digest = ((digest::jsonb - 'techStack')
              || jsonb_build_object('skills', digest::jsonb -> 'techStack'))::text
WHERE digest IS NOT NULL
  AND pg_input_is_valid(digest, 'jsonb')
  AND jsonb_typeof(digest::jsonb) = 'object'
  AND digest::jsonb ? 'techStack';
