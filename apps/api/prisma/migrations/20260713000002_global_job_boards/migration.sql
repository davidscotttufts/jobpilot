-- Collapse the per-profile board copies into one global catalog + a link table.
-- DESTRUCTIVE: the old rows carried each user's board credentials and they are dropped.
-- `bun run db:seed` repopulates the catalog and re-links every existing profile to the defaults.
DROP TABLE "job_boards";

CREATE TABLE "job_boards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "search_url" TEXT,
    "listed" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_boards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_boards_domain_key" ON "job_boards"("domain");

CREATE TABLE "profile_job_boards" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "job_board_id" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "name" TEXT,
    "search_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_job_boards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profile_job_boards_profile_id_job_board_id_key" ON "profile_job_boards"("profile_id", "job_board_id");

CREATE INDEX "profile_job_boards_profile_id_idx" ON "profile_job_boards"("profile_id");

ALTER TABLE "profile_job_boards" ADD CONSTRAINT "profile_job_boards_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "profile_job_boards" ADD CONSTRAINT "profile_job_boards_job_board_id_fkey" FOREIGN KEY ("job_board_id") REFERENCES "job_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
