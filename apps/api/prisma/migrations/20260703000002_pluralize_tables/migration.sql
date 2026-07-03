-- Pluralize all table names. Data-preserving: ALTER TABLE ... RENAME keeps every
-- row (Postgres tracks FK targets by OID, so FKs auto-follow). Each table's
-- auto-generated pkey / unique-index / index / FK objects are renamed to the new
-- plural prefix so Prisma's deterministic naming matches and future diffs stay
-- empty. Enums (application_status, user_role, verification_token_type) are PG
-- types, not tables, and are left singular. auto_apply_settings is already plural.

-- application -> applications
ALTER TABLE "application" RENAME TO "applications";
ALTER TABLE "applications" RENAME CONSTRAINT "application_pkey" TO "applications_pkey";
ALTER INDEX "application_profile_id_idx" RENAME TO "applications_profile_id_idx";
ALTER INDEX "application_normalized_title_normalized_company_idx" RENAME TO "applications_normalized_title_normalized_company_idx";
ALTER INDEX "application_applied_at_idx" RENAME TO "applications_applied_at_idx";
ALTER INDEX "application_campaign_id_idx" RENAME TO "applications_campaign_id_idx";
ALTER INDEX "application_profile_id_url_key" RENAME TO "applications_profile_id_url_key";
ALTER TABLE "applications" RENAME CONSTRAINT "application_profile_id_fkey" TO "applications_profile_id_fkey";
ALTER TABLE "applications" RENAME CONSTRAINT "application_campaign_id_fkey" TO "applications_campaign_id_fkey";

-- user -> users
ALTER TABLE "user" RENAME TO "users";
ALTER TABLE "users" RENAME CONSTRAINT "user_pkey" TO "users_pkey";
ALTER INDEX "user_email_key" RENAME TO "users_email_key";

-- verification_token -> verification_tokens
ALTER TABLE "verification_token" RENAME TO "verification_tokens";
ALTER TABLE "verification_tokens" RENAME CONSTRAINT "verification_token_pkey" TO "verification_tokens_pkey";
ALTER INDEX "verification_token_token_hash_key" RENAME TO "verification_tokens_token_hash_key";
ALTER INDEX "verification_token_user_id_idx" RENAME TO "verification_tokens_user_id_idx";
ALTER INDEX "verification_token_expires_at_idx" RENAME TO "verification_tokens_expires_at_idx";
ALTER TABLE "verification_tokens" RENAME CONSTRAINT "verification_token_user_id_fkey" TO "verification_tokens_user_id_fkey";

-- refresh_token -> refresh_tokens
ALTER TABLE "refresh_token" RENAME TO "refresh_tokens";
ALTER TABLE "refresh_tokens" RENAME CONSTRAINT "refresh_token_pkey" TO "refresh_tokens_pkey";
ALTER INDEX "refresh_token_token_hash_key" RENAME TO "refresh_tokens_token_hash_key";
ALTER INDEX "refresh_token_user_id_idx" RENAME TO "refresh_tokens_user_id_idx";
ALTER INDEX "refresh_token_expires_at_idx" RENAME TO "refresh_tokens_expires_at_idx";
ALTER TABLE "refresh_tokens" RENAME CONSTRAINT "refresh_token_user_id_fkey" TO "refresh_tokens_user_id_fkey";

-- api_token -> api_tokens
ALTER TABLE "api_token" RENAME TO "api_tokens";
ALTER TABLE "api_tokens" RENAME CONSTRAINT "api_token_pkey" TO "api_tokens_pkey";
ALTER INDEX "api_token_token_hash_key" RENAME TO "api_tokens_token_hash_key";
ALTER INDEX "api_token_user_id_idx" RENAME TO "api_tokens_user_id_idx";
ALTER TABLE "api_tokens" RENAME CONSTRAINT "api_token_user_id_fkey" TO "api_tokens_user_id_fkey";

