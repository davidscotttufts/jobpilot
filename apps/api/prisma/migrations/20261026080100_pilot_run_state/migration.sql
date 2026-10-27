-- Interview prep sheets were notes marked by a prefix; they become their own event kind.
UPDATE "application_events"
SET "kind" = 'interview_prep',
    "note" = ltrim(substring("note" FROM length('[interview-prep]') + 1), E' \n')
WHERE "kind" = 'note' AND "note" LIKE '[interview-prep]%';

-- Never read: the snapshot itself carries builtAt.
ALTER TABLE "pilot_states" DROP COLUMN "task_list_built_at";
