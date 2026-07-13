-- The seed-only god role. Postgres allows ADD VALUE inside a transaction (PG12+) only while the new
-- value is not USED in that same transaction, so this migration does nothing else: promotion lives in
-- prisma/seed/superadmin.ts, driven by SUPERADMIN_EMAIL.
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'SUPERADMIN';