-- campaign -> campaigns
ALTER TABLE "campaign" RENAME TO "campaigns";
ALTER TABLE "campaigns" RENAME CONSTRAINT "campaign_pkey" TO "campaigns_pkey";
ALTER INDEX "campaign_profile_id_idx" RENAME TO "campaigns_profile_id_idx";
ALTER TABLE "campaigns" RENAME CONSTRAINT "campaign_profile_id_fkey" TO "campaigns_profile_id_fkey";

-- campaign_event -> campaign_events
ALTER TABLE "campaign_event" RENAME TO "campaign_events";
ALTER TABLE "campaign_events" RENAME CONSTRAINT "campaign_event_pkey" TO "campaign_events_pkey";
ALTER INDEX "campaign_event_campaign_id_created_at_idx" RENAME TO "campaign_events_campaign_id_created_at_idx";
ALTER TABLE "campaign_events" RENAME CONSTRAINT "campaign_event_campaign_id_fkey" TO "campaign_events_campaign_id_fkey";

-- cover_letter -> cover_letters
ALTER TABLE "cover_letter" RENAME TO "cover_letters";
ALTER TABLE "cover_letters" RENAME CONSTRAINT "cover_letter_pkey" TO "cover_letters_pkey";
ALTER INDEX "cover_letter_profile_id_created_at_idx" RENAME TO "cover_letters_profile_id_created_at_idx";
ALTER TABLE "cover_letters" RENAME CONSTRAINT "cover_letter_profile_id_fkey" TO "cover_letters_profile_id_fkey";

-- credential -> credentials
ALTER TABLE "credential" RENAME TO "credentials";
ALTER TABLE "credentials" RENAME CONSTRAINT "credential_pkey" TO "credentials_pkey";
ALTER INDEX "credential_profile_id_idx" RENAME TO "credentials_profile_id_idx";
ALTER INDEX "credential_profile_id_scope_key" RENAME TO "credentials_profile_id_scope_key";
ALTER TABLE "credentials" RENAME CONSTRAINT "credential_profile_id_fkey" TO "credentials_profile_id_fkey";

-- email_account -> email_accounts
ALTER TABLE "email_account" RENAME TO "email_accounts";
ALTER TABLE "email_accounts" RENAME CONSTRAINT "email_account_pkey" TO "email_accounts_pkey";
ALTER INDEX "email_account_profile_id_key" RENAME TO "email_accounts_profile_id_key";
ALTER TABLE "email_accounts" RENAME CONSTRAINT "email_account_profile_id_fkey" TO "email_accounts_profile_id_fkey";

-- email_oauth_client -> email_oauth_clients
ALTER TABLE "email_oauth_client" RENAME TO "email_oauth_clients";
ALTER TABLE "email_oauth_clients" RENAME CONSTRAINT "email_oauth_client_pkey" TO "email_oauth_clients_pkey";
ALTER INDEX "email_oauth_client_profile_id_key" RENAME TO "email_oauth_clients_profile_id_key";
ALTER TABLE "email_oauth_clients" RENAME CONSTRAINT "email_oauth_client_profile_id_fkey" TO "email_oauth_clients_profile_id_fkey";

-- email_message -> email_messages
ALTER TABLE "email_message" RENAME TO "email_messages";
ALTER TABLE "email_messages" RENAME CONSTRAINT "email_message_pkey" TO "email_messages_pkey";
ALTER INDEX "email_message_provider_id_key" RENAME TO "email_messages_provider_id_key";
ALTER INDEX "email_message_review_status_received_at_idx" RENAME TO "email_messages_review_status_received_at_idx";
ALTER INDEX "email_message_matched_app_id_idx" RENAME TO "email_messages_matched_app_id_idx";
ALTER INDEX "email_message_from_domain_received_at_idx" RENAME TO "email_messages_from_domain_received_at_idx";
ALTER INDEX "email_message_verification_domain_received_at_idx" RENAME TO "email_messages_verification_domain_received_at_idx";
ALTER TABLE "email_messages" RENAME CONSTRAINT "email_message_account_id_fkey" TO "email_messages_account_id_fkey";
ALTER TABLE "email_messages" RENAME CONSTRAINT "email_message_matched_app_id_fkey" TO "email_messages_matched_app_id_fkey";

