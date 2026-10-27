-- Web sessions move from JWT + refresh tokens to opaque rows beside the terminal token.
CREATE TYPE "auth_token_kind" AS ENUM ('session', 'terminal');

ALTER TABLE "api_tokens" RENAME TO "auth_tokens";
ALTER TABLE "auth_tokens" RENAME CONSTRAINT "api_tokens_pkey" TO "auth_tokens_pkey";
ALTER TABLE "auth_tokens" RENAME CONSTRAINT "api_tokens_user_id_fkey" TO "auth_tokens_user_id_fkey";
ALTER INDEX "api_tokens_token_hash_key" RENAME TO "auth_tokens_token_hash_key";
ALTER INDEX "api_tokens_user_id_idx" RENAME TO "auth_tokens_user_id_idx";

-- Only the terminal token was ever minted by the app; any other PAT has no UI and no caller.
DELETE FROM "auth_tokens" WHERE "name" <> 'terminal';

ALTER TABLE "auth_tokens" ADD COLUMN "kind" "auth_token_kind";
UPDATE "auth_tokens" SET "kind" = 'terminal';
ALTER TABLE "auth_tokens" ALTER COLUMN "kind" SET NOT NULL;
ALTER TABLE "auth_tokens" DROP COLUMN "name";

CREATE INDEX "auth_tokens_expires_at_idx" ON "auth_tokens"("expires_at");

DROP TABLE "refresh_tokens";
