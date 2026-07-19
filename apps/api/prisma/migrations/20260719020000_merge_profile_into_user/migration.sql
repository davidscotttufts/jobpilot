-- Merge the 1:1 Profile into User. Data-preserving: applicant columns are added to
-- "users", backfilled from "profiles", then every child table's profile_id is rewritten
-- to the owning user id and its FK/index objects renamed to the Prisma-canonical
-- <table>_user_id* names so future diffs stay empty. Each child FK is dropped before the
-- profile_id->user_id UPDATE (the new values would violate the FK to profiles) and re-added
-- against "users" afterward. Every child relation was onDelete Cascade in the old schema.

-- 1. Applicant columns on "users" (defaults mirror the old Profile column definitions).
ALTER TABLE "users" ADD COLUMN "first_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "last_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "contact_email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "website" TEXT;
ALTER TABLE "users" ADD COLUMN "linkedin" TEXT;
ALTER TABLE "users" ADD COLUMN "github" TEXT;
ALTER TABLE "users" ADD COLUMN "street" TEXT;
ALTER TABLE "users" ADD COLUMN "apt_unit" TEXT;
ALTER TABLE "users" ADD COLUMN "city" TEXT;
ALTER TABLE "users" ADD COLUMN "state" TEXT;
ALTER TABLE "users" ADD COLUMN "zip_code" TEXT;
ALTER TABLE "users" ADD COLUMN "country" TEXT;
ALTER TABLE "users" ADD COLUMN "us_authorized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "requires_sponsorship" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "visa_status" TEXT;
ALTER TABLE "users" ADD COLUMN "opt_extension" TEXT;
ALTER TABLE "users" ADD COLUMN "willing_to_relocate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "preferred_locations" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "users" ADD COLUMN "eeo_gender" TEXT;
ALTER TABLE "users" ADD COLUMN "eeo_race" TEXT;
ALTER TABLE "users" ADD COLUMN "eeo_ethnicity" TEXT;
ALTER TABLE "users" ADD COLUMN "eeo_hispanic_or_latino" TEXT;
ALTER TABLE "users" ADD COLUMN "eeo_veteran_status" TEXT;
ALTER TABLE "users" ADD COLUMN "eeo_disability_status" TEXT;
ALTER TABLE "users" ADD COLUMN "primary_resume_id" TEXT;

-- 2. Backfill from the owning profile; keep the newer of the two updated_at stamps.
UPDATE "users" u SET
  "first_name" = p."first_name",
  "last_name" = p."last_name",
  "contact_email" = p."email",
  "phone" = p."phone",
  "website" = p."website",
  "linkedin" = p."linkedin",
  "github" = p."github",
  "street" = p."street",
  "apt_unit" = p."apt_unit",
  "city" = p."city",
  "state" = p."state",
  "zip_code" = p."zip_code",
  "country" = p."country",
  "us_authorized" = p."us_authorized",
  "requires_sponsorship" = p."requires_sponsorship",
  "visa_status" = p."visa_status",
  "opt_extension" = p."opt_extension",
  "willing_to_relocate" = p."willing_to_relocate",
  "preferred_locations" = p."preferred_locations",
  "eeo_gender" = p."eeo_gender",
  "eeo_race" = p."eeo_race",
  "eeo_ethnicity" = p."eeo_ethnicity",
  "eeo_hispanic_or_latino" = p."eeo_hispanic_or_latino",
  "eeo_veteran_status" = p."eeo_veteran_status",
  "eeo_disability_status" = p."eeo_disability_status",
  "primary_resume_id" = p."primary_resume_id",
  "updated_at" = GREATEST(u."updated_at", p."updated_at")
FROM "profiles" p
WHERE p."user_id" = u."id";

-- 3. Repoint every child table from profile id to user id.

