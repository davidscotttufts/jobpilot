-- Every account now has an always-public portfolio addressed by a username.

-- Backfill a random username for existing users who never claimed one. md5(id) is
-- deterministic and unique per row, so it never collides with the unique constraint.
UPDATE "users"
SET "username" = 'pilot-' || substr(md5("id"::text), 1, 10)
WHERE "username" IS NULL;

-- Username is required from here on.
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- Portfolios are always public; the opt-in flag is gone.
ALTER TABLE "users" DROP COLUMN "portfolio_published";