-- job_board -> job_boards
ALTER TABLE "job_board" RENAME TO "job_boards";
ALTER TABLE "job_boards" RENAME CONSTRAINT "job_board_pkey" TO "job_boards_pkey";
ALTER INDEX "job_board_profile_id_idx" RENAME TO "job_boards_profile_id_idx";
ALTER INDEX "job_board_profile_id_domain_key" RENAME TO "job_boards_profile_id_domain_key";
ALTER TABLE "job_boards" RENAME CONSTRAINT "job_board_profile_id_fkey" TO "job_boards_profile_id_fkey";

-- job -> jobs
ALTER TABLE "job" RENAME TO "jobs";
ALTER TABLE "jobs" RENAME CONSTRAINT "job_pkey" TO "jobs_pkey";
ALTER INDEX "job_campaign_id_status_idx" RENAME TO "jobs_campaign_id_status_idx";
ALTER INDEX "job_campaign_id_key_key" RENAME TO "jobs_campaign_id_key_key";
ALTER TABLE "jobs" RENAME CONSTRAINT "job_campaign_id_fkey" TO "jobs_campaign_id_fkey";

-- contact -> contacts
ALTER TABLE "contact" RENAME TO "contacts";
ALTER TABLE "contacts" RENAME CONSTRAINT "contact_pkey" TO "contacts_pkey";
ALTER INDEX "contact_profile_id_idx" RENAME TO "contacts_profile_id_idx";
ALTER INDEX "contact_profile_id_company_idx" RENAME TO "contacts_profile_id_company_idx";
ALTER TABLE "contacts" RENAME CONSTRAINT "contact_profile_id_fkey" TO "contacts_profile_id_fkey";
ALTER TABLE "contacts" RENAME CONSTRAINT "contact_related_app_id_fkey" TO "contacts_related_app_id_fkey";

-- outreach_message -> outreach_messages
ALTER TABLE "outreach_message" RENAME TO "outreach_messages";
ALTER TABLE "outreach_messages" RENAME CONSTRAINT "outreach_message_pkey" TO "outreach_messages_pkey";
ALTER INDEX "outreach_message_profile_id_idx" RENAME TO "outreach_messages_profile_id_idx";
ALTER INDEX "outreach_message_campaign_id_idx" RENAME TO "outreach_messages_campaign_id_idx";
ALTER INDEX "outreach_message_contact_id_idx" RENAME TO "outreach_messages_contact_id_idx";
ALTER INDEX "outreach_message_thread_id_idx" RENAME TO "outreach_messages_thread_id_idx";
ALTER INDEX "outreach_message_status_idx" RENAME TO "outreach_messages_status_idx";
ALTER TABLE "outreach_messages" RENAME CONSTRAINT "outreach_message_profile_id_fkey" TO "outreach_messages_profile_id_fkey";
ALTER TABLE "outreach_messages" RENAME CONSTRAINT "outreach_message_contact_id_fkey" TO "outreach_messages_contact_id_fkey";
ALTER TABLE "outreach_messages" RENAME CONSTRAINT "outreach_message_campaign_id_fkey" TO "outreach_messages_campaign_id_fkey";

-- profile -> profiles
ALTER TABLE "profile" RENAME TO "profiles";
ALTER TABLE "profiles" RENAME CONSTRAINT "profile_pkey" TO "profiles_pkey";
ALTER INDEX "profile_user_id_key" RENAME TO "profiles_user_id_key";
ALTER INDEX "profile_primary_resume_id_key" RENAME TO "profiles_primary_resume_id_key";
ALTER INDEX "profile_user_id_idx" RENAME TO "profiles_user_id_idx";
ALTER TABLE "profiles" RENAME CONSTRAINT "profile_user_id_fkey" TO "profiles_user_id_fkey";
ALTER TABLE "profiles" RENAME CONSTRAINT "profile_primary_resume_id_fkey" TO "profiles_primary_resume_id_fkey";

