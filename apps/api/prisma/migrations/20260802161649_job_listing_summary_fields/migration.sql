-- Digest fields buildListingDraft used to drop. No backfill: the digests live on per-user `jobs`
-- rows, so reading them here would cross the privacy boundary this table exists to enforce.

-- AlterTable
ALTER TABLE "job_listings" ADD COLUMN     "requirements" TEXT[],
ADD COLUMN     "responsibilities" TEXT[],
ADD COLUMN     "years_experience" INTEGER;
