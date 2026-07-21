-- Per-user sort_order becomes an override: NULL inherits the global board's ordering live.
ALTER TABLE "user_job_boards" ALTER COLUMN "sort_order" DROP NOT NULL,
ALTER COLUMN "sort_order" DROP DEFAULT;

-- Existing values are frozen copies of the global sort order (0 users ever reordered) - drop them.
UPDATE "user_job_boards" SET "sort_order" = NULL;
