-- Its own migration: Postgres refuses a new enum value in the transaction that added it, and the
-- next migration converts rows to it.
ALTER TYPE "application_event_kind" ADD VALUE 'interview_prep';