-- reference -> references
ALTER TABLE "reference" RENAME TO "references";
ALTER TABLE "references" RENAME CONSTRAINT "reference_pkey" TO "references_pkey";
ALTER INDEX "reference_profile_id_idx" RENAME TO "references_profile_id_idx";
ALTER TABLE "references" RENAME CONSTRAINT "reference_profile_id_fkey" TO "references_profile_id_fkey";

-- queue_entry -> queue_entries
ALTER TABLE "queue_entry" RENAME TO "queue_entries";
ALTER TABLE "queue_entries" RENAME CONSTRAINT "queue_entry_pkey" TO "queue_entries_pkey";
ALTER INDEX "queue_entry_profile_id_status_idx" RENAME TO "queue_entries_profile_id_status_idx";
ALTER INDEX "queue_entry_status_idx" RENAME TO "queue_entries_status_idx";
ALTER INDEX "queue_entry_profile_id_url_key" RENAME TO "queue_entries_profile_id_url_key";
ALTER TABLE "queue_entries" RENAME CONSTRAINT "queue_entry_profile_id_fkey" TO "queue_entries_profile_id_fkey";

-- resume -> resumes
ALTER TABLE "resume" RENAME TO "resumes";
ALTER TABLE "resumes" RENAME CONSTRAINT "resume_pkey" TO "resumes_pkey";
ALTER INDEX "resume_profile_id_idx" RENAME TO "resumes_profile_id_idx";
ALTER TABLE "resumes" RENAME CONSTRAINT "resume_profile_id_fkey" TO "resumes_profile_id_fkey";

-- resume_variant -> resume_variants
ALTER TABLE "resume_variant" RENAME TO "resume_variants";
ALTER TABLE "resume_variants" RENAME CONSTRAINT "resume_variant_pkey" TO "resume_variants_pkey";
ALTER INDEX "resume_variant_resume_id_idx" RENAME TO "resume_variants_resume_id_idx";
ALTER INDEX "resume_variant_application_id_idx" RENAME TO "resume_variants_application_id_idx";
ALTER TABLE "resume_variants" RENAME CONSTRAINT "resume_variant_resume_id_fkey" TO "resume_variants_resume_id_fkey";
ALTER TABLE "resume_variants" RENAME CONSTRAINT "resume_variant_application_id_fkey" TO "resume_variants_application_id_fkey";

-- upwork_proposal -> upwork_proposals
ALTER TABLE "upwork_proposal" RENAME TO "upwork_proposals";
ALTER TABLE "upwork_proposals" RENAME CONSTRAINT "upwork_proposal_pkey" TO "upwork_proposals_pkey";
ALTER INDEX "upwork_proposal_profile_id_idx" RENAME TO "upwork_proposals_profile_id_idx";
ALTER INDEX "upwork_proposal_profile_id_status_idx" RENAME TO "upwork_proposals_profile_id_status_idx";
ALTER INDEX "upwork_proposal_campaign_id_idx" RENAME TO "upwork_proposals_campaign_id_idx";
ALTER TABLE "upwork_proposals" RENAME CONSTRAINT "upwork_proposal_profile_id_fkey" TO "upwork_proposals_profile_id_fkey";

-- upwork_profile -> upwork_profiles
ALTER TABLE "upwork_profile" RENAME TO "upwork_profiles";
ALTER TABLE "upwork_profiles" RENAME CONSTRAINT "upwork_profile_pkey" TO "upwork_profiles_pkey";
ALTER INDEX "upwork_profile_profile_id_key" RENAME TO "upwork_profiles_profile_id_key";
ALTER TABLE "upwork_profiles" RENAME CONSTRAINT "upwork_profile_profile_id_fkey" TO "upwork_profiles_profile_id_fkey";
