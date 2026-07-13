-- Rename the enum value in place: RENAME VALUE rewrites the label, so rows already holding it keep
-- their role (no re-grant needed). Unlike ADD VALUE, this is safe to use in the same transaction.
ALTER TYPE "user_role" RENAME VALUE 'SUPERADMIN' TO 'SUPER_ADMIN';
