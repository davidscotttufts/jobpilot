-- The agent keys a question only when its answer is a reusable fact
ALTER TABLE "pilot_questions" ADD COLUMN "answer_key" TEXT;

CREATE TABLE "profile_answers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profile_answers_user_id_key_key" ON "profile_answers"("user_id", "key");

ALTER TABLE "profile_answers" ADD CONSTRAINT "profile_answers_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Shared across users, so no user_id
CREATE TABLE "site_hints" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "hint" TEXT NOT NULL,
    "seen_count" INTEGER NOT NULL DEFAULT 1,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_hints_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "site_hints_domain_hint_key" ON "site_hints"("domain", "hint");
CREATE INDEX "site_hints_domain_last_seen_at_idx" ON "site_hints"("domain", "last_seen_at");
