-- The listing column holds skills for any profession, not just tech. `?tech=` stays as the
-- public query param so existing /jobs links keep working.
ALTER TABLE "job_listings" RENAME COLUMN "tech_stack" TO "skills";
ALTER INDEX "job_listings_tech_stack_idx" RENAME TO "job_listings_skills_idx";
