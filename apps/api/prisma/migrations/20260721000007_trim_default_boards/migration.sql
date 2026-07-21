-- Only boards with proven agent traction stay default (LinkedIn, Indeed, Hiring Cafe,
-- We Work Remotely); the rest move to the picker. Glassdoor is dropped outright: it is
-- Indeed's inventory behind a login wall. Mirrors src/modules/job-board/default-boards.ts.

DELETE FROM "job_boards" WHERE "domain" = 'glassdoor.com';

UPDATE "job_boards" SET "is_default" = false
WHERE "domain" IN (
  'wellfound.com', 'workatastartup.com', 'welcometothejungle.com',
  'news.ycombinator.com', 'remoteok.com', '4dayweek.io', 'upwork.com'
);

-- Realign global ordering with the trimmed catalog.
UPDATE "job_boards" SET "sort_order" = v.ord FROM (VALUES
  ('linkedin.com', 1), ('indeed.com', 2), ('hiring.cafe', 3), ('weworkremotely.com', 4),
  ('wellfound.com', 5), ('workatastartup.com', 6), ('welcometothejungle.com', 7),
  ('news.ycombinator.com', 8), ('remoteok.com', 9), ('4dayweek.io', 10), ('upwork.com', 11)
) AS v("domain", ord) WHERE "job_boards"."domain" = v."domain";

-- Un-defaulted boards leave the lists of users who never touched them. Links with
-- credentials or overrides survive, as does Upwork for anyone with Upwork activity.
DELETE FROM "user_job_boards" l
USING "job_boards" b
WHERE l."job_board_id" = b."id"
  AND b."is_default" = false
  AND l."email" IS NULL AND l."password" IS NULL
  AND l."name" IS NULL AND l."search_url" IS NULL
  AND (b."domain" <> 'upwork.com' OR (
    NOT EXISTS (SELECT 1 FROM "upwork_proposals" p WHERE p."user_id" = l."user_id")
    AND NOT EXISTS (SELECT 1 FROM "upwork_profiles" pr WHERE pr."user_id" = l."user_id")
  ));
