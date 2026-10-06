-- Serves `?sort=newest` and `?posted=`: `where status ORDER BY / filter on first_seen_at`.
CREATE INDEX "job_listings_status_first_seen_at_idx" ON "job_listings"("status", "first_seen_at");
