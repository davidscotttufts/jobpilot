-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "verification_token_type" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "CampaignSource" AS ENUM ('search', 'auto-apply', 'apply', 'networking');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('in_progress', 'paused', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "job_listing_status" AS ENUM ('published', 'hidden');

-- CreateEnum
CREATE TYPE "CampaignJobStatus" AS ENUM ('pending', 'approved', 'applying', 'applied', 'failed', 'skipped', 'needs_user');

-- CreateEnum
CREATE TYPE "NetworkingChannel" AS ENUM ('email', 'linkedin');

-- CreateEnum
CREATE TYPE "LinkedinMessageKind" AS ENUM ('inmail', 'connect_note', 'dm');

-- CreateEnum
CREATE TYPE "NetworkingMessageStatus" AS ENUM ('draft', 'approved', 'sent', 'replied', 'bounced', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "ContactEmailSource" AS ENUM ('guessed', 'verified', 'provided');

-- CreateEnum
CREATE TYPE "ContactLinkedinConnection" AS ENUM ('none', 'pending', 'connected');

-- CreateEnum
CREATE TYPE "ContactDiscoverySource" AS ENUM ('google', 'company-site', 'web', 'linkedin', 'manual');

-- CreateEnum
CREATE TYPE "PilotLeaseOutcome" AS ENUM ('done', 'failed', 'abandoned', 'expired');

-- CreateEnum
CREATE TYPE "QuestionKind" AS ENUM ('question', 'choice', '2fa', 'approval');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('open', 'answered', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "PilotJournalKind" AS ENUM ('cycle', 'action', 'observation', 'question', 'system', 'digest', 'correction');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('draft', 'approved', 'declined', 'posted', 'failed', 'skipped', 'expired');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "board" TEXT,
    "source" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "application_status" NOT NULL DEFAULT 'applied',
    "rejected_at" TIMESTAMP(3),
    "match_score" INTEGER,
    "match_reason" TEXT,
    "fail_reason" TEXT,
    "campaign_id" TEXT,
    "normalized_title" TEXT NOT NULL,
    "normalized_company" TEXT NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_events" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "from_status" "application_status",
    "to_status" "application_status",
    "note" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "verification_token_type" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_cipher" TEXT,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "campaign_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "source" "CampaignSource" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'in_progress',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("campaign_id")
);

-- CreateTable
CREATE TABLE "cover_letters" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_url" TEXT,
    "job_title" TEXT,
    "company" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cover_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "api_key" TEXT,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "history_id" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_oauth_clients" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'gmail',
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
    "classification" TEXT,
    "confidence" DOUBLE PRECISION,
    "reasoning" TEXT,
    "matched_app_id" TEXT,
    "match_score" DOUBLE PRECISION,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "applied_status" TEXT,
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
    "email" TEXT,
    "password" TEXT,
    "name" TEXT,
    "search_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
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
    "tech_stack" TEXT[],
    "description_excerpt" TEXT,
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
    "board" TEXT,
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
    "board" TEXT,
    "match_score" INTEGER,
    "match_reason" TEXT,
    "status" "CampaignJobStatus" NOT NULL DEFAULT 'pending',
    "applied_at" TIMESTAMP(3),
    "fail_reason" TEXT,
    "retry_notes" TEXT,
    "skip_reason" TEXT,
    "description" TEXT,
    "digest" TEXT,
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
    "email_source" "ContactEmailSource",
    "email_confidence" DOUBLE PRECISION,
    "linkedin_connection" "ContactLinkedinConnection" NOT NULL DEFAULT 'none',
    "discovery_source" "ContactDiscoverySource",
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
    "channel" "NetworkingChannel" NOT NULL,
    "linkedin_kind" "LinkedinMessageKind",
    "subject" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "status" "NetworkingMessageStatus" NOT NULL DEFAULT 'draft',
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
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "instructions_goals" TEXT NOT NULL DEFAULT '',
    "instructions_config" JSONB NOT NULL DEFAULT '{}',
    "instructions_updated_at" TIMESTAMP(3),
    "agenda_version" TEXT,
    "agenda_generated_at" TIMESTAMP(3),
    "agenda_expires_at" TIMESTAMP(3),
    "agenda_snapshot" JSONB,
    "last_cycle_at" TIMESTAMP(3),
    "cycle_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilot_states_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "pilot_leases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartbeat_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "released_at" TIMESTAMP(3),
    "outcome" "PilotLeaseOutcome",

    CONSTRAINT "pilot_leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "QuestionKind" NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'open',
    "subject_type" TEXT,
    "subject_id" TEXT,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "deep_link" TEXT,
    "answer" TEXT,
    "answered_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilot_journal_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cycle_id" TEXT,
    "kind" "PilotJournalKind" NOT NULL,
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
    "status" "PromotionStatus" NOT NULL DEFAULT 'draft',
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
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "period" TEXT NOT NULL DEFAULT 'yearly',
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
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumed_at" TIMESTAMP(3),

    CONSTRAINT "queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "source_filename" TEXT,
    "source_mime_type" TEXT,
    "source_size_bytes" INTEGER,
    "content" TEXT,
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
    "content" TEXT NOT NULL,
    "diff_notes" TEXT,
    "rewrites" TEXT,
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
    "screening_answers" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "outcome" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
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
    "current_portfolio" TEXT NOT NULL DEFAULT '[]',
    "suggested_title" TEXT,
    "suggested_overview" TEXT,
    "suggested_hourly_rate" TEXT,
    "suggested_portfolio" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'empty',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "upwork_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'USER',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "wrapped_dek" TEXT,
    "username" TEXT NOT NULL,
    "availability" TEXT,
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
    "preferred_locations" TEXT NOT NULL DEFAULT '[]',
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

-- CreateIndex
CREATE INDEX "applications_user_id_idx" ON "applications"("user_id");

-- CreateIndex
CREATE INDEX "applications_normalized_title_normalized_company_idx" ON "applications"("normalized_title", "normalized_company");

-- CreateIndex
CREATE INDEX "applications_applied_at_idx" ON "applications"("applied_at");

-- CreateIndex
CREATE INDEX "applications_campaign_id_idx" ON "applications"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_user_id_url_key" ON "applications"("user_id", "url");

-- CreateIndex
CREATE INDEX "application_events_application_id_created_at_idx" ON "application_events"("application_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_hash_key" ON "verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "verification_tokens_user_id_idx" ON "verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "verification_tokens_expires_at_idx" ON "verification_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_token_hash_key" ON "api_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "api_tokens_user_id_idx" ON "api_tokens"("user_id");

-- CreateIndex
CREATE INDEX "campaigns_user_id_started_at_idx" ON "campaigns"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "campaigns_user_id_status_started_at_idx" ON "campaigns"("user_id", "status", "started_at");

-- CreateIndex
CREATE INDEX "campaigns_user_id_source_started_at_idx" ON "campaigns"("user_id", "source", "started_at");

-- CreateIndex
CREATE INDEX "cover_letters_user_id_created_at_idx" ON "cover_letters"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "credentials_user_id_idx" ON "credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_user_id_scope_key" ON "credentials"("user_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "email_accounts_user_id_key" ON "email_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_oauth_clients_user_id_key" ON "email_oauth_clients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_messages_provider_id_key" ON "email_messages"("provider_id");

-- CreateIndex
CREATE INDEX "email_messages_review_status_received_at_idx" ON "email_messages"("review_status", "received_at");

-- CreateIndex
CREATE INDEX "email_messages_matched_app_id_idx" ON "email_messages"("matched_app_id");

-- CreateIndex
CREATE INDEX "email_messages_from_domain_received_at_idx" ON "email_messages"("from_domain", "received_at");

-- CreateIndex
CREATE INDEX "email_messages_verification_domain_received_at_idx" ON "email_messages"("verification_domain", "received_at");

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
CREATE INDEX "job_listings_tech_stack_idx" ON "job_listings" USING GIN ("tech_stack");

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
CREATE INDEX "job_listing_sources_board_listing_id_idx" ON "job_listing_sources"("board", "listing_id");

-- CreateIndex
CREATE INDEX "jobs_campaign_id_status_idx" ON "jobs"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "jobs_status_updated_at_idx" ON "jobs"("status", "updated_at");

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
CREATE INDEX "pilot_leases_user_id_expires_at_idx" ON "pilot_leases"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "pilot_leases_user_id_subject_type_subject_id_idx" ON "pilot_leases"("user_id", "subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "questions_user_id_status_idx" ON "questions"("user_id", "status");

-- CreateIndex
CREATE INDEX "questions_status_expires_at_idx" ON "questions"("status", "expires_at");

-- CreateIndex
CREATE INDEX "pilot_journal_entries_user_id_created_at_idx" ON "pilot_journal_entries"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "promotion_posts_user_id_status_idx" ON "promotion_posts"("user_id", "status");

-- CreateIndex
CREATE INDEX "references_user_id_idx" ON "references"("user_id");

-- CreateIndex
CREATE INDEX "salary_preferences_user_id_idx" ON "salary_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auto_apply_settings_user_id_key" ON "auto_apply_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "queue_entries_user_id_status_idx" ON "queue_entries"("user_id", "status");

-- CreateIndex
CREATE INDEX "queue_entries_status_idx" ON "queue_entries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "queue_entries_user_id_url_key" ON "queue_entries"("user_id", "url");

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
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_primary_resume_id_key" ON "users"("primary_resume_id");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("campaign_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("campaign_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_related_app_id_fkey" FOREIGN KEY ("related_app_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "networking_messages" ADD CONSTRAINT "networking_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "networking_messages" ADD CONSTRAINT "networking_messages_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "networking_messages" ADD CONSTRAINT "networking_messages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("campaign_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_states" ADD CONSTRAINT "pilot_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_leases" ADD CONSTRAINT "pilot_leases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "users" ADD CONSTRAINT "users_primary_resume_id_fkey" FOREIGN KEY ("primary_resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
