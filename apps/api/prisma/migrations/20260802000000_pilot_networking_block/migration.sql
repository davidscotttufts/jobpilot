-- Data-only, paired with collapsing the pilot networking config into one block
-- (packages/contracts/src/pilot/instructions.ts). Without it the config parses with the new
-- defaults and every existing user's networking silently switches off:
--   networkingEnabled + autonomy.networkingEmail    -> networking.email    ('off' when disabled)
--   networkingEnabled + autonomy.networkingLinkedIn -> networking.linkedIn ('off' when disabled)
--   dailyNetworkingCap                              -> networking.dailyCap
--   networkingFollowupDays                          -> networking.followupDays
-- Idempotent: guarded on the new key being absent, so a re-run is a no-op.

UPDATE "pilot_states"
SET "instructions_config" =
  (
    "instructions_config"
      - 'networkingEnabled'
      - 'autonomy'
      - 'dailyNetworkingCap'
      - 'networkingFollowupDays'
  )
  || jsonb_build_object(
    'networking',
    jsonb_build_object(
      'email',
      CASE
        WHEN COALESCE(("instructions_config"->>'networkingEnabled')::boolean, false)
          THEN COALESCE("instructions_config"->'autonomy'->>'networkingEmail', 'review')
        ELSE 'off'
      END,
      'linkedIn',
      CASE
        WHEN COALESCE(("instructions_config"->>'networkingEnabled')::boolean, false)
          THEN COALESCE("instructions_config"->'autonomy'->>'networkingLinkedIn', 'draft')
        ELSE 'off'
      END,
      'dailyCap', COALESCE("instructions_config"->'dailyNetworkingCap', '5'::jsonb),
      'followupDays', COALESCE("instructions_config"->'networkingFollowupDays', '5'::jsonb)
    )
  )
WHERE jsonb_typeof("instructions_config") = 'object'
  AND NOT "instructions_config" ? 'networking';

-- agenda_snapshot stores a whole AgendaResponse, and the networking payloads changed shape, so one
-- written by the old build 500s on read. Discarding is lossless - it is a cache the next refresh rebuilds.
UPDATE "pilot_states"
SET "agenda_snapshot" = NULL,
    "agenda_expires_at" = NULL
WHERE "agenda_snapshot" IS NOT NULL;

-- Same for an open networking claim: its payload still carries emailAutonomy/linkedInAutonomy and
-- no longer parses. Expiring it is what the sweeper would do anyway once it timed out.
UPDATE "pilot_claims"
SET "released_at" = NOW(),
    "outcome" = 'expired'::"PilotClaimOutcome"
WHERE "released_at" IS NULL
  AND "kind" LIKE 'networking.%';
