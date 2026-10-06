-- Pilot v2 runs one task at a time and review-first was never wired; drop both retired config keys.
UPDATE "pilot_states"
SET "instructions_config" = "instructions_config" - 'maxConcurrentApplies' - 'reviewFirstApplies'
WHERE "instructions_config" ?| ARRAY['maxConcurrentApplies', 'reviewFirstApplies'];
