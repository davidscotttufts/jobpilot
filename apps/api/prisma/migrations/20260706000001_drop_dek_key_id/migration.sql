-- Drop the never-used DEK key-version column; decryption always uses the single SECRET_MASTER_KEY.
ALTER TABLE "users" DROP COLUMN "dek_key_id";
