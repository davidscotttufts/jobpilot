-- Applications link to the job they came from by id instead of matching URLs.
ALTER TABLE "applications" ADD COLUMN "job_id" TEXT;

CREATE INDEX "applications_job_id_idx" ON "applications"("job_id");

ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX "jobs_campaign_id_url_idx";
