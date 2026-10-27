-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "application_source" AS ENUM ('apply', 'auto_apply', 'manual', 'search', 'networking');

-- CreateEnum
CREATE TYPE "application_event_kind" AS ENUM ('status_change', 'note', 'email', 'interview_prep');

-- CreateEnum
CREATE TYPE "application_event_source" AS ENUM ('manual', 'email', 'campaign');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "verification_token_type" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'EMAIL_CHANGE');

-- CreateEnum
CREATE TYPE "oauth_provider" AS ENUM ('google', 'github');

-- CreateEnum
CREATE TYPE "auth_token_kind" AS ENUM ('session', 'terminal');

-- CreateEnum
CREATE TYPE "campaign_source" AS ENUM ('search', 'auto_apply', 'apply', 'networking');

-- CreateEnum
CREATE TYPE "campaign_status" AS ENUM ('in_progress', 'paused', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "campaign_actor" AS ENUM ('user', 'agent', 'pilot');

-- CreateEnum
CREATE TYPE "cover_letter_source" AS ENUM ('apply', 'auto_apply', 'manual');

-- CreateEnum
CREATE TYPE "credential_kind" AS ENUM ('board', 'default', 'service');

-- CreateEnum
CREATE TYPE "service_provider" AS ENUM ('two_captcha', 'capsolver');

-- CreateEnum
CREATE TYPE "email_classification" AS ENUM ('interviewing', 'rejected', 'offer', 'irrelevant', 'verification');

-- CreateEnum
CREATE TYPE "email_review_status" AS ENUM ('pending', 'approved', 'denied', 'auto');

-- CreateEnum
CREATE TYPE "job_listing_status" AS ENUM ('published', 'hidden');

-- CreateEnum
CREATE TYPE "campaign_job_status" AS ENUM ('queued', 'pending', 'approved', 'applying', 'applied', 'failed', 'skipped', 'needs_user');

-- CreateEnum
CREATE TYPE "networking_channel" AS ENUM ('email', 'linkedin');

-- CreateEnum
CREATE TYPE "linkedin_message_kind" AS ENUM ('inmail', 'connect_note', 'dm');

-- CreateEnum
CREATE TYPE "networking_message_status" AS ENUM ('draft', 'approved', 'sent', 'replied', 'bounced', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "contact_email_source" AS ENUM ('guessed', 'verified', 'provided');

-- CreateEnum
CREATE TYPE "contact_linkedin_connection" AS ENUM ('none', 'pending', 'connected');

-- CreateEnum
CREATE TYPE "contact_discovery_source" AS ENUM ('google', 'company_site', 'web', 'linkedin', 'manual');

-- CreateEnum
CREATE TYPE "pilot_run_outcome" AS ENUM ('done', 'failed', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "pilot_question_kind" AS ENUM ('question', 'choice', 'two_factor', 'approval');

-- CreateEnum
CREATE TYPE "pilot_question_status" AS ENUM ('open', 'answered', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "pilot_journal_kind" AS ENUM ('cycle', 'action', 'question', 'system', 'digest', 'correction');

-- CreateEnum
CREATE TYPE "promotion_status" AS ENUM ('draft', 'approved', 'declined', 'posted', 'failed', 'skipped', 'expired');

-- CreateEnum
CREATE TYPE "salary_period" AS ENUM ('yearly', 'monthly', 'hourly');

-- CreateEnum
CREATE TYPE "salary_currency" AS ENUM ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR');

-- CreateEnum
CREATE TYPE "upwork_proposal_status" AS ENUM ('draft', 'submitted', 'closed');

-- CreateEnum
CREATE TYPE "upwork_proposal_outcome" AS ENUM ('hired', 'declined', 'no_response');

-- CreateEnum
CREATE TYPE "upwork_proposal_source" AS ENUM ('manual', 'search');

-- CreateEnum
CREATE TYPE "upwork_profile_status" AS ENUM ('empty', 'draft', 'approved', 'applied');

-- CreateEnum
CREATE TYPE "upwork_inbox_kind" AS ENUM ('invitation', 'offer', 'message');

-- CreateEnum
CREATE TYPE "upwork_inbox_status" AS ENUM ('unread', 'archived');

-- CreateEnum
CREATE TYPE "availability" AS ENUM ('open', 'not_looking');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'USER', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "board_id" TEXT,
    "source" "application_source" NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "application_status" NOT NULL DEFAULT 'applied',
    "rejected_at" TIMESTAMP(3),
    "match_score" INTEGER,
    "match_reason" TEXT,
    "fail_reason" TEXT,
    "campaign_id" TEXT,
    "job_id" TEXT,
    "resume_id" TEXT,
    "resume_variant_id" TEXT,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_events" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "kind" "application_event_kind" NOT NULL,
    "from_status" "application_status",
    "to_status" "application_status",
    "note" TEXT,
    "source" "application_event_source",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "verification_token_type" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "new_email" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "oauth_provider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "auth_token_kind" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_cipher" TEXT,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "source" "campaign_source" NOT NULL,
    "status" "campaign_status" NOT NULL DEFAULT 'in_progress',
    "created_by" "campaign_actor" NOT NULL DEFAULT 'user',
    "status_actor" "campaign_actor",
    "status_reason" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "config" JSONB NOT NULL DEFAULT '{}',
    "board_id" TEXT,
    "pilot_search_id" TEXT,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cover_letters" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "application_id" TEXT,
    "job_url" TEXT,
    "job_title" TEXT,
    "company" TEXT,
    "source" "cover_letter_source" NOT NULL DEFAULT 'manual',
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cover_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "credential_kind" NOT NULL,
    "job_board_id" TEXT,
    "provider" "service_provider",
    "email" TEXT,
    "password" TEXT,
    "api_key" TEXT,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "history_id" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "refresh_failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_oauth_clients" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_oauth_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_messages" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "subject" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "from_name" TEXT,
    "from_domain" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "raw_body" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanned_at" TIMESTAMP(3),
    "classification" "email_classification",
    "confidence" DOUBLE PRECISION,
    "reasoning" TEXT,
    "matched_app_id" TEXT,
    "match_score" DOUBLE PRECISION,
    "review_status" "email_review_status" NOT NULL DEFAULT 'pending',
    "applied_status" "application_status",
    "verification_code" TEXT,
    "verification_link" TEXT,
    "verification_domain" TEXT,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_boards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "search_url" TEXT,
    "listed" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_job_boards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_board_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_job_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_listings" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "salary" TEXT,
    "employment_type" TEXT,
    "skills" TEXT[],
    "description_excerpt" TEXT,
    "requirements" TEXT[],
    "responsibilities" TEXT[],
    "years_experience" INTEGER,
    "status" "job_listing_status" NOT NULL DEFAULT 'published',
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_listing_sources" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "board_id" TEXT,
    "url" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_listing_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "salary" TEXT,
    "type" TEXT,
    "url" TEXT NOT NULL,
    "board_id" TEXT,
    "match_score" INTEGER,
    "match_reason" TEXT,
    "status" "campaign_job_status" NOT NULL DEFAULT 'pending',
    "applied_at" TIMESTAMP(3),
    "fail_reason" TEXT,
    "retry_notes" TEXT,
    "skip_reason" TEXT,
    "description" TEXT,
    "brief" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "linkedin_url" TEXT,
    "email" TEXT,
    "email_source" "contact_email_source",
    "email_confidence" DOUBLE PRECISION,
    "linkedin_connection" "contact_linkedin_connection" NOT NULL DEFAULT 'none',
    "discovery_source" "contact_discovery_source",
    "match_confidence" DOUBLE PRECISION,
    "related_app_id" TEXT,
    "related_job_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "networking_messages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "channel" "networking_channel" NOT NULL,
    "linkedin_kind" "linkedin_message_kind",
    "subject" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "status" "networking_message_status" NOT NULL DEFAULT 'draft',
    "fail_reason" TEXT,
    "provider_id" TEXT,
    "thread_id" TEXT,
    "sent_at" TIMESTAMP(3),
    "replied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "networking_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_states" (
    "user_id" TEXT NOT NULL,
    "running" BOOLEAN NOT NULL DEFAULT false,
    "instructions_goals" TEXT NOT NULL DEFAULT '',
    "instructions_config" JSONB NOT NULL DEFAULT '{}',
    "instructions_updated_at" TIMESTAMP(3),
    "task_list_version" TEXT,
    "task_list_expires_at" TIMESTAMP(3),
    "task_list_snapshot" JSONB,
    "last_cycle_at" TIMESTAMP(3),
    "next_wake_at" TIMESTAMP(3),
    "cycle_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilot_states_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "pilot_searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "board_id" TEXT,
    "resume_id" TEXT,
    "reason" TEXT NOT NULL DEFAULT '',
    "last_run_at" TIMESTAMP(3),
    "last_jobs_seen" INTEGER,
    "last_new_jobs" INTEGER,
    "empty_runs" INTEGER NOT NULL DEFAULT 0,
    "next_run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilot_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_runs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartbeat_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "outcome" "pilot_run_outcome",
    "model" TEXT,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_read_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_write_tokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pilot_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_questions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "pilot_question_kind" NOT NULL,
    "status" "pilot_question_status" NOT NULL DEFAULT 'open',
    "subject_type" TEXT,
    "subject_id" TEXT,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "deep_link" TEXT,
    "answer" TEXT,
    "answer_key" TEXT,
    "answered_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pilot_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_answers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_journal_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cycle_id" TEXT,
    "kind" "pilot_journal_kind" NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "subject_type" TEXT,
    "subject_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pilot_journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_posts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "target" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "status" "promotion_status" NOT NULL DEFAULT 'draft',
    "posted_url" TEXT,
    "scheduled_for" TIMESTAMP(3),
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "references" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "applies_to" TEXT NOT NULL,
    "min_amount" DOUBLE PRECISION,
    "max_amount" DOUBLE PRECISION,
    "currency" "salary_currency" NOT NULL DEFAULT 'USD',
    "period" "salary_period" NOT NULL DEFAULT 'yearly',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "salary_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_apply_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "min_match_score" INTEGER NOT NULL DEFAULT 60,
    "max_applications_per_campaign" INTEGER,
    "default_start_date" TEXT NOT NULL DEFAULT '2 weeks notice',

    CONSTRAINT "auto_apply_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "source_filename" TEXT,
    "source_mime_type" TEXT,
    "source_size_bytes" INTEGER,
    "content" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_variants" (
    "id" TEXT NOT NULL,
    "resume_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "job_url" TEXT,
    "application_id" TEXT,
    "content" JSONB NOT NULL,
    "diff_notes" TEXT,
    "rewrites" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upwork_proposals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "client_name" TEXT,
    "job_url" TEXT,
    "job_description" TEXT,
    "proposal_text" TEXT NOT NULL DEFAULT '',
    "screening_answers" JSONB NOT NULL DEFAULT '[]',
    "status" "upwork_proposal_status" NOT NULL DEFAULT 'draft',
    "outcome" "upwork_proposal_outcome",
    "notes" TEXT,
    "source" "upwork_proposal_source" NOT NULL DEFAULT 'manual',
    "campaign_id" TEXT,
    "job_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "upwork_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upwork_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_title" TEXT,
    "current_overview" TEXT,
    "current_hourly_rate" TEXT,
    "current_portfolio" JSONB NOT NULL DEFAULT '[]',
    "current_skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "suggested_title" TEXT,
    "suggested_overview" TEXT,
    "suggested_hourly_rate" TEXT,
    "suggested_portfolio" JSONB NOT NULL DEFAULT '[]',
    "suggested_skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "upwork_profile_status" NOT NULL DEFAULT 'empty',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "upwork_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upwork_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "connects_balance" INTEGER,
    "last_synced_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upwork_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upwork_inbox_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "upwork_id" TEXT NOT NULL,
    "kind" "upwork_inbox_kind" NOT NULL,
    "title" TEXT NOT NULL,
    "client_name" TEXT,
    "job_url" TEXT,
    "body" TEXT,
    "status" "upwork_inbox_status" NOT NULL DEFAULT 'unread',
    "received_at" TIMESTAMP(3) NOT NULL,
    "raw" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upwork_inbox_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'USER',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "wrapped_dek" TEXT,
    "username" TEXT NOT NULL,
    "availability" "availability",
    "show_resume" BOOLEAN NOT NULL DEFAULT false,
    "show_website" BOOLEAN NOT NULL DEFAULT false,
    "show_linkedin" BOOLEAN NOT NULL DEFAULT false,
    "show_github" BOOLEAN NOT NULL DEFAULT false,
    "first_name" TEXT NOT NULL DEFAULT '',
    "last_name" TEXT NOT NULL DEFAULT '',
    "contact_email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "website" TEXT,
    "linkedin" TEXT,
    "github" TEXT,
    "street" TEXT,
    "apt_unit" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip_code" TEXT,
    "country" TEXT,
    "us_authorized" BOOLEAN NOT NULL DEFAULT false,
    "requires_sponsorship" BOOLEAN NOT NULL DEFAULT false,
    "visa_status" TEXT,
    "opt_extension" TEXT,
    "willing_to_relocate" BOOLEAN NOT NULL DEFAULT false,
    "preferred_locations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "eeo_gender" TEXT,
    "eeo_race" TEXT,
    "eeo_ethnicity" TEXT,
    "eeo_hispanic_or_latino" TEXT,
    "eeo_veteran_status" TEXT,
    "eeo_disability_status" TEXT,
    "primary_resume_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "applications_board_id_idx" ON "applications"("board_id");

-- CreateIndex
CREATE INDEX "applications_user_id_applied_at_idx" ON "applications"("user_id", "applied_at");

-- CreateIndex
CREATE INDEX "applications_applied_at_idx" ON "applications"("applied_at");

-- CreateIndex
CREATE INDEX "applications_campaign_id_idx" ON "applications"("campaign_id");

-- CreateIndex
CREATE INDEX "applications_job_id_idx" ON "applications"("job_id");

-- CreateIndex
CREATE INDEX "applications_resume_id_idx" ON "applications"("resume_id");

-- CreateIndex
CREATE INDEX "applications_resume_variant_id_idx" ON "applications"("resume_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_user_id_url_key" ON "applications"("user_id", "url");

-- CreateIndex
CREATE INDEX "application_events_application_id_created_at_idx" ON "application_events"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "application_events_created_at_idx" ON "application_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_hash_key" ON "verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "verification_tokens_user_id_idx" ON "verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "verification_tokens_expires_at_idx" ON "verification_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_user_id_provider_key" ON "oauth_accounts"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "auth_tokens_user_id_idx" ON "auth_tokens"("user_id");

-- CreateIndex
CREATE INDEX "auth_tokens_expires_at_idx" ON "auth_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "campaigns_user_id_started_at_idx" ON "campaigns"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "campaigns_user_id_status_started_at_idx" ON "campaigns"("user_id", "status", "started_at");

-- CreateIndex
CREATE INDEX "campaigns_user_id_source_started_at_idx" ON "campaigns"("user_id", "source", "started_at");

-- CreateIndex
CREATE INDEX "campaigns_user_id_pilot_search_id_idx" ON "campaigns"("user_id", "pilot_search_id");

-- CreateIndex
CREATE INDEX "campaigns_user_id_updated_at_idx" ON "campaigns"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "campaigns_board_id_idx" ON "campaigns"("board_id");

-- CreateIndex
CREATE INDEX "cover_letters_user_id_created_at_idx" ON "cover_letters"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "cover_letters_application_id_idx" ON "cover_letters"("application_id");

-- CreateIndex
CREATE INDEX "credentials_user_id_idx" ON "credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_user_id_job_board_id_key" ON "credentials"("user_id", "job_board_id");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_user_id_provider_key" ON "credentials"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "email_accounts_user_id_key" ON "email_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_oauth_clients_user_id_key" ON "email_oauth_clients"("user_id");

-- CreateIndex
CREATE INDEX "email_messages_review_status_received_at_idx" ON "email_messages"("review_status", "received_at");

-- CreateIndex
CREATE INDEX "email_messages_matched_app_id_idx" ON "email_messages"("matched_app_id");

-- CreateIndex
CREATE INDEX "email_messages_from_domain_received_at_idx" ON "email_messages"("from_domain", "received_at");

-- CreateIndex
CREATE INDEX "email_messages_verification_domain_received_at_idx" ON "email_messages"("verification_domain", "received_at");

-- CreateIndex
CREATE INDEX "email_messages_received_at_idx" ON "email_messages"("received_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_messages_account_id_provider_id_key" ON "email_messages"("account_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_boards_domain_key" ON "job_boards"("domain");

-- CreateIndex
CREATE INDEX "user_job_boards_user_id_idx" ON "user_job_boards"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_job_boards_user_id_job_board_id_key" ON "user_job_boards"("user_id", "job_board_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_listings_slug_key" ON "job_listings"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "job_listings_dedupe_key_key" ON "job_listings"("dedupe_key");

-- CreateIndex
CREATE INDEX "job_listings_status_last_seen_at_idx" ON "job_listings"("status", "last_seen_at");

-- CreateIndex
CREATE INDEX "job_listings_status_first_seen_at_idx" ON "job_listings"("status", "first_seen_at");

-- CreateIndex
CREATE INDEX "job_listings_skills_idx" ON "job_listings" USING GIN ("skills");

-- CreateIndex
CREATE INDEX "job_listings_title_trgm_idx" ON "job_listings" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "job_listings_company_trgm_idx" ON "job_listings" USING GIN ("company" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "job_listings_location_trgm_idx" ON "job_listings" USING GIN ("location" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "job_listing_sources_url_key" ON "job_listing_sources"("url");

-- CreateIndex
CREATE INDEX "job_listing_sources_listing_id_idx" ON "job_listing_sources"("listing_id");

-- CreateIndex
CREATE INDEX "job_listing_sources_board_id_listing_id_idx" ON "job_listing_sources"("board_id", "listing_id");

-- CreateIndex
CREATE INDEX "jobs_campaign_id_status_idx" ON "jobs"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "jobs_status_updated_at_idx" ON "jobs"("status", "updated_at");

-- CreateIndex
CREATE INDEX "jobs_campaign_id_updated_at_idx" ON "jobs"("campaign_id", "updated_at");

-- CreateIndex
CREATE INDEX "jobs_board_id_idx" ON "jobs"("board_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_campaign_id_key_key" ON "jobs"("campaign_id", "key");

-- CreateIndex
CREATE INDEX "contacts_user_id_idx" ON "contacts"("user_id");

-- CreateIndex
CREATE INDEX "contacts_user_id_company_idx" ON "contacts"("user_id", "company");

-- CreateIndex
CREATE INDEX "networking_messages_user_id_created_at_idx" ON "networking_messages"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "networking_messages_campaign_id_status_idx" ON "networking_messages"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "networking_messages_contact_id_idx" ON "networking_messages"("contact_id");

-- CreateIndex
CREATE INDEX "networking_messages_thread_id_idx" ON "networking_messages"("thread_id");

-- CreateIndex
CREATE INDEX "networking_messages_user_id_status_sent_at_idx" ON "networking_messages"("user_id", "status", "sent_at");

-- CreateIndex
CREATE INDEX "pilot_searches_user_id_next_run_at_idx" ON "pilot_searches"("user_id", "next_run_at");

-- CreateIndex
CREATE INDEX "pilot_searches_board_id_idx" ON "pilot_searches"("board_id");

-- CreateIndex
CREATE INDEX "pilot_runs_user_id_expires_at_idx" ON "pilot_runs"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "pilot_runs_user_id_subject_type_subject_id_idx" ON "pilot_runs"("user_id", "subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "pilot_runs_finished_at_idx" ON "pilot_runs"("finished_at");

-- CreateIndex
CREATE INDEX "pilot_questions_user_id_status_idx" ON "pilot_questions"("user_id", "status");

-- CreateIndex
CREATE INDEX "pilot_questions_status_expires_at_idx" ON "pilot_questions"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "profile_answers_user_id_key_key" ON "profile_answers"("user_id", "key");

-- CreateIndex
CREATE INDEX "pilot_journal_entries_user_id_created_at_idx" ON "pilot_journal_entries"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "pilot_journal_entries_user_id_kind_created_at_idx" ON "pilot_journal_entries"("user_id", "kind", "created_at");

-- CreateIndex
CREATE INDEX "pilot_journal_entries_created_at_idx" ON "pilot_journal_entries"("created_at");

-- CreateIndex
CREATE INDEX "promotion_posts_user_id_status_idx" ON "promotion_posts"("user_id", "status");

-- CreateIndex
CREATE INDEX "promotion_posts_updated_at_idx" ON "promotion_posts"("updated_at");

-- CreateIndex
CREATE INDEX "references_user_id_idx" ON "references"("user_id");

-- CreateIndex
CREATE INDEX "salary_preferences_user_id_idx" ON "salary_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auto_apply_settings_user_id_key" ON "auto_apply_settings"("user_id");

-- CreateIndex
CREATE INDEX "resumes_user_id_idx" ON "resumes"("user_id");

-- CreateIndex
CREATE INDEX "resume_variants_resume_id_idx" ON "resume_variants"("resume_id");

-- CreateIndex
CREATE INDEX "resume_variants_application_id_idx" ON "resume_variants"("application_id");

-- CreateIndex
CREATE INDEX "upwork_proposals_user_id_idx" ON "upwork_proposals"("user_id");

-- CreateIndex
CREATE INDEX "upwork_proposals_user_id_status_idx" ON "upwork_proposals"("user_id", "status");

-- CreateIndex
CREATE INDEX "upwork_proposals_campaign_id_idx" ON "upwork_proposals"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "upwork_profiles_user_id_key" ON "upwork_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "upwork_accounts_user_id_key" ON "upwork_accounts"("user_id");

-- CreateIndex
CREATE INDEX "upwork_inbox_items_user_id_kind_received_at_idx" ON "upwork_inbox_items"("user_id", "kind", "received_at");

-- CreateIndex
CREATE INDEX "upwork_inbox_items_user_id_status_idx" ON "upwork_inbox_items"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "upwork_inbox_items_user_id_upwork_id_key" ON "upwork_inbox_items"("user_id", "upwork_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_primary_resume_id_key" ON "users"("primary_resume_id");

-- CreateIndex
CREATE UNIQUE INDEX "web_push_subscriptions_endpoint_key" ON "web_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "web_push_subscriptions_user_id_idx" ON "web_push_subscriptions"("user_id");

-- Partial unique indexes: Prisma can't model them, so the schema doesn't list them.
-- One default credential per user.
CREATE UNIQUE INDEX "credentials_user_id_default_key" ON "credentials"("user_id") WHERE "kind" = 'default';

-- One unfinished run per subject.
CREATE UNIQUE INDEX "pilot_leases_active_subject_unique" ON "pilot_runs"("user_id", "subject_type", "subject_id") WHERE "finished_at" IS NULL;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "job_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_variant_id_fkey" FOREIGN KEY ("resume_variant_id") REFERENCES "resume_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "job_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_pilot_search_id_fkey" FOREIGN KEY ("pilot_search_id") REFERENCES "pilot_searches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_job_board_id_fkey" FOREIGN KEY ("job_board_id") REFERENCES "job_boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_oauth_clients" ADD CONSTRAINT "email_oauth_clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "email_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_matched_app_id_fkey" FOREIGN KEY ("matched_app_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_job_boards" ADD CONSTRAINT "user_job_boards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_job_boards" ADD CONSTRAINT "user_job_boards_job_board_id_fkey" FOREIGN KEY ("job_board_id") REFERENCES "job_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listing_sources" ADD CONSTRAINT "job_listing_sources_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "job_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listing_sources" ADD CONSTRAINT "job_listing_sources_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "job_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "job_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_related_app_id_fkey" FOREIGN KEY ("related_app_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "networking_messages" ADD CONSTRAINT "networking_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "networking_messages" ADD CONSTRAINT "networking_messages_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "networking_messages" ADD CONSTRAINT "networking_messages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_states" ADD CONSTRAINT "pilot_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_searches" ADD CONSTRAINT "pilot_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_searches" ADD CONSTRAINT "pilot_searches_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "job_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_runs" ADD CONSTRAINT "pilot_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_questions" ADD CONSTRAINT "pilot_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_answers" ADD CONSTRAINT "profile_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_journal_entries" ADD CONSTRAINT "pilot_journal_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_posts" ADD CONSTRAINT "promotion_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "references" ADD CONSTRAINT "references_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_preferences" ADD CONSTRAINT "salary_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_apply_settings" ADD CONSTRAINT "auto_apply_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_variants" ADD CONSTRAINT "resume_variants_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_variants" ADD CONSTRAINT "resume_variants_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upwork_proposals" ADD CONSTRAINT "upwork_proposals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upwork_profiles" ADD CONSTRAINT "upwork_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upwork_accounts" ADD CONSTRAINT "upwork_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upwork_inbox_items" ADD CONSTRAINT "upwork_inbox_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_primary_resume_id_fkey" FOREIGN KEY ("primary_resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_push_subscriptions" ADD CONSTRAINT "web_push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
