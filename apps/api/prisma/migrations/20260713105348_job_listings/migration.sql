-- CreateEnum
CREATE TYPE "job_listing_status" AS ENUM ('published', 'hidden');

-- CreateTable
CREATE TABLE "job_listings" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "salary" TEXT,
    "employment_type" TEXT,
    "tech_stack" TEXT[],
    "description_excerpt" TEXT,
    "status" "job_listing_status" NOT NULL DEFAULT 'published',
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_listing_sources" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "board" TEXT,
    "url" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_listing_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_listings_slug_key" ON "job_listings"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "job_listings_dedupe_key_key" ON "job_listings"("dedupe_key");

-- CreateIndex
CREATE INDEX "job_listings_status_last_seen_at_idx" ON "job_listings"("status", "last_seen_at");

-- CreateIndex
CREATE INDEX "job_listings_tech_stack_idx" ON "job_listings" USING GIN ("tech_stack");

-- CreateIndex
CREATE UNIQUE INDEX "job_listing_sources_url_key" ON "job_listing_sources"("url");

-- CreateIndex
CREATE INDEX "job_listing_sources_listing_id_idx" ON "job_listing_sources"("listing_id");

-- CreateIndex
CREATE INDEX "job_listing_sources_board_listing_id_idx" ON "job_listing_sources"("board", "listing_id");

-- AddForeignKey
ALTER TABLE "job_listing_sources" ADD CONSTRAINT "job_listing_sources_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "job_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: Prisma cannot express operator classes in the schema.
-- The public `?q=` filter is a leading-wildcard ILIKE, which no btree can serve; without these,
-- every anonymous search seq-scans the whole table (twice - rows + count).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "job_listings_title_trgm_idx" ON "job_listings" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "job_listings_company_trgm_idx" ON "job_listings" USING GIN ("company" gin_trgm_ops);
CREATE INDEX "job_listings_location_trgm_idx" ON "job_listings" USING GIN ("location" gin_trgm_ops);
