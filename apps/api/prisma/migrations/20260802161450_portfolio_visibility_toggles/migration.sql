-- Per-item opt-in for the public portfolio. No backfill on purpose: the `false` default is what
-- hides existing users' resume and links until they opt back in, so a `SET true` would undo it.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "show_github" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_linkedin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_resume" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_website" BOOLEAN NOT NULL DEFAULT false;