-- applications
ALTER TABLE "applications" DROP CONSTRAINT "applications_profile_id_fkey";
UPDATE "applications" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "applications" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "applications_profile_id_url_key" RENAME TO "applications_user_id_url_key";
ALTER INDEX "applications_profile_id_idx" RENAME TO "applications_user_id_idx";
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- auto_apply_settings
ALTER TABLE "auto_apply_settings" DROP CONSTRAINT "auto_apply_settings_profile_id_fkey";
UPDATE "auto_apply_settings" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "auto_apply_settings" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "auto_apply_settings_profile_id_key" RENAME TO "auto_apply_settings_user_id_key";
ALTER TABLE "auto_apply_settings" ADD CONSTRAINT "auto_apply_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- campaigns
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_profile_id_fkey";
UPDATE "campaigns" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "campaigns" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "campaigns_profile_id_idx" RENAME TO "campaigns_user_id_idx";
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- contacts
ALTER TABLE "contacts" DROP CONSTRAINT "contacts_profile_id_fkey";
UPDATE "contacts" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "contacts" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "contacts_profile_id_idx" RENAME TO "contacts_user_id_idx";
ALTER INDEX "contacts_profile_id_company_idx" RENAME TO "contacts_user_id_company_idx";
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- cover_letters
ALTER TABLE "cover_letters" DROP CONSTRAINT "cover_letters_profile_id_fkey";
UPDATE "cover_letters" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "cover_letters" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "cover_letters_profile_id_created_at_idx" RENAME TO "cover_letters_user_id_created_at_idx";
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- credentials
ALTER TABLE "credentials" DROP CONSTRAINT "credentials_profile_id_fkey";
UPDATE "credentials" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "credentials" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "credentials_profile_id_scope_key" RENAME TO "credentials_user_id_scope_key";
ALTER INDEX "credentials_profile_id_idx" RENAME TO "credentials_user_id_idx";
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- email_accounts
ALTER TABLE "email_accounts" DROP CONSTRAINT "email_accounts_profile_id_fkey";
UPDATE "email_accounts" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "email_accounts" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "email_accounts_profile_id_key" RENAME TO "email_accounts_user_id_key";
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- email_oauth_clients
ALTER TABLE "email_oauth_clients" DROP CONSTRAINT "email_oauth_clients_profile_id_fkey";
UPDATE "email_oauth_clients" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "email_oauth_clients" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "email_oauth_clients_profile_id_key" RENAME TO "email_oauth_clients_user_id_key";
ALTER TABLE "email_oauth_clients" ADD CONSTRAINT "email_oauth_clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- networking_messages
ALTER TABLE "networking_messages" DROP CONSTRAINT "networking_messages_profile_id_fkey";
UPDATE "networking_messages" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "networking_messages" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "networking_messages_profile_id_idx" RENAME TO "networking_messages_user_id_idx";
ALTER TABLE "networking_messages" ADD CONSTRAINT "networking_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- profile_job_boards -> user_job_boards (table renamed; profile_id column becomes user_id)
ALTER TABLE "profile_job_boards" DROP CONSTRAINT "profile_job_boards_profile_id_fkey";
UPDATE "profile_job_boards" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "profile_job_boards" RENAME COLUMN "profile_id" TO "user_id";
ALTER TABLE "profile_job_boards" RENAME TO "user_job_boards";
ALTER TABLE "user_job_boards" RENAME CONSTRAINT "profile_job_boards_pkey" TO "user_job_boards_pkey";
ALTER INDEX "profile_job_boards_profile_id_job_board_id_key" RENAME TO "user_job_boards_user_id_job_board_id_key";
ALTER INDEX "profile_job_boards_profile_id_idx" RENAME TO "user_job_boards_user_id_idx";
ALTER TABLE "user_job_boards" RENAME CONSTRAINT "profile_job_boards_job_board_id_fkey" TO "user_job_boards_job_board_id_fkey";
ALTER TABLE "user_job_boards" ADD CONSTRAINT "user_job_boards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- queue_entries
ALTER TABLE "queue_entries" DROP CONSTRAINT "queue_entries_profile_id_fkey";
UPDATE "queue_entries" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "queue_entries" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "queue_entries_profile_id_url_key" RENAME TO "queue_entries_user_id_url_key";
ALTER INDEX "queue_entries_profile_id_status_idx" RENAME TO "queue_entries_user_id_status_idx";
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- references
ALTER TABLE "references" DROP CONSTRAINT "references_profile_id_fkey";
UPDATE "references" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "references" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "references_profile_id_idx" RENAME TO "references_user_id_idx";
ALTER TABLE "references" ADD CONSTRAINT "references_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- resumes
ALTER TABLE "resumes" DROP CONSTRAINT "resumes_profile_id_fkey";
UPDATE "resumes" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "resumes" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "resumes_profile_id_idx" RENAME TO "resumes_user_id_idx";
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- salary_preferences
ALTER TABLE "salary_preferences" DROP CONSTRAINT "salary_preferences_profile_id_fkey";
UPDATE "salary_preferences" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "salary_preferences" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "salary_preferences_profile_id_idx" RENAME TO "salary_preferences_user_id_idx";
ALTER TABLE "salary_preferences" ADD CONSTRAINT "salary_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- upwork_proposals
ALTER TABLE "upwork_proposals" DROP CONSTRAINT "upwork_proposals_profile_id_fkey";
UPDATE "upwork_proposals" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "upwork_proposals" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "upwork_proposals_profile_id_idx" RENAME TO "upwork_proposals_user_id_idx";
ALTER INDEX "upwork_proposals_profile_id_status_idx" RENAME TO "upwork_proposals_user_id_status_idx";
ALTER TABLE "upwork_proposals" ADD CONSTRAINT "upwork_proposals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- upwork_profiles
ALTER TABLE "upwork_profiles" DROP CONSTRAINT "upwork_profiles_profile_id_fkey";
UPDATE "upwork_profiles" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "upwork_profiles" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "upwork_profiles_profile_id_key" RENAME TO "upwork_profiles_user_id_key";
ALTER TABLE "upwork_profiles" ADD CONSTRAINT "upwork_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- pilot_states (profile_id is the PK; pkey name pilot_states_pkey is unchanged by the column rename)
ALTER TABLE "pilot_states" DROP CONSTRAINT "pilot_states_profile_id_fkey";
UPDATE "pilot_states" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "pilot_states" RENAME COLUMN "profile_id" TO "user_id";
ALTER TABLE "pilot_states" ADD CONSTRAINT "pilot_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- pilot_leases
ALTER TABLE "pilot_leases" DROP CONSTRAINT "pilot_leases_profile_id_fkey";
UPDATE "pilot_leases" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "pilot_leases" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "pilot_leases_profile_id_expires_at_idx" RENAME TO "pilot_leases_user_id_expires_at_idx";
ALTER TABLE "pilot_leases" ADD CONSTRAINT "pilot_leases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- questions
ALTER TABLE "questions" DROP CONSTRAINT "questions_profile_id_fkey";
UPDATE "questions" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "questions" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "questions_profile_id_status_idx" RENAME TO "questions_user_id_status_idx";
ALTER TABLE "questions" ADD CONSTRAINT "questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- pilot_journal_entries
ALTER TABLE "pilot_journal_entries" DROP CONSTRAINT "pilot_journal_entries_profile_id_fkey";
UPDATE "pilot_journal_entries" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "pilot_journal_entries" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "pilot_journal_entries_profile_id_created_at_idx" RENAME TO "pilot_journal_entries_user_id_created_at_idx";
ALTER TABLE "pilot_journal_entries" ADD CONSTRAINT "pilot_journal_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- promotion_posts
ALTER TABLE "promotion_posts" DROP CONSTRAINT "promotion_posts_profile_id_fkey";
UPDATE "promotion_posts" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "promotion_posts" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "promotion_posts_profile_id_status_idx" RENAME TO "promotion_posts_user_id_status_idx";
ALTER TABLE "promotion_posts" ADD CONSTRAINT "promotion_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- push_subscriptions
ALTER TABLE "push_subscriptions" DROP CONSTRAINT "push_subscriptions_profile_id_fkey";
UPDATE "push_subscriptions" c SET "profile_id" = p."user_id" FROM "profiles" p WHERE c."profile_id" = p."id";
ALTER TABLE "push_subscriptions" RENAME COLUMN "profile_id" TO "user_id";
ALTER INDEX "push_subscriptions_profile_id_idx" RENAME TO "push_subscriptions_user_id_idx";
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Primary-resume back-reference now lives on "users" (nullable, SetNull like before).
CREATE UNIQUE INDEX "users_primary_resume_id_key" ON "users"("primary_resume_id");
ALTER TABLE "users" ADD CONSTRAINT "users_primary_resume_id_fkey" FOREIGN KEY ("primary_resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Profile is fully merged; its table (and its own FK/index objects) is gone.
DROP TABLE "profiles";
