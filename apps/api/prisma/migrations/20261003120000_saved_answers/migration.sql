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
