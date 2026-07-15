CREATE TABLE "salary_preferences" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "applies_to" TEXT NOT NULL,
    "min_amount" DOUBLE PRECISION,
    "max_amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "period" TEXT NOT NULL DEFAULT 'yearly',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "salary_preferences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "salary_preferences_profile_id_idx" ON "salary_preferences"("profile_id");

ALTER TABLE "salary_preferences" ADD CONSTRAINT "salary_preferences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
