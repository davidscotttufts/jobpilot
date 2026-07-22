-- Data-only migration: drop the removed `parkedBoards` key from
-- pilot_states.instructions_config (jsonb). The parked-boards feature is gone
-- (contracts, agenda gathers, instructions form); the key would otherwise linger
-- as dead JSON until the user's next save.
-- Idempotent: the WHERE clause skips rows that no longer carry the key.

UPDATE "pilot_states"
SET "instructions_config" = "instructions_config" - 'parkedBoards'
WHERE "instructions_config" ? 'parkedBoards';
