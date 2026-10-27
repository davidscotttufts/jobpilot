-- Gmail is the only mailbox integration; the provider columns never held anything else.
ALTER TABLE "email_accounts" DROP COLUMN "provider";

ALTER TABLE "email_oauth_clients" DROP COLUMN "provider";

DROP TYPE "email_provider";
